import { fail, isSameOrigin, ok, publicErrorMessage, respondToError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import {
  bulkSetTransactionReviewed,
  bulkSoftDeleteTransactions,
} from "@/lib/data/transactions";
import { bulkTransactionSchema } from "@/validations/transaction.validation";

/**
 * POST /api/transactions/bulk — the table's multiselect delete and the
 * calculator's "mark reviewed" button.
 *
 * Delete stays a soft delete and ownership is part of every update filter,
 * so a foreign id in the body is ignored rather than an error.
 */
export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return fail("PASSWORD_REQUIRED", "Sign in first.", 401);

  if (!isSameOrigin(request)) return fail("FORBIDDEN", "This request did not come from the application.", 403);

  const body = await request.json().catch(() => null);
  const parsed = bulkTransactionSchema.safeParse(body);
  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "Check the rows you selected.", 400, parsed.error.flatten().fieldErrors);
  }

  try {
    const modified =
      parsed.data.action === "review"
        ? await bulkSetTransactionReviewed(session.userId, parsed.data.ids, parsed.data.reviewed)
        : await bulkSoftDeleteTransactions(session.userId, parsed.data.ids);

    return ok({ modified });
  } catch (error) {
    return respondToError(error) ?? fail("UNKNOWN", publicErrorMessage(error), 500);
  }
}
