/**
 * Money handling. Every amount in the domain is an integer number of paise.
 * Rupees exist only at the edges: while parsing a statement, and while
 * displaying a figure.
 */

const AMOUNT = /^-?\d+(\.\d{1,4})?$/;

/**
 * Parses a statement cell into integer paise.
 *
 * Handles "1,234.56", "₹500", "1,234.56 Cr", "(250.00)", "250.00-", "-".
 * Returns `null` when the cell carries no amount at all, so callers can tell
 * "blank" apart from "zero".
 */
export function toPaise(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null;

  if (typeof input === "number") {
    if (!Number.isFinite(input)) return null;
    return Math.round(input * 100);
  }

  let text = input.trim();
  if (!text) return null;

  // An accounting parenthesis means negative.
  let negative = false;
  if (/^\(.*\)$/.test(text)) {
    negative = true;
    text = text.slice(1, -1).trim();
  }

  // A leading minus, and the trailing minus some exports use.
  if (text.startsWith("-")) {
    negative = true;
    text = text.slice(1).trim();
  } else if (text.endsWith("-")) {
    negative = true;
    text = text.slice(0, -1).trim();
  }

  text = text
    .replace(/[\u20B9₹]/g, "")
    .replace(/\b(?:cr|dr)\.?$/i, "")
    .replace(/[,\s]/g, "");

  if (!AMOUNT.test(text)) return null;

  const value = Number(text);
  if (!Number.isFinite(value)) return null;

  const paise = Math.round(Math.abs(value) * 100);
  return negative ? -paise : paise;
}

/** Rupees, for writing the legacy `amount` field. Never used for maths. */
export function fromPaise(paise: number): number {
  return paise / 100;
}

export function sumPaise(values: number[]): number {
  let total = 0;
  for (const value of values) total += value;
  return total;
}

/** A credit adds, a debit subtracts. */
export function signedPaise(
  amountPaise: number,
  direction: "debit" | "credit",
): number {
  return direction === "credit" ? Math.abs(amountPaise) : -Math.abs(amountPaise);
}

/**
 * Statement arithmetic check: opening + credits − debits should equal closing.
 * Tolerance is one paisa, not a float epsilon.
 */
export function statementBalances(input: {
  openingPaise: number | null;
  closingPaise: number | null;
  creditPaise: number;
  debitPaise: number;
}): { ok: boolean; differencePaise: number } | null {
  if (input.openingPaise === null || input.closingPaise === null) return null;

  const expected = input.openingPaise + input.creditPaise - input.debitPaise;
  const differencePaise = input.closingPaise - expected;

  return { ok: Math.abs(differencePaise) <= 1, differencePaise };
}
