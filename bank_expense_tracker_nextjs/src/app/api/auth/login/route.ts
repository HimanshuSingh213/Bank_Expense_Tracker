import { clientIp, fail, isSameOrigin, ok } from "@/lib/api";
import { verifyPassword } from "@/lib/auth/password";
import { rateLimit } from "@/lib/auth/rate-limit";
import { startSession } from "@/lib/auth/session";
import {
  findPasswordUser,
  SetupError,
  SetupDoneError,
} from "@/lib/data/users";
import { loginSchema } from "@/validations/auth.validation";

/**
 * POST /api/auth/login
 *
 * Verifies against the bcrypt hash on the user document in `userinfos`.
 * Failures return the same message and take the same time whether the
 * password was wrong or no account exists yet — nothing leaks by timing.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return fail("FORBIDDEN", "This request did not come from the application.", 403);
  }

  const ip = clientIp(request);
  const perIp = rateLimit(`login:ip:${ip}`, 5, 15 * 60 * 1000);
  const global = rateLimit("login:global", 10, 60 * 60 * 1000);

  if (!perIp.allowed || !global.allowed) {
    const retryAfterSeconds = Math.max(
      perIp.retryAfterSeconds,
      global.retryAfterSeconds,
    );

    return fail(
      "RATE_LIMITED",
      `Too many attempts. Try again in ${Math.ceil(retryAfterSeconds / 60)} minutes.`,
      429,
      { retryAfterSeconds },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);

  if (!parsed.success) {
    return fail("VALIDATION_ERROR", "Enter your password.", 400);
  }

  try {
    const user = await findPasswordUser();

    if (!user) {
      await new Promise((resolve) => setTimeout(resolve, 300));
      return fail("UNKNOWN", "The account setup has not been done yet.", 400);
    }

    const valid = await verifyPassword(parsed.data.password, user.passwordHash);

    if (!valid) {
      // A fixed delay floor so a wrong password is not distinguishable by timing.
      await new Promise((resolve) => setTimeout(resolve, 300));
      return fail("INVALID_CREDENTIALS", "That password is not correct.", 401);
    }

    await startSession(String(user._id));

    return ok({ id: String(user._id), name: user.name, email: user.email });
  } catch (error) {
    if (error instanceof SetupError || error instanceof SetupDoneError) {
      return fail("UNKNOWN", error.message, 500);
    }
    throw error;
  }
}
