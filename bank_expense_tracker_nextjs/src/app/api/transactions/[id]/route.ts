import { fail, isSameOrigin, ok, publicErrorMessage, respondToError } from "@/lib/api";
import { getSession } from "@/lib/auth";
import {
  softDeleteTransaction,
  updateTransaction,
  setTransactionReviewed,
} from "@/lib/data/transactions";
import { updateTransactionSchema, reviewTransactionSchema } from "@/validations/transaction.validation";

/**
 * Edit and delete one row. There is no POST here on purpose: transactions
 * only enter the ledger through the XLS import flow, never typed by hand.
 *
 * Ownership is enforced inside the data functions — a row that belongs to
 * nobody else can never be edited or deleted by this route.
 */

type RouteContext = { params: Promise<{ id: string }> };

/** PATCH /api/transactions/[id] — edit fields, or flip "reviewed". */
export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return fail("PASSWORD_REQUIRED", "Sign in first.", 401);

  if (!isSameOrigin(request)) return fail("FORBIDDEN", "This request did not come from the application.", 403);

  const { id } = await context.params;
  const body = await request.json().catch(() => null);

  try {
    // Only 'reviewed' in the body: flip it without amount/date validation.
    if (body && Object.keys(body).length === 1 && "reviewed" in body) {
      const parsed = reviewTransactionSchema.safeParse(body);
      if (!parsed.success) {
        return fail("VALIDATION_ERROR", "Invalid reviewed value.", 400, parsed.error.flatten().fieldErrors);
      }
      return ok(await setTransactionReviewed(session.userId, id, parsed.data.reviewed));
    }

    const parsed = updateTransactionSchema.safeParse(body);
    if (!parsed.success) {
      return fail("VALIDATION_ERROR", "Check the values you entered.", 400, parsed.error.flatten().fieldErrors);
    }
    return ok(await updateTransaction(session.userId, id, parsed.data));
  } catch (error) {
    return respondToError(error) ?? fail("UNKNOWN", publicErrorMessage(error), 500);
  }
}

/** DELETE /api/transactions/[id] — soft delete; the row can be recovered. */
export async function DELETE(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return fail("PASSWORD_REQUIRED", "Sign in first.", 401);

  if (!isSameOrigin(request)) return fail("FORBIDDEN", "This request did not come from the application.", 403);

  const { id } = await context.params;

  try {
    return ok(await softDeleteTransaction(session.userId, id));
  } catch (error) {
    return respondToError(error) ?? fail("UNKNOWN", publicErrorMessage(error), 500);
  }
}
