"use client";

import React, { useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Flag, Check, AlertTriangle, Loader2 } from "lucide-react";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";

interface ReportListingButtonProps {
  listingId: string;
}

export function ReportListingButton({ listingId }: ReportListingButtonProps) {
  const { data: session, status } = useSession();
  const router = useRouter();

  const [isOpen, setIsOpen] = useState(false);
  const [reason, setReason] = useState<string>("SPAM");
  const [details, setDetails] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const handleClickReport = () => {
    if (status !== "authenticated" || !session?.user) {
      // Redirect to login with current path as callback
      const currentUrl = typeof window !== "undefined" ? window.location.pathname : "/";
      router.push(`/login?callbackUrl=${encodeURIComponent(currentUrl)}`);
      return;
    }
    setErrorMessage("");
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (details.trim().length < 10) {
      setErrorMessage("Please provide at least 10 characters explaining your concern.");
      return;
    }

    setIsSubmitting(true);
    setErrorMessage("");

    try {
      const res = await fetch("/api/v1/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          reason,
          details: details.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to submit report. Please try again.");
      }

      setSuccessMessage("Thank you. Your report has been submitted for administrative review.");
      setTimeout(() => {
        setIsOpen(false);
        setDetails("");
        setSuccessMessage("");
      }, 2500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Submission failed";
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleClickReport}
        aria-label="Report this listing"
        className="inline-flex items-center gap-1.5 text-xs text-muted-text hover:text-red-600 transition-colors cursor-pointer"
      >
        <Flag className="w-3.5 h-3.5" />
        <span>Report this listing</span>
      </button>

      <Dialog
        isOpen={isOpen}
        onClose={() => {
          if (!isSubmitting) {
            setIsOpen(false);
            setErrorMessage("");
          }
        }}
        title="Report Listing"
        description="Help maintain a safe and trusted marketplace by reporting policy violations."
      >
        {successMessage ? (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
              <Check className="w-5 h-5" />
            </div>
            <p className="text-xs font-semibold text-emerald-950">{successMessage}</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            {errorMessage && (
              <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div>
              <label htmlFor="report-reason" className="block text-xs font-semibold text-dark-text mb-1">
                Reason for reporting <span className="text-red-600">*</span>
              </label>
              <select
                id="report-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-white text-xs text-dark-text focus:outline-none focus:ring-1 focus:ring-forest-green"
              >
                <option value="SPAM">Spam or commercial advertising</option>
                <option value="FAKE_PROPERTY">Fake or fraudulent listing</option>
                <option value="INACCURATE_PRICE">Inaccurate price or misleading terms</option>
                <option value="OFFENSIVE_CONTENT">Inappropriate or offensive content</option>
                <option value="OTHER">Other policy violation</option>
              </select>
            </div>

            <div>
              <label htmlFor="report-details" className="block text-xs font-semibold text-dark-text mb-1">
                Details & context <span className="text-red-600">*</span>
              </label>
              <textarea
                id="report-details"
                rows={4}
                value={details}
                onChange={(e) => {
                  setDetails(e.target.value);
                  if (errorMessage) setErrorMessage("");
                }}
                placeholder="Please describe why this listing violates community standards..."
                className="w-full p-2.5 rounded-lg border border-border-subtle text-xs text-dark-text focus:outline-none focus:ring-1 focus:ring-forest-green"
              />
              <div className="flex items-center justify-between text-[11px] text-muted-text mt-1">
                <span>Minimum 10 characters</span>
                <span>{details.length}/2000</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isSubmitting}
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="primary"
                size="sm"
                disabled={isSubmitting || details.trim().length < 10}
                className="bg-red-700 hover:bg-red-800 text-white"
                leftIcon={
                  isSubmitting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Flag className="w-3.5 h-3.5" />
                  )
                }
              >
                {isSubmitting ? "Submitting..." : "Submit Report"}
              </Button>
            </div>
          </form>
        )}
      </Dialog>
    </>
  );
}
