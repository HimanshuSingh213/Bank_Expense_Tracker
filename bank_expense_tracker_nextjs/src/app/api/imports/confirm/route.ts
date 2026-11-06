import { z } from "zod";
import { fail, isSameOrigin, ok, respondToError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import { confirmImportRows } from "@/lib/data/imports";
import type { PreviewRowDoc } from "@/models/statement-import.model";

/**
 * POST /api/imports/confirm — writes the confirmed preview rows to the ledger.
 * No intermediate draft document in Mongo.
 * USER RULE: A StatementImport history document is created ONLY if inserted >= 1.
 */

const confirmBodySchema = z.object({
  fileName: z.string().min(1),
  fileSize: z.number().int().nonnegative().optional(),
  detectedFormat: z.string().optional(),
  periodFrom: z.string().nullable().optional(),
  periodTo: z.string().nullable().optional(),
  closingBalancePaise: z.number().nullable().optional(),
  rows: z.array(
    z.object({
      rowNumber: z.number().int(),
      raw: z.array(z.string()).optional(),
      title: z.string().optional(),
      recipient: z.string().optional(),
      txnDate: z.string().nullable().optional(),
      valueDate: z.string().nullable().optional(),
      narration: z.string(),
      referenceNumber: z.string().nullable().optional(),
      direction: z.enum(["debit", "credit"]).nullable().optional(),
      amountPaise: z.number().nullable().optional(),
      balanceAfterPaise: z.number().nullable().optional(),
      verdict: z.enum(["new", "duplicate", "possible", "invalid"]),
      reason: z.string().nullable().optional(),
      selected: z.boolean(),
      category: z.string().optional(),
      categoryConfident: z.boolean().optional(),
      aiCategory: z.string().nullable().optional(),
      aiConfidence: z.number().nullable().optional(),
      dedupeKey: z.string().nullable().optional(),
    }),
  ),
});

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return fail("PASSWORD_REQUIRED", "Sign in first.", 401);

  if (!isSameOrigin(request)) {
    return fail("FORBIDDEN", "This request did not come from the application.", 403);
  }

  const json = await request.json().catch(() => null);
  const parsed = confirmBodySchema.safeParse(json);
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "The import confirmation payload was invalid.", 400);
  }

  try {
    const result = await confirmImportRows(session.userId, {
      ...parsed.data,
      rows: parsed.data.rows as unknown as PreviewRowDoc[],
    });
    return ok(result);
  } catch (error) {
    return respondToError(error) ?? fail("IMPORT_FAILED", "The import could not be written.", 500);
  }
}
