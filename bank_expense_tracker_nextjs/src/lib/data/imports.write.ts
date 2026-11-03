import { createHash } from "node:crypto";
import { Types } from "mongoose";
import { dbConnect } from "@/lib/dbConnect";
import {
  StatementImport,
  type PreviewRowDoc,
  type StatementImportDoc,
} from "@/models/statement-import.model";
import { Transaction } from "@/models/transaction.model";
import { fromPaise } from "@/lib/money";
import { utcMidnight } from "@/lib/dates";
import type { ParsedTransaction } from "@/helpers/statement-parser/table-parser";

/**
 * The import lifecycle: analyze (draft) → user looks at the preview →
 * confirm (rows are written once). Nothing is written to `transactions`
 * until confirm.
 *
 * The draft's `idempotencyKey` is unique: analyze the same file again and you
 * get the same draft back, confirm the same draft twice and the second call
 * finds it already committed and reports instead of re-inserting.
 */

const DRAFT_TTL_HOURS = 24;

export class ImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImportError";
  }
}

export class ImportNotFoundError extends Error {
  constructor() {
    super("This draft is gone — analyze the statement again.");
    this.name = "ImportNotFoundError";
  }
}

function sha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

/** Makes the analyze step idempotent per owner per file. */
function idempotencyKey(userId: string, fileSha256: string): string {
  return `v1-${sha256(Buffer.from(`${userId}:${fileSha256}`))}`;
}

export async function createImportDraft(
  userId: string,
  accountId: Types.ObjectId,
  file: {
    fileName: string;
    fileSize: number;
    buffer: Buffer;
    detectedFormat: string;
  },
  parsed: {
    transactions: ParsedTransaction[];
    previewRows: PreviewRowDoc[];
    closingBalancePaise: number | null;
  },
): Promise<{ draft: StatementImportDoc; reused: boolean }> {
  await dbConnect();

  const fileHash = sha256(file.buffer);
  const key = idempotencyKey(userId, fileHash);

  const periodFrom = parsed.transactions.at(0)?.date ?? null;
  const periodTo = parsed.transactions.at(-1)?.date ?? null;
  const period =
    periodFrom && periodTo ? { from: periodFrom, to: periodTo } : null;

  // Same owner + same file: reuse the existing draft within its TTL.
  const existing = await StatementImport.findOne({ idempotencyKey: key });
  if (existing && existing.status === "draft") {
    existing.rows = parsed.previewRows;
    existing.detectedFormat = file.detectedFormat;
    existing.statementPeriod = period;
    existing.statementClosingBalancePaise = parsed.closingBalancePaise;
    existing.totals = {
      parsed: existing.rows.length,
      valid: existing.rows.filter((row) => row.verdict !== "invalid").length,
      invalid: existing.rows.filter((row) => row.verdict === "invalid").length,
      new: existing.rows.filter((row) => row.verdict === "new").length,
      possibleDuplicate: existing.rows.filter(
        (row) => row.verdict === "possible",
      ).length,
      selected: existing.rows.filter((row) => row.selected).length,
    };
    existing.expiresAt = new Date(Date.now() + DRAFT_TTL_HOURS * 3_600_000);
    await existing.save();
    return { draft: existing, reused: true };
  }

  // Already committed once? A new attempt gets a fresh key so it can be
  // analyzed honestly — the duplicate rules decide what happens at confirm.
  const suffix = existing ? `-${Date.now().toString(36)}` : "";

  const draft = await StatementImport.create({
    userId: new Types.ObjectId(userId),
    accountId,
    status: "draft",
    originalFileName: file.fileName,
    fileSize: file.fileSize,
    fileSha256: fileHash,
    detectedFormat: file.detectedFormat,
    statementPeriod: period,
    statementOpeningBalancePaise: null,
    statementClosingBalancePaise: parsed.closingBalancePaise,
    rows: parsed.previewRows,
    totals: {
      parsed: parsed.previewRows.length,
      valid: parsed.previewRows.filter((row) => row.verdict !== "invalid").length,
      invalid: parsed.previewRows.filter((row) => row.verdict === "invalid").length,
      new: parsed.previewRows.filter((row) => row.verdict === "new").length,
      possibleDuplicate: parsed.previewRows.filter(
        (row) => row.verdict === "possible",
      ).length,
      selected: parsed.previewRows.filter((row) => row.selected).length,
    },
    result: null,
    idempotencyKey: `${key}${suffix}`,
    expiresAt: new Date(Date.now() + DRAFT_TTL_HOURS * 3_600_000),
    committedAt: null,
  });

  return { draft, reused: false };
}

