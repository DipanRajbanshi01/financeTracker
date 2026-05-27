import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getGroup } from "@/actions/groups";
import { listMembers, type MemberRow } from "@/actions/members";
import { listTransactions } from "@/actions/transactions";
import { TransactionList } from "@/components/transactions/transaction-list";
import { BalanceSummary } from "@/components/balances/balance-summary";
import { SettlementList } from "@/components/balances/settlement-list";
import { CategoryChart } from "@/components/balances/category-chart";
import { computeBalances } from "@/lib/balances";
import { suggestSettlements } from "@/lib/settlement";
import { fromMinor } from "@/lib/money";
import type { Transaction, TransactionSplit } from "@/lib/types";

export const dynamic = "force-dynamic";

function memberLabel(m: MemberRow): string {
  return (
    m.display_name ||
    m.profile_display_name ||
    m.profile_email ||
    m.invite_email ||
    "Unknown"
  );
}

export default async function GroupOverviewPage({ params }: { params: { groupId: string } }) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [group, members, transactions] = await Promise.all([
    getGroup(params.groupId),
    listMembers(params.groupId),
    listTransactions({ groupId: params.groupId }),
  ]);
  if (!group) return null;

  const joined = members.filter((m) => m.user_id);
  const pending = members.filter((m) => !m.user_id);

  const totalSpentMinor = transactions
    .filter((t) => t.type === "spent")
    .reduce((acc, t) => acc + t.amount_minor, 0);
  const totalCollectedMinor = transactions
    .filter((t) => t.type === "collected")
    .reduce((acc, t) => acc + t.amount_minor, 0);

  const memberLabels: Record<string, string> = {};
  for (const m of members) {
    if (m.user_id) memberLabels[m.user_id] = memberLabel(m);
  }

  // Flatten splits to feed the pure compute function. Drop transactions whose
  // payer is no longer in the labels map (member was removed) — we still
  // count them in spend totals but they don't have a label.
  const flatSplits: TransactionSplit[] = transactions.flatMap((t) =>
    t.splits.map((s) => ({
      transaction_id: t.id,
      user_id: s.user_id,
      share_minor: s.share_minor,
    })),
  );
  const flatTransactions: Transaction[] = transactions.map((t) => ({
    id: t.id,
    group_id: t.group_id,
    type: t.type,
    amount_minor: t.amount_minor,
    paid_by: t.paid_by,
    paid_to: t.paid_to,
    source: t.source,
    description: t.description,
    category: t.category,
    occurred_on: t.occurred_on,
    created_by: t.created_by,
    created_at: t.created_at,
  }));

  const balances = computeBalances(flatTransactions, flatSplits);
  const settlements = suggestSettlements(balances);
  const recent = transactions.slice(0, 5);
  const isSplitwise = group.mode === "splitwise";

  return (
    <div className="space-y-6">
      <section className="grid gap-4 sm:grid-cols-4">
        <Stat label="Members" value={joined.length.toString()} />
        <Stat
          label="Pending invites"
          value={pending.length.toString()}
          tone={pending.length ? "magenta" : "muted"}
        />
        <Stat
          label="Total spent"
          value={`${group.currency} ${fromMinor(totalSpentMinor)}`}
          tone="cyan"
          mono
        />
        <Stat
          label="Total collected"
          value={`${group.currency} ${fromMinor(totalCollectedMinor)}`}
          tone="magenta"
          mono
        />
      </section>

      {isSplitwise ? (
        <div className="grid gap-6 lg:grid-cols-2">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold text-orbit-text">Balances</h2>
            <BalanceSummary
              balances={balances}
              memberLabels={memberLabels}
              currency={group.currency}
              currentUserId={user.id}
            />
          </section>
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-orbit-text">Settle up</h2>
              <span className="text-[10px] font-mono uppercase tracking-wider text-orbit-muted">
                suggested
              </span>
            </div>
            <SettlementList
              groupId={group.id}
              transfers={settlements}
              memberLabels={memberLabels}
              currency={group.currency}
            />
          </section>
        </div>
      ) : (
        <section className="panel grid place-items-center px-6 py-10 text-center">
          <div className="space-y-2">
            <div className="font-mono text-xs uppercase tracking-[0.3em] text-orbit-magenta/80">
              Pool mode
            </div>
            <h3 className="text-base font-medium text-orbit-text">
              Net pool: {group.currency} {fromMinor(totalCollectedMinor - totalSpentMinor)}
            </h3>
            <p className="max-w-md text-sm text-orbit-muted">
              In pool mode there are no individual debts to settle. The group has
              collected {group.currency} {fromMinor(totalCollectedMinor)} and spent{" "}
              {group.currency} {fromMinor(totalSpentMinor)}.
            </p>
          </div>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-orbit-text">Recent transactions</h2>
            <Link
              href={`/groups/${group.id}/transactions`}
              className="text-xs text-orbit-cyan hover:underline"
            >
              View all →
            </Link>
          </div>
          <TransactionList
            groupId={group.id}
            currency={group.currency}
            transactions={recent}
            memberLabels={memberLabels}
            currentUserId={user.id}
          />
        </section>
        <section className="space-y-3">
          <h2 className="text-lg font-semibold text-orbit-text">Spend by category</h2>
          <CategoryChart transactions={flatTransactions} currency={group.currency} />
        </section>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  tone = "default",
  mono = false,
}: {
  label: string;
  value: string;
  tone?: "default" | "muted" | "magenta" | "cyan";
  mono?: boolean;
}) {
  const valueClass =
    tone === "magenta"
      ? "text-orbit-magenta"
      : tone === "muted"
        ? "text-orbit-text"
        : tone === "cyan"
          ? "text-orbit-cyan"
          : "text-orbit-cyan";
  return (
    <div className="panel px-4 py-3">
      <div className="text-[10px] font-mono uppercase tracking-wider text-orbit-muted">
        {label}
      </div>
      <div className={`mt-1 text-xl font-semibold ${valueClass} ${mono ? "font-mono" : ""}`}>
        {value}
      </div>
    </div>
  );
}
