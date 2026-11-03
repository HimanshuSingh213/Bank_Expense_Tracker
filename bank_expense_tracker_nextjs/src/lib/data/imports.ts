import { Types } from "mongoose";
import { dbConnect } from "@/lib/dbConnect";
import { StatementImport, type StatementImportDoc } from "@/models/statement-import.model";
import type { ImportSummary } from "@/types/import";

/**
 * Import history. Every query is scoped to the signed-in owner, and `rows` is
 * never selected here — the preview lives on the import's own page.
 */
export async function listImports(
  userId: string,
  limit = 20,
): Promise<ImportSummary[]> {
  await dbConnect();

  const documents = await StatementImport.find({
    userId: new Types.ObjectId(userId),
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
