"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Dialog } from "@/components/ui/Dialog";
import {
  Flag,
  CheckCircle2,
  RefreshCw,
  Eye,
  AlertTriangle,
  User as UserIcon,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  FileText,
  ShieldCheck,
} from "lucide-react";

interface AdminReport {
  id: string;
  listing?: {
    id: string;
    title: string;
    type: string;
    slug: string;
    status: string;
    location?: { city: string; locality: string };
    thumbnail?: string | null;
  } | null;
  reporter: {
    id: string | null;
    name: string;
    email: string;
  };
  reason: string;
  details: string;
  status: "OPEN" | "INVESTIGATING" | "RESOLVED" | "DISMISSED";
  adminNotes?: string | null;
  resolvedBy?: {
    id: string;
    name: string;
    email: string;
  } | null;
  resolvedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AdminReportsPage() {
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [reasonFilter, setReasonFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [limit] = useState(15);

  const [reports, setReports] = useState<AdminReport[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Review Dialog State
  const [activeReport, setActiveReport] = useState<AdminReport | null>(null);
  const [newStatus, setNewStatus] = useState<"INVESTIGATING" | "RESOLVED" | "DISMISSED">("RESOLVED");
  const [adminNotes, setAdminNotes] = useState("");
  const [refreshIndex, setRefreshIndex] = useState(0);

  const refreshReports = useCallback(() => {
    setIsLoading(true);
    setRefreshIndex((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let ignore = false;
    async function loadReports() {
      try {
        const params = new URLSearchParams({
          status: statusFilter,
          page: page.toString(),
          limit: limit.toString(),
        });
        if (reasonFilter !== "ALL") {
          params.set("reason", reasonFilter);
        }

        const res = await fetch(`/api/v1/admin/reports?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to load listing reports");

        const json = await res.json();
        if (!ignore && json.success && json.data) {
          setReports(json.data.reports || []);
          setTotalPages(json.data.pagination.totalPages || 1);
          setTotalCount(json.data.pagination.totalCount || 0);
        }
      } catch (error) {
        if (!ignore) {
          console.error("[ADMIN_FETCH_REPORTS_ERROR]", error);
          setToastMessage({ type: "error", text: "Failed to load listing reports." });
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadReports();
    return () => {
      ignore = true;
    };
  }, [statusFilter, reasonFilter, page, limit, refreshIndex]);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleUpdateReport = async () => {
    if (!activeReport) return;
    setActionLoadingId(activeReport.id);

    try {
      const res = await fetch(`/api/v1/admin/reports/${activeReport.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: newStatus,
          adminNotes: adminNotes.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update report status");
      }

      setToastMessage({
        type: "success",
        text: `Report marked as ${newStatus}!`,
      });

      setActiveReport(null);
      setAdminNotes("");
      refreshReports();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Report update failed";
      setToastMessage({ type: "error", text: msg });
    } finally {
      setActionLoadingId(null);
    }
  };

  const getStatusBadge = (status: AdminReport["status"]) => {
    switch (status) {
      case "OPEN":
        return <Badge variant="neutral" size="sm" className="bg-amber-100 text-amber-800 border-amber-200 font-semibold animate-pulse">Open Review</Badge>;
      case "INVESTIGATING":
        return <Badge variant="neutral" size="sm" className="bg-blue-100 text-blue-800 border-blue-200">Investigating</Badge>;
      case "RESOLVED":
        return <Badge variant="primary" size="sm" className="bg-emerald-100 text-emerald-800 border-emerald-200">Resolved</Badge>;
      case "DISMISSED":
        return <Badge variant="neutral" size="sm" className="bg-gray-100 text-gray-600 border-gray-200">Dismissed</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  const formatReasonLabel = (reason: string) => {
    switch (reason) {
      case "SPAM":
        return "Spam / Advertising";
      case "FAKE_PROPERTY":
        return "Fake / Fraudulent";
      case "INACCURATE_PRICE":
        return "Inaccurate Pricing";
      case "OFFENSIVE_CONTENT":
        return "Offensive Content";
      case "OTHER":
        return "Other Policy Concern";
      default:
        return reason;
    }
  };

  return (
    <div className="space-y-6 text-left">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-5 right-5 z-50 p-4 rounded-xl shadow-lg border text-xs font-semibold flex items-center gap-2.5 max-w-md animate-in slide-in-from-top-2 ${
            toastMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : "bg-red-50 border-red-200 text-red-900"
          }`}
        >
          {toastMessage.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Flag className="w-5 h-5 text-red-600" />
            <h1 className="text-xl sm:text-2xl font-bold text-dark-text tracking-tight">
              Community Listing Reports
            </h1>
          </div>
          <p className="text-xs text-muted-text">
            Investigate user-flagged listings, verify authenticity, and record administrative resolution notes.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={refreshReports}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          className="text-xs self-start sm:self-auto"
        >
          Sync Reports
        </Button>
      </div>

      {/* Filter Bar */}
      <div className="p-4 rounded-xl border border-border-subtle bg-white shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-muted-text">
            <span>Report Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-border-subtle bg-white text-xs text-dark-text focus:outline-none focus:ring-1 focus:ring-forest-green font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="OPEN">Open Review</option>
              <option value="INVESTIGATING">Investigating</option>
              <option value="RESOLVED">Resolved</option>
              <option value="DISMISSED">Dismissed</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-text">
            <span>Violation Reason:</span>
            <select
              value={reasonFilter}
              onChange={(e) => {
                setReasonFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-border-subtle bg-white text-xs text-dark-text focus:outline-none focus:ring-1 focus:ring-forest-green font-medium"
            >
              <option value="ALL">All Reasons</option>
              <option value="SPAM">Spam / Advertising</option>
              <option value="FAKE_PROPERTY">Fake / Fraudulent</option>
              <option value="INACCURATE_PRICE">Inaccurate Pricing</option>
              <option value="OFFENSIVE_CONTENT">Offensive Content</option>
              <option value="OTHER">Other Violation</option>
            </select>
          </div>
        </div>

        <div className="text-xs text-muted-text">
          Showing <strong className="text-dark-text">{reports.length}</strong> of{" "}
          <strong className="text-dark-text">{totalCount}</strong> reports
        </div>
      </div>

      {/* Reports Queue */}
      <div className="rounded-xl border border-border-subtle bg-white shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-7 h-7 animate-spin text-red-600 mx-auto mb-2" />
            <p className="text-xs text-muted-text">Loading reports from database...</p>
          </div>
        ) : reports.length === 0 ? (
          <div className="p-12 text-center max-w-md mx-auto">
            <div className="w-12 h-12 rounded-full bg-light-green text-forest-green flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-dark-text">No reports in queue</h3>
            <p className="text-xs text-muted-text mt-1">
              There are currently no community reports matching your filter criteria.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {reports.map((report) => (
              <div
                key={report.id}
                className="p-4 sm:p-5 hover:bg-gray-50/70 transition-colors flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
              >
                {/* Left: Report Details */}
                <div className="flex-1 min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {getStatusBadge(report.status)}
                    <Badge variant="neutral" size="sm" className="bg-red-50 text-red-700 border-red-200">
                      {formatReasonLabel(report.reason)}
                    </Badge>
                    <span className="text-[11px] text-muted-text">
                      Reported {new Date(report.createdAt).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Target Listing Reference */}
                  {report.listing ? (
                    <div className="p-2.5 rounded-lg bg-gray-50 border border-border-subtle flex items-center justify-between gap-3 text-xs">
                      <div className="min-w-0">
                        <span className="text-[10px] text-muted-text uppercase tracking-wider font-semibold block">
                          Target Listing ({report.listing.type})
                        </span>
                        <div className="font-bold text-dark-text truncate">
                          {report.listing.title}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[11px] font-mono text-muted-text uppercase">
                          Status: {report.listing.status}
                        </span>
                        <Link
                          href={report.listing.type === "PROPERTY" ? `/properties/${report.listing.slug}` : `/services/${report.listing.slug}`}
                          target="_blank"
                          className="inline-flex items-center gap-1 text-[11px] text-forest-green hover:underline font-medium"
                        >
                          <span>View</span>
                          <ExternalLink className="w-3 h-3" />
                        </Link>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 rounded-lg bg-gray-50 border border-border-subtle text-xs text-muted-text italic">
                      Associated listing is no longer available in database.
                    </div>
                  )}

                  {/* Complaint Details */}
                  <div className="text-xs text-dark-text bg-white p-2.5 rounded-lg border border-border-subtle/80">
                    <span className="font-semibold text-muted-text block text-[11px] mb-0.5">
                      Reporter Explanation:
                    </span>
                    <p className="whitespace-pre-line">{report.details}</p>
                  </div>

                  {/* Reporter Meta & Resolution Meta */}
                  <div className="flex flex-wrap items-center gap-4 text-[11px] text-muted-text">
                    <span className="flex items-center gap-1">
                      <UserIcon className="w-3 h-3" />
                      <span>Reported by: <strong>{report.reporter.name}</strong> ({report.reporter.email})</span>
                    </span>

                    {report.resolvedBy && (
                      <span className="flex items-center gap-1 text-emerald-800">
                        <ShieldCheck className="w-3 h-3" />
                        <span>Resolved by staff: {report.resolvedBy.name}</span>
                      </span>
                    )}

                    {report.adminNotes && (
                      <span className="flex items-center gap-1 text-blue-900 font-medium">
                        <FileText className="w-3 h-3 text-blue-700" />
                        <span>Staff Note: &quot;{report.adminNotes}&quot;</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Right: Review Action */}
                <div className="shrink-0 self-end lg:self-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      setActiveReport(report);
                      setNewStatus(report.status === "OPEN" ? "RESOLVED" : report.status);
                      setAdminNotes(report.adminNotes || "");
                    }}
                    leftIcon={<Eye className="w-3.5 h-3.5" />}
                  >
                    Manage Report
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border-subtle bg-gray-50 flex items-center justify-between text-xs text-muted-text">
            <span>
              Page <strong className="text-dark-text">{page}</strong> of{" "}
              <strong className="text-dark-text">{totalPages}</strong> ({totalCount} total)
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage(page + 1)}
                rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* RESOLUTION DIALOG */}
      {activeReport && (
        <Dialog
          isOpen={Boolean(activeReport)}
          onClose={() => setActiveReport(null)}
          title="Resolve Community Report"
          description={`Report ID: ${activeReport.id}`}
        >
          <div className="space-y-4 text-left">
            <div className="p-3 rounded-lg bg-gray-50 border border-border-subtle text-xs space-y-1">
              <div className="font-semibold text-dark-text">
                Violation Claim: {formatReasonLabel(activeReport.reason)}
              </div>
              <p className="text-muted-text text-[11px] whitespace-pre-line">
                {activeReport.details}
              </p>
            </div>

            <div>
              <label htmlFor="report-status-select" className="block text-xs font-semibold text-dark-text mb-1">
                Resolution Decision <span className="text-red-600">*</span>
              </label>
              <select
                id="report-status-select"
                value={newStatus}
                onChange={(e) =>
                  setNewStatus(e.target.value as "INVESTIGATING" | "RESOLVED" | "DISMISSED")
                }
                className="w-full px-3 py-2 rounded-lg border border-border-subtle bg-white text-xs text-dark-text focus:outline-none focus:ring-1 focus:ring-forest-green"
              >
                <option value="INVESTIGATING">Keep Under Active Investigation</option>
                <option value="RESOLVED">Mark Resolved (Action Taken / Verified)</option>
                <option value="DISMISSED">Dismiss Report (Unsubstantiated / Inaccurate)</option>
              </select>
            </div>

            <div>
              <label htmlFor="admin-private-notes" className="block text-xs font-semibold text-dark-text mb-1">
                Internal Administrative Notes (Private)
              </label>
              <textarea
                id="admin-private-notes"
                rows={3}
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Private moderation notes (never visible to regular users or public visitors)..."
                className="w-full p-2.5 rounded-lg border border-border-subtle text-xs text-dark-text focus:outline-none focus:ring-1 focus:ring-forest-green"
              />
              <span className="text-[11px] text-muted-text block mt-1">
                Internal notes are securely kept for admin audit trail.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
              <Button
                variant="outline"
                size="sm"
                disabled={Boolean(actionLoadingId)}
                onClick={() => setActiveReport(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-forest-green hover:bg-forest-green/90 text-white"
                disabled={Boolean(actionLoadingId)}
                onClick={handleUpdateReport}
                leftIcon={
                  actionLoadingId ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )
                }
              >
                {actionLoadingId ? "Saving..." : "Save Resolution"}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
