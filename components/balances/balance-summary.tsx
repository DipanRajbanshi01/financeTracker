import { fromMinor } from "@/lib/money";
import type { MemberBalance } from "@/lib/balances";

export function BalanceSummary({
  balances,
  memberLabels,
  currency,
  currentUserId,
}: {
  balances: MemberBalance[];
  memberLabels: Record<string, string>;
  currency: string;
  currentUserId: string;
}) {
  if (balances.length === 0) {
    return (
      <div className="panel grid place-items-center px-6 py-10 text-center">
        <p className="text-sm text-orbit-muted">
          No balances yet — add a transaction to get started.
        </p>
      </div>
    );
  }

  const sorted = [...balances].sort(
    (a, b) => Math.abs(b.net_minor) - Math.abs(a.net_minor),
  );

  return (
    <ul className="divide-y divide-orbit-border rounded-xl border border-orbit-border bg-orbit-surface/40">
      {sorted.map((b) => {
        const label = memberLabels[b.user_id] ?? "Unknown";
        const isMe = b.user_id === currentUserId;
        const tone =
          b.net_minor > 0
            ? "text-orbit-cyan"
            : b.net_minor < 0
              ? "text-orbit-magenta"
              : "text-orbit-muted";
        const sign = b.net_minor > 0 ? "+" : b.net_minor < 0 ? "−" : "";
        const status =
          b.net_minor > 0
            ? "is owed"
            : b.net_minor < 0
              ? "owes"
              : "settled";
        return (
          <li
            key={b.user_id}
            className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
          >
            <div className="flex items-center gap-2">
              <span className="text-orbit-text">{label}</span>
              {isMe ? <span className="text-xs text-orbit-muted">(you)</span> : null}
              <span className="text-xs text-orbit-muted">{status}</span>
            </div>
            <div className={`font-mono text-sm font-semibold ${tone}`}>
              {sign} {currency} {fromMinor(Math.abs(b.net_minor))}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
