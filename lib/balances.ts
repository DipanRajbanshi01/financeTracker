// PURE function: net balance per member.
// No DB calls. Operates on a list of transactions and their splits.
//
// Convention: net_minor > 0 means the group owes this member; < 0 means
// this member owes the group. Balances always sum to zero.
//
// Per-type semantics (matches the form's data shapes in Phase 3):
//   - spent:                paid_by gets +amount, each split.user_id gets -share
//   - collected/member:     paid_by (the contributor) gets +amount, no splits
//   - collected/outside:    no paid_by, each split.user_id gets +share
//                           (in pool-mode no splits are captured → no effect on balances)
//   - settlement:           paid_by gets +amount, paid_to gets -amount

import type { Transaction, TransactionSplit } from "./types";

export interface MemberBalance {
  user_id: string;
  net_minor: number;
}

export function computeBalances(
  transactions: Transaction[],
  splits: TransactionSplit[],
): MemberBalance[] {
  const splitsByTxn = new Map<string, TransactionSplit[]>();
  for (const s of splits) {
    const list = splitsByTxn.get(s.transaction_id);
    if (list) list.push(s);
    else splitsByTxn.set(s.transaction_id, [s]);
  }

  const net = new Map<string, number>();
  const credit = (id: string, amount: number) =>
    net.set(id, (net.get(id) ?? 0) + amount);

  for (const t of transactions) {
    const txnSplits = splitsByTxn.get(t.id) ?? [];

    if (t.type === "spent") {
      if (t.paid_by) credit(t.paid_by, t.amount_minor);
      for (const s of txnSplits) credit(s.user_id, -s.share_minor);
    } else if (t.type === "collected") {
      if (t.source === "member") {
        if (t.paid_by) credit(t.paid_by, t.amount_minor);
      } else if (t.source === "outside") {
        for (const s of txnSplits) credit(s.user_id, s.share_minor);
      }
    } else if (t.type === "settlement") {
      if (t.paid_by) credit(t.paid_by, t.amount_minor);
      if (t.paid_to) credit(t.paid_to, -t.amount_minor);
    }
  }

  return Array.from(net.entries())
    .map(([user_id, net_minor]) => ({ user_id, net_minor }))
    .sort((a, b) => b.net_minor - a.net_minor || a.user_id.localeCompare(b.user_id));
}
