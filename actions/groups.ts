"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createGroupSchema } from "@/lib/validation";
import type { Group, GroupMode } from "@/lib/types";

export interface GroupSummary {
  id: string;
  name: string;
  mode: GroupMode;
  currency: string;
  member_count: number;
  my_role: "owner" | "member";
}

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string> };

export async function createGroup(_prev: unknown, formData: FormData): Promise<ActionResult> {
  const parsed = createGroupSchema.safeParse({
    name: formData.get("name"),
    mode: formData.get("mode"),
    currency: formData.get("currency") || "NPR",
    ownerDisplayName: formData.get("ownerDisplayName"),
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
  const { data: groupId, error } = await supabase.rpc("create_group_with_owner", {
    p_name: parsed.data.name,
    p_mode: parsed.data.mode,
    p_currency: parsed.data.currency,
    p_owner_display_name: parsed.data.ownerDisplayName ?? null,
  });

  if (error || !groupId) {
    return { ok: false, error: error?.message ?? "Failed to create group." };
  }

  revalidatePath("/dashboard");
  redirect(`/groups/${groupId}`);
}

export async function listMyGroups(): Promise<GroupSummary[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // RLS limits this to groups I belong to. We also fetch my membership row
  // to know my role, and aggregate member counts.
  const { data: groups, error } = await supabase
    .from("groups")
    .select("id, name, mode, currency")
    .order("created_at", { ascending: false });

  if (error || !groups || groups.length === 0) return [];

  const ids = groups.map((g) => g.id);
  const { data: members } = await supabase
    .from("group_members")
    .select("group_id, user_id, role")
    .in("group_id", ids);

  const byGroup = new Map<string, { count: number; myRole: "owner" | "member" }>();
  for (const m of members ?? []) {
    const entry = byGroup.get(m.group_id) ?? { count: 0, myRole: "member" as const };
    entry.count += 1;
    if (m.user_id === user.id && (m.role === "owner" || m.role === "member")) {
      entry.myRole = m.role;
    }
    byGroup.set(m.group_id, entry);
  }

  return groups.map((g) => ({
    id: g.id,
    name: g.name,
    mode: g.mode as GroupMode,
    currency: g.currency,
    member_count: byGroup.get(g.id)?.count ?? 0,
    my_role: byGroup.get(g.id)?.myRole ?? "member",
  }));
}

export async function getGroup(groupId: string): Promise<Group | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("groups")
    .select("*")
    .eq("id", groupId)
    .maybeSingle();

  if (error || !data) return null;
  return data as Group;
}
