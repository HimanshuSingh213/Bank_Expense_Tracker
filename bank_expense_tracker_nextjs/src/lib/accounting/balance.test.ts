import { describe, expect, it } from "vitest";
import { computeBalancePaise, reconcileBalance } from "@/lib/accounting/balance";

const at = (day: number) => new Date(Date.UTC(2026, 9, day));

describe("computeBalancePaise", () => {
  it("sums every transaction when there is no anchor yet", () => {
    const balance = computeBalancePaise(null, [
      { amountPaise: 500000, direction: "credit", txnDate: at(1) },
      { amountPaise: 120000, direction: "debit", txnDate: at(2) },
    ]);

    expect(balance).toBe(380000);
  });

  it("starts from the anchor and ignores rows on or before it", () => {
    const anchor = { balancePaise: 1000000, asOfDate: at(31) };

    const balance = computeBalancePaise(anchor, [
      // Historical context: already inside the anchor figure.
      { amountPaise: 900000, direction: "credit", txnDate: at(15) },
      { amountPaise: 100000, direction: "debit", txnDate: at(31) },
      // After the anchor: counted.
      { amountPaise: 50000, direction: "debit", txnDate: new Date(Date.UTC(2026, 10, 1)) },
    ]);

    expect(balance).toBe(950000);
  });

  it("skips soft-deleted rows", () => {
    const anchor = { balancePaise: 100000, asOfDate: at(31) };

    const balance = computeBalancePaise(anchor, [
      {
        amountPaise: 50000,
        direction: "debit",
        txnDate: new Date(Date.UTC(2026, 10, 2)),
        deletedAt: new Date(),
      },
    ]);

    expect(balance).toBe(100000);
  });

  it("does not let a historical import move the present balance", () => {
    const anchor = { balancePaise: 1000000, asOfDate: at(31) };
    const balance = computeBalancePaise(anchor, [
      { amountPaise: 250000, direction: "credit", txnDate: at(10) },
      { amountPaise: 300000, direction: "debit", txnDate: at(20) },
    ]);

    expect(balance).toBe(1000000);
  });
});

describe("reconcileBalance", () => {
  it("reports no drift when the cache matches", () => {
    expect(reconcileBalance({ storedPaise: 950000, computedPaise: 950000 })).toEqual({
      driftPaise: 0,
      balanced: true,
    });
  });

  it("names the drift when it does not", () => {
    expect(
      reconcileBalance({ storedPaise: 1000000, computedPaise: 950000 }),
    ).toEqual({ driftPaise: 50000, balanced: false });
  });
});
