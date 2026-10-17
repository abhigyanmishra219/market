"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { ShieldCheck, Sparkles, AlertCircle, ArrowLeft, Loader2 } from "lucide-react";

function SignInContent() {
  const searchParams = useSearchParams();
  const rawCallbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const errorParam = searchParams.get("error");
  const [isLoading, setIsLoading] = useState(false);

  // Validate callbackUrl to prevent open redirects
  const safeCallbackUrl =
    rawCallbackUrl.startsWith("/") && !rawCallbackUrl.startsWith("//")
      ? rawCallbackUrl
      : "/dashboard";

  const errorMessages: Record<string, string> = {
    OAuthSignin: "Failed to construct an OAuth authorization URL. Please try again.",
    OAuthCallback: "Error while processing OAuth callback from Google.",
    OAuthCreateAccount: "Could not create user account in database.",
    EmailCreateAccount: "Could not create user account.",
    Callback: "Error in callback handler.",
    OAuthAccountNotLinked:
      "This email is already associated with another account. Please use your original login method.",
    AccessDenied: "You denied Google access permissions or your account is restricted.",
    AccountSuspended: "Your account has been suspended. Please contact platform support.",
    Configuration:
      "Database connection failed. Please ensure your IP address is whitelisted in MongoDB Atlas.",
    Default: "Unable to sign in. Please try again later.",
  };

  const errorMessage = errorParam ? errorMessages[errorParam] || errorMessages.Default : null;

  const handleGoogleSignIn = async () => {
    try {
      setIsLoading(true);
      await signIn("google", { callbackUrl: safeCallbackUrl });
    } catch (err) {
      console.error("[SIGN_IN_ERROR]", err);
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-2xl border border-border-subtle bg-white p-6 sm:p-8 shadow-sm">
      {/* Brand Header */}
      <div className="text-center mb-6">
        <Link href="/" className="inline-flex items-center gap-2 mb-3">
          <div className="w-10 h-10 rounded-xl bg-forest-green flex items-center justify-center text-white font-bold text-xl shadow-xs">
            M
          </div>
        </Link>
        <h1 className="text-2xl font-bold text-dark-text tracking-tight">Sign in to Marketplace</h1>
        <p className="text-xs text-muted-text mt-1">
          Explore, list, and book living spaces and local services
        </p>
      </div>

      {/* Error Callout */}
      {errorMessage && (
        <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2.5 text-left">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <p className="text-xs text-red-800 font-medium leading-relaxed">{errorMessage}</p>
        </div>
      )}

      {/* Primary OAuth Action */}
      <div className="space-y-4">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full justify-center border-gray-300 hover:bg-gray-50 text-dark-text font-medium h-12 shadow-xs text-sm"
          disabled={isLoading}
          onClick={handleGoogleSignIn}
          leftIcon={
            isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin text-forest-green" />
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
          {isLoading ? "Redirecting to Google..." : "Continue with Google"}
        </Button>

        {/* Feature Highlights */}
        <div className="pt-4 border-t border-border-subtle/80 space-y-2.5">
          <div className="flex items-center gap-2 text-xs text-muted-text">
            <ShieldCheck className="w-3.5 h-3.5 text-forest-green shrink-0" />
            <span>Single account for browsing, posting ads, and booking</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-text">
            <Sparkles className="w-3.5 h-3.5 text-forest-green shrink-0" />
            <span>Saved favorite listings synchronized across devices</span>
          </div>
        </div>
      </div>

      {/* Footer Back Link */}
      <div className="mt-6 pt-4 border-t border-border-subtle/60 text-center">
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

export default function SignInPage() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 sm:px-6 py-12">
      <Suspense
        fallback={
          <div className="w-full max-w-md rounded-2xl border border-border-subtle bg-white p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-forest-green mx-auto mb-2" />
            <p className="text-xs text-muted-text">Loading authentication interface...</p>
          </div>
        }
      >
        <SignInContent />
      </Suspense>
    </div>
  );
}
