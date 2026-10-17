"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession, signIn, signOut } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  ShieldAlert,
  ShieldCheck,
  Lock,
  LogOut,
  ArrowLeft,
  Loader2,
  AlertCircle,
  LayoutDashboard,
} from "lucide-react";

function AdminLoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const errorParam = searchParams.get("error");
  const { data: session, status } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  // If already authenticated as an administrator, immediately redirect to /admin
  React.useEffect(() => {
    if (status === "authenticated" && session?.user?.role === "ADMIN") {
      router.replace("/admin");
    }
  }, [status, session, router]);

  const handleAdminSignIn = async () => {
    try {
      setIsLoading(true);
      await signIn("google", { callbackUrl: "/admin" });
    } catch (err) {
      console.error("[ADMIN_SIGN_IN_ERROR]", err);
      setIsLoading(false);
    }
  };

  const handleSwitchAccount = async () => {
    try {
      setIsLoading(true);
      await signOut({ callbackUrl: "/admin/login" });
    } catch (err) {
      console.error("[ADMIN_SIGN_OUT_ERROR]", err);
      setIsLoading(false);
    }
  };

  if (status === "loading") {
    return (
      <div className="w-full max-w-md rounded-2xl border border-purple-200 bg-white p-8 text-center shadow-md">
        <Loader2 className="w-6 h-6 animate-spin text-purple-700 mx-auto mb-2" />
        <p className="text-xs text-muted-text">Verifying administrative credentials...</p>
      </div>
    );
  }

  // State A: Logged in, but lacking administrative privileges
  if (session?.user && session.user.role !== "ADMIN") {
    return (
      <div className="w-full max-w-md rounded-2xl border border-red-200 bg-white p-6 sm:p-8 shadow-sm">
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto mb-3 border border-red-100">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <Badge variant="neutral" size="sm" className="mb-2 text-red-700 bg-red-50 border-red-200">
            Access Denied
          </Badge>
          <h1 className="text-2xl font-bold text-dark-text tracking-tight">
            Administrative Access Restricted
          </h1>
          <p className="text-xs text-muted-text mt-2 leading-relaxed">
            You are currently authenticated as:
          </p>
          <div className="mt-2 p-2.5 rounded-lg bg-gray-50 border border-border-subtle text-left text-xs">
            <div className="font-semibold text-dark-text truncate">{session.user.name}</div>
            <div className="text-muted-text truncate">{session.user.email}</div>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-amber-700 font-medium">
              <span>Account Role:</span>
              <span className="font-mono uppercase bg-amber-50 px-1 rounded">{session.user.role}</span>
            </div>
          </div>
        </div>

        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-left mb-6">
          <p className="text-xs text-amber-900 leading-relaxed">
            This administrative dashboard is strictly reserved for authorized platform staff.
            Your account does not have administrator privileges.
          </p>
        </div>

        <div className="space-y-3">
          <Button
            type="button"
            variant="outline"
            size="md"
            className="w-full justify-center border-red-200 text-red-700 hover:bg-red-50"
            disabled={isLoading}
            onClick={handleSwitchAccount}
            leftIcon={isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
          >
            {isLoading ? "Signing out..." : "Sign Out & Switch Account"}
          </Button>

          <Link href="/dashboard" className="block w-full">
            <Button
              type="button"
              variant="secondary"
              size="md"
              className="w-full justify-center"
              leftIcon={<LayoutDashboard className="w-4 h-4" />}
            >
              Return to User Dashboard
            </Button>
          </Link>
        </div>

        <div className="mt-6 pt-4 border-t border-border-subtle text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-text hover:text-forest-green transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to marketplace</span>
          </Link>
        </div>
      </div>
    );
  }

  // State B: Unauthenticated staff visitor
  return (
    <div className="w-full max-w-md rounded-2xl border border-purple-200 bg-white p-6 sm:p-8 shadow-sm">
      {/* Brand & Portal Header */}
      <div className="text-center mb-6">
        <div className="w-12 h-12 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center mx-auto mb-3 border border-purple-100 shadow-xs">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div className="flex justify-center mb-2">
          <Badge variant="primary" size="sm" className="bg-purple-100 text-purple-900 border-purple-200">
            Staff Portal
          </Badge>
        </div>
        <h1 className="text-2xl font-bold text-dark-text tracking-tight">Admin Moderation Console</h1>
        <p className="text-xs text-muted-text mt-1.5">
          Restricted platform governance & listing moderation entry point
        </p>
      </div>

      {/* Error Callout */}
      {errorParam && (
        <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2.5 text-left">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <p className="text-xs text-red-800 font-medium leading-relaxed">
            {errorParam === "AccessDenied"
              ? "Access denied. Only authorized platform administrators may access this portal."
              : "Authentication failed. Please verify your administrator credentials."}
          </p>
        </div>
      )}

      {/* Authentication Action */}
      <div className="space-y-4">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full justify-center border-purple-200 hover:bg-purple-50/60 text-dark-text font-medium h-12 shadow-xs text-sm"
          disabled={isLoading}
          onClick={handleAdminSignIn}
          leftIcon={
            isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-purple-700" />
            ) : (
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
            )
          }
        >
          {isLoading ? "Authenticating Admin..." : "Authenticate with Google"}
        </Button>

        {/* Security Notice */}
        <div className="p-3.5 rounded-xl bg-purple-50/60 border border-purple-200/70 text-left">
          <div className="flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-purple-700 shrink-0 mt-0.5" />
            <div className="text-[11px] text-purple-950 leading-relaxed">
              <span className="font-semibold text-purple-900 block mb-0.5">
                Staff Authentication Policy
              </span>
              Administrative privileges are strictly restricted to the explicitly configured platform administrator
              account. Regular user accounts will be safely rejected.
            </div>
          </div>
        </div>
      </div>

      {/* Back to Public Site */}
      <div className="mt-6 pt-4 border-t border-border-subtle text-center">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-text hover:text-forest-green transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to public marketplace</span>
        </Link>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 sm:px-6 py-12">
      <Suspense
        fallback={
          <div className="w-full max-w-md rounded-2xl border border-purple-200 bg-white p-8 text-center shadow-sm">
            <Loader2 className="w-6 h-6 animate-spin text-purple-700 mx-auto mb-2" />
            <p className="text-xs text-muted-text">Loading admin portal...</p>
          </div>
        }
      >
        <AdminLoginContent />
      </Suspense>
    </div>
  );
}
