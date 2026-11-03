import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import {
  categorizeTransaction,
  extractPartyAndTitle,
  parseDateSafely,
  parseTableRows,
  toTitleCase,
} from "@/helpers/statement-parser/table-parser";
import { generatePasswordVariants } from "@/helpers/statement-parser/workbook-reader";
import { isDuplicateTransaction } from "@/helpers/statement-parser/duplicate-check";

/**
 * Expectations ported from the legacy parser, plus a workbook round-trip:
 * rows → SheetJS bytes → the reader → the table parser. This is how SBI
 * exports arrive, so the test reads a file the same way the route does.
 */

const day = (iso: string) => new Date(`${iso}T12:00:00.000Z`);

describe("parseDateSafely (legacy date rules)", () => {
  it("reads DD/MM/YYYY strings", () => {
    expect(parseDateSafely("01/10/2025")).toEqual(day("2025-10-01"));
    expect(parseDateSafely("28-02-2025")).toEqual(day("2025-02-28"));
  });

  it("reads DD-MMM-YYYY strings", () => {
    expect(parseDateSafely("01-OCT-2025")).toEqual(day("2025-10-01"));
    expect(parseDateSafely("15-Sep-2025")).toEqual(day("2025-09-15"));
  });

  it("reads YYYY-MM-DD strings", () => {
    expect(parseDateSafely("2025-10-01")).toEqual(day("2025-10-01"));
  });

  it("reads Excel serial numbers", () => {
    // 45131 days after 1899-12-30 → 2023-07-24 (verified via the epoch maths).
    const parsed = parseDateSafely(45131);
    expect(parsed?.toISOString().slice(0, 10)).toBe("2023-07-24");
  });

  it("anchors midnight dates at midday (legacy rollover guard)", () => {
    const parsed = parseDateSafely(new Date(Date.UTC(2025, 0, 31)));
    expect(parsed?.toISOString()).toBe("2025-01-31T12:00:00.000Z");
  });

  it("rejects footer text and impossible dates (a documented fix: the legacy Date.UTC roll)", () => {
    expect(parseDateSafely("Statement Total")).toBeNull();
    expect(parseDateSafely("Page 1 of 3")).toBeNull();
    expect(parseDateSafely("Balance")).toBeNull();
    // 31 February would silently become 3 March in the legacy parser.
    expect(parseDateSafely("2025-02-31")).toBeNull();
    expect(parseDateSafely("")).toBeNull();
    expect(parseDateSafely(null)).toBeNull();
  });
});

describe("extractPartyAndTitle + categories (legacy keyword rules)", () => {
  it("names UPI payees", () => {
    const upi = extractPartyAndTitle("UPI/DR/401234567890/JOHN DOE/HDFC/NO");
    expect(upi.title).toBe("John Doe");
  });

  it("recognises bank phrases", () => {
    expect(extractPartyAndTitle("INB INTEREST CREDIT CAPITALISED").title).toBe(
      "Bank Interest Credit",
    );
    expect(extractPartyAndTitle("ATM WDL 1234 ATM NARAINA").title).toBe(
      "ATM Cash Withdrawal",
    );
  });

  it("falls back to the first chunk, truncating long ones as-is (no re-casing)", () => {
    const parsed = extractPartyAndTitle("SOME LONG MERCHANT NAME PVT LTD-EXTRA DETAILS");
    expect(parsed.title).toBe("SOME LONG MERCHANT NAME P...");
  });

  it("categorises by the legacy keyword lists", () => {
    expect(categorizeTransaction("Swiggy", "UPI/SWIGGY")).toBe("Food");
    expect(categorizeTransaction("Zerodha SIP", "")).toBe("Investments");
    expect(categorizeTransaction("Unknown vendor", "random turnover")).toBe("Bills");
  });

  it("title cases like the legacy toTitleCase", () => {
    expect(toTitleCase("swiggy bangalore")).toBe("Swiggy Bangalore");
  });
});

describe("isDuplicateTransaction (legacy heuristics, paise-exact)", () => {
  const base = {
    date: day("2025-10-01"),
    amountPaise: 25000,
    isExpense: true,
    description: "UPI/DR/401234567890/PAY/HDFC/NO",
    balanceAfterPaise: 100_000,
  };

  it("matches on a genuine reference even across different descriptions", () => {
    expect(
      isDuplicateTransaction(base, {
        ...base,
        description: "UPI payment to someone 401234567890",
      }),
    ).toBe(true);
  });

  it("never matches when both references exist and differ", () => {
    expect(
      isDuplicateTransaction(base, { ...base, description: "UPI/DR/401234567891/PAY" }),
    ).toBe(false);
  });

  it("different dates are never duplicates", () => {
    expect(
      isDuplicateTransaction(base, {
        ...base,
        description: "ATM WDL", // no reference, falls through to date rule
        date: day("2025-10-02"),
      }),
    ).toBe(false);
  });

  it("same day + same running balance ⇒ duplicate", () => {
    expect(
      isDuplicateTransaction(
        { ...base, description: "ATM WDL" },
        { ...base, description: "ATM WDL CHQ" },
      ),
    ).toBe(true);
  });

  it("same day + different running balance ⇒ not a duplicate", () => {
    expect(
      isDuplicateTransaction(
        { ...base, description: "ATM WDL", balanceAfterPaise: 99_000 },
        { ...base, description: "ATM WDL CHQ", balanceAfterPaise: 100_000 },
      ),
    ).toBe(false);
  });

  it("same day + exact same description ⇒ duplicate", () => {
    expect(
      isDuplicateTransaction(
        { ...base, description: "POS 4012 MALL", balanceAfterPaise: null },
        { ...base, description: "POS 4012 Mall", balanceAfterPaise: null },
      ),
    ).toBe(true);
  });
});

