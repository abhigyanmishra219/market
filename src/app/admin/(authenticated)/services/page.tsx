"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Dialog } from "@/components/ui/Dialog";
import {
  Wrench,
  CheckCircle2,
  XCircle,
  Search,
  RefreshCw,
  Eye,
  AlertTriangle,
  User as UserIcon,
  Phone,
  MessageCircle,
  MapPin,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  Archive,
  PauseCircle,
} from "lucide-react";

interface AdminListing {
  id: string;
  type: "PROPERTY" | "SERVICE";
  status: "DRAFT" | "PENDING_REVIEW" | "APPROVED" | "REJECTED" | "PAUSED" | "ARCHIVED";
  title: string;
  slug: string;
  description: string;
  owner: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    whatsapp?: string | null;
    role: string;
  };
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
    pricingModel: string;
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
  moderation: {
    reviewedBy?: string | null;
    reviewedAt?: string | null;
    rejectionReason?: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

export default function AdminServicesPage() {
  const [statusFilter, setStatusFilter] = useState<string>("PENDING_REVIEW");
  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(12);

  const [listings, setListings] = useState<AdminListing[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Dialog States
  const [inspectListing, setInspectListing] = useState<AdminListing | null>(null);
  const [approveConfirmListing, setApproveConfirmListing] = useState<AdminListing | null>(null);
  const [rejectListing, setRejectListing] = useState<AdminListing | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionError, setRejectionError] = useState("");
  const [refreshIndex, setRefreshIndex] = useState(0);

  const refreshServices = useCallback(() => {
    setIsLoading(true);
    setRefreshIndex((prev) => prev + 1);
  }, []);

  useEffect(() => {
    let ignore = false;
    async function loadServices() {
      try {
        const params = new URLSearchParams({
          type: "SERVICE",
          status: statusFilter,
          page: page.toString(),
          limit: limit.toString(),
        });
        if (searchQuery.trim()) {
          params.set("search", searchQuery.trim());
        }

        const res = await fetch(`/api/v1/admin/listings?${params.toString()}`);
        if (!res.ok) throw new Error("Failed to load service listings");

        const json = await res.json();
        if (!ignore && json.success && json.data) {
          let items: AdminListing[] = json.data.listings || [];
          if (categoryFilter !== "ALL") {
            items = items.filter(
              (item) => item.serviceDetails?.category === categoryFilter
            );
          }
          setListings(items);
          setTotalPages(json.data.pagination.totalPages || 1);
          setTotalCount(json.data.pagination.totalCount || 0);
        }
      } catch (error) {
        if (!ignore) {
          console.error("[ADMIN_FETCH_SERVICES_ERROR]", error);
          setToastMessage({ type: "error", text: "Failed to load services for moderation." });
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    loadServices();
    return () => {
      ignore = true;
    };
  }, [statusFilter, categoryFilter, page, limit, searchQuery, refreshIndex]);

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleModerateAction = async (
    id: string,
    action: "APPROVE" | "REJECT" | "ARCHIVE" | "PAUSE",
    reason?: string
  ) => {
    setActionLoadingId(id);
    try {
      const res = await fetch(`/api/v1/admin/listings/${id}/moderate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          rejectionReason: reason,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || `Failed to ${action.toLowerCase()} listing`);
      }

      const actionLabels = {
        APPROVE: "approved and published live",
        REJECT: "rejected with feedback sent to provider",
        ARCHIVE: "archived from marketplace",
        PAUSE: "paused (unpublished from discovery)",
      };

      setToastMessage({
        type: "success",
        text: `Service successfully ${actionLabels[action]}!`,
      });

      setApproveConfirmListing(null);
      setRejectListing(null);
      setInspectListing(null);
      setRejectionReason("");
      setRejectionError("");
      refreshServices();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Moderation action failed";
      setToastMessage({ type: "error", text: msg });
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatPrice = (listing: AdminListing) => {
    if (!listing.serviceDetails) return "N/A";
    const s = listing.serviceDetails;
    if (s.pricingModel === "QUOTE_BASED") return "Quote based";
    if (!s.startingPrice) return "Free estimate";
    const formatted = new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(s.startingPrice);
    return s.pricingModel === "HOURLY" ? `${formatted} / hr` : `From ${formatted}`;
  };

  const getStatusBadge = (status: AdminListing["status"]) => {
    switch (status) {
      case "APPROVED":
        return <Badge variant="primary" size="sm" className="bg-emerald-100 text-emerald-800 border-emerald-200">Live Approved</Badge>;
      case "PENDING_REVIEW":
        return <Badge variant="neutral" size="sm" className="bg-amber-100 text-amber-800 border-amber-200 font-semibold animate-pulse">Pending Review</Badge>;
      case "REJECTED":
        return <Badge variant="neutral" size="sm" className="bg-red-100 text-red-800 border-red-200">Rejected</Badge>;
      case "PAUSED":
        return <Badge variant="neutral" size="sm" className="bg-gray-100 text-gray-700 border-gray-200">Paused</Badge>;
      case "ARCHIVED":
        return <Badge variant="neutral" size="sm" className="bg-gray-100 text-gray-500 border-gray-200">Archived</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
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
            <Wrench className="w-5 h-5 text-purple-700" />
            <h1 className="text-xl sm:text-2xl font-bold text-dark-text tracking-tight">
              Service Moderation Console
            </h1>
          </div>
          <p className="text-xs text-muted-text">
            Review professional trade profiles, evaluate pricing models and coverage areas, approve qualified services, or reject with feedback.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={refreshServices}
          leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
          className="text-xs self-start sm:self-auto"
        >
          Sync Services
        </Button>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-xl border border-border-subtle bg-white shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-muted-text absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search trade title, locality, city, provider..."
            className="w-full pl-9 pr-3 py-2 rounded-lg border border-border-subtle text-xs text-dark-text placeholder:text-muted-text focus:outline-none focus:ring-1 focus:ring-forest-green"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs text-muted-text">
            <span>Status:</span>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-border-subtle bg-white text-xs text-dark-text focus:outline-none focus:ring-1 focus:ring-forest-green font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING_REVIEW">Pending Review</option>
              <option value="APPROVED">Live Approved</option>
              <option value="REJECTED">Rejected</option>
              <option value="PAUSED">Paused</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-muted-text">
            <span>Trade:</span>
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setPage(1);
              }}
              className="px-2.5 py-1.5 rounded-lg border border-border-subtle bg-white text-xs text-dark-text focus:outline-none focus:ring-1 focus:ring-forest-green font-medium"
            >
              <option value="ALL">All Trades</option>
              <option value="PLUMBING">Plumbing</option>
              <option value="ELECTRICAL">Electrical</option>
              <option value="CARPENTRY">Carpentry</option>
              <option value="PAINTING">Painting</option>
              <option value="CLEANING">Cleaning</option>
              <option value="APPLIANCE_REPAIR">Appliance Repair</option>
              <option value="PEST_CONTROL">Pest Control</option>
              <option value="HVAC">HVAC</option>
              <option value="OTHER">Other Trade</option>
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={refreshServices}
            className="h-8 text-xs"
          >
            Apply
          </Button>
        </div>
      </div>

      {/* Services Listings Queue */}
      <div className="rounded-xl border border-border-subtle bg-white shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-7 h-7 animate-spin text-purple-700 mx-auto mb-2" />
            <p className="text-xs text-muted-text">Loading service listings...</p>
          </div>
        ) : listings.length === 0 ? (
          <div className="p-12 text-center max-w-md mx-auto">
            <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-700 flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-dark-text">No services found</h3>
            <p className="text-xs text-muted-text mt-1">
              No service submissions match your selected status or filter criteria.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {listings.map((listing) => (
              <div
                key={listing.id}
                className="p-4 sm:p-5 hover:bg-gray-50/70 transition-colors flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
              >
                {/* Left: Thumbnail + Trade Specs */}
                <div className="flex items-start gap-3.5 flex-1 min-w-0">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-purple-50/50 border border-purple-200/60 overflow-hidden shrink-0 flex items-center justify-center relative">
                    {listing.photos && listing.photos.length > 0 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={listing.photos[0].url}
                        alt={listing.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-purple-700">
                        <Wrench className="w-5 h-5 mb-0.5" />
                        <span className="text-[9px]">Trade</span>
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {getStatusBadge(listing.status)}
                      <span className="text-xs font-bold text-purple-900">
                        {formatPrice(listing)}
                      </span>
                      {listing.serviceDetails && (
                        <span className="text-[11px] text-muted-text border-l border-border-subtle pl-2 font-medium">
                          {listing.serviceDetails.category} • {listing.serviceDetails.experienceYears}y exp • {listing.serviceDetails.pricingModel}
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-dark-text truncate">
                      {listing.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-text mt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-purple-700 shrink-0" />
                        <span className="truncate">
                          {listing.location.locality}, {listing.location.city}
                        </span>
                      </span>

                      <span className="flex items-center gap-1">
                        <UserIcon className="w-3.5 h-3.5 text-muted-text shrink-0" />
                        <span className="truncate">{listing.owner.name}</span>
                        <span className="text-[11px] text-muted-text/80">({listing.owner.email})</span>
                      </span>

                      <span className="flex items-center gap-1 text-[11px]">
                        <Calendar className="w-3 h-3 text-muted-text" />
                        <span>{new Date(listing.createdAt).toLocaleDateString()}</span>
                      </span>
                    </div>

                    {listing.status === "REJECTED" && listing.moderation?.rejectionReason && (
                      <div className="mt-2 p-2 rounded-lg bg-red-50 border border-red-200 text-xs text-red-900 flex items-start gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-semibold">Rejection reason:</span>{" "}
                          {listing.moderation.rejectionReason}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div className="flex flex-wrap items-center gap-2 shrink-0 self-end lg:self-center">
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => setInspectListing(listing)}
                    leftIcon={<Eye className="w-3.5 h-3.5" />}
                  >
                    Inspect
                  </Button>

                  {listing.status !== "APPROVED" && (
                    <Button
                      variant="primary"
                      size="sm"
                      className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs"
                      disabled={actionLoadingId === listing.id}
                      onClick={() => setApproveConfirmListing(listing)}
                      leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                    >
                      Approve
                    </Button>
                  )}

                  {listing.status !== "REJECTED" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-red-200 text-red-700 hover:bg-red-50 text-xs"
                      disabled={actionLoadingId === listing.id}
                      onClick={() => {
                        setRejectListing(listing);
                        setRejectionReason(listing.moderation?.rejectionReason || "");
                        setRejectionError("");
                      }}
                      leftIcon={<XCircle className="w-3.5 h-3.5" />}
                    >
                      Reject
                    </Button>
                  )}

                  {listing.status === "APPROVED" && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs text-muted-text hover:text-dark-text"
                        disabled={actionLoadingId === listing.id}
                        onClick={() => handleModerateAction(listing.id, "PAUSE")}
                        leftIcon={<PauseCircle className="w-3.5 h-3.5" />}
                      >
                        Unpublish
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs text-muted-text hover:text-red-700"
                        disabled={actionLoadingId === listing.id}
                        onClick={() => handleModerateAction(listing.id, "ARCHIVE")}
                        leftIcon={<Archive className="w-3.5 h-3.5" />}
                      >
                        Archive
                      </Button>
                    </>
                  )}
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

      {/* INSPECT SERVICE MODAL */}
      {inspectListing && (
        <Dialog
          isOpen={Boolean(inspectListing)}
          onClose={() => setInspectListing(null)}
          title="Inspect Professional Service"
          description={`ID: ${inspectListing.id} • Submitted by ${inspectListing.owner.name}`}
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          <div className="space-y-5 text-left">
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-border-subtle">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {getStatusBadge(inspectListing.status)}
                  <span className="text-xs font-bold text-purple-900">
                    {formatPrice(inspectListing)}
                  </span>
                </div>
                <h3 className="text-base font-bold text-dark-text">{inspectListing.title}</h3>
                <p className="text-xs text-muted-text mt-0.5">
                  {inspectListing.location.locality}, {inspectListing.location.city}
                </p>
              </div>

              {inspectListing.status === "APPROVED" && (
                <Link
                  href={`/services/${inspectListing.slug}`}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-xs text-purple-800 hover:underline shrink-0"
                >
                  <span>Public View</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>

            {/* Photos */}
            {inspectListing.photos && inspectListing.photos.length > 0 ? (
              <div>
                <h4 className="text-xs font-semibold text-dark-text mb-2">
                  Trade Photos ({inspectListing.photos.length})
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {inspectListing.photos.map((photo, idx) => (
                    <div
                      key={photo.id || idx}
                      className="rounded-lg overflow-hidden border border-border-subtle bg-gray-100 aspect-video relative"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.url}
                        alt={`Photo ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-gray-50 border border-border-subtle text-center text-xs text-muted-text">
                No photos uploaded for this service.
              </div>
            )}

            {/* Description */}
            <div>
              <h4 className="text-xs font-semibold text-dark-text mb-1">Service Scope & Description</h4>
              <p className="text-xs text-dark-text whitespace-pre-line bg-gray-50 p-3 rounded-lg border border-border-subtle">
                {inspectListing.description}
              </p>
            </div>

            {/* Service Details */}
            {inspectListing.serviceDetails && (
              <div className="p-3.5 rounded-xl border border-purple-200/70 bg-purple-50/40">
                <h4 className="text-xs font-bold text-purple-900 mb-2 uppercase tracking-wide">
                  Trade Profile
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-muted-text block text-[11px]">Trade Category</span>
                    <span className="font-semibold text-dark-text">{inspectListing.serviceDetails.category}</span>
                  </div>
                  <div>
                    <span className="text-muted-text block text-[11px]">Pricing Model</span>
                    <span className="font-semibold text-dark-text">{inspectListing.serviceDetails.pricingModel}</span>
                  </div>
                  <div>
                    <span className="text-muted-text block text-[11px]">Trade Experience</span>
                    <span className="font-semibold text-dark-text">{inspectListing.serviceDetails.experienceYears} Years</span>
                  </div>
                  <div>
                    <span className="text-muted-text block text-[11px]">Operating Hours</span>
                    <span className="font-semibold text-dark-text">
                      {inspectListing.serviceDetails.workingHours?.start || "08:00"} – {inspectListing.serviceDetails.workingHours?.end || "20:00"}
                    </span>
                  </div>
                  <div className="sm:col-span-2">
                    <span className="text-muted-text block text-[11px]">Operating Days</span>
                    <span className="font-semibold text-dark-text">
                      {inspectListing.serviceDetails.workingDays?.join(", ") || "All days"}
                    </span>
                  </div>
                </div>

                {inspectListing.serviceDetails.serviceAreas?.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-purple-200/60">
                    <span className="text-muted-text text-[11px] block mb-1">Service Localities</span>
                    <div className="flex flex-wrap gap-1">
                      {inspectListing.serviceDetails.serviceAreas.map((area) => (
                        <span key={area} className="text-[10px] bg-white border border-purple-200 text-purple-900 px-1.5 py-0.5 rounded font-medium">
                          {area}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {inspectListing.serviceDetails.guarantees && (
                  <div className="mt-2 text-xs text-dark-text">
                    <span className="text-muted-text text-[11px] block">Guarantees & Warranties</span>
                    <span className="italic">{inspectListing.serviceDetails.guarantees}</span>
                  </div>
                )}
              </div>
            )}

            {/* Provider Contact */}
            <div className="p-3 rounded-lg border border-border-subtle bg-gray-50 flex items-center justify-between text-xs">
              <div>
                <span className="text-[11px] text-muted-text block">Professional Account</span>
                <span className="font-bold text-dark-text">{inspectListing.owner.name}</span>
                <span className="text-muted-text ml-1.5">({inspectListing.owner.email})</span>
              </div>
              <div className="flex items-center gap-3">
                {inspectListing.owner.phone && (
                  <span className="flex items-center gap-1 text-purple-800 font-medium">
                    <Phone className="w-3.5 h-3.5" />
                    <span>{inspectListing.owner.phone}</span>
                  </span>
                )}
                {inspectListing.owner.whatsapp && (
                  <span className="flex items-center gap-1 text-emerald-600 font-medium">
                    <MessageCircle className="w-3.5 h-3.5" />
                    <span>WhatsApp</span>
                  </span>
                )}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-3 border-t border-border-subtle flex items-center justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setInspectListing(null)}>
                Close
              </Button>
              {inspectListing.status !== "APPROVED" && (
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-emerald-700 hover:bg-emerald-800 text-white"
                  onClick={() => setApproveConfirmListing(inspectListing)}
                  leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                >
                  Approve Service
                </Button>
              )}
              {inspectListing.status !== "REJECTED" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-200 text-red-700 hover:bg-red-50"
                  onClick={() => {
                    setRejectListing(inspectListing);
                    setRejectionReason(inspectListing.moderation?.rejectionReason || "");
                    setRejectionError("");
                  }}
                  leftIcon={<XCircle className="w-3.5 h-3.5" />}
                >
                  Reject Service
                </Button>
              )}
            </div>
          </div>
        </Dialog>
      )}

      {/* APPROVE CONFIRMATION MODAL */}
      {approveConfirmListing && (
        <Dialog
          isOpen={Boolean(approveConfirmListing)}
          onClose={() => setApproveConfirmListing(null)}
          title="Confirm Service Approval"
          description={`"${approveConfirmListing.title}"`}
        >
          <div className="space-y-4 text-left">
            <p className="text-xs text-muted-text leading-relaxed">
              Approving this service will immediately publish it to the public marketplace, making it visible to customers searching for trade professionals.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setApproveConfirmListing(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-emerald-700 hover:bg-emerald-800 text-white"
                disabled={Boolean(actionLoadingId)}
                onClick={() => handleModerateAction(approveConfirmListing.id, "APPROVE")}
                leftIcon={
                  actionLoadingId ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )
                }
              >
                {actionLoadingId ? "Approving..." : "Confirm Approval"}
              </Button>
            </div>
          </div>
        </Dialog>
      )}

      {/* REJECT WITH REASON MODAL */}
      {rejectListing && (
        <Dialog
          isOpen={Boolean(rejectListing)}
          onClose={() => {
            setRejectListing(null);
            setRejectionReason("");
            setRejectionError("");
          }}
          title="Reject Service Submission"
          description={`"${rejectListing.title}"`}
        >
          <div className="space-y-4 text-left">
            <p className="text-xs text-red-800 bg-red-50 p-2.5 rounded-lg border border-red-200">
              A constructive rejection reason is required so the service provider understands what corrections are needed for resubmission.
            </p>

            <div>
              <label htmlFor="service-reject-reason" className="block text-xs font-semibold text-dark-text mb-1">
                Rejection Reason <span className="text-red-600">*</span>
              </label>
              <textarea
                id="service-reject-reason"
                rows={3}
                value={rejectionReason}
                onChange={(e) => {
                  setRejectionReason(e.target.value);
                  if (rejectionError) setRejectionError("");
                }}
                placeholder="e.g. Please clarify your trade license details and specify realistic starting rates."
                className="w-full p-2.5 rounded-lg border border-border-subtle text-xs text-dark-text focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              <div className="flex items-center justify-between mt-1 text-[11px]">
                {rejectionError ? (
                  <span className="text-red-600 font-medium">{rejectionError}</span>
                ) : (
                  <span className="text-muted-text">Minimum 5 characters</span>
                )}
                <span className="text-muted-text">{rejectionReason.length}/500</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRejectListing(null);
                  setRejectionReason("");
                  setRejectionError("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="border-red-300 text-red-700 hover:bg-red-50"
                disabled={Boolean(actionLoadingId)}
                onClick={() => {
                  if (rejectionReason.trim().length < 5) {
                    setRejectionError("Please provide a reason of at least 5 characters.");
                    return;
                  }
                  handleModerateAction(rejectListing.id, "REJECT", rejectionReason.trim());
                }}
                leftIcon={
                  actionLoadingId ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <XCircle className="w-3.5 h-3.5" />
                  )
                }
              >
                {actionLoadingId ? "Rejecting..." : "Confirm Rejection"}
              </Button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
}
