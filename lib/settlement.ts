// PURE function: minimize transfers needed to settle all debts.
//
// True minimum is NP-hard; we use the standard greedy "max creditor pays max
// debtor" pattern which is what Splitwise and similar apps use. Produces at
// most max(creditors, debtors) transfers — optimal in most realistic cases.
//
// Input balances must sum to zero (the computeBalances output always does).

import type { MemberBalance } from "./balances";

export interface SettlementTransfer {
  from: string;
  to: string;
  amount_minor: number;
}

export function suggestSettlements(balances: MemberBalance[]): SettlementTransfer[] {
  const creditors: { user_id: string; amount: number }[] = [];
  const debtors: { user_id: string; amount: number }[] = [];

  for (const b of balances) {
    if (b.net_minor > 0) creditors.push({ user_id: b.user_id, amount: b.net_minor });
    else if (b.net_minor < 0) debtors.push({ user_id: b.user_id, amount: -b.net_minor });
  }

  creditors.sort((a, b) => b.amount - a.amount || a.user_id.localeCompare(b.user_id));
  debtors.sort((a, b) => b.amount - a.amount || a.user_id.localeCompare(b.user_id));

  const transfers: SettlementTransfer[] = [];
  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const c = creditors[ci];
    const d = debtors[di];
    const amount = Math.min(c.amount, d.amount);
    if (amount > 0) {
      transfers.push({ from: d.user_id, to: c.user_id, amount_minor: amount });
      c.amount -= amount;
      d.amount -= amount;
    }
    if (c.amount === 0) ci += 1;
    if (d.amount === 0) di += 1;
  }

  return transfers;
}
