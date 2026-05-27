"use client";

import { useState } from "react";
import { TransactionForm } from "./transaction-form";
import type { SplitMember } from "./split-editor";
import type { GroupMode } from "@/lib/types";

export function AddTransactionPanel({
  groupId,
  groupMode,
  currency,
  members,
  knownCategories,
}: {
  groupId: string;
  groupMode: GroupMode;
  currency: string;
  members: SplitMember[];
  knownCategories: string[];
}) {
  const [open, setOpen] = useState(false);

  if (members.length === 0) {
    return (
      <div className="panel grid place-items-center px-6 py-8 text-center text-sm text-orbit-muted">
        Invite at least one member before adding transactions.
      </div>
    );
  }

  if (!open) {
    return (
      <div className="flex justify-end">
        <button type="button" className="neon-button" onClick={() => setOpen(true)}>
          + Add transaction
        </button>
      </div>
    );
  }

  return (
    <TransactionForm
      groupId={groupId}
      groupMode={groupMode}
      currency={currency}
      members={members}
      knownCategories={knownCategories}
      onDone={() => setOpen(false)}
    />
  );
}
