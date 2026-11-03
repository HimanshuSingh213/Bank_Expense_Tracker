import { getSession, type Session } from "@/lib/auth/session";

/** Thrown when a route or server action has no verified session. */
export class SessionExpiredError extends Error {
  constructor() {
    super("Your session has expired. Sign in again.");
    this.name = "SessionExpiredError";
  }
}

/**
 * The only way a request learns who the user is. The id comes from the signed
 * cookie, never from a body, query string, or header.
 */
export async function requireSession(): Promise<Session> {
  const session = await getSession();
  if (!session) throw new SessionExpiredError();
  return session;
}

/**
 * Converts a thrown error into the HTTP status and code the client expects.
 * Kept here so every route handles session loss the same way.
 */
export function sessionErrorResponse(error: unknown): {
  code: "SESSION_EXPIRED" | null;
} {
  return { code: error instanceof SessionExpiredError ? "SESSION_EXPIRED" : null };
}
