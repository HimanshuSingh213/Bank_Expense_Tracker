import { codedError } from "@/lib/api";
import { createHash } from "node:crypto";
import { Types } from "mongoose";
import { dbConnect } from "@/lib/dbConnect";
import {
  StatementImport,
  type PreviewRowDoc,
  type StatementImportDoc,
} from "@/models/statement-import.model";
import { Transaction } from "@/models/transaction.model";
import { Account, type AccountDoc } from "@/models/account.model";
import { fromPaise } from "@/lib/money";
import { toISODate, utcMidnight } from "@/lib/dates";
import { suggestCategories } from "@/lib/ai";
import type { ParsedTransaction } from "@/helpers/statement-parser/table-parser";
import {
  DuplicateCandidate,
  duplicateReason,
  isDuplicateTransaction,
} from "@/helpers/statement-parser/duplicate-check";
import { extractReference, makeDedupeKey } from "@/lib/data/transactions";
import type { ImportSummary } from "@/types/import";

/**
 * Everything about the XLS import lives in this one file: history reads, the
 * preview builder, and the draft → confirm write lifecycle.
 *
 * The lifecycle is: analyze (draft) → user looks at the preview → confirm
 * (rows are written once). Nothing is written to `transactions` until confirm.
 *
 * The draft's `idempotencyKey` is unique: analyze the same file again and you
 * get the same draft back, confirm the same draft twice and the second call
 * finds it already committed and reports instead of re-inserting.
 */

// ---------------------------------------------------------------------------
// History reads (production history table and dashboard card)
// ---------------------------------------------------------------------------

export async function listImports(
  userId: string,
  limit = 20,
): Promise<ImportSummary[]> {
  await dbConnect();

  const documents = await StatementImport.find({
    userId: new Types.ObjectId(userId),
    status: "committed",
  })
    .select(
      "status originalFileName detectedFormat createdAt statementPeriod totals result",
    )
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  return (documents as unknown as StatementImportDoc[]).map(toImportSummary);
}

export async function latestImport(
  userId: string,
): Promise<ImportSummary | null> {
  const [latest] = await listImports(userId, 1);
  return latest ?? null;
}

