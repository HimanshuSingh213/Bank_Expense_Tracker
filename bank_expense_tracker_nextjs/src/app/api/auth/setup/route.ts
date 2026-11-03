import { clientIp, fail, isSameOrigin, ok } from "@/lib/api";
import { hashPassword } from "@/lib/auth/password";
import { rateLimit } from "@/lib/auth/rate-limit";
import { startSession } from "@/lib/auth/session";
import { completeSetup, SetupDoneError, SetupError } from "@/lib/data/users";
import { setupApiSchema } from "@/validations/auth.validation";

/**
 * POST /api/auth/setup
 *
 * The one-time owner creation. It succeeds exactly once: after any account
 * owns a password this route refuses, and the browser is sent to /login.
 */
export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return fail("FORBIDDEN", "This request did not come from the application.", 403);
  }

  const ip = clientIp(request);
  // Strict on purpose: setup happens once, from one machine.
  const perIp = rateLimit(`setup:ip:${ip}`, 5, 60 * 60 * 1000);

  if (!perIp.allowed) {
    return fail(
      "RATE_LIMITED",
      `Too many attempts. Try again in ${Math.ceil(perIp.retryAfterSeconds / 60)} minutes.`,
      429,
      { retryAfterSeconds: perIp.retryAfterSeconds },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = setupApiSchema.safeParse(body);

  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((issue) => issue.message)
      .join(" ");
    return fail("VALIDATION_ERROR", issues || "Check the form and try again.", 400);
  }

  try {
    const user = await completeSetup({
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash: await hashPassword(parsed.data.password),
    });

    // Sign straight in; the person never needs to type the password twice.
    await startSession(String(user._id));

    return ok({ id: String(user._id), name: user.name, email: user.email });
  } catch (error) {
    if (error instanceof SetupDoneError || error instanceof SetupError) {
      return fail("CONFLICT", error.message, 409);
    }
    throw error;
  }
}
