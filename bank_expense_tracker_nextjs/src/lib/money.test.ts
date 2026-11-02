import { describe, expect, it } from "vitest";
import { statementBalances, toPaise } from "@/lib/money";

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
