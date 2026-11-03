import { fail, isSameOrigin, ok } from "@/lib/api";
import { getSession } from "@/lib/auth/session";
import { rateLimit } from "@/lib/auth/rate-limit";
import { clientIp } from "@/lib/api";
import {
  ImportError,
  ImportNotFoundError,
  confirmImport,
} from "@/lib/data/imports.write";
import { publicErrorMessage } from "@/lib/errors";

/**
 * POST /api/imports/[id]/confirm — writes the drafted rows exactly once.
 * Download-only change to the ledger: new/selected rows insert, duplicates
 * and unselected rows do not, and the answer reports what landed.
 */

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const session = await getSession();
  if (!session) return fail("PASSWORD_REQUIRED", "Sign in first.", 401);

  if (!isSameOrigin(request)) {
    return fail("FORBIDDEN", "This request did not come from the application.", 403);
  }

  const limit = rateLimit(`import-confirm:${clientIp(request)}`, 10, 60_000);
  if (!limit.allowed) {
    return fail("RATE_LIMITED", "Too many confirms. Wait a moment.", 429);
  }

  const { id } = await context.params;

  try {
    const result = await confirmImport(session.userId, id);
    return ok(result);
  } catch (error) {
    console.error("Import confirm failed:", error);

    if (error instanceof ImportNotFoundError) {
      return fail("NOT_FOUND", error.message, 404);
    }
    if (error instanceof ImportError) {
      return fail("IMPORT_FAILED", error.message, 400);
    }

    return fail("IMPORT_FAILED", publicErrorMessage(error), 500);
  }
}
