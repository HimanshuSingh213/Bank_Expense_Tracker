import { Types } from "mongoose";
import { dbConnect } from "@/lib/dbConnect";
import { StatementImport, type PreviewRowDoc } from "@/models/statement-import.model";
import type { ParsedTransaction } from "@/helpers/statement-parser/table-parser";
import {
  DuplicateCandidate,
  duplicateReason,
  isDuplicateTransaction,
} from "@/helpers/statement-parser/duplicate-check";
import {
  extractReference,
  makeDedupeKey,
} from "@/lib/transactions/identity";
import { toISODate, utcMidnight } from "@/lib/dates";

/**
 * Turns freshly parsed rows into the preview rows, marking duplicates with an
 * explained reason — exactly what the preview table shows the user.
 */

export type RowVerdictCounts = {
  parsed: number;
  new: number;
  duplicate: number;
  invalid: number;
};

function candidateOf(row: ParsedTransaction): DuplicateCandidate {
  return {
    date: row.date,
    amountPaise: row.amountPaise,
    isExpense: row.isExpense,
    description: row.description,
    balanceAfterPaise: row.balanceAfterPaise,
  };
}

/** Compares against the rows a statement already stored for this account. */
export async function buildPreviewRows(
  userId: string,
  accountId: Types.ObjectId,
  parsed: ParsedTransaction[],
): Promise<{ rows: PreviewRowDoc[]; counts: RowVerdictCounts }> {
  await dbConnect();

    const transactions = (await import("@/models/transaction.model")).Transaction;
  const existingRows = (await transactions.find({
    userId,
    accountId,
    deletedAt: null,
  })
    .lean()
    .catch(() => [])) as unknown as Array<{
    date?: unknown;
    txnDate?: Date;
    amountPaise?: number;
    amount?: number;
    direction?: string;
    isExpense?: boolean;
    description?: string;
    title?: string;
    balanceAfterPaise?: number | null;
    balance?: number | null;
  }>;

  const existing: DuplicateCandidate[] = existingRows.map((row) => ({
    date: row.txnDate ?? (row.date as Date | null) ?? null,
    amountPaise:
      typeof row.amountPaise === "number"
        ? row.amountPaise
        : Math.round((row.amount ?? 0) * 100),
    isExpense: row.direction ? row.direction === "debit" : Boolean(row.isExpense),
    description: row.description || row.title || "",
    balanceAfterPaise:
      typeof row.balanceAfterPaise === "number"
        ? row.balanceAfterPaise
        : typeof row.balance === "number"
          ? Math.round(row.balance * 100)
          : null,
  }));

  const rows: PreviewRowDoc[] = [];
  const withinFile: DuplicateCandidate[] = [];

  for (const parsedRow of parsed) {
    const candidate = candidateOf(parsedRow);

    // Rule order matters: DB first (the real "already imported"), then the
    // same file (a repeated line pulled out of same day twice).
    const dbMatch = existing.find(
      (candidateExisting) => isDuplicateTransaction(candidate, candidateExisting),
    );
    const twinInFile = withinFile.find((previous) =>
      isDuplicateTransaction(candidate, previous),
    );

    const pastReason = dbMatch ? duplicateReason(candidate, dbMatch) : null;

    // Dedupe key so the database itself can refuse a re-import when the bank
    // gave a strong reference.
    const dedupeKey = makeDedupeKey({
      accountId: accountId.toString(),
      referenceNumber: extractReference(parsedRow.description),
      txnDate: utcMidnight(parsedRow.date),
      amountPaise: parsedRow.amountPaise,
      direction: parsedRow.isExpense ? "debit" : "credit",
    });

    if (twinInFile) {
      rows.push(previewRowFrom(parsedRow, dedupeKey, {
        verdict: "duplicate",
        reason: "Twice in this same file — same day, amount and description",
        selected: false,
      }));
      continue;
    }

    if (dbMatch) {
      rows.push(previewRowFrom(parsedRow, dedupeKey, {
        verdict: "duplicate",
        reason: pastReason ?? "Already in the ledger",
        selected: true,
      }));
      continue;
    }

    rows.push(previewRowFrom(parsedRow, dedupeKey, {
      verdict: "new",
      reason: null,
      selected: true,
    }));
    withinFile.push(candidate);
  }

  return {
    rows,
    counts: countVerdicts(rows),
  };
}

function previewRowFrom(
  row: ParsedTransaction,
  dedupeKey: string | null,
  overrides: { verdict: PreviewRowDoc["verdict"]; reason: string | null; selected: boolean },
): PreviewRowDoc {
  return {
    rowNumber: row.rowNumber,
    raw: row.raw,
    txnDate: toISODate(utcMidnight(row.date)),
    valueDate: null,
    narration: row.description || row.title,
    referenceNumber: extractReference(row.description),
    direction: row.isExpense ? "debit" : "credit",
    amountPaise: row.amountPaise,
    balanceAfterPaise: row.balanceAfterPaise,
    verdict: overrides.verdict,
    reason: overrides.reason,
    issues: [],
    selected: overrides.selected,
    category: row.category,
    dedupeKey,
  };
}

export function countVerdicts(rows: PreviewRowDoc[]): RowVerdictCounts {
  let newCount = 0;
  let duplicateCount = 0;
  let invalidCount = 0;

  for (const row of rows) {
    if (row.verdict === "new") newCount++;
    else if (row.verdict === "duplicate") duplicateCount++;
    else invalidCount++;
  }

  return {
    parsed: rows.length,
    new: newCount,
    duplicate: duplicateCount,
    invalid: invalidCount,
  };
}
