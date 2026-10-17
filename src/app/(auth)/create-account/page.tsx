"use client";

import React, { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  ShieldCheck,
  Building2,
  Wrench,
  CalendarCheck,
  AlertCircle,
  ArrowLeft,
  Loader2,
  Sparkles,
} from "lucide-react";

function CreateAccountContent() {
  const searchParams = useSearchParams();
  const rawCallbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const errorParam = searchParams.get("error");
  const [isLoading, setIsLoading] = useState(false);

  // Validate callbackUrl to prevent open redirects
  const safeCallbackUrl =
    rawCallbackUrl.startsWith("/") &&
    !rawCallbackUrl.startsWith("//") &&
    !rawCallbackUrl.startsWith("/\\")
      ? rawCallbackUrl
      : "/dashboard";

  const errorMessages: Record<string, string> = {
    OAuthSignin: "Failed to construct an OAuth authorization URL. Please try again.",
    OAuthCallback: "Error while processing OAuth callback from Google.",
    OAuthCreateAccount: "Could not initialize user account in the database.",
    EmailCreateAccount: "Could not create user record.",
    Callback: "Error in callback handler.",
    OAuthAccountNotLinked:
      "This email is already associated with an existing account. Please sign in with your original method.",
    AccessDenied: "You denied Google access permissions or your account is restricted.",
    AccountSuspended: "This account has been suspended. Please contact platform support.",
    Configuration: "Database connection failed. Please ensure configuration is valid.",
    Default: "Unable to complete account registration. Please try again.",
  };

  const errorMessage = errorParam ? errorMessages[errorParam] || errorMessages.Default : null;

  const handleGoogleSignUp = async () => {
    try {
      setIsLoading(true);
      await signIn("google", { callbackUrl: safeCallbackUrl });
    } catch (err) {
      console.error("[CREATE_ACCOUNT_ERROR]", err);
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-lg rounded-2xl border border-border-subtle bg-white p-6 sm:p-8 shadow-sm">
      {/* Brand & Badge Header */}
      <div className="text-center mb-6">
        <Link href="/" className="inline-flex items-center gap-2 mb-3">
          <div className="w-10 h-10 rounded-xl bg-forest-green flex items-center justify-center text-white font-bold text-xl shadow-xs hover:bg-forest-green-hover transition-colors">
            M
          </div>
        </Link>
        <div className="flex justify-center mb-2">
          <Badge variant="primary" size="sm" className="gap-1 font-medium">
            <Sparkles className="w-3 h-3" />
            <span>Unified Marketplace Account</span>
          </Badge>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-dark-text tracking-tight">
          Create Your Account
        </h1>
        <p className="text-xs text-muted-text mt-1.5 max-w-md mx-auto">
          One single marketplace account for finding homes, advertising property, or offering skilled local services.
        </p>
      </div>

      {/* Error Callout */}
      {errorMessage && (
        <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-200 flex items-start gap-2.5 text-left">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <p className="text-xs text-red-800 font-medium leading-relaxed">{errorMessage}</p>
        </div>
      )}

      {/* Primary Action Button */}
      <div className="space-y-4">
        <Button
          type="button"
          variant="outline"
          size="lg"
          className="w-full justify-center border-gray-300 hover:bg-gray-50 text-dark-text font-medium h-12 shadow-xs text-sm"
          disabled={isLoading}
          onClick={handleGoogleSignUp}
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
          {isLoading ? "Connecting to Google..." : "Continue with Google"}
        </Button>

        {/* Transparent Authentication Notice */}
        <div className="p-3.5 rounded-xl bg-light-green/40 border border-emerald-200/60 text-left">
          <div className="flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-forest-green shrink-0 mt-0.5" />
            <div className="text-[11px] text-dark-text leading-relaxed">
              <span className="font-semibold text-forest-green block mb-0.5">
                Simple & Passwordless Google Authentication
              </span>
              Our platform uses secure Google OAuth. There are no separate passwords to configure or lose.
              On your first sign-in, your normal user account is created automatically with zero platform fees.
              Existing users will be securely reconnected to their listings without duplicate accounts.
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
          <div className="p-3 rounded-lg border border-border-subtle bg-gray-50/50 text-left">
            <Building2 className="w-4 h-4 text-forest-green mb-1.5" />
            <h4 className="text-xs font-semibold text-dark-text">List Properties</h4>
            <p className="text-[11px] text-muted-text mt-0.5">Post rent, sale, or PG listings with photos</p>
          </div>
          <div className="p-3 rounded-lg border border-border-subtle bg-gray-50/50 text-left">
            <Wrench className="w-4 h-4 text-purple-700 mb-1.5" />
            <h4 className="text-xs font-semibold text-dark-text">Offer Services</h4>
            <p className="text-[11px] text-muted-text mt-0.5">Plumbing, electrical, repair & maintenance</p>
          </div>
          <div className="p-3 rounded-lg border border-border-subtle bg-gray-50/50 text-left">
            <CalendarCheck className="w-4 h-4 text-blue-700 mb-1.5" />
            <h4 className="text-xs font-semibold text-dark-text">Book Requests</h4>
            <p className="text-[11px] text-muted-text mt-0.5">Schedule appointments with local pros</p>
          </div>
        </div>
      </div>

      {/* Alternate Login Link */}
      <div className="mt-6 pt-4 border-t border-border-subtle text-center">
        <p className="text-xs text-muted-text mb-2">
          Already initialized your marketplace account?{" "}
          <Link
            href={`/login?callbackUrl=${encodeURIComponent(safeCallbackUrl)}`}
            className="font-semibold text-forest-green hover:underline"
          >
            Sign in here
          </Link>
        </p>
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

export default function CreateAccountPage() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-4 sm:px-6 py-12">
      <Suspense
        fallback={
          <div className="w-full max-w-lg rounded-2xl border border-border-subtle bg-white p-8 text-center">
            <Loader2 className="w-6 h-6 animate-spin text-forest-green mx-auto mb-2" />
            <p className="text-xs text-muted-text">Loading onboarding interface...</p>
          </div>
        }
      >
        <CreateAccountContent />
      </Suspense>
    </div>
  );
}
