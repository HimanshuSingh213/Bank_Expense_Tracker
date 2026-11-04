import { describe, expect, it } from "vitest";
import {
  statementBalances,
  toPaise,
  reconcileBalance,
  computeBalancePaise,
} from "@/lib/money";

describe("toPaise", () => {
  it("parses plain and grouped decimals", () => {
    expect(toPaise("1,234.56")).toBe(123456);
    expect(toPaise("0.01")).toBe(1);
    expect(toPaise("124850.00")).toBe(12485000);
  });

  it("handles the rupee sign, currency suffixes and spacing", () => {
    expect(toPaise("₹500")).toBe(50000);
    expect(toPaise("₹ 1,24,850.00")).toBe(12485000);
    expect(toPaise("500.00 Cr")).toBe(50000);
    expect(toPaise("500.00 DR")).toBe(50000);
  });

  it("keeps the sign for negatives, parentheses and trailing minus", () => {
    expect(toPaise("-250.00")).toBe(-25000);
    expect(toPaise("(250.00)")).toBe(-25000);
    expect(toPaise("250.00-")).toBe(-25000);
  });

  it("returns null for blank cells and placeholders", () => {
    expect(toPaise("")).toBeNull();
    expect(toPaise("-")).toBeNull();
    expect(toPaise(null)).toBeNull();
    expect(toPaise("not an amount")).toBeNull();
  });

  it("never uses float arithmetic to build paise", () => {
    expect(toPaise(0.1 + 0.2)).toBe(30);
    expect(toPaise("19.99")).toBe(1999);
  });
});

describe("statementBalances", () => {
  it("accepts a statement whose arithmetic closes", () => {
    expect(
      statementBalances({
        openingPaise: 100000,
        closingPaise: 150000,
        creditPaise: 75000,
        debitPaise: 25000,
      }),
    ).toEqual({ ok: true, differencePaise: 0 });
  });

  it("names the difference when it does not close", () => {
    const result = statementBalances({
      openingPaise: 100000,
      closingPaise: 150000,
      creditPaise: 50000,
      debitPaise: 25000,
    });

    expect(result?.ok).toBe(false);
    expect(result?.differencePaise).toBe(25000);
  });

  it("returns null when either balance is missing", () => {
    expect(
      statementBalances({
        openingPaise: null,
        closingPaise: 150000,
        creditPaise: 0,
        debitPaise: 0,
      }),
    ).toBeNull();
  });
});


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
