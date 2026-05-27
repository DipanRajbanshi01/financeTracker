"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useCallback } from "react";
import type { MemberLookup } from "./transaction-list";

export function TransactionFilters({
  memberLabels,
  categories,
}: {
  memberLabels: MemberLookup;
  categories: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const update = useCallback(
    (key: string, value: string) => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      const qs = next.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname);
    },
    [params, pathname, router],
  );

  const memberIds = Object.keys(memberLabels);
  const type = params.get("type") ?? "";
  const paidBy = params.get("paidBy") ?? "";
  const category = params.get("category") ?? "";
  const hasAny = Boolean(type || paidBy || category);

  return (
    <div className="flex flex-wrap items-end gap-3">
      <FilterSelect
        label="Type"
        value={type}
        onChange={(v) => update("type", v)}
        options={[
          { value: "", label: "All" },
          { value: "spent", label: "Spent" },
          { value: "collected", label: "Collected" },
        ]}
      />
      <FilterSelect
        label="Paid by"
        value={paidBy}
        onChange={(v) => update("paidBy", v)}
        options={[
          { value: "", label: "Anyone" },
          ...memberIds.map((id) => ({ value: id, label: memberLabels[id] })),
        ]}
      />
      <FilterSelect
        label="Category"
        value={category}
        onChange={(v) => update("category", v)}
        options={[
          { value: "", label: "All" },
          ...categories.map((c) => ({ value: c, label: c })),
        ]}
      />
      {hasAny ? (
        <button
          type="button"
          onClick={() => router.replace(pathname)}
          className="text-xs text-orbit-muted hover:text-orbit-text"
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block text-xs">
      <span className="mb-1 block uppercase tracking-wider text-orbit-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-md border border-orbit-border bg-orbit-bg px-2 py-1.5 text-sm text-orbit-text focus:border-orbit-cyan focus:outline-none focus:ring-1 focus:ring-orbit-cyan"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
