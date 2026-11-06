import { toPaise } from "@/lib/money";
/**
 * The statement table parser, ported from the legacy application:
 *   My Bank Expense Tracker/frontend/src/utils/statementParser.js
 *
 * Every rule below is the legacy rule — same header sniffing, same footer
 * skip-list, same date tolerance, same party/title extraction, same keyword
 * categories. Only money carries differently: everywhere the legacy parsed a
 * rupee float, this port keeps integer paise. Comparisons > 0 are unchanged.
 */

export type ParsedTransaction = {
  rowNumber: number;
  raw: string[];
  /** UTC midnight of the statement calendar date. */
  date: Date;
  description: string;
  title: string;
  recipient: string;
  category: string;
  /** False when the category came from the keyword-rule fallback. */
  categoryConfident: boolean;
  isExpense: boolean;
  amountPaise: number;
  balanceAfterPaise: number | null;
  isOnline: boolean;
};

export type TableParseResult = {
  transactions: ParsedTransaction[];
  /** Last running balance seen, whether from a footer or the last data row. */
  closingBalancePaise: number | null;
  /** Header-independent markers found, shown to the user in the preview. */
  detectedFormat: string;
};

const TYPE_MONTHS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

const CATEGORY_RULES: Array<{ category: string; keywords: string[] }> = [
  {
    category: "Food",
    keywords: [
      "swiggy", "zomato", "blinkit", "zepto", "instamart", "domino", "pizza",
      "mcdonald", "burger", "kfc", "starbucks", "chai", "coffee", "cafe",
      "restaurant", "bakery", "dhaba", "barbeque", "haldiram", "bikanervala",
      "subway", "faasos", "eatfit", "behrouz", "sweet", "food", "kitchen",
      "dining", "canteen", "hotel food", "caterer", "baker",
    ],
  },
  {
    category: "Travel",
    keywords: [
      "uber", "ola", "rapido", "dmrc", "delhi metro", "metro", "irctc",
      "railway", "makemytrip", "goibibo", "yatra", "indigo", "air india",
      "spicejet", "akasa", "vistara", "fuel", "petrol", "diesel", "hpcl",
      "bpcl", "iocl", "indian oil", "bharat petroleum", "hindustan petroleum",
      "shell", "fastag", "toll", "parking", "auto fare", "cab fare",
      "bus ticket", "redbus", "abhibus",
    ],
  },
  {
    category: "Shopping",
    keywords: [
      "amazon", "flipkart", "myntra", "ajio", "meesho", "nykaa", "zara", "h&m",
      "decathlon", "tata cliq", "croma", "reliance digital", "vijay sales",
      "apple store", "d-mart", "dmart", "smart bazaar", "spencer",
      "supermarket", "retail", "clothing", "apparel", "fashion", "footwear",
      "opticals", "lenskart", "electronics", "shopping", "mall", "bazaar",
      "pvr", "inox", "cinepolis", "bookmyshow", "cinema", "theatre", "movie",
    ],
  },
  {
    category: "Bills",
    keywords: [
      "airtel", "jio", "vodafone", "vi prepaid", "bsnl", "recharge", "bescom",
      "tata power", "torrent", "adani electricity", "mseb", "uppcl",
      "electricity", "water bill", "piped gas", "igl", "mgl", "indane",
      "hp gas", "bharat gas", "broadband", "act fibernet", "hathaway",
      "netflix", "spotify", "prime video", "hotstar", "youtube premium",
      "apple.com/bill", "google play", "gym", "cult.fit", "fitness",
      "maintenance", "society", "rent", "insurance", "lic", "hdfc ergo",
      "star health", "credit card payment", "billdesk", "cred", "loan emi",
    ],
  },
  {
    category: "Investments",
    keywords: [
      "zerodha", "groww", "upstox", "angel one", "kuvera", "coin",
      "mutual fund", "sip", "uti mf", "sbi mf", "hdfc mf", "icici prudential",
      "dividend", "interest credit", "fd interest",
    ],
  },
  {
    category: "Salary",
    keywords: [
      "salary", "sal credit", "payroll", "monthly salary", "stipend",
    ],
  },
  {
    category: "Cash",
    keywords: [
      "atm wdl", "atm cash", "cash wdl", "cash dep", "nfs atm", "sbi atm",
      "cdm wdl", "cash withdrawal",
    ],
  },
  {
    category: "Fees & Charges",
    keywords: [
      "sms chg", "sms charges", "annual fee", "debit card fee", "gst",
      "penalty", "bank charges", "min bal chg",
    ],
  },
  {
    category: "Interest",
    keywords: [
      "int.pd", "interest credit", "credit interest", "savings bank int",
      "sb interest", "fd interest credit",
    ],
  },
];

