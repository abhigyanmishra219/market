import { auth } from "@/lib/auth";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import { redirect } from "next/navigation";
import { Session } from "next-auth";

/**
 * Validates that a redirect URL is an internal relative path,
 * preventing open redirect attacks.
 */
export function validateSafeRedirect(
  targetUrl: string | null | undefined,
  fallback: string = "/"
): string {
  if (!targetUrl || typeof targetUrl !== "string") {
    return fallback;
  }

  const trimmed = targetUrl.trim();

  // Must begin with a single slash and not double slash (protocol-relative) or backslash
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.startsWith("/\\")) {
    return fallback;
  }

  // Reject javascript: or data: schemes
  if (trimmed.toLowerCase().includes("javascript:") || trimmed.toLowerCase().includes("data:")) {
    return fallback;
  }

  return trimmed;
}

/**
 * Retrieves the current session (or null if unauthenticated).
 */
export async function getCurrentSession(): Promise<Session | null> {
  try {
    return await auth();
  } catch (error: unknown) {
    // In Next.js 16 prerendering, allow dynamic bailouts and redirects to bubble up
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      typeof (error as { digest: unknown }).digest === "string"
    ) {
      const digest = (error as { digest: string }).digest;
      if (digest.startsWith("NEXT_") || digest === "HANGING_PROMISE_REJECTION") {
        throw error;
      }
    }
    console.error("[AUTH_GET_SESSION_ERROR]", error);
    return null;
  }
}

/**
 * Enforces authentication inside API Route Handlers and Server Actions.
 * Throws UnauthorizedError (401) or ForbiddenError (403 if suspended).
 */
export async function requireAuth(): Promise<Session> {
  const session = await getCurrentSession();

  if (!session || !session.user || !session.user.id) {
    throw new UnauthorizedError("Authentication is required to perform this action.");
  }

  if (session.user.status === "SUSPENDED") {
    throw new ForbiddenError("Your account has been suspended. Please contact support.");
  }

  return session;
}

/**
 * Enforces admin authorization inside API Route Handlers.
 * Throws ForbiddenError (403) if role !== 'ADMIN'.
 */
export async function requireAdmin(): Promise<Session> {
  const session = await requireAuth();

  if (session.user.role !== "ADMIN") {
    throw new ForbiddenError("Administrative privileges are required to access this resource.");
  }

  return session;
}

/**
 * Enforces that the current authenticated user owns the target resource,
 * or possesses an ADMIN role.
 */
export function assertOwnership(
  resourceOwnerId: string | { toString(): string },
  session: Session
): void {
  const ownerIdStr = resourceOwnerId.toString();
  const userIdStr = session.user.id.toString();

  if (session.user.role !== "ADMIN" && ownerIdStr !== userIdStr) {
    throw new ForbiddenError("You do not have permission to modify this resource.");
  }
}

/**
 * Guard for Server Component pages (e.g. /account/profile, /dashboard).
 * Redirects to /auth/signin?callbackUrl=... if unauthenticated.
 */
export async function requirePageAuth(currentPath: string): Promise<Session> {
  const session = await getCurrentSession();

  if (!session?.user) {
    const safeCallback = encodeURIComponent(validateSafeRedirect(currentPath, "/dashboard"));
    redirect(`/auth/signin?callbackUrl=${safeCallback}`);
  }

  if (session.user.status === "SUSPENDED") {
    redirect("/?error=AccountSuspended");
  }

  return session;
}

/**
 * Guard for Admin Server Component pages (e.g. /admin/*).
 */
export async function requirePageAdmin(): Promise<Session> {
  const session = await getCurrentSession();

  if (!session?.user) {
    redirect("/auth/signin?callbackUrl=/admin");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/?error=Forbidden");
  }

  return session;
}
