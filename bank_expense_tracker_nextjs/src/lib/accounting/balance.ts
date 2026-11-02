import { signedPaise } from "@/lib/money";
import type { Direction } from "@/types/transaction";

/**
 * The anchored ledger — the single source of truth for an account balance.
 *
 *   currentBalance = anchor.balancePaise
 *                  + Σ signed(txn) for every txn strictly after anchor.asOfDate
 *
 * The anchor carries the untracked past. Transactions on or before the anchor
 * date are historical context and never affect the current balance, which is
 * what stops a historical statement import from clobbering the present.
 */

export type LedgerEntry = {
  amountPaise: number;
  direction: Direction;
  txnDate: Date;
  deletedAt?: Date | null;
};

export type BalanceAnchorInput = {
  balancePaise: number;
  asOfDate: Date;
} | null;

export function computeBalancePaise(
  anchor: BalanceAnchorInput,
  entries: LedgerEntry[],
): number {
  let total = anchor ? anchor.balancePaise : 0;
  const anchorTime = anchor ? anchor.asOfDate.getTime() : null;

  for (const entry of entries) {
    if (entry.deletedAt) continue;
    if (anchorTime !== null && entry.txnDate.getTime() <= anchorTime) continue;

    total += signedPaise(entry.amountPaise, entry.direction);
  }

  return total;
}

/**
 * Compares the cached `currentBalance` with the computed figure. The difference
 * is shown in the reconcile dialog; it is never silently corrected.
 */
export function reconcileBalance(input: {
  storedPaise: number;
  computedPaise: number;
}): { driftPaise: number; balanced: boolean } {
  const driftPaise = input.storedPaise - input.computedPaise;

  return { driftPaise, balanced: driftPaise === 0 };
}
