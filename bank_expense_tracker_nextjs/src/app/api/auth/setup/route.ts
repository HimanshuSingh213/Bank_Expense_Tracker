import { fail, isSameOrigin, ok, publicErrorMessage } from "@/lib/api";
import { completeSetup, hashPassword, startSession } from "@/lib/auth";
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
    const message = error instanceof Error ? error.message : "Setup refused.";
    if (message.includes("already exists")) {
      return fail("CONFLICT", message, 409);
    }
    return fail("UNKNOWN", publicErrorMessage(error), 500);
  }
}
