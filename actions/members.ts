"use server";

import { revalidatePath } from "next/cache";
import { randomBytes } from "node:crypto";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { inviteMemberSchema, removeMemberSchema } from "@/lib/validation";
import type { ActionResult } from "./groups";

export interface MemberRow {
  group_id: string;
  user_id: string | null;
  invite_email: string | null;
  display_name: string | null;
  role: "owner" | "member";
  joined_at: string;
  profile_email: string | null;
  profile_display_name: string | null;
}

export interface InviteResult {
  accountCreated: boolean;
  email?: string;
  password?: string;
}

export async function listMembers(groupId: string): Promise<MemberRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("group_members")
    .select(`
      group_id, user_id, invite_email, display_name, role, joined_at,
      profile:profiles!group_members_user_id_fkey ( email, display_name )
    `)
    .eq("group_id", groupId)
    .order("joined_at", { ascending: true });

  if (error || !data) return [];

  return data.map((row: any) => ({
    group_id: row.group_id,
    user_id: row.user_id,
    invite_email: row.invite_email,
    display_name: row.display_name,
    role: row.role,
    joined_at: row.joined_at,
    profile_email: row.profile?.email ?? null,
    profile_display_name: row.profile?.display_name ?? null,
  }));
}

// Owner-managed invite: if the email already has a profile (existing user),
// just add them to the group. Otherwise create their auth account immediately
// with an auto-generated password and return the credentials so the owner can
// share them with the friend.
export async function inviteMember(
  _prev: unknown,
  formData: FormData,
): Promise<ActionResult<InviteResult>> {
  const parsed = inviteMemberSchema.safeParse({
    groupId: formData.get("groupId"),
    email: formData.get("email"),
    displayName: formData.get("displayName"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path.join(".");
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { ok: false, error: "Please fix the errors below.", fieldErrors };
  }

  const supabase = createClient();

  // Path A: profile already exists for this email — just add to the group.
  const { data: existing } = await supabase
    .from("profiles")
    .select("id")
    .eq("email", parsed.data.email)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("group_members").insert({
      group_id: parsed.data.groupId,
      user_id: existing.id,
      invite_email: null,
      display_name: parsed.data.displayName ?? null,
      role: "member" as const,
    });
    if (error) {
      if (error.code === "23505") {
        return { ok: false, error: "That person is already in this group." };
      }
      return { ok: false, error: error.message };
    }
    revalidatePath(`/groups/${parsed.data.groupId}/members`);
    revalidatePath(`/groups/${parsed.data.groupId}`);
    return { ok: true, data: { accountCreated: false } };
  }

  // Path B: new email — create the auth account, then add to the group.
  const password = generatePassword();
  const admin = createAdminClient();
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: parsed.data.email,
    password,
    email_confirm: true,
    user_metadata: parsed.data.displayName ? { full_name: parsed.data.displayName } : undefined,
  });
  if (createErr || !created.user) {
    return {
      ok: false,
      error: createErr?.message ?? "Failed to create account.",
    };
  }

  // The on_auth_user_created trigger has now created the profile row.
  // Add the membership directly.
  const { error: memberErr } = await supabase.from("group_members").insert({
    group_id: parsed.data.groupId,
    user_id: created.user.id,
    invite_email: null,
    display_name: parsed.data.displayName ?? null,
    role: "member" as const,
  });
  if (memberErr) {
    if (memberErr.code === "23505") {
      return { ok: false, error: "That person is already in this group." };
    }
    return { ok: false, error: memberErr.message };
  }

  revalidatePath(`/groups/${parsed.data.groupId}/members`);
  revalidatePath(`/groups/${parsed.data.groupId}`);
  return {
    ok: true,
    data: { accountCreated: true, email: parsed.data.email, password },
  };
}

// Fire-and-forget form action; errors are silent in the UI.
export async function removeMember(formData: FormData): Promise<void> {
  const parsed = removeMemberSchema.safeParse({
    groupId: formData.get("groupId"),
    userId: formData.get("userId") || undefined,
    inviteEmail: formData.get("inviteEmail") || undefined,
  });
  if (!parsed.success) return;

  const supabase = createClient();
  let q = supabase.from("group_members").delete().eq("group_id", parsed.data.groupId);
  if (parsed.data.userId) q = q.eq("user_id", parsed.data.userId);
  if (parsed.data.inviteEmail) q = q.eq("invite_email", parsed.data.inviteEmail);

  await q;
  revalidatePath(`/groups/${parsed.data.groupId}/members`);
  revalidatePath(`/groups/${parsed.data.groupId}`);
}

function generatePassword(): string {
  // 12 chars from an unambiguous alphabet (no 0/O, 1/l/I).
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const bytes = randomBytes(12);
  let s = "";
  for (let i = 0; i < 12; i++) s += alphabet[bytes[i] % alphabet.length];
  return s;
}
