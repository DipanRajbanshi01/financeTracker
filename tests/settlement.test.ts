import { describe, it, expect } from "vitest";
import { suggestSettlements } from "@/lib/settlement";

describe("suggestSettlements", () => {
  it("returns no transfers when balances are empty or all zero", () => {
    expect(suggestSettlements([])).toEqual([]);
    expect(
      suggestSettlements([
        { user_id: "a", net_minor: 0 },
        { user_id: "b", net_minor: 0 },
      ]),
    ).toEqual([]);
  });

  it("simple two-person debt produces one transfer", () => {
    const result = suggestSettlements([
      { user_id: "a", net_minor: -500 },
      { user_id: "b", net_minor: 500 },
    ]);
    expect(result).toEqual([{ from: "a", to: "b", amount_minor: 500 }]);
  });

  it("three-person: one debtor pays the larger creditor first", () => {
    // a owes 600, b is owed 200, c is owed 400 → a pays c first (400), then b (200)
    const result = suggestSettlements([
      { user_id: "a", net_minor: -600 },
      { user_id: "b", net_minor: 200 },
      { user_id: "c", net_minor: 400 },
    ]);
    expect(result).toEqual([
      { from: "a", to: "c", amount_minor: 400 },
      { from: "a", to: "b", amount_minor: 200 },
    ]);
  });

  it("four-person: settles correctly with at most n-1 transfers", () => {
    const balances = [
      { user_id: "a", net_minor: -600 },
      { user_id: "b", net_minor: -300 },
      { user_id: "c", net_minor: 400 },
      { user_id: "d", net_minor: 500 },
    ];
    const result = suggestSettlements(balances);

    expect(result.length).toBeLessThanOrEqual(balances.length - 1);
    for (const t of result) {
      expect(t.amount_minor).toBeGreaterThan(0);
      expect(t.from).not.toBe(t.to);
    }

    // Applying the transfers should zero out every balance.
    const net = new Map<string, number>(balances.map((b) => [b.user_id, b.net_minor]));
    for (const t of result) {
      net.set(t.from, (net.get(t.from) ?? 0) + t.amount_minor);
      net.set(t.to, (net.get(t.to) ?? 0) - t.amount_minor);
    }
    for (const [, v] of net) expect(v).toBe(0);
  });

  it("handles one-paisa rounding when splitting unevenly", () => {
    // 100 paisa across 3 = 34 + 33 + 33 — payer ends at +66, others at -33 each.
    const result = suggestSettlements([
      { user_id: "a", net_minor: 66 },
      { user_id: "b", net_minor: -33 },
      { user_id: "c", net_minor: -33 },
    ]);
    expect(result.length).toBe(2);
    const total = result.reduce((acc, t) => acc + t.amount_minor, 0);
    expect(total).toBe(66);
  });

  it("ignores zero balances entirely", () => {
    const result = suggestSettlements([
      { user_id: "a", net_minor: 0 },
      { user_id: "b", net_minor: -500 },
      { user_id: "c", net_minor: 500 },
      { user_id: "d", net_minor: 0 },
    ]);
    expect(result).toEqual([{ from: "b", to: "c", amount_minor: 500 }]);
  });
});