/**
 * Writes the chosen rows. Idempotent: the draft flips to `committed` and the
 * unique dedupe keys plus the status check make a second call safe.
 */
export async function confirmImport(
  userId: string,
  draftId: string,
): Promise<{
  inserted: number;
  skipped: number;
}> {
  if (!Types.ObjectId.isValid(draftId)) throw new ImportNotFoundError();
  await dbConnect();

  const draft = await StatementImport.findOne({
    _id: new Types.ObjectId(draftId),
    userId: new Types.ObjectId(userId),
  });

  if (!draft) throw new ImportNotFoundError();
  if (draft.status === "committed") {
    return { inserted: draft.result?.inserted ?? 0, skipped: draft.result?.skipped ?? 0 };
  }
  if (draft.status !== "draft") {
    throw new ImportError(
      "Only a draft can be confirmed. Analyze the statement again.",
    );
  }

  const writable = draft.rows.filter(
    (row) =>
      row.selected &&
      row.verdict !== "invalid" &&
      typeof row.amountPaise === "number" &&
      row.amountPaise > 0,
  );

  if (writable.length) {
    const accountId = draft.accountId;

    const documents = writable.map((row) => ({
      userId: new Types.ObjectId(userId),
      accountId,
      title: row.narration.slice(0, 100) || "Bank Transaction",
      description: row.narration,
      recipient: row.narration.slice(0, 100),
      category: row.category ?? "Others",
      // Legacy columns, kept in sync:
      amount: fromPaise(row.amountPaise ?? 0),
      isExpense: row.direction === "debit",
      date: utcMidnight(new Date(`${row.txnDate}T00:00:00Z`)),
      reviewed: false,
      reviewedAt: null,
      source: "statement-import" as const,
      // Authoritative columns:
      amountPaise: row.amountPaise ?? 0,
      direction: row.direction ?? "debit",
      txnDate: utcMidnight(new Date(`${row.txnDate}T00:00:00Z`)),
      balanceAfterPaise: row.balanceAfterPaise ?? null,
      balance:
        typeof row.balanceAfterPaise === "number"
          ? row.balanceAfterPaise / 100
          : null,
      referenceNumber: row.referenceNumber ?? null,
      dedupeKey: row.dedupeKey ?? null,
      importId: draft._id,
      importRowNumber: row.rowNumber,
      rawRow: row.raw ?? [],
      isOnline: row.narration.toUpperCase().includes("UPI"),
    }));

    // ordered:false keeps one bad row from stopping the rest; a rare
    // duplicate-key row is simply counted as skipped below.
    try {
      const inserted = await Transaction.insertMany(documents, { ordered: false });
      await StatementImport.updateOne(
        { _id: draft._id },
        {
          $set: {
            status: "committed",
            committedAt: new Date(),
            result: {
              inserted: inserted.length,
              skipped: writable.length - inserted.length,
              invalid: draft.totals.invalid,
              anchorUpdated: false,
            },
          },
        },
      );
      return { inserted: inserted.length, skipped: writable.length - inserted.length };
    } catch (error) {
      // insertMany with ordered:false may partially insert — measure what
      // landed by querying, then record the import as committed with the
      // real numbers. This write path never leaves a wrong result count.
      const insertedCount = await Transaction.countDocuments({
        importId: draft._id,
      });

      await StatementImport.updateOne(
        { _id: draft._id },
        {
          $set: {
            status: "committed",
            committedAt: new Date(),
            result: {
              inserted: insertedCount,
              skipped: writable.length - insertedCount,
              invalid: draft.totals.invalid,
              anchorUpdated: false,
            },
          },
        },
      );

      if (insertedCount === 0) {
        throw new ImportError(
          "None of the rows could be written. Nothing was changed.",
        );
      }
      return { inserted: insertedCount, skipped: writable.length - insertedCount };
    }
  }

  await StatementImport.updateOne(
    { _id: draft._id },
    {
      $set: {
        status: "committed",
        committedAt: new Date(),
        result: {
          inserted: 0,
          skipped: 0,
          invalid: draft.totals.invalid,
          anchorUpdated: false,
        },
      },
    },
  );

  return { inserted: 0, skipped: 0 };
}

/** Used by the API route (thin): the draft the preview page shows. */
export async function getDraft(
  userId: string,
  draftId: string,
): Promise<StatementImportDoc | null> {
  if (!Types.ObjectId.isValid(draftId)) return null;
  await dbConnect();

  return StatementImport.findOne({
    _id: new Types.ObjectId(draftId),
    userId: new Types.ObjectId(userId),
  }).lean<StatementImportDoc>();
}
