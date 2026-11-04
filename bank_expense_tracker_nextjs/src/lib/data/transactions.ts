import { codedError } from "@/lib/api";
import { createHash } from "node:crypto";
import { Types, type QueryFilter } from "mongoose";
import { dbConnect } from "@/lib/dbConnect";
import { Transaction, type TransactionDoc } from "@/models/transaction.model";
import { fromISODate, toISODate } from "@/lib/dates";
import { DB_SIGNED_PAISE, fromPaise, toPaise } from "@/lib/money";
import type {
  Direction,
  TransactionCategory,
  TransactionDto,
  TransactionFilters,
  TransactionListResult,
} from "@/types/transaction";

/**
 * Everything about the transaction ledger lives in this one file: identity
 * (dedupe key / fingerprint), reads (list, detail, totals) and writes (edit,
 * reviewed flag, soft delete). "One domain, one file" — the only split is by
 * concept in the comments, not by file count.
 *
 * Every read and write takes a `userId` that came from a verified session.
 * Ownership sits inside the query itself, so the "load then check" pattern —
 * and the window between those two steps — is never used.
 *
 * The balance is never written here. It is the anchored-ledger computation
 * over the transactions (see the account model), so any edit or delete is
 * reflected on the next read without a separate mutation that can drift.
 */

// ---------------------------------------------------------------------------
// Identity — a bank statement gives no unique ids, so two keys carry two jobs.
//
//  - `dedupeKey` — a hard uniqueness constraint. Set only when a strong
//    reference number exists.
//  - `fingerprint` — informational. Helps explain a "possible duplicate" in
//    the preview; never enforced by the database.
//
// Identity is scoped to the account, so the same UPI reference appearing in
// two accounts (a transfer between your own accounts) stays valid in both.
// ---------------------------------------------------------------------------

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
 * Reference patterns, in priority order.
 * The SBI `Ref No./Cheque No.` column always wins when the profile maps it.
 */
