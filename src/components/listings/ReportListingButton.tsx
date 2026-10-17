"use client";

import React, { useState } from "react";
import { Flag, Check } from "lucide-react";

export function ReportListingButton({ listingId }: { listingId: string }) {
  const [reported, setReported] = useState(false);

  const handleReport = () => {
    // In production, this can submit a flag to /api/v1/listings/[id]/report
    setReported(true);
    setTimeout(() => setReported(false), 4000);
  };

  if (reported) {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-forest-green font-medium">
        <Check className="w-3.5 h-3.5" />
        <span>Report received for review</span>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleReport}
      aria-label={`Report listing ${listingId}`}
      className="inline-flex items-center gap-1 text-xs text-muted-text hover:text-red-600 transition-colors cursor-pointer"
    >
      <Flag className="w-3 h-3" />
      <span>Report this listing</span>
    </button>
  );
}
