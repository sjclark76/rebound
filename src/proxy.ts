import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only: pages still verify the session via requireSession().
export function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api/auth|api/health|login|icons|manifest.webmanifest|apple-icon|icon|favicon.ico|_next).*)"],
};
