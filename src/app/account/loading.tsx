import React from "react";
import { Skeleton } from "@/components/ui/Skeleton";

export default function AccountLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="rounded-2xl border border-border-subtle bg-white p-6 sm:p-7 shadow-xs">
        <div className="space-y-2">
          <Skeleton className="h-4 w-32 rounded-full" />
          <Skeleton className="h-8 w-56 rounded-lg" />
          <Skeleton className="h-3.5 w-72 rounded-md" />
        </div>
      </div>

      <div className="rounded-2xl border border-border-subtle bg-white p-6 sm:p-7 shadow-xs space-y-4">
        <Skeleton className="h-5 w-48 rounded-md" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 rounded-xl border border-border-subtle bg-off-white/60 space-y-2">
              <Skeleton className="h-3 w-24 rounded-md" />
              <Skeleton className="h-5 w-40 rounded-md" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
