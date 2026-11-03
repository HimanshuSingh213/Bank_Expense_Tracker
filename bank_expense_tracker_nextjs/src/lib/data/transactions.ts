import { Types, type QueryFilter } from "mongoose";
import { dbConnect } from "@/lib/dbConnect";
import { Transaction, type TransactionDoc } from "@/models/transaction.model";
import { DB_SIGNED_PAISE } from "@/lib/data/aggregation";
import type {
  Direction,
  TransactionCategory,
  TransactionDto,
  TransactionFilters,
  TransactionListResult,
} from "@/types/transaction";

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
    narration: document.description || document.title,
    referenceNumber: document.referenceNumber || null,
    category: (document.category ?? "Others") as TransactionCategory,
    direction,
    amountPaise: Math.abs(amountPaise),
    balanceAfterPaise,
    reviewed: Boolean(document.reviewed),
    reviewedAt: document.reviewedAt ? document.reviewedAt.toISOString() : null,
    source: document.source ?? "manual",
    importId: document.importId ? String(document.importId) : null,
    importRowNumber: document.importRowNumber ?? null,
  };
}
