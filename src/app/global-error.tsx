"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GLOBAL_ERROR_BOUNDARY]", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-[#F5F7F4] flex items-center justify-center p-4 font-sans text-[#202923]">
        <div className="max-w-md w-full rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm flex flex-col items-center">
          <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>

          <h2 className="text-xl font-bold tracking-tight">Application Error</h2>

          <p className="mt-2 text-xs text-gray-500 leading-relaxed">
            A critical unexpected error occurred. Please try reloading the page.
          </p>

          <div className="mt-6 flex items-center gap-3">
            <button
              type="button"
              onClick={() => reset()}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#214A3B] text-white text-xs font-semibold hover:bg-[#1b3d31] transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reload Application</span>
            </button>
            <Link
              href="/"
              className="inline-flex items-center px-4 py-2 rounded-lg border border-gray-200 text-xs font-semibold hover:bg-gray-50 transition-colors"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
