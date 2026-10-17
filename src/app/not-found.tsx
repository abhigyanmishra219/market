import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Compass, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 sm:px-6">
      <div className="max-w-md w-full rounded-2xl border border-border-subtle bg-white p-8 text-center shadow-xs flex flex-col items-center">
        <div className="w-12 h-12 rounded-full bg-light-green text-forest-green flex items-center justify-center mb-4">
          <Compass className="w-6 h-6" />
        </div>

        <span className="text-xs font-bold text-forest-green tracking-wider uppercase">
          404 Error
        </span>

        <h2 className="mt-1 text-2xl font-bold text-dark-text tracking-tight">Page Not Found</h2>

        <p className="mt-2 text-xs text-muted-text leading-relaxed">
          The page or listing you are looking for does not exist, has been paused, or was relocated.
        </p>

        <div className="mt-6 flex items-center gap-3">
          <Link href="/">
            <Button variant="primary" size="md" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Return to Homepage
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
