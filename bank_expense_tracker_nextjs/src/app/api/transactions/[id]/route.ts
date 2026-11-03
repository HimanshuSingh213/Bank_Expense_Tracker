import { fail, isSameOrigin, ok } from "@/lib/api";
import { getSession } from "@/lib/auth/session";
import { rateLimit } from "@/lib/auth/rate-limit";
import { clientIp } from "@/lib/api";
import {
  DuplicateTransactionError,
  TransactionNotFoundError,
  TransactionWriteError,
  softDeleteTransaction,
  updateTransaction,
} from "@/lib/data/transactions.write";
import { publicErrorMessage } from "@/lib/errors";
import { updateTransactionSchema } from "@/validations/transaction.validation";

/**
 * Edit and delete one row. There is no POST here on purpose: transactions
 * only enter the ledger through the XLS import flow, never typed by hand.
 *
 * Every branch starts the same way — session, ownership is enforced inside
 * the data functions, so a row that belongs to nobody else can never be
 * edited or deleted by this route.
 */

type RouteContext = { params: Promise<{ id: string }> };

function failureOf(error: unknown) {
  if (error instanceof TransactionNotFoundError) {
    return fail("NOT_FOUND", error.message, 404);
  }
  if (error instanceof DuplicateTransactionError) {
    return fail("CONFLICT", error.message, 409);
  }
  if (error instanceof TransactionWriteError) {
    return fail("VALIDATION_ERROR", error.message, 400);
  }
  return null;
}

/** PATCH /api/transactions/[id] — edit fields, or flip "reviewed". */
export async function PATCH(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return fail("PASSWORD_REQUIRED", "Sign in first.", 401);

  if (!isSameOrigin(request)) {
    return fail("FORBIDDEN", "This request did not come from the application.", 403);
  }

  const limit = rateLimit(`txn-write:${clientIp(request)}`, 20, 60_000);
  if (!limit.allowed) {
    return fail("RATE_LIMITED", "Too many changes. Wait a moment.", 429);
  }

  const { id } = await context.params;
  const body = await request.json().catch(() => null);
  const parsed = updateTransactionSchema.safeParse(body);

  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "Check the values you entered.", 400,
      parsed.error.flatten().fieldErrors);
  }

  try {
    const updated = await updateTransaction(session.userId, id, parsed.data);
    return ok(updated);
  } catch (error) {
    console.error("Transaction update failed:", error);
    const mapped = failureOf(error);
    if (mapped) return mapped;
    return fail("UNKNOWN", publicErrorMessage(error), 500);
  }
}

/** DELETE /api/transactions/[id] — soft delete; the row can be recovered. */
export async function DELETE(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return fail("PASSWORD_REQUIRED", "Sign in first.", 401);

  if (!isSameOrigin(request)) {
    return fail("FORBIDDEN", "This request did not come from the application.", 403);
  }

  const limit = rateLimit(`txn-write:${clientIp(request)}`, 20, 60_000);
  if (!limit.allowed) {
    return fail("RATE_LIMITED", "Too many changes. Wait a moment.", 429);
  }

  const { id } = await context.params;

  try {
    const deleted = await softDeleteTransaction(session.userId, id);
    return ok(deleted);
  } catch (error) {
    console.error("Transaction delete failed:", error);
    const mapped = failureOf(error);
    if (mapped) return mapped;
    return fail("UNKNOWN", publicErrorMessage(error), 500);
  }
}
