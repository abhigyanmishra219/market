"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected errors internally for telemetry
    console.error("[APP_CLIENT_ERROR_BOUNDARY]", error);
  }, [error]);

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 sm:px-6">
      <div className="max-w-md w-full rounded-2xl border border-border-subtle bg-white p-8 text-center shadow-xs flex flex-col items-center">
        <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
          <AlertCircle className="w-6 h-6" />
        </div>

        <h2 className="text-xl font-bold text-dark-text tracking-tight">Something went wrong</h2>

        <p className="mt-2 text-xs text-muted-text leading-relaxed">
          An unexpected error occurred while rendering this page. Our team has been notified.
        </p>

        {process.env.NODE_ENV === "development" && error.message && (
          <div className="mt-4 p-3 rounded-lg bg-gray-50 border border-border-subtle text-left w-full overflow-x-auto text-[11px] text-red-700 font-mono">
            {error.message}
          </div>
        )}

        <div className="mt-6 flex items-center gap-3 w-full sm:w-auto">
          <Button
            variant="primary"
            size="md"
            onClick={() => reset()}
            leftIcon={<RefreshCw className="w-4 h-4" />}
          >
            Try Again
          </Button>
          <Link href="/">
            <Button variant="outline" size="md">
              Go to Homepage
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
