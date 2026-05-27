import { describe, it, expect } from "vitest";
import { computeBalances } from "@/lib/balances";
import type { Transaction, TransactionSplit } from "@/lib/types";

function txn(overrides: Partial<Transaction> & { id: string }): Transaction {
  return {
    group_id: "g1",
    type: "spent",
    amount_minor: 0,
    paid_by: null,
    paid_to: null,
    source: null,
    description: "",
    category: null,
    occurred_on: "2026-01-01",
    created_by: "u1",
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

function byUser(rows: { user_id: string; net_minor: number }[]) {
  return Object.fromEntries(rows.map((r) => [r.user_id, r.net_minor]));
}

describe("computeBalances", () => {
  it("returns empty for empty input", () => {
    expect(computeBalances([], [])).toEqual([]);
  });

  it("spent: credits payer, debits each split share", () => {
    const t = txn({ id: "t1", type: "spent", amount_minor: 1200, paid_by: "a" });
    const splits: TransactionSplit[] = [
      { transaction_id: "t1", user_id: "a", share_minor: 400 },
      { transaction_id: "t1", user_id: "b", share_minor: 400 },
      { transaction_id: "t1", user_id: "c", share_minor: 400 },
    ];
    const balances = byUser(computeBalances([t], splits));
    expect(balances.a).toBe(800);
    expect(balances.b).toBe(-400);
    expect(balances.c).toBe(-400);
  });

  it("spent: custom (uneven) split", () => {
    const t = txn({ id: "t1", type: "spent", amount_minor: 1000, paid_by: "a" });
    const splits: TransactionSplit[] = [
      { transaction_id: "t1", user_id: "a", share_minor: 700 },
      { transaction_id: "t1", user_id: "b", share_minor: 300 },
    ];
    const balances = byUser(computeBalances([t], splits));
    expect(balances.a).toBe(300);
    expect(balances.b).toBe(-300);
  });

  it("collected/outside: credits each split member, no paid_by", () => {
    const t = txn({
      id: "t2",
      type: "collected",
      source: "outside",
      amount_minor: 600,
      paid_by: null,
    });
    const splits: TransactionSplit[] = [
      { transaction_id: "t2", user_id: "a", share_minor: 200 },
      { transaction_id: "t2", user_id: "b", share_minor: 200 },
      { transaction_id: "t2", user_id: "c", share_minor: 200 },
    ];
    const balances = byUser(computeBalances([t], splits));
    expect(balances.a).toBe(200);
    expect(balances.b).toBe(200);
    expect(balances.c).toBe(200);
  });

  it("collected/member: credits the contributor only", () => {
    const t = txn({
      id: "t3",
      type: "collected",
      source: "member",
      amount_minor: 500,
      paid_by: "a",
    });
    const balances = byUser(computeBalances([t], []));
    expect(balances.a).toBe(500);
  });

  it("settlement: payer +amount, receiver -amount", () => {
    const t = txn({
      id: "t4",
      type: "settlement",
      amount_minor: 500,
      paid_by: "a",
      paid_to: "b",
    });
    const balances = byUser(computeBalances([t], []));
    expect(balances.a).toBe(500);
    expect(balances.b).toBe(-500);
  });

  it("settlement zeroes out a prior debt", () => {
    const spent = txn({
      id: "t1",
      type: "spent",
      amount_minor: 1000,
      paid_by: "a",
    });
    const splits: TransactionSplit[] = [
      { transaction_id: "t1", user_id: "a", share_minor: 500 },
      { transaction_id: "t1", user_id: "b", share_minor: 500 },
    ];
    const settle = txn({
      id: "t2",
      type: "settlement",
      amount_minor: 500,
      paid_by: "b",
      paid_to: "a",
    });
    const balances = byUser(computeBalances([spent, settle], splits));
    expect(balances.a).toBe(0);
    expect(balances.b).toBe(0);
  });

  it("balances always sum to zero (paisa-rounded splits)", () => {
    // 100 paisa across 3 = 34 + 33 + 33
    const t = txn({ id: "t1", type: "spent", amount_minor: 100, paid_by: "a" });
    const splits: TransactionSplit[] = [
      { transaction_id: "t1", user_id: "a", share_minor: 34 },
      { transaction_id: "t1", user_id: "b", share_minor: 33 },
      { transaction_id: "t1", user_id: "c", share_minor: 33 },
    ];
    const rows = computeBalances([t], splits);
    const sum = rows.reduce((acc, r) => acc + r.net_minor, 0);
    expect(sum).toBe(0);
  });

  it("aggregates across multiple transactions", () => {
    const t1 = txn({ id: "t1", type: "spent", amount_minor: 600, paid_by: "a" });
    const t1Splits: TransactionSplit[] = [
      { transaction_id: "t1", user_id: "a", share_minor: 200 },
      { transaction_id: "t1", user_id: "b", share_minor: 200 },
      { transaction_id: "t1", user_id: "c", share_minor: 200 },
    ];
    const t2 = txn({ id: "t2", type: "spent", amount_minor: 300, paid_by: "b" });
    const t2Splits: TransactionSplit[] = [
      { transaction_id: "t2", user_id: "a", share_minor: 100 },
      { transaction_id: "t2", user_id: "b", share_minor: 100 },
      { transaction_id: "t2", user_id: "c", share_minor: 100 },
    ];
    const balances = byUser(
      computeBalances([t1, t2], [...t1Splits, ...t2Splits]),
    );
    expect(balances.a).toBe(300);
    expect(balances.b).toBe(0);
    expect(balances.c).toBe(-300);
  });

  it("pool-mode spent (no splits, no paid_by recorded) leaves balances untouched", () => {
    // In pool mode the form skips paid_by-as-credit semantics for the pool view.
    // Here we model a transaction with paid_by null and no splits: nothing happens.
    const t = txn({
      id: "t1",
      type: "spent",
      amount_minor: 1000,
      paid_by: null,
    });
    expect(computeBalances([t], [])).toEqual([]);
  });
});