export function categorizeTransaction(
  partyName = "",
  description = "",
): string {
  return categorizeWithConfidence(partyName, description).category;
}

/**
 * The same legacy rules, plus an honesty flag: `confident: false` means the
 * row landed on the "Bills" fallback because no keyword matched. Those are
 * exactly the rows the AI tier may suggest a better category for.
 */
export function categorizeWithConfidence(
  partyName = "",
  description = "",
): { category: string; confident: boolean } {
  const combined = `${partyName} ${description}`.toLowerCase();

  for (const rule of CATEGORY_RULES) {
    if (rule.keywords.some((keyword) => combined.includes(keyword))) {
      return { category: rule.category, confident: true };
    }
  }

  return { category: "Bills", confident: false };
}

export function toTitleCase(text = ""): string {
  if (!text) return "";

  return text
    .toLowerCase()
    .split(" ")
    .map((word) => (word ? word[0].toUpperCase() + word.slice(1) : ""))
    .join(" ");
}

/**
 * Who is this payment to, and what should the row display? The legacy logic:
 * special bank phrases first, then UPI names, then card machines, then known
 * merchant names, then the first chunk of the narration.
 */
export function extractPartyAndTitle(description = ""): {
  title: string;
  recipient: string;
} {
  if (!description) {
    return { title: "Bank Transaction", recipient: "" };
  }

  const clean = description.replace(/\u00A0/g, " ").replace(/\s+/g, " ").trim();
  const upper = clean.toUpperCase();

  if (upper.includes("INTEREST CREDIT") || upper.includes("INT.PD")) {
    return { title: "Bank Interest Credit", recipient: "Bank" };
  }
  if (upper.includes("CHQ WDL") || upper.includes("CHEQUE")) {
    return { title: "Cheque Withdrawal", recipient: "Cheque" };
  }
  if (upper.includes("ATM WDL") || upper.includes("CASH WDL")) {
    return { title: "ATM Cash Withdrawal", recipient: "Self / ATM" };
  }
  if (upper.includes("SALARY") || upper.includes("ACH/SAL")) {
    return { title: "Monthly Salary Credit", recipient: "Employer" };
  }

  if (upper.includes("UPI/") || upper.includes("UPI-")) {
    const delimiter = upper.includes("UPI/") ? "/" : "-";
    const parts = clean.split(delimiter);

    if (parts.length >= 3) {
      // Legacy heuristic: UPI/DR/NAME/… picks part 3, UPI/NAME picks part 1.
      let rawName = parts[parts.length >= 4 ? 3 : 1].trim();
      rawName = rawName.replace(/[@#].*$/, "").replace(/[0-9]{5,}/g, "").trim();

      if (rawName.length >= 2) {
        const formatted = toTitleCase(rawName);
        return { title: formatted, recipient: formatted };
      }
    }
  }

  if (upper.startsWith("POS ") || upper.startsWith("ECOM ")) {
    const words = clean.split(" ").slice(2);
    if (words.length > 0) {
      const name = toTitleCase(words.slice(0, 3).join(" "));
      return { title: name, recipient: name };
    }
  }

  for (const rule of CATEGORY_RULES) {
    for (const keyword of rule.keywords) {
      if (upper.includes(keyword.toUpperCase())) {
        const name = toTitleCase(keyword);
        return { title: name, recipient: name };
      }
    }
  }

  const firstChunk = clean.split(/[-–—/,\n]/)[0].trim();
  const fallbackTitle =
    firstChunk.length > 25 ? `${firstChunk.substring(0, 25)}...` : firstChunk;

  return { title: fallbackTitle || "Bank Transaction", recipient: "" };
}

/**
 * Statement dates in any shape the banks export: a SheetJS Date, an Excel
 * serial number, or a string like 01/10/2025, 01-10-2025, 01-Oct-2025 or
 * 2025-10-01. Everything lands at UTC 12:00 — the legacy "midday anchor"
 * that can never roll a calendar date across timezones.
 */
export function parseDateSafely(dateVal: unknown): Date | null {
  if (!dateVal) return null;

  if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
    const y = dateVal.getUTCFullYear();
    const m = dateVal.getUTCMonth();
    const d = dateVal.getUTCDate();
    const h = dateVal.getUTCHours();
    const min = dateVal.getUTCMinutes();
    const s = dateVal.getUTCSeconds();

    // A midnight date is anchored to midday, NOT to utcMidnight; statement
    // rows are saved at UTC midnight later. This mirrors the legacy code and
    // keeps would-be "before midnight" values unambiguous.
    if (h === 0 && min === 0 && s === 0) {
      return new Date(Date.UTC(y, m, d, 12, 0, 0));
    }
    return dateVal;
  }

  // Excel serial dates, e.g. 45123.
  if (typeof dateVal === "number" && dateVal > 20000 && dateVal < 80000) {
    const wholeDays = Math.floor(dateVal);
    const fraction = dateVal - wholeDays;
    const epochDays = wholeDays - 25569;
    const ms = epochDays * 86_400_000 + Math.round(fraction * 86_400_000);
    const date = new Date(ms);

    if (fraction === 0) {
      return new Date(
        Date.UTC(
          date.getUTCFullYear(),
          date.getUTCMonth(),
          date.getUTCDate(),
          12,
          0,
          0,
        ),
      );
    }
    return date;
  }

  const dateStr = String(dateVal).replace(/\u00A0/g, " ").trim();
  if (!dateStr || dateStr.length < 4) return null;

  const lower = dateStr.toLowerCase();
  if (
    lower.includes("total") ||
    lower.includes("grand") ||
    lower.includes("sum") ||
    lower.includes("page") ||
    lower.includes("balance") ||
    lower.includes("statement") ||
    lower.includes("period") ||
    lower.includes("generated") ||
    lower.includes("note") ||
    lower.includes("disclaimer") ||
    lower.includes("count")
  ) {
    return null;
  }

  const parts = dateStr.split(/[-/.\s]+/);
  if (parts.length < 3) return null;

  const [first, second, third] = parts;
  let yearText = third ?? "";
  let monthIndex = Number.parseInt(second ?? "", 10) - 1;
  let day = Number.parseInt(first ?? "", 10);

  if (yearText && yearText.length === 2) yearText = `20${yearText}`;

  // Not a number? Maybe a month name — "01-Oct-2025".
  if (Number.isNaN(monthIndex) && second) {
    monthIndex = TYPE_MONTHS[second.toLowerCase().slice(0, 3)] ?? -1;
  }

  let year = Number.parseInt(yearText, 10);
  // If format is YYYY-MM-DD, the first part is the year.
  if (first && first.length === 4) {
    year = Number.parseInt(first, 10);
    day = Number.parseInt(third ?? "", 10) || 1;
  }

  const dayValid = !Number.isNaN(day) && day >= 1;
  const monthValid = !Number.isNaN(monthIndex) && monthIndex >= 0 && monthIndex <= 11;
  const yearValid = !Number.isNaN(year) && year >= 1990 && year <= 2099;

  // The legacy code trusted day <= 31 and let `Date.UTC` silently roll
  // impossible dates (31/02 → 03/03). Hand-corrected sheets do contain such
  // rows, so the calendar is checked for real here.
  if (dayValid && monthValid && yearValid) {
    const candidate = new Date(Date.UTC(year, monthIndex, day, 12, 0, 0));
    if (candidate.getUTCDate() !== day) return null;
    return candidate;
  }

  const nativeParsed = new Date(dateVal as string);
  if (
    !Number.isNaN(nativeParsed.getTime()) &&
    nativeParsed.getUTCFullYear() >= 1990 &&
    nativeParsed.getUTCFullYear() <= 2099
  ) {
    return new Date(
      Date.UTC(
        nativeParsed.getUTCFullYear(),
        nativeParsed.getUTCMonth(),
        nativeParsed.getUTCDate(),
        12,
        0,
        0,
      ),
    );
  }

  return null;
}

/** Cells → plain text, minus everything the sheet decorations add. */
function cellText(value: unknown): string {
  if (value === undefined || value === null) return "";
  return String(value).replace(/\u00A0/g, " ").trim();
}

/** "1,234.56" or "1,234.56 Cr" → integer paise. 0 when the cell is empty. */
function moneyToPaise(value: unknown): number {
  const text = cellText(value);
  if (!text) return 0;
  const paise = toPaise(text);
  return paise === null ? 0 : Math.abs(paise);
}

/** Legacy helper: does the raw number pair up behind a comma? */
function numericText(value: unknown): number {
  const text = cellText(value).replace(/,/g, "");
  const parsed = Number.parseFloat(text);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * From a footer/summary row: "Closing balance 12,345.67" etc. Port of the
 * legacy extractClosingBalanceFromSummaryRow.
 */
function closingBalanceFromSummaryRow(
  row: unknown[],
  rowJoined: string,
  balanceCol: number,
): number | null {
  if (!Array.isArray(row)) return null;

  // 1. Regex search across all cells in the row for a labelled balance.
  for (const cell of row) {
    const cellStr = cellText(cell);
    if (!cellStr) continue;

    const match = cellStr.match(
      /(?:closing\s*balance|available\s*balance|balance\s*as\s*on|total\s*balance|ending\s*balance|net\s*balance|balance)[\s:]*(?:rs\.?|inr)?\s*([0-9,]+(?:\.[0-9]{1,2})?)/i,
    );
    if (match?.[1]) {
      const num = Number.parseFloat(match[1].replace(/,/g, ""));
      if (!Number.isNaN(num) && num >= 0) return Math.round(num * 100);
    }
  }

  // 2. Summary wording present? Try the balance column, then the last cells.
  const mentions =
    rowJoined.includes("closing") ||
    rowJoined.includes("available") ||
    rowJoined.includes("balance") ||
    rowJoined.includes("summary") ||
    rowJoined.includes("total");

  if (!mentions) return null;

  if (balanceCol !== -1) {
    const raw = cellText(row[balanceCol])
      .replace(/,/g, "")
      .replace(/cr|dr/gi, "");
    const parsed = Number.parseFloat(raw);
    if (!Number.isNaN(parsed) && parsed >= 0) return Math.round(parsed * 100);
  }

  for (let i = row.length - 1; i >= 0; i--) {
    const cellStr = cellText(row[i])
      .replace(/,/g, "")
      .replace(/^(?:rs\.?|inr)\s*/i, "")
      .replace(/\s*(?:cr|dr)$/i, "")
      .trim();

    const num = Number.parseFloat(cellStr);
    if (!Number.isNaN(num) && num > 0 && /^[0-9]+(?:\.[0-9]+)?$/.test(cellStr)) {
      return Math.round(num * 100);
    }
  }

  return null;
}

/**
 * The core port: find the header row, map the columns, then read every data
 * row, skipping every footer the banks love to append.
 */
export function parseTableRows(rows: unknown[][]): TableParseResult {
  if (!Array.isArray(rows) || rows.length === 0) {
    return {
      transactions: [],
      closingBalancePaise: null,
      detectedFormat: "EMPTY",
    };
  }

  let headerIndex = -1;
  let dateCol = 0;
  let descCol = 1;
  let debitCol = -1;
  let creditCol = -1;
  let balanceCol = -1;
  let singleAmountCol = -1;
  let typeCol = -1;

  // Search up to 100 rows for the header row.
  for (let i = 0; i < Math.min(rows.length, 100); i++) {
    const row = rows[i];
    if (!Array.isArray(row)) continue;

    const rowStr = row.map((cell) => cellText(cell).toLowerCase()).join(" ");
    const hasDateHeader =
      rowStr.includes("date") ||
      rowStr.includes("tran date") ||
      rowStr.includes("txn date") ||
      rowStr.includes("posting date") ||
      rowStr.includes("value date");
    const hasDescHeader =
      rowStr.includes("narration") ||
      rowStr.includes("description") ||
      rowStr.includes("particular") ||
      rowStr.includes("details") ||
      rowStr.includes("remarks") ||
      rowStr.includes("merchant");

    if (
      hasDateHeader &&
      (hasDescHeader ||
        rowStr.includes("debit") ||
        rowStr.includes("credit") ||
        rowStr.includes("withdrawal") ||
        rowStr.includes("amount"))
    ) {
      headerIndex = i;

      row.forEach((cell, idx) => {
        const c = cellText(cell).toLowerCase();
        if (
          (c.includes("date") || c.includes("txn") || c.includes("tran") || c.includes("posting")) &&
          !c.includes("value") &&
          dateCol === 0
        ) {
          dateCol = idx;
        }
        if (c.includes("value date") && dateCol === 0) dateCol = idx;
        if (
          c.includes("narration") ||
          c.includes("description") ||
          c.includes("particular") ||
          c.includes("details") ||
          c.includes("remarks") ||
          c.includes("merchant")
        ) {
          descCol = idx;
        }
        if (
          c.includes("debit") ||
          c.includes("withdrawal") ||
          c === "dr" ||
          c.includes("dr.") ||
          c.includes("dr amt") ||
          c.includes("withdrawal amt")
        ) {
          debitCol = idx;
        }
        if (
          c.includes("credit") ||
          c.includes("deposit") ||
          c === "cr" ||
          c.includes("cr.") ||
          c.includes("cr amt") ||
          c.includes("deposit amt")
        ) {
          creditCol = idx;
        }
        if (
          c.includes("balance") ||
          c.includes("closing") ||
          c === "bal" ||
          c.includes("bal.") ||
          c.includes("available bal")
        ) {
          balanceCol = idx;
        }
        if (
          c === "amount" ||
          c === "txn amount" ||
          c === "transaction amount" ||
          c === "net amount"
        ) {
          singleAmountCol = idx;
        }
        if (
          c.includes("type") ||
          c.includes("dr / cr") ||
          c.includes("dr/cr") ||
          c.includes("cr/dr")
        ) {
          typeCol = idx;
        }
      });
      break;
    }
  }

  // Legacy fallback when the specific headers were not found.
  if (debitCol === -1 && creditCol === -1 && singleAmountCol === -1) {
    debitCol = 3;
    creditCol = 4;
    balanceCol = 5;
  }

  const startIndex = headerIndex !== -1 ? headerIndex + 1 : 0;
  const transactions: ParsedTransaction[] = [];
  let closingBalancePaise: number | null = null;

  for (let i = startIndex; i < rows.length; i++) {
    const row = rows[i];
    if (!Array.isArray(row) || row.length < 2) continue;

    const rowJoined = row.map((cell) => cellText(cell).toLowerCase()).join(" ");

    // 1. Skip ALL footer, summary and total rows, but learn the closing
    //    balance from them when one is present.
    if (
      rowJoined.includes("total") ||
      rowJoined.includes("grand total") ||
      rowJoined.includes("opening balance") ||
      rowJoined.includes("closing balance") ||
      rowJoined.includes("available balance") ||
      rowJoined.includes("total transactions") ||
      rowJoined.includes("total withdrawal") ||
      rowJoined.includes("total deposit") ||
      rowJoined.includes("total debit") ||
      rowJoined.includes("total credit") ||
      rowJoined.includes("statement summary") ||
      rowJoined.includes("account summary") ||
      rowJoined.includes("brought forward") ||
      rowJoined.includes("carried forward") ||
      rowJoined.includes("computer generated") ||
      rowJoined.includes("generated on") ||
      rowJoined.includes("generated at") ||
      rowJoined.includes("page ") ||
      rowJoined.includes("page no") ||
      rowJoined.includes("statement period") ||
      rowJoined.includes("end of statement") ||
      rowJoined.includes("end of report") ||
      rowJoined.includes("disclaimer") ||
      rowJoined.includes("important notice") ||
      rowJoined.includes("count of") ||
      rowJoined.includes("b/f") ||
      rowJoined.includes("c/f")
    ) {
      const summaryBal = closingBalanceFromSummaryRow(row, rowJoined, balanceCol);
      if (summaryBal !== null) closingBalancePaise = summaryBal;
      continue;
    }

    const dateVal = row[dateCol];
    const descVal = cellText(row[descCol]);

    // 2. Statement rows must carry a real date.
    const dateObj = parseDateSafely(dateVal);
    if (!dateObj) continue;

    // 3. Skip empty narrations and stray header repeats.
    const descLower = descVal.toLowerCase();
    if (
      !descVal ||
      descLower === "narration" ||
      descLower === "particulars" ||
      descLower === "description" ||
      descLower === "details" ||
      descLower === "remarks" ||
      descLower.startsWith("total")
    ) {
      continue;
    }

    let debit = 0;
    let credit = 0;

    if (debitCol !== -1 || creditCol !== -1) {
      debit = debitCol !== -1 ? moneyToPaise(row[debitCol]) : 0;
      credit = creditCol !== -1 ? moneyToPaise(row[creditCol]) : 0;
    }

    // Single amount column: the type column decides the direction.
    if (debit === 0 && credit === 0 && singleAmountCol !== -1) {
      const amount = moneyToPaise(row[singleAmountCol]);
      const typeVal = typeCol !== -1 ? cellText(row[typeCol]).toLowerCase() : "";

      if (
        typeVal.includes("cr") ||
        typeVal.includes("credit") ||
        typeVal.includes("received") ||
        typeVal.includes("refund")
      ) {
        credit = amount;
      } else {
        debit = amount;
      }
    }

    if (debit === 0 && credit === 0) continue;

    const isExpense = debit > 0;
    const amountPaise = isExpense ? debit : credit;
    if (Number.isNaN(amountPaise) || amountPaise <= 0) continue;

    const { title, recipient } = extractPartyAndTitle(descVal);
    const { category, confident } = categorizeWithConfidence(title, descVal);

    const runningBal =
      balanceCol !== -1 && cellText(row[balanceCol])
        ? Math.round(numericText(row[balanceCol]) * 100)
        : null;

    if (runningBal !== null && !Number.isNaN(runningBal)) {
      closingBalancePaise = runningBal;
    }

    transactions.push({
      rowNumber: i + 1,
      raw: row.map((cell) => cellText(cell)),
      date: dateObj,
      description: descVal,
      title,
      recipient,
      category,
      categoryConfident: confident,
      isExpense,
      amountPaise,
      balanceAfterPaise: runningBal,
      isOnline: descVal.toUpperCase().includes("UPI"),
    });
  }

  return {
    transactions,
    closingBalancePaise,
    detectedFormat: headerIndex !== -1 ? "TABLE+HEADER" : "TABLE",
  };
}
