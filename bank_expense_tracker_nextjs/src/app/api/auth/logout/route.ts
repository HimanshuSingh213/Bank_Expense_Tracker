import { fail, isSameOrigin, ok } from "@/lib/api";
import { endSession } from "@/lib/auth";

/** POST /api/auth/logout — clears the cookie. */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return fail("FORBIDDEN", "This request did not come from the application.", 403);
  }

  await endSession();
  return ok({ signedOut: true });
}
