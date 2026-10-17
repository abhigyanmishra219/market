"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Dialog } from "@/components/ui/Dialog";
import { formatCurrency } from "@/lib/utils";
import { getServiceCategory } from "@/lib/service-categories";
import {
  Wrench,
  PlusCircle,
  Edit3,
  Eye,
  Pause,
  Play,
  Trash2,
  ShieldAlert,
  Send,
  MapPin,
  CheckCircle,
} from "lucide-react";

export interface OwnerServiceItem {
  id: string;
  type: string;
  status: "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "PAUSED" | "ARCHIVED";
  title: string;
  slug: string;
  description: string;
  location: {
    city: string;
    cityCode: string;
    locality: string;
    streetAddress?: string | null;
  };
  photos: Array<{
    id: string;
    url: string;
    isPrimary?: boolean;
    caption?: string | null;
  }>;
  serviceDetails?: {
    category: string;
    pricingModel: "FIXED" | "HOURLY" | "QUOTE_BASED";
    startingPrice?: number;
    experienceYears: number;
    serviceAreas: string[];
    workingDays: string[];
    workingHours?: {
      start: string;
      end: string;
    };
    guarantees?: string | null;
  };
  moderation?: {
    reviewedAt?: string | null;
    rejectionReason?: string | null;
  };
  metrics?: {
    views: number;
    contactReveals: number;
    savesCount: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface OwnerServiceListProps {
  initialServices: OwnerServiceItem[];
}

const STATUS_FILTERS = [
  { id: "ALL", label: "All Services" },
  { id: "APPROVED", label: "Active" },
  { id: "PENDING_REVIEW", label: "In Review" },
  { id: "REJECTED", label: "Action Required" },
  { id: "PAUSED", label: "Paused" },
  { id: "DRAFT", label: "Drafts" },
  { id: "ARCHIVED", label: "Archived" },
];

export function OwnerServiceList({ initialServices }: OwnerServiceListProps) {
  const router = useRouter();
  const [services, setServices] = useState<OwnerServiceItem[]>(initialServices);
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Archive modal state
  const [archiveTarget, setArchiveTarget] = useState<OwnerServiceItem | null>(null);

  // Filter items
  const filteredServices = services.filter((item) => {
    if (selectedStatus === "ALL") {
      return item.status !== "ARCHIVED";
    }
    return item.status === selectedStatus;
  });

  // Handle status toggle (Pause / Resume / Resubmit)
  const handleStatusChange = async (
    serviceId: string,
    targetStatus: "PAUSED" | "APPROVED" | "PENDING_REVIEW" | "ARCHIVED"
  ) => {
    setActionLoadingId(serviceId);
    setActionError(null);

    try {
      const res = await fetch(`/api/v1/listings/${serviceId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to update service status");
      }

      // Update local state
      setServices((prev) =>
        prev.map((item) =>
          item.id === serviceId ? { ...item, status: targetStatus } : item
        )
      );

      router.refresh();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "An unexpected error occurred");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Confirm soft-delete / archival
  const handleConfirmArchive = async () => {
    if (!archiveTarget) return;

    setActionLoadingId(archiveTarget.id);
    setActionError(null);

    try {
      const res = await fetch(`/api/v1/listings/${archiveTarget.id}`, {
        method: "DELETE",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || "Failed to archive service listing");
      }

      setServices((prev) =>
        prev.map((item) =>
          item.id === archiveTarget.id ? { ...item, status: "ARCHIVED" } : item
        )
      );

      setArchiveTarget(null);
      router.refresh();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to archive service");
    } finally {
      setActionLoadingId(null);
    }
  };

  const getStatusBadge = (status: OwnerServiceItem["status"]) => {
    switch (status) {
      case "APPROVED":
        return <Badge variant="primary">Live & Published</Badge>;
      case "PENDING_REVIEW":
        return <Badge variant="warning">Under Review</Badge>;
      case "REJECTED":
        return <Badge variant="danger">Changes Requested</Badge>;
      case "PAUSED":
        return <Badge variant="neutral">Paused</Badge>;
      case "DRAFT":
        return <Badge variant="neutral">Draft</Badge>;
      case "ARCHIVED":
        return <Badge variant="neutral">Archived</Badge>;
      default:
        return <Badge variant="neutral">{status}</Badge>;
    }
  };

  const formatPricing = (details?: OwnerServiceItem["serviceDetails"]) => {
    if (!details) return "Price on request";
    if (details.pricingModel === "QUOTE_BASED") return "Quote Required";
    if (details.startingPrice !== undefined) {
      const formatted = formatCurrency(details.startingPrice);
      return details.pricingModel === "HOURLY"
        ? `${formatted} / hr`
        : `Starts at ${formatted}`;
    }
    return "Price on request";
  };

  return (
    <div>
      {/* Action Header & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        {/* Status Filter Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {STATUS_FILTERS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                selectedStatus === tab.id
                  ? "bg-forest-green text-white shadow-xs"
                  : "bg-white text-muted-text hover:text-dark-text border border-border-subtle hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Create Service CTA */}
        <Link href="/dashboard/services/new" className="shrink-0">
          <Button variant="primary" size="sm" leftIcon={<PlusCircle className="w-4 h-4" />}>
            Post New Service
          </Button>
        </Link>
      </div>

      {actionError && (
        <div className="mb-6 p-4 rounded-xl border border-red-200 bg-red-50 text-red-800 text-xs flex items-center justify-between">
          <span>{actionError}</span>
          <button
            onClick={() => setActionError(null)}
            className="text-red-900 font-bold hover:underline ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Services List / Cards */}
      {filteredServices.length > 0 ? (
        <div className="space-y-4">
          {filteredServices.map((service) => {
            const primaryPhoto =
              service.photos.find((p) => p.isPrimary) || service.photos[0];
            const categoryConfig = getServiceCategory(service.serviceDetails?.category);
            const isProcessing = actionLoadingId === service.id;

            return (
              <div
                key={service.id}
                className="rounded-2xl border border-border-subtle bg-white p-5 sm:p-6 shadow-xs hover:border-forest-green/40 transition-all flex flex-col md:flex-row md:items-center justify-between gap-5"
              >
                {/* Left Section: Thumbnail & Core Specs */}
                <div className="flex items-start gap-4">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl bg-light-purple/40 border border-purple-100 overflow-hidden relative shrink-0 flex items-center justify-center">
                    {primaryPhoto ? (
                      <Image
                        src={primaryPhoto.url}
                        alt={service.title}
                        fill
                        className="object-cover"
                        sizes="96px"
                      />
                    ) : (
                      <Wrench className="w-8 h-8 text-purple-700 opacity-60" />
                    )}
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center gap-2 mb-1.5">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-light-purple text-purple-900 border border-purple-200">
                        {categoryConfig.label}
                      </span>
                      {getStatusBadge(service.status)}
                    </div>

                    <h3 className="text-base font-bold text-dark-text hover:text-forest-green transition-colors line-clamp-1">
                      {service.title}
                    </h3>

                    <div className="text-sm font-bold text-forest-green mt-0.5">
                      {formatPricing(service.serviceDetails)}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-text mt-2">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-forest-green" />
                        <span>
                          {service.location.locality}, {service.location.city}
                        </span>
                      </div>

                      {service.serviceDetails && (
                        <div className="flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{service.serviceDetails.experienceYears} yrs exp</span>
                        </div>
                      )}

                      {service.serviceDetails?.serviceAreas && service.serviceDetails.serviceAreas.length > 0 && (
                        <div className="text-[11px] text-muted-text">
                          Covers: {service.serviceDetails.serviceAreas.slice(0, 3).join(", ")}
                          {service.serviceDetails.serviceAreas.length > 3 ? "..." : ""}
                        </div>
                      )}
                    </div>

                    {/* Rejection Feedback Banner for Owner */}
                    {service.status === "REJECTED" && service.moderation?.rejectionReason && (
                      <div className="mt-3 p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-900 text-xs flex items-start gap-2">
                        <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Moderation feedback: </span>
                          <span>{service.moderation.rejectionReason}</span>
                          <div className="mt-1 font-semibold text-rose-800">
                            Click &quot;Edit &amp; Fix&quot; below to update your service and resubmit for review.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Section: Action Controls */}
                <div className="flex flex-wrap sm:flex-nowrap md:flex-col lg:flex-row items-center gap-2 self-end md:self-center shrink-0 w-full sm:w-auto">
                  {/* View Public Listing */}
                  {service.status === "APPROVED" && (
                    <Link
                      href={`/services/${service.slug}`}
                      className="w-full sm:w-auto"
                      target="_blank"
                    >
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={<Eye className="w-3.5 h-3.5" />}
                        className="w-full sm:w-auto text-xs"
                      >
                        View Live
                      </Button>
                    </Link>
                  )}

                  {/* Edit Service Listing */}
                  {service.status !== "ARCHIVED" && (
                    <Link
                      href={`/dashboard/services/${service.id}/edit`}
                      className="w-full sm:w-auto"
                    >
                      <Button
                        variant={service.status === "REJECTED" ? "primary" : "outline"}
                        size="sm"
                        leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                        className="w-full sm:w-auto text-xs"
                      >
                        {service.status === "REJECTED" ? "Edit & Fix" : "Edit"}
                      </Button>
                    </Link>
                  )}

                  {/* Resubmit Draft or Rejected Service */}
                  {(service.status === "DRAFT" || service.status === "REJECTED") && (
                    <Button
                      variant="primary"
                      size="sm"
                      isLoading={isProcessing}
                      leftIcon={<Send className="w-3.5 h-3.5" />}
                      onClick={() => handleStatusChange(service.id, "PENDING_REVIEW")}
                      className="w-full sm:w-auto text-xs"
                    >
                      Submit for Review
                    </Button>
                  )}

                  {/* Pause / Resume Controls */}
                  {service.status === "APPROVED" && (
                    <Button
                      variant="outline"
                      size="sm"
                      isLoading={isProcessing}
                      leftIcon={<Pause className="w-3.5 h-3.5" />}
                      onClick={() => handleStatusChange(service.id, "PAUSED")}
                      className="w-full sm:w-auto text-xs"
                    >
                      Pause
                    </Button>
                  )}

                  {service.status === "PAUSED" && (
                    <Button
                      variant="primary"
                      size="sm"
                      isLoading={isProcessing}
                      leftIcon={<Play className="w-3.5 h-3.5" />}
                      onClick={() => handleStatusChange(service.id, "APPROVED")}
                      className="w-full sm:w-auto text-xs"
                    >
                      Resume
                    </Button>
                  )}

                  {/* Soft Delete / Archive */}
                  {service.status !== "ARCHIVED" && (
                    <Button
                      variant="outline"
                      size="sm"
                      leftIcon={<Trash2 className="w-3.5 h-3.5 text-red-600" />}
                      onClick={() => setArchiveTarget(service)}
                      className="w-full sm:w-auto text-xs text-red-600 hover:bg-red-50 hover:border-red-200"
                    >
                      Archive
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="rounded-2xl border border-dashed border-border-subtle bg-white p-10 text-center flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-light-purple/60 text-purple-900 flex items-center justify-center mb-4">
            <Wrench className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-dark-text">No service listings found</h3>
          <p className="text-xs text-muted-text max-w-md mt-1 mb-6 leading-relaxed">
            {selectedStatus === "ALL"
              ? "You haven't registered any professional services yet. Offer your plumbing, electrical, carpentry, or cleaning skills to local customers."
              : `You do not have any service listings with the "${selectedStatus}" status.`}
          </p>
          <Link href="/dashboard/services/new">
            <Button variant="primary" size="md" leftIcon={<PlusCircle className="w-4 h-4" />}>
              Post a Service Listing
            </Button>
          </Link>
        </div>
      )}

      {/* Confirmation Modal for Archiving Service Listing */}
      <Dialog
        isOpen={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        title="Archive Service Listing"
        description="Are you sure you want to archive this service? It will be immediately removed from public search results and no new clients will be able to book it."
      >
        {archiveTarget && (
          <div className="p-3 rounded-lg bg-gray-50 border border-border-subtle text-xs text-dark-text mt-2">
            <div className="font-semibold text-forest-green">{archiveTarget.title}</div>
            <div className="text-muted-text mt-0.5">
              Category: {getServiceCategory(archiveTarget.serviceDetails?.category).label} • {archiveTarget.location.locality}
            </div>
          </div>
        )}
        <div className="mt-4 flex items-center justify-end gap-3">
          <Button variant="outline" size="sm" onClick={() => setArchiveTarget(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleConfirmArchive}
            isLoading={Boolean(actionLoadingId && archiveTarget)}
          >
            Yes, Archive Listing
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
