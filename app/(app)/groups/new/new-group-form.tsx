"use client";

import { useFormState, useFormStatus } from "react-dom";
import { createGroup, type ActionResult } from "@/actions/groups";

const initialState: ActionResult | null = null;

export function NewGroupForm() {
  const [state, action] = useFormState(createGroup, initialState);
  const fieldErrors = state && !state.ok ? state.fieldErrors ?? {} : {};

  return (
    <form action={action} className="panel space-y-6 p-6">
      <label className="block">
        <span className="mb-1 block text-xs uppercase tracking-wider text-orbit-muted">
          Group name
        </span>
        <input
          name="name"
          required
          maxLength={80}
          placeholder="Pokhara trip 2026"
          className="input"
        />
        {fieldErrors.name ? <FieldError msg={fieldErrors.name} /> : null}
      </label>

      <fieldset className="space-y-2">
        <legend className="mb-1 text-xs uppercase tracking-wider text-orbit-muted">Mode</legend>
        <ModeOption
          value="splitwise"
          title="Splitwise"
          desc="Track who paid what, split per person, see who owes whom, and settle up."
          accent="cyan"
          defaultChecked
        />
        <ModeOption
          value="pool"
          title="Shared pool"
          desc="Everyone contributes to a common fund. The group spends from it — no individual debts."
          accent="magenta"
        />
        {fieldErrors.mode ? <FieldError msg={fieldErrors.mode} /> : null}
      </fieldset>

      <label className="block">
        <span className="mb-1 block text-xs uppercase tracking-wider text-orbit-muted">
          Currency
        </span>
        <input
          name="currency"
          defaultValue="NPR"
          maxLength={3}
          className="input uppercase"
        />
        {fieldErrors.currency ? <FieldError msg={fieldErrors.currency} /> : null}
      </label>

      <label className="block">
        <span className="mb-1 block text-xs uppercase tracking-wider text-orbit-muted">
          Your display name in this group (optional)
        </span>
        <input
          name="ownerDisplayName"
          placeholder="e.g. Dipan"
          maxLength={80}
          className="input"
        />
        {fieldErrors.ownerDisplayName ? <FieldError msg={fieldErrors.ownerDisplayName} /> : null}
      </label>

      {state && !state.ok && !Object.keys(fieldErrors).length ? (
        <p className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {state.error}
        </p>
      ) : null}

      <div className="flex justify-end gap-3">
        <a href="/dashboard" className="ghost-button">
          Cancel
        </a>
        <SubmitButton />
      </div>
    </form>
  );
}

function ModeOption({
  value,
  title,
  desc,
  accent,
  defaultChecked,
}: {
  value: "splitwise" | "pool";
  title: string;
  desc: string;
  accent: "cyan" | "magenta";
  defaultChecked?: boolean;
}) {
  const ring =
    accent === "cyan"
      ? "peer-checked:border-orbit-cyan peer-checked:shadow-neon"
      : "peer-checked:border-orbit-magenta peer-checked:shadow-[0_0_0_1px_rgba(232,121,249,0.4),0_0_24px_-4px_rgba(232,121,249,0.35)]";
  const dot = accent === "cyan" ? "text-orbit-cyan" : "text-orbit-magenta";
  return (
    <label className="block">
      <input
        type="radio"
        name="mode"
        value={value}
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />
      <div
        className={`cursor-pointer rounded-lg border border-orbit-border bg-orbit-bg/40 p-4 transition ${ring}`}
      >
        <div className="flex items-start gap-3">
          <span className={`mt-1 font-mono text-xs ${dot}`}>●</span>
          <div>
            <div className="text-sm font-semibold text-orbit-text">{title}</div>
            <div className="mt-0.5 text-xs text-orbit-muted">{desc}</div>
          </div>
        </div>
      </div>
    </label>
  );
}

function FieldError({ msg }: { msg: string }) {
  return <p className="mt-1 text-xs text-red-300">{msg}</p>;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="neon-button" disabled={pending}>
      {pending ? "Creating..." : "Create group"}
    </button>
  );
}
