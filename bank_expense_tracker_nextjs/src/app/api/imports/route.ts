import { fail, isSameOrigin, ok, publicErrorMessage } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { getPrimaryAccountDoc } from "@/lib/data/accounts";
import { buildPreviewRows } from "@/lib/data/imports";
import { parseTableRows } from "@/helpers/statement-parser/table-parser";
import { readStatementWorkbook } from "@/helpers/statement-parser/workbook-reader";

/**
 * POST /api/imports — the "analyze" step.
 *
 * Excel only (the user's decision): .xls / .xlsx up to 8 MB, optional
 * statement password. The file is parsed on the server with the ported
 * legacy parser; nothing is saved to DB here — drafts remain in-memory
 * on the client until confirm.
 */

const MAX_BYTES = 8 * 1024 * 1024;
const ALLOWED = new Set(["xls", "xlsx"]);

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return fail("PASSWORD_REQUIRED", "Sign in first.", 401);

  if (!isSameOrigin(request)) {
    return fail("FORBIDDEN", "This request did not come from the application.", 403);
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

  const userPassword = String(form.get("password") ?? "").trim();
  const envPassword = (process.env.STATEMENT_PASSWORD ?? "").trim();
  const password = userPassword || envPassword;
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

    const periodFrom = parsed.transactions.at(0)?.date?.toISOString() ?? null;
    const periodTo = parsed.transactions.at(-1)?.date?.toISOString() ?? null;

    const draft = {
      id: "preview",
      fileName: rawFile.name,
      fileSize: rawFile.size,
      detectedFormat: detectedFormatParts.join(" / "),
      periodFrom,
      periodTo,
      closingBalancePaise: parsed.closingBalancePaise,
      totals: {
        parsed: rows.length,
        valid: rows.filter((r) => r.verdict !== "invalid").length,
        invalid: rows.filter((r) => r.verdict === "invalid").length,
        new: rows.filter((r) => r.verdict === "new").length,
        possibleDuplicate: rows.filter(
          (r) => r.verdict === "duplicate" || r.verdict === "possible",
        ).length,
        selected: rows.filter((r) => r.selected).length,
      },
      rows,
    };

    return ok({ draft, counts });
  } catch (error) {
    console.error("Import analyze failed:", error);

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
      if (!userPassword) {
        return fail(
          "INVALID_FILE_PASSWORD",
          "Password required to unlock this bank statement.",
          401,
        );
      }
      return fail(
        "INVALID_FILE_PASSWORD",
        "Incorrect password. The statement could not be decrypted with this password.",
        401,
      );
    }

    return fail("IMPORT_FAILED", publicErrorMessage(error), 500);
  }
}
