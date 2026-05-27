import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getGroup } from "@/actions/groups";
import { listMembers, type MemberRow } from "@/actions/members";
import {
  listTransactions,
  listCategoriesInUse,
  type TransactionFilter,
} from "@/actions/transactions";
import { AddTransactionPanel } from "@/components/transactions/add-transaction-panel";
import { TransactionFilters } from "@/components/transactions/transaction-filters";
import { TransactionList } from "@/components/transactions/transaction-list";
import type { TransactionType } from "@/lib/types";

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

export default async function TransactionsPage({
  params,
  searchParams,
}: {
  params: { groupId: string };
  searchParams: { type?: string; paidBy?: string; category?: string };
}) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const group = await getGroup(params.groupId);
  if (!group) return null;

  const members = await listMembers(params.groupId);
  const joined = members.filter((m): m is MemberRow & { user_id: string } => Boolean(m.user_id));

  const splitMembers = joined.map((m) => ({ user_id: m.user_id, label: memberLabel(m) }));
  const memberLabels: Record<string, string> = {};
  for (const m of joined) memberLabels[m.user_id] = memberLabel(m);

  const validType: TransactionType | undefined =
    searchParams.type === "spent" || searchParams.type === "collected"
      ? searchParams.type
      : undefined;

  const filter: TransactionFilter = {
    groupId: params.groupId,
    type: validType,
    paidBy: searchParams.paidBy || undefined,
    category: searchParams.category || undefined,
  };

  const [transactions, categoriesInUse] = await Promise.all([
    listTransactions(filter),
    listCategoriesInUse(params.groupId),
  ]);

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-orbit-text">Transactions</h2>
          <p className="text-xs text-orbit-muted">
            Newest first. Filters update the URL so you can share or bookmark a view.
          </p>
        </div>
      </header>

      <AddTransactionPanel
        groupId={group.id}
        groupMode={group.mode}
        currency={group.currency}
        members={splitMembers}
        knownCategories={categoriesInUse}
      />

      <TransactionFilters memberLabels={memberLabels} categories={categoriesInUse} />

      <TransactionList
        groupId={group.id}
        currency={group.currency}
        transactions={transactions}
        memberLabels={memberLabels}
        currentUserId={user.id}
      />
    </div>
  );
}
