"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { fromMinor } from "@/lib/money";
import { deleteTransaction, type TransactionWithSplits } from "@/actions/transactions";

export interface MemberLookup {
  [user_id: string]: string;
}

export function TransactionList({
  groupId,
  currency,
  transactions,
  memberLabels,
  currentUserId,
}: {
  groupId: string;
  currency: string;
  transactions: TransactionWithSplits[];
  memberLabels: MemberLookup;
  currentUserId: string;
}) {
  if (transactions.length === 0) {
    return (
      <div className="panel grid place-items-center px-6 py-12 text-center">
        <div className="space-y-1">
          <p className="text-sm text-orbit-text">No transactions yet</p>
          <p className="text-xs text-orbit-muted">
            Add a spend or contribution to start tracking.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-orbit-border rounded-xl border border-orbit-border bg-orbit-surface/40">
      {transactions.map((t) => (
        <Row
          key={t.id}
          txn={t}
          groupId={groupId}
          currency={currency}
          memberLabels={memberLabels}
          canDelete={t.created_by === currentUserId}
        />
      ))}
    </ul>
  );
}

function Row({
  txn,
  groupId,
  currency,
  memberLabels,
  canDelete,
}: {
  txn: TransactionWithSplits;
  groupId: string;
  currency: string;
  memberLabels: MemberLookup;
  canDelete: boolean;
}) {
  const isCollected = txn.type === "collected";
  const amountColor = isCollected ? "text-orbit-magenta" : "text-orbit-cyan";
  const sign = isCollected ? "+" : "−";

  const subject =
    txn.type === "spent" || (txn.type === "collected" && txn.source === "member")
      ? memberLabels[txn.paid_by ?? ""] ?? "Unknown"
      : "Outside";

  const verb = isCollected
    ? txn.source === "member"
      ? "contributed"
      : "received from outside"
    : "paid";

  return (
    <li className="grid grid-cols-[1fr_auto] items-start gap-3 px-4 py-3 text-sm">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-orbit-text">{subject}</span>
          <span className="text-orbit-muted">{verb}</span>
          {txn.category ? (
            <span className="rounded-full border border-orbit-border bg-orbit-bg/40 px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider text-orbit-muted">
              {txn.category}
            </span>
          ) : null}
        </div>
        {txn.description ? (
          <div className="mt-0.5 truncate text-xs text-orbit-text/80">{txn.description}</div>
        ) : null}
        <div className="mt-1 flex items-center gap-3 text-[11px] text-orbit-muted">
          <span>{txn.occurred_on}</span>
          {txn.splits.length > 0 ? (
            <span>· split {txn.splits.length} ways</span>
          ) : null}
        </div>
      </div>
      <div className="flex flex-col items-end gap-1">
        <div className={`font-mono text-base font-semibold ${amountColor}`}>
          {sign} {currency} {fromMinor(txn.amount_minor)}
        </div>
        {canDelete ? (
          <DeleteButton transactionId={txn.id} groupId={groupId} />
        ) : null}
      </div>
    </li>
  );
}

function DeleteButton({ transactionId, groupId }: { transactionId: string; groupId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirming, setConfirming] = useState(false);

  function doDelete() {
    const fd = new FormData();
    fd.set("transactionId", transactionId);
    fd.set("groupId", groupId);
    startTransition(async () => {
      await deleteTransaction(null, fd);
      router.refresh();
    });
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-[10px] uppercase tracking-wider text-orbit-muted hover:text-red-300"
      >
        delete
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2 text-[10px] uppercase tracking-wider">
      <span className="text-red-300/90">delete?</span>
      <button
        type="button"
        onClick={doDelete}
        disabled={pending}
        className="rounded border border-red-500/40 bg-red-500/10 px-1.5 py-0.5 text-red-300 hover:bg-red-500/20 disabled:opacity-50"
      >
        {pending ? "..." : "yes"}
      </button>
      <button
        type="button"
        onClick={() => setConfirming(false)}
        disabled={pending}
        className="text-orbit-muted hover:text-orbit-text disabled:opacity-50"
      >
        no
      </button>
    </div>
  );
}
