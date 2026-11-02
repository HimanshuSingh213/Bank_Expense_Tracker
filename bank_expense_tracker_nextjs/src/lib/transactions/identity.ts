import { createHash } from "node:crypto";
import { toISODate } from "@/lib/dates";
import type { Direction } from "@/types/transaction";

/**
 * Transaction identity.
 *
 * A bank statement does not give every row a unique identifier, so we use two
 * keys with different jobs:
 *
 *  - `dedupeKey` — a hard uniqueness constraint. Set only when a strong
 *    reference number exists.
 *  - `fingerprint` — informational. Helps explain a "possible duplicate" in the
 *    preview; never enforced by the database.
 *
 * Identity is scoped to the account, so the same UPI reference appearing in two
 * accounts (a transfer between your own accounts) stays valid in both.
 */

/** Uppercase, single-spaced. Used for hashing and comparison only. */
export function normalizeNarration(narration: string): string {
  return narration.replace(/\s+/g, " ").trim().toUpperCase();
}

/** Uppercase alphanumerics, so " 4123-4567 " and "41234567" are one value. */
export function normalizeReference(value: string | null | undefined): string | null {
  if (!value) return null;

  const cleaned = value.toUpperCase().replace(/[^A-Z0-9]/g, "");
  return cleaned.length >= 4 ? cleaned : null;
}

/**
 * Reference patterns, in priority order (plan §10.1).
 * The SBI `Ref No./Cheque No.` column always wins when the profile maps it.
 */
const PATTERNS: Array<{ pattern: RegExp; prefix?: string }> = [
  // UPI/DR/412345678901, IMPS/P2A/123456789012
  { pattern: /\b(?:UPI|IMPS)[\/:\s]+(?:(?:DR|CR|P2A|P2P|NET)[\/:\s]+)?(\d{10,16})\b/ },
  // NEFT/RTGS followed by a 12–22 character reference
  { pattern: /\b(?:NEFT|RTGS)[\/:\s]+([A-Z0-9]{12,22})\b/ },
  // RRN/UTR references
  { pattern: /\b(?:RRN|UTR)[\/:\s]+([A-Z0-9]{10,20})\b/ },
  // Cheque numbers
  { pattern: /\b(?:CHQ|CHEQUE)[\/:\s]+(\d{6})\b/, prefix: "CHQ" },
  // Bare concatenated form, e.g. UPI423871928374 (legacy third alternative)
  { pattern: /\bUPI(\d{10,16})\b/ },
];

export function extractReference(
  narration: string,
  columnReference?: string | null,
): string | null {
  const fromColumn = normalizeReference(columnReference);
  if (fromColumn) return fromColumn;

  const text = narration.toUpperCase();

  for (const { pattern, prefix } of PATTERNS) {
    const match = pattern.exec(text);
    if (!match) continue;

    const digits = match[1].replace(/[^A-Z0-9]/g, "");
    return prefix ? `${prefix}${digits}` : digits;
  }

  return null;
}

function sha256(input: string): string {
  return createHash("sha256").update(input).digest("hex");
}

/**
 * The one hard uniqueness key. Returns null when the row has no strong
 * reference or no date — in that case the database cannot arbitrate, so the
 * preview must ask the user (plan §10.3).
 */
export function makeDedupeKey(input: {
  accountId: string;
  referenceNumber: string | null;
  txnDate: Date | null;
  amountPaise: number;
  direction: Direction;
}): string | null {
  const reference = normalizeReference(input.referenceNumber);
  if (!reference || !input.txnDate) return null;

  return sha256(
    [
      input.accountId,
      reference,
      toISODate(input.txnDate),
      input.amountPaise,
      input.direction,
    ].join("|"),
  );
}

/** Informational only. Two rows can share a fingerprint and both be real. */
export function makeFingerprint(input: {
  accountId: string;
  txnDate: Date | null;
  amountPaise: number;
  direction: Direction;
  narration: string;
}): string {
  return sha256(
    [
      input.accountId,
      input.txnDate ? toISODate(input.txnDate) : "",
      input.amountPaise,
      input.direction,
      normalizeNarration(input.narration),
    ].join("|"),
  );
}