function toImportSummary(document: StatementImportDoc): ImportSummary {
  return {
    id: String(document._id),
    status: document.status,
    fileName: document.originalFileName,
    format: document.detectedFormat,
    createdAt: document.createdAt?.toISOString() ?? new Date(0).toISOString(),
    periodFrom: document.statementPeriod?.from
      ? document.statementPeriod.from.toISOString()
      : null,
    periodTo: document.statementPeriod?.to
      ? document.statementPeriod.to.toISOString()
      : null,
    rowsParsed: document.totals?.parsed ?? 0,
    inserted: document.result?.inserted ?? 0,
    skipped: document.result?.skipped ?? 0,
    invalid: document.result?.invalid ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Preview builder — turns freshly parsed rows into preview rows, marking
// duplicates with an explained reason — exactly what the preview table shows.
// ---------------------------------------------------------------------------

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

  const existingRows = (await Transaction.find({
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
        // Already in the ledger: never re-insert it by accident. The user can
        // still tick the box on purpose if they truly want a second copy.
        selected: false,
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

  // The local AI tier only sees rows whose keyword rules were not confident
  // AND that would actually be inserted — duplicates need no suggestions,
  // and rows the rules already named never cost a model pass.
  const unsureRows: Array<{ rowIndex: number; narration: string }> = [];
  for (let i = 0; i < parsed.length; i++) {
    const previewRow = rows[i];
    const parsedRow = parsed[i];
    if (
      previewRow &&
      previewRow.verdict === "new" &&
      parsedRow &&
      !parsedRow.categoryConfident
    ) {
      unsureRows.push({ rowIndex: i, narration: previewRow.narration });
    }
  }

  const suggestions = await suggestCategories(
    unsureRows.map((unsure) => unsure.narration),
  );
  for (const { index, suggestion } of suggestions) {
    const target = rows[unsureRows[index]?.rowIndex];
    if (!target) continue;
    target.aiCategory = suggestion.category;
    target.aiConfidence = suggestion.confidence;
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
    // `title` and `recipient` come from the parser running the legacy
    // extractPartyAndTitle rules (UPI/POS/keyword handling) — never raw text.
    title: row.title,
    recipient: row.recipient,
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
    categoryConfident: row.categoryConfident,
    // The AI tier fills these after the rules have had their say.
    aiCategory: null,
    aiConfidence: null,
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

function sha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

/**
 * The statement's own final running balance becomes (or refreshes) the
 * account's balance anchor, so the dashboard balance stays trustworthy
 * after every import. The balance rows on or before `asOfDate` are the
 * anchor's past and are excluded from the ledger sum — no double count.
 *
 * Never regresses: an older statement cannot overwrite a newer anchor.
 * Best-effort: the rows are already written when this runs, so an anchor
 * failure is reported in `result.anchorUpdated` rather than failing the
 * whole confirm.
 */
export async function refreshAnchorFromRows(
  userId: string,
  accountId: Types.ObjectId,
  rows: Array<{ txnDate?: string | null; rowNumber: number; balanceAfterPaise?: number | null }>,
  fileName: string,
  importId: Types.ObjectId,
): Promise<boolean> {
  const balanceRows = rows
    .map((row): { txnDate: string; rowNumber: number; balanceAfterPaise: number } | null =>
      typeof row.balanceAfterPaise === "number" && typeof row.txnDate === "string"
        ? { txnDate: row.txnDate, rowNumber: row.rowNumber, balanceAfterPaise: row.balanceAfterPaise }
        : null,
    )
    .filter((row): row is NonNullable<typeof row> => row !== null)
    .sort((a, b) =>
      a.txnDate === b.txnDate ? a.rowNumber - b.rowNumber : a.txnDate < b.txnDate ? -1 : 1,
    );
  const ending = balanceRows[balanceRows.length - 1];
  if (!ending) return false;

  const asOfDate = utcMidnight(new Date(`${ending.txnDate}T00:00:00Z`));

  const account = await Account.findOne(
    { _id: accountId, userId: new Types.ObjectId(userId) },
    { balanceAnchor: 1 },
  ).lean<AccountDoc>();
  if (!account) return false;

  if (
    account.balanceAnchor &&
    account.balanceAnchor.asOfDate.getTime() > asOfDate.getTime()
  ) {
    return false;
  }

  const updated = await Account.updateOne(
    { _id: account._id, userId: new Types.ObjectId(userId) },
    {
      $set: {
        balanceAnchor: {
          balancePaise: ending.balanceAfterPaise ?? 0,
          asOfDate,
          source: "statement",
          importId,
          note: fileName,
          setAt: new Date(),
        },
      },
    },
  );
  return Boolean(updated.acknowledged && updated.modifiedCount > 0);
}

export type ConfirmImportPayload = {
  fileName: string;
  fileSize?: number;
  detectedFormat?: string;
  periodFrom?: string | null;
  periodTo?: string | null;
  closingBalancePaise?: number | null;
  rows: PreviewRowDoc[];
};

/**
 * Confirms in-memory preview rows directly into the ledger without intermediate DB draft.
 * USER RULE: Creates a StatementImport record ONLY if at least 1 row was imported (inserted >= 1).
 */
export async function confirmImportRows(
  userId: string,
  payload: ConfirmImportPayload,
): Promise<{ inserted: number; skipped: number }> {
  await dbConnect();

  const account = await Account.findOne({ userId: new Types.ObjectId(userId) });
  if (!account) {
    throw codedError("NOT_FOUND", "No account is linked to this ledger yet.");
  }

  const writable = payload.rows.filter(
    (row) =>
      row.selected &&
      row.verdict !== "invalid" &&
      typeof row.amountPaise === "number" &&
      row.amountPaise > 0,
  );

  if (!writable.length) {
    return { inserted: 0, skipped: 0 };
  }

  const importId = new Types.ObjectId();
  const documents = writable.map((row) => {
    const rawDate = row.txnDate ? new Date(`${row.txnDate}T00:00:00Z`) : new Date();
    const txnDate = isNaN(rawDate.getTime()) ? new Date() : utcMidnight(rawDate);

    return {
      userId: new Types.ObjectId(userId),
      accountId: account._id,
      title: row.title || row.narration?.slice(0, 100) || "Bank Transaction",
      description: row.narration || "",
      recipient: row.recipient || "",
      category: row.category ?? "Others",
      amount: fromPaise(row.amountPaise ?? 0),
      isExpense: row.direction === "debit",
      date: txnDate,
      reviewed: false,
      reviewedAt: null,
      amountPaise: row.amountPaise ?? 0,
      direction: row.direction ?? "debit",
      txnDate,
      balanceAfterPaise: row.balanceAfterPaise ?? null,
      balance:
        typeof row.balanceAfterPaise === "number"
          ? row.balanceAfterPaise / 100
          : null,
      referenceNumber: row.referenceNumber ?? null,
      dedupeKey: row.dedupeKey ?? null,
      importId,
      importRowNumber: row.rowNumber,
      rawRow: row.raw ?? [],
      isOnline: (row.narration || "").toUpperCase().includes("UPI"),
    };
  });

  let insertedCount = 0;
  try {
    const inserted = await Transaction.insertMany(documents, { ordered: false });
    insertedCount = inserted.length;
  } catch {
    insertedCount = await Transaction.countDocuments({ importId });
  }

  const anchorUpdated = await refreshAnchorFromRows(
    userId,
    account._id,
    payload.rows,
    payload.fileName,
    importId,
  );

  // USER RULE: Only save history if at least 1 row was imported!
  if (insertedCount >= 1) {
    const fromDate = payload.periodFrom ? new Date(payload.periodFrom) : null;
    const toDate = payload.periodTo ? new Date(payload.periodTo) : null;
    const statementPeriod =
      fromDate && toDate && !isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())
        ? { from: fromDate, to: toDate }
        : null;

    const fileHash = sha256(
      Buffer.from(`${userId}:${payload.fileName}:${Date.now()}`),
    );

    await StatementImport.create({
      _id: importId,
      userId: new Types.ObjectId(userId),
      accountId: account._id,
      status: "committed",
      originalFileName: payload.fileName,
      fileSize: payload.fileSize ?? 0,
      fileSha256: fileHash,
      detectedFormat: payload.detectedFormat ?? "EXCEL",
      statementPeriod,
      statementOpeningBalancePaise: null,
      statementClosingBalancePaise: payload.closingBalancePaise ?? null,
      rows: payload.rows,
      totals: {
        parsed: payload.rows.length,
        valid: payload.rows.filter((r) => r.verdict !== "invalid").length,
        invalid: payload.rows.filter((r) => r.verdict === "invalid").length,
        new: payload.rows.filter((r) => r.verdict === "new").length,
        possibleDuplicate: payload.rows.filter(
          (r) => r.verdict === "duplicate" || r.verdict === "possible",
        ).length,
        selected: writable.length,
      },
      result: {
        inserted: insertedCount,
        skipped: writable.length - insertedCount,
        invalid: payload.rows.filter((r) => r.verdict === "invalid").length,
        anchorUpdated,
      },
      idempotencyKey: `import-${importId.toString()}`,
      committedAt: new Date(),
    });
  }

  return {
    inserted: insertedCount,
    skipped: writable.length - insertedCount,
  };
}
