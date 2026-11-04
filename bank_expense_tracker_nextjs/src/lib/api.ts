import { NextResponse } from "next/server";
import type { ApiErrorCode, ApiErrorResponse, ApiSuccessResponse } from "@/types/api";

/** Every successful API response has this shape. */
export function ok<T>(data: T, status = 200) {
  const body: ApiSuccessResponse<T> = { success: true, data };
  return NextResponse.json(body, { status });
}

/** Every failure has this shape, with a stable machine-readable code. */
export function fail(
  code: ApiErrorCode,
  message: string,
  status: number,
  details?: unknown,
) {
  const body: ApiErrorResponse = { success: false, error: message, code };
  if (details !== undefined) body.details = details;
  return NextResponse.json(body, { status });
}

/**
 * CSRF defence for state-changing requests: the browser must have sent this
 * request from our own origin. SameSite=Lax already blocks the common cases,
 * this closes the rest.
 */
export function isSameOrigin(request: Request): boolean {
  const expected = process.env.APP_URL;
  if (!expected) return false;

  const origin = request.headers.get("origin");
  if (origin) return sameOriginValue(origin, expected);

  const referer = request.headers.get("referer");
  if (referer) return sameOriginValue(referer, expected);

  return false;
}

function sameOriginValue(value: string, expected: string): boolean {
  try {
    return new URL(value).origin === new URL(expected).origin;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Errors
//
// One error shape for the whole codebase: a plain `Error` carrying the machine
// code a route needs. No classes and no `instanceof` — the code travels with it.
// ---------------------------------------------------------------------------

/** Throws an `Error` tagged with the response code its route should answer with. */
export function codedError(code: ApiErrorCode, message: string): Error {
  const error = new Error(message);
  (error as { code?: ApiErrorCode }).code = code;
  return error;
}

/** The code a thrown error carries, or null when it is not one of ours. */
export function errorCode(error: unknown): ApiErrorCode | null {
  if (!(error instanceof Error)) return null;
  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? (code as ApiErrorCode) : null;
}

/** HTTP status a coded error answers with. */
const STATUS_BY_CODE: Partial<Record<ApiErrorCode, number>> = {
  NOT_FOUND: 404,
  CONFLICT: 409,
  VALIDATION_ERROR: 400,
  IMPORT_STATE: 409,
  AI_UNAVAILABLE: 503,
};

/**
 * The one place a thrown error becomes a response. Data-layer functions tag
 * their errors with a code; every route's catch is just this call, falling
 * back to UNKNOWN when something unplanned escapes.
 */
export function respondToError(error: unknown): NextResponse | null {
  const code = errorCode(error);
  if (!code) return null;

  const status = STATUS_BY_CODE[code];
  if (!status) return null;

  const message = error instanceof Error && error.message ? error.message : code;
  return fail(code, message, status);
}

/**
 * Turns a thrown error into something safe to show a person.
 * The detail is logged server-side; the browser never sees a connection
 * string, a stack trace, or a MongoDB host.
 */
export function publicErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error);

  if (message.includes("MONGODB_URI")) {
    return "The database is not configured. Copy .env.example to .env.local and set MONGODB_URI.";
  }

  if (
    message.includes("Could not connect") ||
    message.includes("Server selection") ||
    message.includes("timed out")
  ) {
    return "The database could not be reached. Check that MongoDB is running and that MONGODB_URI is correct.";
  }

  return "The server could not complete this request. The details were logged.";
}
