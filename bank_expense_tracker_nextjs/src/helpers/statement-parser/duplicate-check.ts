import { extractReference } from "@/lib/transactions/identity";

/**
 * Duplicate detection, ported one RULE for one RULE from the legacy code:
 *   My Bank Expense Tracker/backend/statementCore.js → isDuplicateTransaction
 *
 * The legacy function ran on rupee floats with a 0.01 tolerance. Here every
 * amount is integer paise, so "within one paisa" becomes exact equality —
 * same meaning, no float edge.
 *
 * The rules, in the legacy order:
 *   1. Amount must match, direction must match.
 *   2. Both rows carry a genuine reference (UPI/RRN/UTR/Cheque):
 *      • same reference       → duplicate,
 *      • different reference  → NOT a duplicate, even on the same day.
 *   3. Different dates            → NEVER a duplicate.
 *   4. Same date, both rows carry a running balance:
 *      • same balance          → duplicate (the same ledger line re-read),
 *      • different balance     → NOT a duplicate.
 *   5. Same date and the exact same raw description → duplicate.
 */

export type DuplicateCandidate = {
  date: Date | string | null;
  amountPaise: number;
  isExpense: boolean;
  description: string;
  balanceAfterPaise: number | null;
};

function dateKey(date: Date | string | null): string {
  if (!date) return "";
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return String(date).slice(0, 10);

  const year = value.getUTCFullYear();
  const month = String(value.getUTCMonth() + 1).padStart(2, "0");
  const day = String(value.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function referenceOf(candidate: DuplicateCandidate): string | null {
  return extractReference(candidate.description || "");
}

export function isDuplicateTransaction(
  candidate: DuplicateCandidate,
  existing: DuplicateCandidate,
): boolean {
  if (candidate.amountPaise !== existing.amountPaise) return false;
  if (candidate.isExpense !== existing.isExpense) return false;

  const candidateRef = referenceOf(candidate);
  const existingRef = referenceOf(existing);

  // 1. Both have a genuine reference.
  if (candidateRef && existingRef) {
    return candidateRef === existingRef;
  }

  // 2. Different dates are never duplicates.
  const candidateDate = dateKey(candidate.date);
  const existingDate = dateKey(existing.date);
  if (candidateDate && existingDate && candidateDate !== existingDate) {
    return false;
  }

  // 3. Same date: check the running balance.
  const candidateBal = candidate.balanceAfterPaise;
  const existingBal = existing.balanceAfterPaise;

  if (candidateBal !== null && existingBal !== null) {
    return candidateBal === existingBal;
  }

  // 4. Exact raw description + same date + same amount.
  const candidateDesc = (candidate.description || "").trim().toLowerCase();
  const existingDesc = (existing.description || "").trim().toLowerCase();
  if (candidateDesc && existingDesc && candidateDesc === existingDesc) {
    return true;
  }

  return false;
}

export function duplicateReason(
  candidate: DuplicateCandidate,
  existing: DuplicateCandidate,
): string | null {
  if (!isDuplicateTransaction(candidate, existing)) return null;

  const candidateRef = referenceOf(candidate);
  const existingRef = referenceOf(existing);
  if (candidateRef && existingRef) {
    return `Matched reference ${candidateRef}`;
  }

  // Rule 3 decided the verdict on the balance when both carry one.
  const bothHaveBalance =
    candidate.balanceAfterPaise !== null &&
    existing.balanceAfterPaise !== null;
  if (bothHaveBalance) {
    return "Same day, same amount, same running balance";
  }

  return "Same day, same amount, same description";
}
