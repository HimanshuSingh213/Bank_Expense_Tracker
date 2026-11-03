import { Types } from "mongoose";
import { dbConnect } from "@/lib/dbConnect";
import { Transaction, type TransactionDoc } from "@/models/transaction.model";
import { toTransactionDto } from "@/lib/data/transactions";
import { fromISODate } from "@/lib/dates";
import { fromPaise, toPaise } from "@/lib/money";
import { makeDedupeKey } from "@/lib/transactions/identity";
import type { Direction, TransactionDto } from "@/types/transaction";

/**
 * Write operations for the ledger. Every call takes a `userId` that came from
 * a verified session, and ownership is enforced inside the query itself — the
 * "load then check" pattern is never used.
 *
 * The balance is never written here. It is the anchored-ledger computation
 * over the transactions, so any create/edit/delete is reflected on next read
 * without a separate mutation that can drift.
 */

export type TransactionWriteInput = {
  title: string;
  date: string;
  direction: Direction;
  amount: string;
  category: string;
  narration?: string;
  referenceNumber?: string;
};

export class TransactionWriteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransactionWriteError";
  }
}

export class DuplicateTransactionError extends Error {
  constructor(message = "A row with the same date, amount and title already exists.") {
    super(message);
    this.name = "DuplicateTransactionError";
  }
}

/** The row either does not exist or does not belong to this session. */
export class TransactionNotFoundError extends Error {
  constructor() {
    super("That row does not exist, or it was hidden by a review.");
    this.name = "TransactionNotFoundError";
  }
}

function ownerId(userId: string) {
  return new Types.ObjectId(userId);
}

/** Amount and date are validated before anything is written. */
function writeFields(input: {
  direction: Direction;
  amount: string;
  date: string;
  referenceNumber?: string;
  accountId: string;
}) {
  const amountPaise = toPaise(input.amount);
  if (amountPaise === null || amountPaise <= 0) {
    throw new TransactionWriteError("The amount must be a positive rupee figure.");
  }

  const txnDate = fromISODate(input.date);
  if (!txnDate) {
    throw new TransactionWriteError("The date could not be read as YYYY-MM-DD.");
  }

  return {
    amountPaise,
    txnDate,
    dedupeKey: dedupeKeyOf({
      accountId: input.accountId,
      referenceNumber: input.referenceNumber ?? null,
      txnDate,
      amountPaise,
      direction: input.direction,
    }),
  };
}

/** Wrap only for null-safety of the passed fields. */
function dedupeKeyOf(input: {
  accountId: string;
  referenceNumber: string | null;
  txnDate: Date;
  amountPaise: number;
  direction: Direction;
}) {
  return makeDedupeKey(input);
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

export async function createTransaction(
  userId: string,
  account: { _id: unknown },
  input: TransactionWriteInput & { reviewed?: boolean },
): Promise<TransactionDto> {
  const accountId = String(account._id);
  const accountObjectId = new Types.ObjectId(accountId);
  const { amountPaise, txnDate, dedupeKey } = writeFields({
    ...input,
    accountId,
  });
  await dbConnect();

  // Strong-reference guard first: the dedupe key is a database-level
  // uniqueness constraint when the row carries a reference number.
  if (dedupeKey) {
    const sameKey = await Transaction.exists({ dedupeKey, ...notDeleted });
    if (sameKey) {
      throw new DuplicateTransactionError(
        "A row with that reference number already exists.",
      );
    }
  }

  // Soft guard for manual adds without a reference: date + amount + title.
  const twin = await Transaction.exists({
    userId: ownerId(userId),
    accountId: accountObjectId,
    txnDate,
    amountPaise,
    direction: input.direction,
    title: input.title,
    ...notDeleted,
  });

  if (twin) throw new DuplicateTransactionError();

  const created = await Transaction.create({
    userId: ownerId(userId),
    accountId: accountObjectId,
    title: input.title,
    description: input.narration ?? "",
    recipient: input.title,
    category: input.category,
    ...legacyFields(amountPaise, input.direction, txnDate),
    amountPaise,
    direction: input.direction,
    txnDate,
    valueDate: null,
    referenceNumber: input.referenceNumber ?? null,
    dedupeKey,
    fingerprint: null,
    reviewed: input.reviewed ?? false,
    reviewedAt: null,
    source: "manual",
    balance: null,
    balanceAfterPaise: null,
    importId: null,
    importRowNumber: null,
    rawRow: null,
  });

  return toTransactionDto(created as unknown as TransactionDoc);
}

export type TransactionUpdateInput = Partial<TransactionWriteInput> & {
  reviewed?: boolean;
  /** Passing null clears the reference number and the dedupe key. */
  referenceNumber?: string | null;
};

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
  if (!Types.ObjectId.isValid(id)) throw new TransactionNotFoundError();
  await dbConnect();

  const current = await Transaction.findOne({
    _id: new Types.ObjectId(id),
    userId: ownerId(userId),
    ...notDeleted,
  }).lean();

  if (!current) throw new TransactionNotFoundError();
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
    throw new TransactionWriteError("The amount must be a positive rupee figure.");
  }
  if (!txnDate) {
    throw new TransactionWriteError("The date could not be read as YYYY-MM-DD.");
  }

  const referenceNumber =
    input.referenceNumber !== undefined
      ? input.referenceNumber
      : (doc.referenceNumber ?? null);

  const accountId = String(doc.accountId);
  const dedupeKey = dedupeKeyOf({
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
      throw new DuplicateTransactionError(
        "A row with that reference number already exists.",
      );
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
    if (twin) throw new DuplicateTransactionError();
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

  if (!updated) throw new TransactionNotFoundError();
  return toTransactionDto(updated as unknown as TransactionDoc);
}

/** Reviewed toggle. Clearing `reviewedAt` keeps the timestamps honest. */
export async function setTransactionReviewed(
  userId: string,
  id: string,
  reviewed: boolean,
): Promise<TransactionDto> {
  if (!Types.ObjectId.isValid(id)) throw new TransactionNotFoundError();
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

  if (!updated) throw new TransactionNotFoundError();
  return toTransactionDto(updated as unknown as TransactionDoc);
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
  if (!Types.ObjectId.isValid(id)) throw new TransactionNotFoundError();
  await dbConnect();

  const deleted = await Transaction.findOneAndUpdate(
    { _id: new Types.ObjectId(id), userId: ownerId(userId), ...notDeleted },
    { $set: { deletedAt: new Date() } },
    { new: true, lean: true },
  );

  if (!deleted) throw new TransactionNotFoundError();
  return toTransactionDto(deleted as unknown as TransactionDoc);
}
