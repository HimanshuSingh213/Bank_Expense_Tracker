import { describe, expect, it } from "vitest";
import {
  extractReference,
  makeDedupeKey,
  makeFingerprint,
  normalizeReference,
} from "@/lib/transactions/identity";

const date = new Date(Date.UTC(2026, 9, 31));

describe("normalizeReference", () => {
  it("uppercases and strips separators", () => {
    expect(normalizeReference(" 4123-4567 ")).toBe("41234567");
    expect(normalizeReference("abc/123")).toBe("ABC123");
  });

  it("rejects junk and very short values", () => {
    expect(normalizeReference("")).toBeNull();
    expect(normalizeReference(null)).toBeNull();
    expect(normalizeReference("12")).toBeNull();
  });
});

describe("extractReference", () => {
  it("prefers the statement's own reference column", () => {
    expect(
      extractReference("UPI/DR/412345678901/AMAZON PAY", "999888777666"),
    ).toBe("999888777666");
  });

  it("reads a UPI reference from the narration", () => {
    expect(extractReference("UPI/DR/412345678901/AMAZON PAY INDIA/YESB")).toBe(
      "412345678901",
    );
    expect(extractReference("IMPS/P2A/123456789012/SOMEONE")).toBe("123456789012");
  });

  it("reads NEFT, RTGS, RRN and UTR references", () => {
    expect(extractReference("NEFT/N123456789012345/ACME PVT LTD")).toBe(
      "N123456789012345",
    );
    expect(extractReference("RTGS/R123456789012/ACME")).toBe("R123456789012");
    expect(extractReference("RRN/123456789012")).toBe("123456789012");
    expect(extractReference("UTR/ABCD1234567890")).toBe("ABCD1234567890");
  });

  it("prefixes cheque numbers so they cannot collide with other numbers", () => {
    expect(extractReference("CHQ/123456/AXIS BANK")).toBe("CHQ123456");
  });

  it("returns null when nothing identifies the row", () => {
    expect(extractReference("ATM WDL/1234/HDFC BANK")).toBeNull();
    expect(extractReference("SALARY CREDIT — OCTOBER 2026")).toBeNull();
  });
});

describe("makeDedupeKey", () => {
  const base = {
    accountId: "acc-1",
    referenceNumber: "412345678901",
    txnDate: date,
    amountPaise: 248900,
    direction: "debit" as const,
  };

  it("is stable for the same identity", () => {
    expect(makeDedupeKey(base)).toBe(makeDedupeKey({ ...base }));
  });

  it("changes when the amount changes", () => {
    expect(makeDedupeKey(base)).not.toBe(
      makeDedupeKey({ ...base, amountPaise: 248901 }),
    );
  });

  it("is scoped to the account", () => {
    expect(makeDedupeKey(base)).not.toBe(
      makeDedupeKey({ ...base, accountId: "acc-2" }),
    );
  });

  it("is null without a strong reference or a date", () => {
    expect(makeDedupeKey({ ...base, referenceNumber: null })).toBeNull();
    expect(makeDedupeKey({ ...base, txnDate: null })).toBeNull();
  });
});

describe("makeFingerprint", () => {
  const base = {
    accountId: "acc-1",
    txnDate: date,
    amountPaise: 248900,
    direction: "debit" as const,
    narration: "UPI/DR/412345678901/AMAZON PAY",
  };

  it("ignores spacing and case in the narration", () => {
    expect(makeFingerprint(base)).toBe(
      makeFingerprint({ ...base, narration: "upi/dr/412345678901/amazon   pay" }),
    );
  });

  it("separates rows with different narrations", () => {
    expect(makeFingerprint(base)).not.toBe(
      makeFingerprint({ ...base, narration: "UPI/DR/412345678901/FLIPKART" }),
    );
  });
});
