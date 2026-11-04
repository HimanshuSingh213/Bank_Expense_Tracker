import { fail, ok } from "@/lib/api";
import { getSession, getUserById } from "@/lib/auth";

/** GET /api/auth/session — who the verified cookie belongs to. */
export async function GET() {
  const session = await getSession();

  if (!session) {
    return fail("SESSION_EXPIRED", "Sign in to continue.", 401);
  }

  const user = await getUserById(session.userId);

  if (!user) {
    return fail("SESSION_EXPIRED", "Sign in to continue.", 401);
  }

  return ok({ id: String(user._id), name: user.name, email: user.email });
}
