import { Types } from "mongoose";
import { clientIp, fail, isSameOrigin, ok } from "@/lib/api";
import { getSession } from "@/lib/auth/session";
import { rateLimit } from "@/lib/auth/rate-limit";
import { getPrimaryAccountDoc } from "@/lib/data/accounts";
import { parseTableRows } from "@/helpers/statement-parser/table-parser";
import { readStatementWorkbook } from "@/helpers/statement-parser/workbook-reader";
import { buildPreviewRows } from "@/lib/data/imports.parse";
import { createImportDraft, ImportError } from "@/lib/data/imports.write";
import { publicErrorMessage } from "@/lib/errors";

/**
 * POST /api/imports — the "analyze" step.
 *
 * Excel only (the user's decision): .xls / .xlsx up to 8 MB, optional
 * statement password. The file is parsed on the server with the ported
 * legacy parser; nothing touches `transactions` here — only the draft.
 */

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(["xls", "xlsx"]);

/** The draft shape the browser gets — no Mongo internals. */
function draftToJson(draft: Awaited<ReturnType<typeof createImportDraft>>["draft"]) {
  return {
    id: String(draft._id),
    fileName: draft.originalFileName,
    detectedFormat: draft.detectedFormat,
    periodFrom: draft.statementPeriod?.from?.toISOString() ?? null,
    periodTo: draft.statementPeriod?.to?.toISOString() ?? null,
    closingBalancePaise: draft.statementClosingBalancePaise,
    totals: draft.totals,
    rows: draft.rows,
  };
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return fail("PASSWORD_REQUIRED", "Sign in first.", 401);

  if (!isSameOrigin(request)) {
    return fail("FORBIDDEN", "This request did not come from the application.", 403);
  }

  const limit = rateLimit(`import:${clientIp(request)}`, 10, 60_000);
  if (!limit.allowed) {
    return fail("RATE_LIMITED", "Too many analyses. Wait a moment.", 429);
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail("VALIDATION_ERROR", "The upload could not be read.", 400);
  }

  const rawFile = form.get("file");
  if (!(rawFile instanceof File)) {
    return fail("VALIDATION_ERROR", "Choose an Excel statement file.", 400);
  }

  const extension = rawFile.name.split(".").pop()?.toLowerCase() ?? "";
  if (!ALLOWED.has(extension)) {
    return fail(
      "UNSUPPORTED_FORMAT",
      `Only Excel statements (.xls, .xlsx) are accepted — not .${extension || "unknown"}.`,
      400,
    );
  }

  if (rawFile.size > MAX_BYTES) {
    return fail("FILE_TOO_LARGE", "The file is larger than 8 MB.", 400);
  }

  const password = String(form.get("password") ?? "").trim();
  const account = await getPrimaryAccountDoc(session.userId);
  if (!account) {
    return fail("NOT_FOUND", "No account is linked to this ledger yet.", 404);
  }

  const buffer = Buffer.from(await rawFile.arrayBuffer());
  const detectedFormatParts: string[] = [extension.toUpperCase()];

  try {
    const workbook = await readStatementWorkbook(buffer, password);
    detectedFormatParts.push(workbook.sheetName, workbook.strategy);

    const parsed = parseTableRows(workbook.rows);

    if (!parsed.transactions.length) {
      return fail(
        "UNSUPPORTED_LAYOUT",
        "No transaction rows were found. Check the file has Date and Narration columns.",
        400,
      );
    }

    const { rows, counts } = await buildPreviewRows(
      session.userId,
      account._id,
      parsed.transactions,
    );

    const { draft } = await createImportDraft(
      session.userId,
      new Types.ObjectId(String(account._id)),
      {
        fileName: rawFile.name,
        fileSize: rawFile.size,
        buffer,
        detectedFormat: `${detectedFormatParts.join(" / ")}`,
      },
      {
        transactions: parsed.transactions,
        previewRows: rows,
        closingBalancePaise: parsed.closingBalancePaise,
      },
    );

    return ok({ draft: draftToJson(draft), counts });
  } catch (error) {
    console.error("Import analyze failed:", error);

    if (error instanceof ImportError) {
      return fail("IMPORT_FAILED", error.message, 400);
    }

    const message = error instanceof Error ? error.message : String(error);
    const passwordRequired =
      (error as { passwordRequired?: boolean })?.passwordRequired === true ||
      /password required/i.test(message);

    if (passwordRequired) {
      return fail(
        "INVALID_FILE_PASSWORD",
        "Password required to unlock this bank statement.",
        401,
      );
    }

    if (/incorrect password/i.test(message)) {
      return fail(
        "INVALID_FILE_PASSWORD",
        "Incorrect password. The statement could not be decrypted with this password.",
        401,
      );
    }

    return fail("IMPORT_FAILED", publicErrorMessage(error), 500);
  }
}