const REFERENCE_PATTERNS: Array<{ pattern: RegExp; prefix?: string }> = [
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

  for (const { pattern, prefix } of REFERENCE_PATTERNS) {
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
 * preview must ask the user.
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

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/**
 * Every query starts from this scope: the owner, and not deleted.
 * Ownership is never a filter the caller can forget.
 */
function baseMatch(userId: string): QueryFilter<TransactionDoc> {
  return { userId: new Types.ObjectId(userId), deletedAt: null };
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function listTransactions(
  userId: string,
  filters: TransactionFilters,
): Promise<TransactionListResult> {
  await dbConnect();

  const match = baseMatch(userId);
  const and: QueryFilter<TransactionDoc>[] = [];

  if (filters.q) {
    const pattern = new RegExp(escapeRegex(filters.q), "i");
    and.push({
      $or: [
        { title: pattern },
        { description: pattern },
        { referenceNumber: pattern },
      ],
    });
  }

  if (filters.from || filters.to) {
    const dateRange = {
      ...(filters.from ? { $gte: filters.from } : {}),
      ...(filters.to ? { $lt: filters.to } : {}),
    };
    and.push({
      $or: [{ txnDate: dateRange }, { date: dateRange }],
    });
  }

  if (filters.category) and.push({ category: filters.category });
  if (filters.direction) and.push({ direction: filters.direction });
  if (filters.reviewed !== undefined) and.push({ reviewed: filters.reviewed });

  const query = and.length ? ({ ...match, $and: and } as QueryFilter<TransactionDoc>) : match;

  const skip = (filters.page - 1) * filters.limit;

  const [documents, total, totalsRows] = await Promise.all([
    Transaction.find(query)
      .sort({ txnDate: -1, date: -1, createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(filters.limit)
      .lean(),
    Transaction.countDocuments(query),
    Transaction.aggregate<{ creditPaise: number; debitPaise: number }>([
      { $match: query },
      {
        $group: {
          _id: null,
          creditPaise: {
            $sum: { $cond: [{ $gt: [DB_SIGNED_PAISE, 0] }, DB_SIGNED_PAISE, 0] },
          },
          debitPaise: {
            $sum: { $cond: [{ $lt: [DB_SIGNED_PAISE, 0] }, { $multiply: [DB_SIGNED_PAISE, -1] }, 0] },
          },
        },
      },
    ]),
  ]);

  const creditPaise = totalsRows[0]?.creditPaise ?? 0;
  const debitPaise = totalsRows[0]?.debitPaise ?? 0;

  return {
    items: (documents as unknown as TransactionDoc[]).map(toTransactionDto),
    page: filters.page,
    limit: filters.limit,
    total,
    totals: { creditPaise, debitPaise, netPaise: creditPaise - debitPaise },
  };
}

export async function getTransaction(
  userId: string,
  id: string,
): Promise<TransactionDto | null> {
  if (!Types.ObjectId.isValid(id)) return null;
  await dbConnect();

  const document = await Transaction.findOne({
    ...baseMatch(userId),
    _id: new Types.ObjectId(id),
  }).lean();

  return document ? toTransactionDto(document as unknown as TransactionDoc) : null;
}

export async function countUnreviewed(userId: string): Promise<number> {
  await dbConnect();

  return Transaction.countDocuments({ ...baseMatch(userId), reviewed: false });
}

export async function recentTransactions(
  userId: string,
  limit = 8,
): Promise<TransactionDto[]> {
  await dbConnect();

  const documents = await Transaction.find(baseMatch(userId))
    .sort({ txnDate: -1, date: -1, createdAt: -1, _id: -1 })
    .limit(limit)
    .lean();

  return (documents as unknown as TransactionDoc[]).map(toTransactionDto);
}

/**
 * The balance the STATEMENT printed on its newest measured row — the last
 * running balance, exactly as the bank recorded it. This is the truth the
 * front page should lead with, not a sum of deltas (which equals a real
 * balance only when the ledger is complete and anchored perfectly).
 */
export async function latestStatementBalance(
  userId: string,
  accountId: string,
): Promise<{ balancePaise: number | null; asOf: Date | null }> {
  await dbConnect();

  const document = (await Transaction.findOne(
    {
      ...baseMatch(userId),
      accountId: new Types.ObjectId(accountId),
      $or: [{ balanceAfterPaise: { $type: "number" } }, { balance: { $type: "number" } }],
    } as unknown as Parameters<typeof Transaction.findOne>[0],
    { balanceAfterPaise: 1, balance: 1, txnDate: 1, date: 1 },
  )
    .sort({ txnDate: -1, date: -1, _id: -1 })
    .lean()) as unknown as {
    balanceAfterPaise?: number | null;
    balance?: number | null;
    txnDate?: Date | null;
    date?: Date | null;
  } | null;

  if (!document) return { balancePaise: null, asOf: null };

  // Missing/unknown dates sort last in a descending sort, so if the newest
  // row carries no date we still have the latest dated balance.
  const asOf = (document.txnDate ?? document.date ?? null) as Date | null;

  return {
    balancePaise:
      typeof document.balanceAfterPaise === "number"
        ? document.balanceAfterPaise
        : typeof document.balance === "number"
          ? Math.round(document.balance * 100)
          : null,
    asOf: asOf && !Number.isNaN(asOf.getTime()) ? asOf : null,
  };
}

/** Totals for one IST range, used by the dashboard and analytics. */
export async function totalsForRange(
  userId: string,
  from: Date,
  to: Date,
): Promise<{ creditPaise: number; debitPaise: number; netPaise: number; count: number }> {
  await dbConnect();

  const rows = await Transaction.aggregate<{
    creditPaise: number;
    debitPaise: number;
    count: number;
  }>([
    {
      $match: {
        ...baseMatch(userId),
        $or: [
          { txnDate: { $gte: from, $lt: to } },
          { date: { $gte: from, $lt: to } },
        ],
      },
    },
    {
      $group: {
        _id: null,
        creditPaise: {
          $sum: { $cond: [{ $gt: [DB_SIGNED_PAISE, 0] }, DB_SIGNED_PAISE, 0] },
        },
        debitPaise: {
          $sum: { $cond: [{ $lt: [DB_SIGNED_PAISE, 0] }, { $multiply: [DB_SIGNED_PAISE, -1] }, 0] },
        },
        count: { $sum: 1 },
      },
    },
  ]);

  const creditPaise = rows[0]?.creditPaise ?? 0;
  const debitPaise = rows[0]?.debitPaise ?? 0;

  return {
    creditPaise,
    debitPaise,
    netPaise: creditPaise - debitPaise,
    count: rows[0]?.count ?? 0,
  };
}

export async function categoryTotals(
  userId: string,
  from: Date,
  to: Date,
): Promise<Array<{ category: string; debitPaise: number; count: number }>> {
  await dbConnect();

  return Transaction.aggregate<{ category: string; debitPaise: number; count: number }>([
    {
      $match: {
        ...baseMatch(userId),
        $or: [
          { txnDate: { $gte: from, $lt: to } },
          { date: { $gte: from, $lt: to } },
        ],
        $expr: { $lt: [DB_SIGNED_PAISE, 0] },
      },
    },
    {
      $group: {
        _id: { $ifNull: ["$category", "Others"] },
        debitPaise: { $sum: { $multiply: [DB_SIGNED_PAISE, -1] } },
        count: { $sum: 1 },
      },
    },
    { $sort: { debitPaise: -1 } },
    { $project: { _id: 0, category: "$_id", debitPaise: 1, count: 1 } },
  ]);
}

/**
 * Maps a stored document to the shape the UI uses.
 *
 * Legacy rows predate `amountPaise`, `direction` and `txnDate`, so each has a
 * documented fallback. New writes always set all three.
 */
export function toTransactionDto(document: TransactionDoc): TransactionDto {
  const amountPaise =
    typeof document.amountPaise === "number"
      ? document.amountPaise
      : Math.round((document.amount ?? 0) * 100);

  const direction: Direction =
    document.direction ?? (document.isExpense ? "debit" : "credit");

  const txnDate = document.txnDate
    ? new Date(document.txnDate)
    : document.date
      ? new Date(document.date as string | Date)
      : null;

  const balanceAfterPaise =
    typeof document.balanceAfterPaise === "number"
      ? document.balanceAfterPaise
      : typeof document.balance === "number"
        ? Math.round(document.balance * 100)
        : null;

  return {
    id: String(document._id),
    txnDate: txnDate && !Number.isNaN(txnDate.getTime()) ? txnDate.toISOString() : null,
    valueDate: document.valueDate ? document.valueDate.toISOString() : null,
    title: document.title,
    recipient: document.recipient || "",
    narration: document.description || document.title,
    referenceNumber: document.referenceNumber || null,
    category: (document.category ?? "Others") as TransactionCategory,
    direction,
    amountPaise: Math.abs(amountPaise),
    balanceAfterPaise,
    reviewed: Boolean(document.reviewed),
    reviewedAt: document.reviewedAt ? document.reviewedAt.toISOString() : null,
    importId: document.importId ? String(document.importId) : null,
    importRowNumber: document.importRowNumber ?? null,
  };
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export type TransactionUpdateInput = {
  title?: string;
  date?: string;
  direction?: Direction;
  amount?: string;
  category?: string;
  narration?: string;
  reviewed?: boolean;
  /** Passing null clears the reference number and the dedupe key. */
  referenceNumber?: string | null;
};

function ownerId(userId: string) {
  return new Types.ObjectId(userId);
}

/**
 * Legacy columns (`amount`, `isExpense`, `date`) stay in sync so the old
 * application keeps working against the same collection.
 */
function legacyFields(amountPaise: number, direction: Direction, txnDate: Date) {
  return {
    amount: fromPaise(amountPaise),
    isExpense: direction === "debit",
    date: txnDate,
  };
}

const notDeleted = { deletedAt: null };

/** Ids from the browser, filtered to real ObjectIds. Waste ids harmlessly drop out. */
function toObjectIds(ids: string[]): Types.ObjectId[] {
  const objectIds: Types.ObjectId[] = [];

  for (const id of ids) {
    if (typeof id === "string" && Types.ObjectId.isValid(id)) {
      objectIds.push(new Types.ObjectId(id));
    }
  }

  return objectIds;
}

/**
 * Partial edit. The amount/date/direction arrive as plain strings from the
 * API; when any identity field changes, the duplicate guard runs against the
 * merged row so an edit cannot silently create a twin.
 */
export async function updateTransaction(
  userId: string,
  id: string,
  input: TransactionUpdateInput,
): Promise<TransactionDto> {
  if (!Types.ObjectId.isValid(id)) {
    throw codedError("NOT_FOUND", "That row does not exist, or it was hidden by a review.");
  }
  await dbConnect();

  const current = await Transaction.findOne({
    _id: new Types.ObjectId(id),
    userId: ownerId(userId),
    ...notDeleted,
  }).lean();

  if (!current) {
    throw codedError("NOT_FOUND", "That row does not exist, or it was hidden by a review.");
  }
  const doc = current as unknown as TransactionDoc;

  const direction = input.direction ?? doc.direction;
  const title = input.title ?? doc.title;
  const category = input.category ?? doc.category;
  const narration = input.narration ?? doc.description ?? "";
  const amountPaise =
    input.amount !== undefined
      ? (toPaise(input.amount) ?? -1)
      : (doc.amountPaise ??
        Math.round((doc.amount ?? 0) * 100));
  const txnDate = input.date ? fromISODate(input.date) : (doc.txnDate ?? null);

  if (!Number.isFinite(amountPaise) || amountPaise <= 0) {
    throw codedError("VALIDATION_ERROR", "The amount must be a positive rupee figure.");
  }
  if (!txnDate) {
    throw codedError("VALIDATION_ERROR", "The date could not be read as YYYY-MM-DD.");
  }

  const referenceNumber =
    input.referenceNumber !== undefined
      ? input.referenceNumber
      : (doc.referenceNumber ?? null);

  const accountId = String(doc.accountId);
  const dedupeKey = makeDedupeKey({
    accountId,
    referenceNumber: referenceNumber ?? null,
    txnDate,
    amountPaise,
    direction,
  });

  if (dedupeKey && dedupeKey !== (doc.dedupeKey ?? null)) {
    const sameKey = await Transaction.exists({
      dedupeKey,
      ...notDeleted,
      _id: { $ne: doc._id },
    });
    if (sameKey) {
      throw codedError("CONFLICT", "A row with that reference number already exists.");
    }
  }

  const identityChanged =
    title !== doc.title ||
    txnDate.getTime() !== (doc.txnDate?.getTime() ?? -1) ||
    amountPaise !== (doc.amountPaise ?? -1) ||
    direction !== doc.direction;

  if (identityChanged) {
    const twin = await Transaction.exists({
      userId: ownerId(userId),
      accountId: new Types.ObjectId(accountId),
      txnDate,
      amountPaise,
      direction,
      title,
      ...notDeleted,
      _id: { $ne: doc._id },
    });

    if (twin) {
      throw codedError("CONFLICT", "A row with the same date, amount and title already exists.");
    }
  }

  const reviewed = input.reviewed ?? doc.reviewed;

  const updated = await Transaction.findOneAndUpdate(
    { _id: doc._id, userId: ownerId(userId), ...notDeleted },
    {
      $set: {
        title,
        category,
        description: narration,
        recipient: title,
        amountPaise,
        direction,
        txnDate,
        reviewed,
        reviewedAt: reviewed ? (doc.reviewedAt ?? new Date()) : null,
        referenceNumber: referenceNumber ?? null,
        dedupeKey,
        // Legacy columns, kept in sync.
        ...legacyFields(amountPaise, direction, txnDate),
      },
    },
    { new: true, lean: true },
  );

  if (!updated) {
    throw codedError("NOT_FOUND", "That row does not exist, or it was hidden by a review.");
  }
  return toTransactionDto(updated as unknown as TransactionDoc);
}

/** Reviewed toggle. Clearing `reviewedAt` keeps the timestamps honest. */
export async function setTransactionReviewed(
  userId: string,
  id: string,
  reviewed: boolean,
): Promise<TransactionDto> {
  if (!Types.ObjectId.isValid(id)) {
    throw codedError("NOT_FOUND", "That row does not exist, or it was hidden by a review.");
  }
  await dbConnect();

  const updated = await Transaction.findOneAndUpdate(
    { _id: new Types.ObjectId(id), userId: ownerId(userId), ...notDeleted },
    {
      $set: {
        reviewed,
        reviewedAt: reviewed ? new Date() : null,
      },
    },
    { new: true, lean: true },
  );

  if (!updated) {
    throw codedError("NOT_FOUND", "That row does not exist, or it was hidden by a review.");
  }
  return toTransactionDto(updated as unknown as TransactionDoc);
}

/**
 * Bulk "reviewed" toggle — the ledger rows inside a calculator window, or the
 * ticked rows in the table, all flip in one write. Ownership is part of the
 * filter, so only rows belonging to this user can be touched, and unknown /
 * deleted / foreign ids are simply left out (the count tells the caller how
 * many actually moved). Clearing `reviewedAt` keeps the timestamps honest.
 */
export async function bulkSetTransactionReviewed(
  userId: string,
  ids: string[],
  reviewed: boolean,
): Promise<number> {
  const objectIds = toObjectIds(ids);
  if (!objectIds.length) return 0;
  await dbConnect();

  const result = await Transaction.updateMany(
    { _id: { $in: objectIds }, userId: ownerId(userId), ...notDeleted },
    { $set: { reviewed, reviewedAt: reviewed ? new Date() : null } },
  );

  return result.modifiedCount ?? 0;
}

/**
 * Bulk soft delete for the ticked rows: same rules as
 * `softDeleteTransaction` — `deletedAt` is set, nothing is destroyed — just
 * in one write so an accidental multi-row removal stays recoverable.
 */
export async function bulkSoftDeleteTransactions(
  userId: string,
  ids: string[],
): Promise<number> {
  const objectIds = toObjectIds(ids);
  if (!objectIds.length) return 0;
  await dbConnect();

  const result = await Transaction.updateMany(
    { _id: { $in: objectIds }, userId: ownerId(userId), ...notDeleted },
    { $set: { deletedAt: new Date() } },
  );

  return result.modifiedCount ?? 0;
}

/**
 * Soft delete: the row stays in the database with `deletedAt` set, so an
 * accidental removal can be recovered and history/imports stay explainable.
 * Money writes never hard-delete.
 */
export async function softDeleteTransaction(
  userId: string,
  id: string,
): Promise<TransactionDto> {
  if (!Types.ObjectId.isValid(id)) {
    throw codedError("NOT_FOUND", "That row does not exist, or it was hidden by a review.");
  }
  await dbConnect();

  const deleted = await Transaction.findOneAndUpdate(
    { _id: new Types.ObjectId(id), userId: ownerId(userId), ...notDeleted },
    { $set: { deletedAt: new Date() } },
    { new: true, lean: true },
  );

  if (!deleted) {
    throw codedError("NOT_FOUND", "That row does not exist, or it was hidden by a review.");
  }
  return toTransactionDto(deleted as unknown as TransactionDoc);
}
