import { fromMinor } from "@/lib/money";
import type { Transaction } from "@/lib/types";

export function CategoryChart({
  transactions,
  currency,
}: {
  transactions: Pick<Transaction, "type" | "amount_minor" | "category">[];
  currency: string;
}) {
  const totals = new Map<string, number>();
  for (const t of transactions) {
    if (t.type !== "spent") continue;
    const key = t.category ?? "Uncategorized";
    totals.set(key, (totals.get(key) ?? 0) + t.amount_minor);
  }

  const rows = Array.from(totals.entries())
    .map(([category, amount_minor]) => ({ category, amount_minor }))
    .sort((a, b) => b.amount_minor - a.amount_minor);

  if (rows.length === 0) {
    return (
      <div className="panel grid place-items-center px-6 py-8 text-center">
        <p className="text-sm text-orbit-muted">
          Spend by category will appear once you record some expenses.
        </p>
      </div>
    );
  }

  const max = rows[0].amount_minor;
  const accents = ["cyan", "magenta", "lime"] as const;

  return (
    <ul className="space-y-2.5 rounded-xl border border-orbit-border bg-orbit-surface/40 p-4">
      {rows.map((r, i) => {
        const accent = accents[i % accents.length];
        const pct = max === 0 ? 0 : Math.max(2, Math.round((r.amount_minor / max) * 100));
        return (
          <li key={r.category} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-orbit-text">{r.category}</span>
              <span className={`font-mono ${accentText(accent)}`}>
                {currency} {fromMinor(r.amount_minor)}
              </span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-orbit-bg/60">
              <div
                className={`h-full rounded-full ${accentBar(accent)}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function accentText(a: "cyan" | "magenta" | "lime") {
  return a === "cyan"
    ? "text-orbit-cyan"
    : a === "magenta"
      ? "text-orbit-magenta"
      : "text-orbit-lime";
}

function accentBar(a: "cyan" | "magenta" | "lime") {
  return a === "cyan"
    ? "bg-orbit-cyan/80"
    : a === "magenta"
      ? "bg-orbit-magenta/80"
      : "bg-orbit-lime/80";
}
