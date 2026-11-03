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

/** Client IP for rate limiting, as seen by the Next.js server. */
export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") ?? "unknown";
}
