"use client";

import { useMemo } from "react";
import { fromMinor, splitEqually } from "@/lib/money";

export type SplitMode = "equal" | "custom";

export interface SplitMember {
  user_id: string;
  label: string;
}

export interface SplitEditorValue {
  mode: SplitMode;
  // shares keyed by user_id; absent or null = not included
  shares: Record<string, number | null>;
}

export function SplitEditor({
  members,
  amountMinor,
  value,
  onChange,
  currency,
}: {
  members: SplitMember[];
  amountMinor: number;
  value: SplitEditorValue;
  onChange: (next: SplitEditorValue) => void;
  currency: string;
}) {
  const included = useMemo(
    () => members.filter((m) => value.shares[m.user_id] != null),
    [members, value.shares],
  );

  const sum = useMemo(
    () => included.reduce((acc, m) => acc + (value.shares[m.user_id] ?? 0), 0),
    [included, value.shares],
  );

  const remainder = amountMinor - sum;
  const balanced = remainder === 0 && included.length > 0;

  function toggleMember(user_id: string, include: boolean) {
    const nextShares = { ...value.shares };
    if (include) nextShares[user_id] = 0;
    else delete nextShares[user_id];

    const next: SplitEditorValue = { mode: value.mode, shares: nextShares };
    if (next.mode === "equal") rebalanceEqual(next, amountMinor);
    onChange(next);
  }

  function setMode(mode: SplitMode) {
    const next: SplitEditorValue = { mode, shares: { ...value.shares } };
    if (mode === "equal") rebalanceEqual(next, amountMinor);
    onChange(next);
  }

  function setShareInput(user_id: string, raw: string) {
    if (value.mode !== "custom") return;
    const parsed = parseMajorToMinor(raw);
    const nextShares = { ...value.shares, [user_id]: parsed };
    onChange({ mode: "custom", shares: nextShares });
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs uppercase tracking-wider text-orbit-muted">Split</div>
        <div className="flex rounded-md border border-orbit-border bg-orbit-bg/40 p-0.5 text-xs">
          {(["equal", "custom"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-3 py-1 rounded-sm transition ${
                value.mode === m
                  ? "bg-orbit-cyan/20 text-orbit-cyan"
                  : "text-orbit-muted hover:text-orbit-text"
              }`}
            >
              {m === "equal" ? "Equal" : "Custom"}
            </button>
          ))}
        </div>
      </div>

      <ul className="divide-y divide-orbit-border rounded-lg border border-orbit-border bg-orbit-bg/40">
        {members.map((m) => {
          const share = value.shares[m.user_id];
          const checked = share != null;
          return (
            <li key={m.user_id} className="flex items-center gap-3 px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => toggleMember(m.user_id, e.target.checked)}
                className="h-4 w-4 accent-orbit-cyan"
                aria-label={`Include ${m.label}`}
              />
              <span className="flex-1 truncate text-orbit-text">{m.label}</span>
              {value.mode === "equal" ? (
                <span className="font-mono text-xs text-orbit-muted">
                  {checked ? `${currency} ${fromMinor(share ?? 0)}` : "—"}
                </span>
              ) : (
                <input
                  type="text"
                  inputMode="decimal"
                  disabled={!checked}
                  value={checked ? fromMinor(share ?? 0) : ""}
                  onChange={(e) => setShareInput(m.user_id, e.target.value)}
                  className="w-28 rounded-md border border-orbit-border bg-orbit-bg px-2 py-1 text-right font-mono text-xs text-orbit-text disabled:opacity-40"
                />
              )}
            </li>
          );
        })}
      </ul>

      <div
        className={`flex items-center justify-between rounded-md border px-3 py-2 text-xs ${
          balanced
            ? "border-orbit-cyan/40 bg-orbit-cyan/10 text-orbit-cyan"
            : "border-orbit-magenta/40 bg-orbit-magenta/10 text-orbit-magenta"
        }`}
      >
        <span>
          {included.length} {included.length === 1 ? "member" : "members"} included
        </span>
        <span className="font-mono">
          {currency} {fromMinor(sum)} / {currency} {fromMinor(amountMinor)}
          {remainder !== 0 ? ` (off by ${currency} ${fromMinor(Math.abs(remainder))})` : ""}
        </span>
      </div>
    </div>
  );
}

export function makeInitialSplitValue(
  members: SplitMember[],
  amountMinor: number,
  mode: SplitMode = "equal",
): SplitEditorValue {
  const shares: Record<string, number> = {};
  if (members.length === 0 || amountMinor <= 0) {
    return { mode, shares };
  }
  const equal = splitEqually(amountMinor, members.length);
  members.forEach((m, i) => (shares[m.user_id] = equal[i]));
  return { mode, shares };
}

function rebalanceEqual(value: SplitEditorValue, amountMinor: number): void {
  const ids = Object.keys(value.shares);
  if (ids.length === 0 || amountMinor <= 0) {
    for (const id of ids) value.shares[id] = 0;
    return;
  }
  const equal = splitEqually(amountMinor, ids.length);
  ids.forEach((id, i) => (value.shares[id] = equal[i]));
}

function parseMajorToMinor(raw: string): number {
  const s = raw.trim();
  if (!/^\d*(\.\d{0,2})?$/.test(s)) return 0;
  if (!s) return 0;
  const [whole = "0", frac = ""] = s.split(".");
  const paddedFrac = (frac + "00").slice(0, 2);
  return parseInt(whole || "0", 10) * 100 + parseInt(paddedFrac || "0", 10);
}

// Export for parent form to call when amount changes externally.
export function rebalanceForAmount(value: SplitEditorValue, amountMinor: number): SplitEditorValue {
  if (value.mode !== "equal") return value;
  const next: SplitEditorValue = { mode: "equal", shares: { ...value.shares } };
  rebalanceEqual(next, amountMinor);
  return next;
}
