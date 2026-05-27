"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  SplitEditor,
  type SplitEditorValue,
  type SplitMember,
  makeInitialSplitValue,
  rebalanceForAmount,
} from "./split-editor";
import { addTransaction } from "@/actions/transactions";
import { DEFAULT_CATEGORIES } from "@/lib/categories";
import type { GroupMode } from "@/lib/types";

type TxnType = "spent" | "collected";
type Source = "member" | "outside";

export function TransactionForm({
  groupId,
  groupMode,
  currency,
  members,
  knownCategories,
  onDone,
}: {
  groupId: string;
  groupMode: GroupMode;
  currency: string;
  members: SplitMember[];
  knownCategories: string[];
  onDone?: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [type, setType] = useState<TxnType>("spent");
  const [source, setSource] = useState<Source>("member");
  const [amountRaw, setAmountRaw] = useState<string>("");
  const [paidBy, setPaidBy] = useState<string>(members[0]?.user_id ?? "");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("");
  const [occurredOn, setOccurredOn] = useState<string>(today());
  const [serverError, setServerError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const amountMinor = useMemo(() => parseMajorToMinor(amountRaw), [amountRaw]);

  const splitsActive =
    groupMode === "splitwise" && (type === "spent" || (type === "collected" && source === "outside"));

  const [split, setSplit] = useState<SplitEditorValue>(() =>
    makeInitialSplitValue(members, 0, "equal"),
  );

  // Rebalance equal splits when amount changes.
  useEffect(() => {
    if (!splitsActive) return;
    setSplit((prev) => rebalanceForAmount(prev, amountMinor));
  }, [amountMinor, splitsActive]);

  // Reset split selection when members or splitsActive flips on.
  useEffect(() => {
    if (splitsActive) {
      setSplit(makeInitialSplitValue(members, amountMinor, "equal"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [splitsActive, members.length]);

  const categoryOptions = useMemo(() => {
    const set = new Set<string>([...DEFAULT_CATEGORIES, ...knownCategories]);
    return Array.from(set).sort();
  }, [knownCategories]);

  function reset() {
    setAmountRaw("");
    setDescription("");
    setCategory("");
    setOccurredOn(today());
    setServerError(null);
    setFieldErrors({});
    setSplit(makeInitialSplitValue(members, 0, "equal"));
  }

  function buildFormData(): FormData {
    const fd = new FormData();
    fd.set("groupId", groupId);
    fd.set("type", type);
    fd.set("amount", amountRaw);
    fd.set("description", description);
    fd.set("category", category);
    fd.set("occurred_on", occurredOn);
    if (type === "spent") {
      fd.set("paid_by", paidBy);
    } else {
      fd.set("source", source);
      if (source === "member") fd.set("paid_by", paidBy);
    }
    if (splitsActive) {
      const rows = Object.entries(split.shares)
        .filter(([, v]) => v != null)
        .map(([user_id, share_minor]) => ({ user_id, share_minor: share_minor as number }));
      fd.set("splitsJson", JSON.stringify(rows));
    }
    return fd;
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    setFieldErrors({});
    const fd = buildFormData();
    startTransition(async () => {
      const res = await addTransaction(null, fd);
      if (!res.ok) {
        setServerError(res.error);
        setFieldErrors(res.fieldErrors ?? {});
        return;
      }
      reset();
      router.refresh();
      onDone?.();
    });
  }

  const showPaidBy = type === "spent" || (type === "collected" && source === "member");

  return (
    <form onSubmit={submit} className="panel space-y-5 p-5">
      <Segmented
        label="Type"
        options={[
          { value: "spent", label: "Spent", accent: "cyan" },
          { value: "collected", label: "Collected", accent: "magenta" },
        ]}
        value={type}
        onChange={(v) => setType(v as TxnType)}
      />

      {type === "collected" ? (
        <Segmented
          label="Source"
          options={[
            { value: "member", label: "From a member" },
            { value: "outside", label: "From outside (refund, income)" },
          ]}
          value={source}
          onChange={(v) => setSource(v as Source)}
        />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wider text-orbit-muted">
            Amount ({currency})
          </span>
          <input
            type="text"
            inputMode="decimal"
            required
            placeholder="0.00"
            value={amountRaw}
            onChange={(e) => setAmountRaw(e.target.value)}
            className="input text-right font-mono"
          />
          {fieldErrors.amount ? <ErrLine msg={fieldErrors.amount} /> : null}
        </label>
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wider text-orbit-muted">Date</span>
          <input
            type="date"
            required
            value={occurredOn}
            onChange={(e) => setOccurredOn(e.target.value)}
            className="input"
          />
          {fieldErrors.occurred_on ? <ErrLine msg={fieldErrors.occurred_on} /> : null}
        </label>
      </div>

      <label className="block">
        <span className="mb-1 block text-xs uppercase tracking-wider text-orbit-muted">
          Description
        </span>
        <input
          type="text"
          maxLength={200}
          placeholder="Dinner at Mandala"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="input"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs uppercase tracking-wider text-orbit-muted">
            Category
          </span>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="input"
          >
            <option value="">— none —</option>
            {categoryOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>

        {showPaidBy ? (
          <label className="block">
            <span className="mb-1 block text-xs uppercase tracking-wider text-orbit-muted">
              {type === "spent" ? "Paid by" : "Contributed by"}
            </span>
            <select
              required
              value={paidBy}
              onChange={(e) => setPaidBy(e.target.value)}
              className="input"
            >
              {members.map((m) => (
                <option key={m.user_id} value={m.user_id}>
                  {m.label}
                </option>
              ))}
            </select>
            {fieldErrors.paid_by ? <ErrLine msg={fieldErrors.paid_by} /> : null}
          </label>
        ) : null}
      </div>

      {splitsActive ? (
        <div className="space-y-2">
          <SplitEditor
            members={members}
            amountMinor={amountMinor}
            value={split}
            onChange={setSplit}
            currency={currency}
          />
          {fieldErrors.splitsJson ? <ErrLine msg={fieldErrors.splitsJson} /> : null}
        </div>
      ) : null}

      {serverError && Object.keys(fieldErrors).length === 0 ? (
        <p className="rounded-md border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-300">
          {serverError}
        </p>
      ) : null}

      <div className="flex justify-end gap-3">
        {onDone ? (
          <button
            type="button"
            onClick={onDone}
            className="ghost-button"
            disabled={pending}
          >
            Cancel
          </button>
        ) : null}
        <button type="submit" className="neon-button" disabled={pending}>
          {pending ? "Saving..." : "Save transaction"}
        </button>
      </div>
    </form>
  );
}

function Segmented<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string; accent?: "cyan" | "magenta" }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div>
      <div className="mb-1 text-xs uppercase tracking-wider text-orbit-muted">{label}</div>
      <div className="inline-flex rounded-md border border-orbit-border bg-orbit-bg/40 p-0.5 text-xs">
        {options.map((o) => {
          const active = value === o.value;
          const activeClass = active
            ? o.accent === "magenta"
              ? "bg-orbit-magenta/20 text-orbit-magenta"
              : "bg-orbit-cyan/20 text-orbit-cyan"
            : "text-orbit-muted hover:text-orbit-text";
          return (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              className={`rounded-sm px-3 py-1.5 transition ${activeClass}`}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function ErrLine({ msg }: { msg: string }) {
  return <p className="mt-1 text-xs text-red-300">{msg}</p>;
}

function today(): string {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function parseMajorToMinor(s: string): number {
  if (!/^\d+(\.\d{1,2})?$/.test(s.trim())) return 0;
  const [whole, frac = ""] = s.trim().split(".");
  const paddedFrac = (frac + "00").slice(0, 2);
  return parseInt(whole, 10) * 100 + parseInt(paddedFrac, 10);
}
