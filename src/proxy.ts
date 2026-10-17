import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Next.js 16 Proxy convention for perimeter route interception and redirects.
 * Note: Authentication and authorization are also enforced defense-in-depth
 * at Server Component pages and API Route Handlers.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Protected route patterns
  const isDashboardRoute = pathname.startsWith("/dashboard");
  const isAccountRoute = pathname.startsWith("/account");
  const isAdminRoute = pathname.startsWith("/admin");

  if (!isDashboardRoute && !isAccountRoute && !isAdminRoute) {
    return NextResponse.next();
  }

  // Check for presence of database session cookie
  const sessionToken =
    request.cookies.get("__Secure-authjs.session-token")?.value ||
    request.cookies.get("authjs.session-token")?.value;

  if (!sessionToken) {
    const signInUrl = new URL("/auth/signin", request.url);
    // Sanitize callback destination to prevent open redirects
    const safeCallback = pathname.startsWith("/") ? pathname : "/";
    signInUrl.searchParams.set("callbackUrl", safeCallback);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/account/:path*", "/admin/:path*"],
};
