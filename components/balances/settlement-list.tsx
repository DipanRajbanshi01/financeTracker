"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { fromMinor } from "@/lib/money";
import { recordSettlement } from "@/actions/transactions";
import type { SettlementTransfer } from "@/lib/settlement";

export function SettlementList({
  groupId,
  transfers,
  memberLabels,
  currency,
}: {
  groupId: string;
  transfers: SettlementTransfer[];
  memberLabels: Record<string, string>;
  currency: string;
}) {
  if (transfers.length === 0) {
    return (
      <div className="panel grid place-items-center px-6 py-10 text-center">
        <p className="text-sm text-orbit-text">All settled. ✨</p>
        <p className="mt-1 text-xs text-orbit-muted">Nobody owes anyone right now.</p>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-orbit-border rounded-xl border border-orbit-border bg-orbit-surface/40">
      {transfers.map((t, i) => (
        <SettleRow
          key={`${t.from}-${t.to}-${i}`}
          groupId={groupId}
          transfer={t}
          memberLabels={memberLabels}
          currency={currency}
        />
      ))}
    </ul>
  );
}

function SettleRow({
  groupId,
  transfer,
  memberLabels,
  currency,
}: {
  groupId: string;
  transfer: SettlementTransfer;
  memberLabels: Record<string, string>;
  currency: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [amount, setAmount] = useState(fromMinor(transfer.amount_minor));
  const [error, setError] = useState<string | null>(null);

  function settle() {
    setError(null);
    const fd = new FormData();
    fd.set("groupId", groupId);
    fd.set("fromUserId", transfer.from);
    fd.set("toUserId", transfer.to);
    fd.set("amount", amount);
    fd.set("occurred_on", today());
    fd.set(
      "description",
      `Settlement: ${memberLabels[transfer.from] ?? "?"} → ${memberLabels[transfer.to] ?? "?"}`,
    );
    startTransition(async () => {
      const res = await recordSettlement(null, fd);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <li className="grid grid-cols-1 gap-3 px-4 py-3 text-sm sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="min-w-0">
        <div className="text-orbit-text">
          <span className="font-medium">{memberLabels[transfer.from] ?? "?"}</span>
          <span className="mx-2 text-orbit-muted">pays</span>
          <span className="font-medium">{memberLabels[transfer.to] ?? "?"}</span>
        </div>
        {error ? (
          <p className="mt-1 text-xs text-red-300">{error}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-xs text-orbit-muted">{currency}</span>
        <input
          type="text"
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-28 rounded-md border border-orbit-border bg-orbit-bg px-2 py-1 text-right font-mono text-xs text-orbit-text"
        />
        <button
          type="button"
          onClick={settle}
          disabled={pending}
          className="neon-button px-3 py-1 text-xs"
        >
          {pending ? "..." : "Mark paid"}
        </button>
      </div>
    </li>
  );
}

function today(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