describe("parseTableRows (legacy table rules)", () => {
  const header = ["Txn Date", "Description", "Ref No./Cheque No.", "Debit", "Credit", "Balance"];

  it("finds the header, reads rows with debit/credit, tracks the closing balance", () => {
    const rows = [
      ["Statement of account", "", "", "", "", ""],
      header,
      ["01/10/2025", "UPI/DR/401234567890/JOHN DOE/HDFC/NO", "", "300.00", "", "12,500.00"],
      ["02/10/2025", "IMPS-CR-990012345678-VENDOR X", "", "", "1,000.00", "13,500.00"],
      ["Total", "", "", "300.00", "1,000.00", "13,500.00"],
      ["Closing Balance :", "", "", "", "", "13,500.00"],
      ["Computer Generated Statement", "", "", "", "", ""],
    ];

    const result = parseTableRows(rows);

    expect(result.transactions).toHaveLength(2);

    const [spend, income] = result.transactions;
    expect(spend.amountPaise).toBe(30_000);
    expect(spend.isExpense).toBe(true);
    // Legacy default: anything with no keyword lands in Bills.
    expect(spend.category).toBe("Bills");
    expect(spend.title).toBe("John Doe");
    expect(spend.balanceAfterPaise).toBe(1_250_000);

    expect(income.isExpense).toBe(false);
    expect(income.amountPaise).toBe(100_000);
    expect(income.balanceAfterPaise).toBe(1_350_000);

    expect(result.closingBalancePaise).toBe(1_350_000);
  });

  it("reads a single-amount column using the type column", () => {
    const rows = [
      ["Txn Date", "Description", "Amount", "Dr / Cr", "Balance"],
      ["03/10/2025", "UPI/DR/401234567890/SHOP", "150.00", "DR", "9,850.00"],
      ["04/10/2025", "UPI-CR-401234567890-REFUND", "40.00", "CREDIT", "9,890.00"],
    ];

    const result = parseTableRows(rows);

    expect(result.transactions).toHaveLength(2);
    expect(result.transactions[0].isExpense).toBe(true);
    expect(result.transactions[0].amountPaise).toBe(15_000);
    expect(result.transactions[1].isExpense).toBe(false);
    expect(result.transactions[1].amountPaise).toBe(4_000);
  });

  it("drops rows without a real date or an amount", () => {
    const rows = [
      header,
      ["", "no date row", "", "100.00", "", ""],
      ["TOTAL", "no amount row", "", "", "", ""],
      ["02/10/2025", "IMPS-CR-990012345678-VENDOR X", "", "", "500.00", "14,000.00"],
    ];

    const result = parseTableRows(rows);
    expect(result.transactions).toHaveLength(1);
    expect(result.transactions[0].amountPaise).toBe(50_000);
  });
});

describe("workbook reader round-trip (Excel in, rows out)", () => {
  it("parses a real .xlsx built the way SheetJS exports", async () => {
    const { readStatementWorkbook } = await import(
      "@/helpers/statement-parser/workbook-reader"
    );

    const sheetRows = [
      ["State Bank of India — Statement"],
      ["Txn Date", "Description", "Debit", "Credit", "Balance"],
      ["01/10/2025", "UPI/DR/401234567890/JOHN DOE", "300.00", "", "12,500.00"],
      ["02/10/2025", "Salary oct", "", "45,000.00", "57,500.00"],
      ["Closing Balance", "", "", "", "57,500.00"],
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(sheetRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    const bytes = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });

    const read = await readStatementWorkbook(Buffer.from(bytes));
    const parsed = parseTableRows(read.rows);

    expect(read.sheetName).toBe("Sheet1");
    expect(parsed.transactions).toHaveLength(2);
    // Salary goes through the special-case title (legacy behaviour); the
    // keyword lists never produced a Salary category themselves.
    expect(parsed.transactions[1].title).toBe("Monthly Salary Credit");
    expect(parsed.closingBalancePaise).toBe(5_750_000);
  });
});

describe("generatePasswordVariants (legacy password rules)", () => {
  it("expands an 8-digit DOB password", () => {
    const variants = generatePasswordVariants("05041995");
    expect(variants).toContain("050495"); // DDMMYY
    expect(variants).toContain("05041995");
  });

  it("strips punctuation from a dashed DOB password", () => {
    const variants = generatePasswordVariants("05-04-1995");
    expect(variants).toContain("05041995");
  });

  it("a 10-digit mobile also tries its last digits", () => {
    const variants = generatePasswordVariants("9876543210");
    expect(variants).toContain("3210");
    expect(variants).toContain("43210");
  });

  it("no password means no variants", () => {
    expect(generatePasswordVariants("")).toEqual([]);
  });
});
