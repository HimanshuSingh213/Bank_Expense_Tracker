import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/auth";

/**
 * Edge-level convenience only: it checks that a session cookie is *present*.
 * It cannot reach the database here, and it is not the security boundary —
 * every page and route re-verifies the cookie through `getSession()`.
 */
export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Never redirect away from login or setup at proxy level —
  // those pages check real database session validity via getSession().
  if (pathname.startsWith("/login") || pathname.startsWith("/setup")) {
    return NextResponse.next();
  }

  const hasCookie = request.cookies.has(SESSION_COOKIE);
  if (hasCookie) return NextResponse.next();

  const login = new URL("/login", request.url);
  if (pathname !== "/") login.searchParams.set("next", pathname);

  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/auth).*)"],
};
