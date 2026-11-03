/**
 * Database-side money expressions.
 *
 * `signedPaise()` in `src/lib/money.ts` is the definition of a signed amount.
 * These expressions mirror it inside MongoDB so totals can be summed without
 * loading every row. If the rule changes, both must change together — the
 * `$ifNull` fallbacks exist only for legacy documents written before
 * `amountPaise`/`direction` existed.
 */

export const DB_AMOUNT_PAISE = {
  $ifNull: ["$amountPaise", { $multiply: ["$amount", 100] }],
} as const;

export const DB_DIRECTION = {
  $ifNull: ["$direction", { $cond: ["$isExpense", "debit", "credit"] }],
} as const;

export const DB_SIGNED_PAISE = {
  $cond: [
    { $eq: [DB_DIRECTION, "credit"] },
    DB_AMOUNT_PAISE,
    { $multiply: [DB_AMOUNT_PAISE, -1] },
  ],
} as const;
