import * as XLSX from "xlsx";
import * as officeCrypto from "officecrypto-tool";

/**
 * Reads an SBI Excel statement (.xls / .xlsx) into plain rows of cells.
 *
 * The strategy chain is the legacy backend's
 * (My Bank Expense Tracker/backend/server.js → /api/statement/decrypt-and-parse):
 *   1. Try a direct SheetJS read — unencrypted files, or files whose built-in
 *      reader handles the password.
 *   2. If that fails and a password is given, try every common variant the
 *      banks' customers actually use (see below), with officecrypto-tool
 *      which understands the standard Excel encryption containers.
 *   3. Anything else → a clear "encrypted / wrong password" error, never a
 *      half-read.
 *
 * Each attempt is deterministic: same bytes, same password, same result.
 */

export type WorkbookReadResult = {
  /** Every sheet as arrays of cells; the parser takes row objects. */
  rows: unknown[][];
  sheetName: string;
  /** Which strategy succeeded, recorded for import history. */
  strategy: "direct" | "decrypted";
};

export type WorkbookReadError = Error & {
  passwordRequired?: boolean;
};

const MAX_CELL_ROWS = 8_000;

/** Same variant generator the legacy backend used. */
export function generatePasswordVariants(password: string): string[] {
  if (!password) return [];

  const raw = password;
  const trimmed = raw.trim();
  const variants = new Set([
    raw,
    trimmed,
    trimmed.toUpperCase(),
    trimmed.toLowerCase(),
  ]);

  // Strip the separators banks put in dates: '05-04-1995' → '05041995'.
  const alphaNumericOnly = trimmed.replace(/[^a-zA-Z0-9]/g, "");
  if (alphaNumericOnly) {
    variants.add(alphaNumericOnly);
    variants.add(alphaNumericOnly.toUpperCase());
    variants.add(alphaNumericOnly.toLowerCase());
  }

  // An 8-digit date-of-birth (DDMMYYYY) also unlocks as DDMMYY, and around.
  if (/^\d{8}$/.test(alphaNumericOnly)) {
    variants.add(alphaNumericOnly.slice(0, 4) + alphaNumericOnly.slice(6, 8));
  } else if (/^\d{6}$/.test(alphaNumericOnly)) {
    variants.add(alphaNumericOnly.slice(0, 4) + "19" + alphaNumericOnly.slice(4, 6));
    variants.add(alphaNumericOnly.slice(0, 4) + "20" + alphaNumericOnly.slice(4, 6));
  }

  // A 10-digit mobile number might also be its last 4–5 digits.
  if (/^\d{10}$/.test(alphaNumericOnly)) {
    variants.add(alphaNumericOnly.slice(-4));
    variants.add(alphaNumericOnly.slice(-5));
  }

  return [...variants].filter(Boolean);
}

function toRows(workbook: XLSX.WorkBook): WorkbookReadResult {
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("The workbook has no sheets to read.");
  }

  const worksheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(worksheet, {
    header: 1,
    raw: false,
    defval: "",
  });

  return {
    rows: rows.slice(0, MAX_CELL_ROWS),
    sheetName,
    strategy: rows.length ? "direct" : "decrypted",
  };
}

/** Strategy 1: the plain reader, across every password variant. */
function readDirect(
  buffer: Buffer,
  variants: string[],
): { rows: unknown[][]; sheetName: string } | null {
  const passwords = variants.length ? variants : [""];

  for (const password of passwords) {
    try {
      const workbook = XLSX.read(buffer, {
        type: "buffer",
        cellDates: true,
        ...(password ? { password } : {}),
      });
      const { rows, sheetName } = toRows(workbook);
      if (rows.length) return { rows, sheetName };
    } catch {
      // keep trying variants
    }
  }

  return null;
}

/**
 * Reads and returns rows, or throws with clear wording:
 *  - "password required" → the UI shows the password box,
 *  - "incorrect password" → the given one is wrong,
 *  - anything else is a broken/unsupported file.
 */
export async function readStatementWorkbook(
  buffer: Buffer,
  password = "",
): Promise<WorkbookReadResult> {
  const variants = password ? generatePasswordVariants(password) : [];

  const direct = readDirect(
    buffer,
    variants,
  );

  if (direct) {
    return {
      rows: direct.rows,
      sheetName: direct.sheetName,
      strategy: "direct",
    };
  }

  // Strategy 2: officecrypto-tool decrypt, then a clean read.
  if (password) {
    let lastDecryptError: unknown = null;

    for (const variant of variants) {
      try {
        const decrypted = await officeCrypto.decrypt(buffer, {
          password: variant,
        });
        const decryptedBuffer = Buffer.isBuffer(decrypted)
          ? decrypted
          : Buffer.from(decrypted);

        const workbook = XLSX.read(decryptedBuffer, {
          type: "buffer",
          cellDates: true,
        });
        const { rows, sheetName } = toRows(workbook);

        if (rows.length) {
          return { rows, sheetName, strategy: "decrypted" };
        }
      } catch (error) {
        lastDecryptError = error;
      }
    }

    if (lastDecryptError) {
      const error = new Error(
        "Incorrect password. The statement could not be decrypted with this password.",
      ) as WorkbookReadError;
      error.passwordRequired = false;
      throw error;
    }
  }

  const passwordRequired = !password && /password|encrypted/i.test(
    (() => {
      try {
        XLSX.read(buffer, { type: "buffer", cellDates: true });
        return "";
      } catch (probeError) {
        return probeError instanceof Error ? probeError.message : String(probeError);
      }
    })(),
  );

  if (passwordRequired) {
    const error = new Error(
      "Password required to unlock this bank statement.",
    ) as WorkbookReadError;
    error.passwordRequired = true;
    throw error;
  }

  const error = new Error(
    "This Excel file could not be read. Export a new statement from YONO / OnlineSBI and try again.",
  ) as WorkbookReadError;
  error.passwordRequired = false;
  throw error;
}
