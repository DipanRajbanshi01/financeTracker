"use client";

import { useFormState, useFormStatus } from "react-dom";
import { useEffect, useState } from "react";
import { inviteMember, removeMember, type MemberRow, type InviteResult } from "@/actions/members";
import type { ActionResult } from "@/actions/groups";

const initialState: ActionResult<InviteResult> | null = null;

function displayLabel(m: MemberRow): string {
  return (
    m.display_name ||
    m.profile_display_name ||
    m.profile_email ||
    m.invite_email ||
    "Unknown"
  );
}

function statusLabel(m: MemberRow): { text: string; tone: string } {
  if (!m.user_id) return { text: "Pending invite", tone: "text-orbit-magenta" };
  if (m.role === "owner") return { text: "Owner", tone: "text-orbit-cyan" };
  return { text: "Member", tone: "text-orbit-muted" };
}

export function MemberList({
  groupId,
  members,
  canManage,
  currentUserId,
}: {
  groupId: string;
  members: MemberRow[];
  canManage: boolean;
  currentUserId: string;
}) {
  const [inviteState, inviteAction] = useFormState(inviteMember, initialState);
  const [lastCreds, setLastCreds] = useState<{ email: string; password: string } | null>(null);

  useEffect(() => {
    if (inviteState?.ok && inviteState.data.accountCreated && inviteState.data.email && inviteState.data.password) {
      setLastCreds({ email: inviteState.data.email, password: inviteState.data.password });
    }
  }, [inviteState]);

  return (
    <div className="space-y-6">
      {canManage ? (
        <form action={inviteAction} className="panel space-y-3 p-4">
          <input type="hidden" name="groupId" value={groupId} />
          <h3 className="text-sm font-semibold text-orbit-text">Add member</h3>
          <p className="text-xs text-orbit-muted">
            New emails get an account created on the spot — you'll see their password to share.
            Existing users are added straight to the group.
          </p>
          <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-wider text-orbit-muted">
                Email
              </span>
              <input
                type="email"
                name="email"
                required
                placeholder="friend@example.com"
                className="input"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-[10px] uppercase tracking-wider text-orbit-muted">
                Display name (optional)
              </span>
              <input type="text" name="displayName" placeholder="Asmita" className="input" />
            </label>
            <div className="flex items-end">
              <InviteSubmit />
            </div>
          </div>
          {inviteState && !inviteState.ok ? (
            <p className="rounded-md border border-red-500/40 bg-red-500/10 p-2 text-xs text-red-300">
              {inviteState.error}
            </p>
          ) : null}
          {inviteState?.ok && !inviteState.data.accountCreated ? (
            <p className="rounded-md border border-orbit-cyan/40 bg-orbit-cyan/10 p-2 text-xs text-orbit-cyan">
              Added to the group. (They already had an account — no new password needed.)
            </p>
          ) : null}
        </form>
      ) : null}

      {lastCreds ? (
        <CredentialsPanel
          email={lastCreds.email}
          password={lastCreds.password}
          onDismiss={() => setLastCreds(null)}
        />
      ) : null}

      <ul className="divide-y divide-orbit-border rounded-xl border border-orbit-border bg-orbit-surface/40">
        {members.map((m) => {
          const status = statusLabel(m);
          const isMe = m.user_id === currentUserId;
          const canRemove = canManage && m.role !== "owner";
          return (
            <li
              key={m.user_id ?? m.invite_email ?? Math.random()}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <div className="min-w-0">
                <div className="truncate text-orbit-text">
                  {displayLabel(m)}
                  {isMe ? <span className="ml-2 text-xs text-orbit-muted">(you)</span> : null}
                </div>
                {m.profile_email && m.profile_email !== displayLabel(m) ? (
                  <div className="truncate text-xs text-orbit-muted">{m.profile_email}</div>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                <span className={`font-mono text-[10px] uppercase tracking-wider ${status.tone}`}>
                  {status.text}
                </span>
                {canRemove ? (
                  <RemoveButton
                    groupId={groupId}
                    userId={m.user_id ?? undefined}
                    inviteEmail={m.invite_email ?? undefined}
                  />
                ) : null}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function CredentialsPanel({
  email,
  password,
  onDismiss,
}: {
  email: string;
  password: string;
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState<"email" | "password" | "both" | null>(null);

  function copy(value: string, kind: "email" | "password" | "both") {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(kind);
      setTimeout(() => setCopied(null), 1500);
    });
  }

  const both = `Email: ${email}\nPassword: ${password}`;

  return (
    <div className="panel space-y-3 border-orbit-cyan/40 p-4 shadow-neon">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-orbit-cyan">Share these once</h3>
          <p className="mt-1 text-xs text-orbit-muted">
            Send this to your friend over WhatsApp / text / wherever. They use it to sign in at
            this URL. They can change their password from Supabase later if they want.
          </p>
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-xs text-orbit-muted hover:text-orbit-text"
        >
          dismiss
        </button>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <CredField label="Email" value={email} onCopy={() => copy(email, "email")} copied={copied === "email"} />
        <CredField label="Password" value={password} mono onCopy={() => copy(password, "password")} copied={copied === "password"} />
      </div>

      <button
        type="button"
        onClick={() => copy(both, "both")}
        className="neon-button w-full text-xs"
      >
        {copied === "both" ? "Copied!" : "Copy both"}
      </button>
    </div>
  );
}

function CredField({
  label,
  value,
  mono = false,
  onCopy,
  copied,
}: {
  label: string;
  value: string;
  mono?: boolean;
  onCopy: () => void;
  copied: boolean;
}) {
  return (
    <div className="rounded-md border border-orbit-border bg-orbit-bg/60 p-2">
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wider text-orbit-muted">
        <span>{label}</span>
        <button
          type="button"
          onClick={onCopy}
          className="text-orbit-cyan hover:underline"
        >
          {copied ? "copied" : "copy"}
        </button>
      </div>
      <div className={`mt-1 break-all text-sm text-orbit-text ${mono ? "font-mono" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function InviteSubmit() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="neon-button" disabled={pending}>
      {pending ? "Adding..." : "Add"}
    </button>
  );
}

function RemoveButton({
  groupId,
  userId,
  inviteEmail,
}: {
  groupId: string;
  userId?: string;
  inviteEmail?: string;
}) {
  return (
    <form action={removeMember}>
      <input type="hidden" name="groupId" value={groupId} />
      {userId ? <input type="hidden" name="userId" value={userId} /> : null}
      {inviteEmail ? <input type="hidden" name="inviteEmail" value={inviteEmail} /> : null}
      <RemoveSubmit />
    </form>
  );
}

function RemoveSubmit() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className="rounded-md border border-orbit-border px-2 py-1 text-xs text-orbit-muted hover:border-red-500/50 hover:text-red-300 disabled:opacity-50"
      disabled={pending}
    >
      {pending ? "..." : "Remove"}
    </button>
  );
}
