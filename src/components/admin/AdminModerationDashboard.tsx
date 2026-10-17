"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Dialog } from "@/components/ui/Dialog";
import {
  ShieldCheck,
  Building2,
  Wrench,
  Clock,
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
  Layers,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Loader2,
  Image as ImageIcon,
} from "lucide-react";

export interface AdminMetrics {
  propertiesTotal: number;
  servicesTotal: number;
  pendingProperties: number;
  pendingServices: number;
  approvedProperties: number;
  approvedServices: number;
  rejectedProperties: number;
  rejectedServices: number;
  pendingTotal: number;
  approvedTotal: number;
  rejectedTotal: number;
  pausedTotal: number;
  archivedTotal: number;
  usersTotal: number;
}

export interface AdminListing {
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
  propertyDetails?: {
    purpose: string;
    propertyType: string;
    price: number;
    securityDeposit?: number;
    maintenanceFee?: number;
    bedrooms?: number;
    bathrooms?: number;
    carpetArea: number;
    furnishing: string;
    amenities: string[];
    availableFrom?: string;
    preferredTenants?: string;
  };
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
  metrics: {
    views: number;
    contactReveals: number;
    savesCount: number;
  };
  createdAt: string;
  updatedAt: string;
}

interface AdminModerationDashboardProps {
  initialMetrics: AdminMetrics;
  initialListings?: AdminListing[];
  initialTotalCount?: number;
  initialTotalPages?: number;
  adminUser: {
    name?: string | null;
    email?: string | null;
    role?: string;
  };
}

export function AdminModerationDashboard({
  initialMetrics,
  initialListings = [],
  initialTotalCount = 0,
  initialTotalPages = 1,
  adminUser,
}: AdminModerationDashboardProps) {
  const [metrics, setMetrics] = useState<AdminMetrics>(initialMetrics);
  const [activeTab, setActiveTab] = useState<"PENDING" | "PROPERTIES" | "SERVICES" | "ALL">("PENDING");
  const [typeFilter, setTypeFilter] = useState<"PROPERTY" | "SERVICE" | "ALL">("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("PENDING_REVIEW");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(15);

  const [listings, setListings] = useState<AdminListing[]>(initialListings);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [totalCount, setTotalCount] = useState(initialTotalCount);
  const [isLoading, setIsLoading] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isFirstMount = React.useRef(true);

  // Dialog States
  const [inspectListing, setInspectListing] = useState<AdminListing | null>(null);
  const [approveConfirmListing, setApproveConfirmListing] = useState<AdminListing | null>(null);
  const [rejectListing, setRejectListing] = useState<AdminListing | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectionError, setRejectionError] = useState("");

  // Sync tab clicks with filter states
  const handleTabChange = (tab: "PENDING" | "PROPERTIES" | "SERVICES" | "ALL") => {
    setActiveTab(tab);
    setPage(1);
    if (tab === "PENDING") {
      setTypeFilter("ALL");
      setStatusFilter("PENDING_REVIEW");
    } else if (tab === "PROPERTIES") {
      setTypeFilter("PROPERTY");
      setStatusFilter("ALL");
    } else if (tab === "SERVICES") {
      setTypeFilter("SERVICE");
      setStatusFilter("ALL");
    } else {
      setTypeFilter("ALL");
      setStatusFilter("ALL");
    }
  };

  const fetchMetrics = async () => {
    try {
      const res = await fetch("/api/v1/admin/overview");
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setMetrics(json.data);
        }
      }
    } catch (e) {
      console.error("[FETCH_METRICS_ERROR]", e);
    }
  };

  const fetchListings = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        type: typeFilter,
        status: statusFilter,
        page: page.toString(),
        limit: limit.toString(),
      });
      if (searchQuery.trim()) {
        params.set("search", searchQuery.trim());
      }

      const res = await fetch(`/api/v1/admin/listings?${params.toString()}`);
      if (!res.ok) throw new Error("Failed to load listings");

      const json = await res.json();
      if (json.success && json.data) {
        setListings(json.data.listings || []);
        setTotalPages(json.data.pagination.totalPages || 1);
        setTotalCount(json.data.pagination.totalCount || 0);
      }
    } catch (error) {
      console.error("[ADMIN_FETCH_LISTINGS_ERROR]", error);
      setToastMessage({ type: "error", text: "Failed to load listings for moderation." });
    } finally {
      setIsLoading(false);
    }
  }, [typeFilter, statusFilter, page, limit, searchQuery]);

  useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false;
      return;
    }
    fetchListings();
  }, [fetchListings]);

  // Auto clear toast after 4 seconds
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleApprove = async (listing: AdminListing) => {
    setActionLoadingId(listing.id);
    try {
      const res = await fetch(`/api/v1/admin/listings/${listing.id}/moderate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "APPROVE" }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to approve listing");
      }

      setToastMessage({
        type: "success",
        text: `"${listing.title}" successfully APPROVED and published live!`,
      });
      setApproveConfirmListing(null);
      if (inspectListing?.id === listing.id) {
        setInspectListing(null);
      }

      // Refresh list & metrics
      fetchListings();
      fetchMetrics();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Approval failed";
      setToastMessage({ type: "error", text: msg });
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectListing) return;
    if (!rejectionReason.trim() || rejectionReason.trim().length < 5) {
      setRejectionError("Please provide a constructive reason of at least 5 characters.");
      return;
    }

    setActionLoadingId(rejectListing.id);
    try {
      const res = await fetch(`/api/v1/admin/listings/${rejectListing.id}/moderate`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "REJECT",
          rejectionReason: rejectionReason.trim(),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to reject listing");
      }

      setToastMessage({
        type: "success",
        text: `Listing rejected with feedback provided to owner.`,
      });
      setRejectListing(null);
      setRejectionReason("");
      setRejectionError("");
      if (inspectListing?.id === rejectListing.id) {
        setInspectListing(null);
      }

      // Refresh list & metrics
      fetchListings();
      fetchMetrics();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Rejection failed";
      setToastMessage({ type: "error", text: msg });
    } finally {
      setActionLoadingId(null);
    }
  };

  const formatPrice = (listing: AdminListing) => {
    if (listing.type === "PROPERTY" && listing.propertyDetails) {
      const p = listing.propertyDetails;
      const formatted = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(p.price);
      return p.purpose === "FOR_RENT" ? `${formatted} / month` : formatted;
    }
    if (listing.type === "SERVICE" && listing.serviceDetails) {
      const s = listing.serviceDetails;
      if (s.pricingModel === "QUOTE_BASED") return "Quote based";
      if (!s.startingPrice) return "Free estimate";
      const formatted = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 0,
      }).format(s.startingPrice);
      return s.pricingModel === "HOURLY" ? `${formatted} / hr` : `From ${formatted}`;
    }
    return "N/A";
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
      case "DRAFT":
        return <Badge variant="neutral" size="sm">Draft</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8">
      {/* Toast Notification */}
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

      {/* Staff Banner */}
      <div className="rounded-2xl border border-purple-200 bg-gradient-to-r from-purple-50/80 via-white to-light-green/30 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-purple-700" />
              <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                Staff Moderation Console
              </span>
              <Badge variant="primary" size="sm" className="bg-purple-700 text-white border-purple-800">
                ADMIN
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-dark-text tracking-tight">
              Listing Approvals & Platform Governance
            </h1>
            <p className="text-xs text-muted-text mt-1">
              Logged in as: <strong className="text-dark-text">{adminUser.name}</strong> ({adminUser.email}).
              Review submissions, enforce quality guidelines, and approve community listings.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                fetchMetrics();
                fetchListings();
              }}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              className="text-xs"
            >
              Sync Dashboard
            </Button>
          </div>
        </div>
      </div>

      {/* Overview Statistics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Pending Total */}
        <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/50 shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-amber-900 uppercase tracking-wider">Pending</span>
            <Clock className="w-4 h-4 text-amber-700" />
          </div>
          <div className="text-2xl font-extrabold text-amber-950">{metrics.pendingTotal}</div>
          <div className="text-[10px] text-amber-800 mt-0.5">
            {metrics.pendingProperties} props, {metrics.pendingServices} serv
          </div>
        </div>

        {/* Live Approved */}
        <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/40 shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-emerald-900 uppercase tracking-wider">Live Approved</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-950">{metrics.approvedTotal}</div>
          <div className="text-[10px] text-emerald-800 mt-0.5">
            {metrics.approvedProperties} props, {metrics.approvedServices} serv
          </div>
        </div>

        {/* Total Properties */}
        <div className="p-4 rounded-xl border border-border-subtle bg-white shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-muted-text uppercase tracking-wider">Properties</span>
            <Building2 className="w-4 h-4 text-forest-green" />
          </div>
          <div className="text-2xl font-extrabold text-dark-text">{metrics.propertiesTotal}</div>
          <div className="text-[10px] text-muted-text mt-0.5">
            {metrics.pendingProperties} awaiting approval
          </div>
        </div>

        {/* Total Services */}
        <div className="p-4 rounded-xl border border-border-subtle bg-white shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-muted-text uppercase tracking-wider">Services</span>
            <Wrench className="w-4 h-4 text-purple-700" />
          </div>
          <div className="text-2xl font-extrabold text-dark-text">{metrics.servicesTotal}</div>
          <div className="text-[10px] text-muted-text mt-0.5">
            {metrics.pendingServices} awaiting approval
          </div>
        </div>

        {/* Rejected Listings */}
        <div className="p-4 rounded-xl border border-red-200 bg-red-50/30 shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-red-900 uppercase tracking-wider">Rejected</span>
            <XCircle className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-extrabold text-red-950">{metrics.rejectedTotal}</div>
          <div className="text-[10px] text-red-800 mt-0.5">
            Feedback sent to owners
          </div>
        </div>

        {/* Total Accounts */}
        <div className="p-4 rounded-xl border border-border-subtle bg-white shadow-2xs">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[11px] font-semibold text-muted-text uppercase tracking-wider">Accounts</span>
            <UserIcon className="w-4 h-4 text-blue-700" />
          </div>
          <div className="text-2xl font-extrabold text-dark-text">{metrics.usersTotal}</div>
          <div className="text-[10px] text-muted-text mt-0.5">
            Verified members
          </div>
        </div>
      </div>

      {/* Main Moderation Console Card */}
      <div className="rounded-2xl border border-border-subtle bg-white shadow-sm overflow-hidden">
        {/* Navigation Tabs Header */}
        <div className="border-b border-border-subtle px-4 sm:px-6 pt-4 flex flex-wrap items-center justify-between gap-4 bg-gray-50/50">
          <div className="flex items-center gap-1 sm:gap-2">
            <button
              type="button"
              onClick={() => handleTabChange("PENDING")}
              className={`px-3 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-2 ${
                activeTab === "PENDING"
                  ? "border-amber-600 text-amber-900 bg-white"
                  : "border-transparent text-muted-text hover:text-dark-text"
              }`}
            >
              <Clock className="w-3.5 h-3.5 text-amber-600" />
              <span>Pending Queue</span>
              {metrics.pendingTotal > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800">
                  {metrics.pendingTotal}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("PROPERTIES")}
              className={`px-3 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-2 ${
                activeTab === "PROPERTIES"
                  ? "border-forest-green text-forest-green bg-white"
                  : "border-transparent text-muted-text hover:text-dark-text"
              }`}
            >
              <Building2 className="w-3.5 h-3.5 text-forest-green" />
              <span>Properties</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-medium bg-gray-100 text-muted-text">
                {metrics.propertiesTotal}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("SERVICES")}
              className={`px-3 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-2 ${
                activeTab === "SERVICES"
                  ? "border-purple-700 text-purple-900 bg-white"
                  : "border-transparent text-muted-text hover:text-dark-text"
              }`}
            >
              <Wrench className="w-3.5 h-3.5 text-purple-700" />
              <span>Services</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-medium bg-gray-100 text-muted-text">
                {metrics.servicesTotal}
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleTabChange("ALL")}
              className={`px-3 py-2.5 text-xs font-semibold rounded-t-lg transition-colors border-b-2 flex items-center gap-2 ${
                activeTab === "ALL"
                  ? "border-dark-text text-dark-text bg-white"
                  : "border-transparent text-muted-text hover:text-dark-text"
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-dark-text" />
              <span>All Submissions</span>
            </button>
          </div>

          <div className="text-xs text-muted-text pb-2 sm:pb-0">
            Showing <strong className="text-dark-text">{listings.length}</strong> of{" "}
            <strong className="text-dark-text">{totalCount}</strong> listings
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="p-4 border-b border-border-subtle bg-white flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-muted-text absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search title, locality, city, owner..."
              className="w-full pl-9 pr-3 py-2 rounded-lg border border-border-subtle text-xs text-dark-text placeholder:text-muted-text focus:outline-none focus:ring-1 focus:ring-forest-green"
            />
          </div>

          {/* Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-muted-text">
              <span>Type:</span>
              <select
                value={typeFilter}
                onChange={(e) => {
                  setTypeFilter(e.target.value as "PROPERTY" | "SERVICE" | "ALL");
                  setPage(1);
                }}
                className="px-2.5 py-1.5 rounded-lg border border-border-subtle bg-white text-xs text-dark-text focus:outline-none focus:ring-1 focus:ring-forest-green font-medium"
              >
                <option value="ALL">All Types</option>
                <option value="PROPERTY">Properties</option>
                <option value="SERVICE">Services</option>
              </select>
            </div>

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

            <Button
              variant="outline"
              size="sm"
              onClick={fetchListings}
              className="h-8 text-xs"
              leftIcon={<RefreshCw className="w-3 h-3" />}
            >
              Filter
            </Button>
          </div>
        </div>

        {/* Listings List Surface */}
        {isLoading ? (
          <div className="p-12 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-purple-700 mx-auto mb-3" />
            <p className="text-xs text-muted-text font-medium">Retrieving listings from database...</p>
          </div>
        ) : listings.length === 0 ? (
          <div className="p-12 text-center max-w-md mx-auto">
            <div className="w-12 h-12 rounded-full bg-light-green text-forest-green flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-dark-text">No listings found</h3>
            <p className="text-xs text-muted-text mt-1">
              There are no listings matching your current filter criteria. Great job keeping the moderation queue clean!
            </p>
            {(statusFilter !== "ALL" || typeFilter !== "ALL" || searchQuery) && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4 text-xs"
                onClick={() => {
                  setTypeFilter("ALL");
                  setStatusFilter("ALL");
                  setSearchQuery("");
                }}
              >
                Reset Filters
              </Button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {listings.map((listing) => (
              <div
                key={listing.id}
                className="p-4 sm:p-5 hover:bg-gray-50/70 transition-colors flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4"
              >
                {/* Left: Thumbnail + Core Specs */}
                <div className="flex items-start gap-4 flex-1 min-w-0">
                  {/* Photo thumbnail or placeholder icon */}
                  <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl bg-gray-100 border border-border-subtle overflow-hidden shrink-0 flex items-center justify-center relative">
                    {listing.photos && listing.photos.length > 0 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={listing.photos[0].url}
                        alt={listing.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-muted-text">
                        <ImageIcon className="w-5 h-5 mb-0.5" />
                        <span className="text-[9px]">No photo</span>
                      </div>
                    )}
                    <div className="absolute top-1 left-1">
                      <span
                        className={`text-[9px] font-bold px-1 rounded uppercase ${
                          listing.type === "PROPERTY"
                            ? "bg-forest-green text-white"
                            : "bg-purple-700 text-white"
                        }`}
                      >
                        {listing.type === "PROPERTY" ? "Prop" : "Serv"}
                      </span>
                    </div>
                  </div>

                  {/* Details column */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      {getStatusBadge(listing.status)}
                      <span className="text-xs font-bold text-forest-green">
                        {formatPrice(listing)}
                      </span>
                      {listing.type === "PROPERTY" && listing.propertyDetails && (
                        <span className="text-[11px] text-muted-text border-l border-border-subtle pl-2">
                          {listing.propertyDetails.propertyType} • {listing.propertyDetails.furnishing}
                        </span>
                      )}
                      {listing.type === "SERVICE" && listing.serviceDetails && (
                        <span className="text-[11px] text-purple-900 border-l border-border-subtle pl-2 font-medium">
                          {listing.serviceDetails.category} • {listing.serviceDetails.experienceYears}y exp
                        </span>
                      )}
                    </div>

                    <h3 className="text-sm font-bold text-dark-text truncate">
                      {listing.title}
                    </h3>

                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-text mt-1">
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-forest-green shrink-0" />
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

                    {/* Rejection callout if previously rejected */}
                    {listing.status === "REJECTED" && listing.moderation.rejectionReason && (
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
                <div className="flex items-center gap-2 shrink-0 self-end lg:self-center">
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
                      leftIcon={
                        actionLoadingId === listing.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        )
                      }
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
                        setRejectionReason(listing.moderation.rejectionReason || "");
                        setRejectionError("");
                      }}
                      leftIcon={<XCircle className="w-3.5 h-3.5" />}
                    >
                      Reject
                    </Button>
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
              <strong className="text-dark-text">{totalPages}</strong>
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

      {/* ========================================================================= */}
      {/* INSPECT LISTING DETAIL MODAL */}
      {/* ========================================================================= */}
      {inspectListing && (
        <Dialog
          isOpen={Boolean(inspectListing)}
          onClose={() => setInspectListing(null)}
          title={`Inspect ${inspectListing.type === "PROPERTY" ? "Property" : "Service"} Submission`}
          description={`ID: ${inspectListing.id} • Submitted by ${inspectListing.owner.name}`}
          className="max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          <div className="space-y-5 text-left">
            {/* Header info */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-border-subtle">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  {getStatusBadge(inspectListing.status)}
                  <span className="text-xs font-bold text-forest-green">
                    {formatPrice(inspectListing)}
                  </span>
                </div>
                <h3 className="text-base font-bold text-dark-text">{inspectListing.title}</h3>
                <p className="text-xs text-muted-text mt-0.5">
                  {inspectListing.location.streetAddress ? `${inspectListing.location.streetAddress}, ` : ""}
                  {inspectListing.location.locality}, {inspectListing.location.city} ({inspectListing.location.cityCode})
                </p>
              </div>

              {inspectListing.status === "APPROVED" && (
                <Link
                  href={inspectListing.type === "PROPERTY" ? `/properties/${inspectListing.slug}` : `/services/${inspectListing.slug}`}
                  target="_blank"
                  className="inline-flex items-center gap-1 text-xs text-forest-green hover:underline shrink-0"
                >
                  <span>Public View</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              )}
            </div>

            {/* Photos carousel / grid */}
            {inspectListing.photos && inspectListing.photos.length > 0 ? (
              <div>
                <h4 className="text-xs font-semibold text-dark-text mb-2 flex items-center justify-between">
                  <span>Uploaded Photos ({inspectListing.photos.length})</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {inspectListing.photos.map((photo, idx) => (
                    <div
                      key={photo.id || idx}
                      className="rounded-lg overflow-hidden border border-border-subtle bg-gray-100 aspect-video relative group"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.url}
                        alt={`Photo ${idx + 1}`}
                        className="w-full h-full object-cover"
                      />
                      {photo.isPrimary && (
                        <span className="absolute bottom-1 left-1 bg-forest-green text-white text-[9px] font-bold px-1.5 py-0.5 rounded shadow">
                          Primary
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 rounded-lg bg-gray-50 border border-border-subtle text-center text-xs text-muted-text">
                No photos attached to this listing submission.
              </div>
            )}

            {/* Description */}
            <div>
              <h4 className="text-xs font-semibold text-dark-text mb-1">Description</h4>
              <p className="text-xs text-dark-text/90 whitespace-pre-line bg-gray-50 p-3 rounded-lg border border-border-subtle">
                {inspectListing.description}
              </p>
            </div>

            {/* Specific Specs: Property vs Service */}
            {inspectListing.type === "PROPERTY" && inspectListing.propertyDetails && (
              <div className="p-3.5 rounded-xl border border-emerald-200/60 bg-light-green/20">
                <h4 className="text-xs font-bold text-forest-green mb-2 uppercase tracking-wide">
                  Property Specifications
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-muted-text block text-[11px]">Classification</span>
                    <span className="font-semibold text-dark-text">{inspectListing.propertyDetails.propertyType}</span>
                  </div>
                  <div>
                    <span className="text-muted-text block text-[11px]">Purpose</span>
                    <span className="font-semibold text-dark-text">{inspectListing.propertyDetails.purpose}</span>
                  </div>
                  <div>
                    <span className="text-muted-text block text-[11px]">Furnishing</span>
                    <span className="font-semibold text-dark-text">{inspectListing.propertyDetails.furnishing}</span>
                  </div>
                  <div>
                    <span className="text-muted-text block text-[11px]">Bedrooms / Baths</span>
                    <span className="font-semibold text-dark-text">
                      {inspectListing.propertyDetails.bedrooms || 0} BHK / {inspectListing.propertyDetails.bathrooms || 0} Bath
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-text block text-[11px]">Carpet Area</span>
                    <span className="font-semibold text-dark-text">{inspectListing.propertyDetails.carpetArea} sq ft</span>
                  </div>
                  <div>
                    <span className="text-muted-text block text-[11px]">Security Deposit</span>
                    <span className="font-semibold text-dark-text">₹{inspectListing.propertyDetails.securityDeposit || 0}</span>
                  </div>
                </div>

                {inspectListing.propertyDetails.amenities && inspectListing.propertyDetails.amenities.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-emerald-200/50">
                    <span className="text-muted-text text-[11px] block mb-1">Amenities</span>
                    <div className="flex flex-wrap gap-1">
                      {inspectListing.propertyDetails.amenities.map((a) => (
                        <span key={a} className="text-[10px] bg-white border border-emerald-200 text-forest-green px-1.5 py-0.5 rounded font-medium">
                          {a}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {inspectListing.type === "SERVICE" && inspectListing.serviceDetails && (
              <div className="p-3.5 rounded-xl border border-purple-200/70 bg-purple-50/40">
                <h4 className="text-xs font-bold text-purple-900 mb-2 uppercase tracking-wide">
                  Service Professional Profile
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
                    <span className="text-muted-text block text-[11px]">Working Hours</span>
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

                {inspectListing.serviceDetails.serviceAreas && inspectListing.serviceDetails.serviceAreas.length > 0 && (
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
                    <span className="text-muted-text text-[11px] block">Guarantees & Warranties:</span>
                    <span className="italic">{inspectListing.serviceDetails.guarantees}</span>
                  </div>
                )}
              </div>
            )}

            {/* Provider / Owner contact card */}
            <div className="p-3 rounded-lg border border-border-subtle bg-gray-50 flex flex-wrap items-center justify-between gap-3">
              <div>
                <span className="text-[11px] text-muted-text block">Listing Owner Account</span>
                <span className="text-xs font-bold text-dark-text">{inspectListing.owner.name}</span>
                <span className="text-xs text-muted-text ml-1.5">({inspectListing.owner.email})</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                {inspectListing.owner.phone && (
                  <span className="flex items-center gap-1 text-forest-green font-medium">
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

            {/* Footer action buttons */}
            <div className="pt-3 border-t border-border-subtle flex items-center justify-end gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setInspectListing(null)}
              >
                Close
              </Button>

              {inspectListing.status !== "APPROVED" && (
                <Button
                  variant="primary"
                  size="sm"
                  className="bg-emerald-700 hover:bg-emerald-800 text-white"
                  disabled={actionLoadingId === inspectListing.id}
                  onClick={() => setApproveConfirmListing(inspectListing)}
                  leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                >
                  Approve Listing
                </Button>
              )}

              {inspectListing.status !== "REJECTED" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-200 text-red-700 hover:bg-red-50"
                  disabled={actionLoadingId === inspectListing.id}
                  onClick={() => {
                    setRejectListing(inspectListing);
                    setRejectionReason(inspectListing.moderation.rejectionReason || "");
                    setRejectionError("");
                  }}
                  leftIcon={<XCircle className="w-3.5 h-3.5" />}
                >
                  Reject Listing
                </Button>
              )}
            </div>
          </div>
        </Dialog>
      )}

      {/* ========================================================================= */}
      {/* APPROVE CONFIRMATION DIALOG */}
      {/* ========================================================================= */}
      {approveConfirmListing && (
        <Dialog
          isOpen={Boolean(approveConfirmListing)}
          onClose={() => setApproveConfirmListing(null)}
          title="Approve & Publish Listing"
          description="Confirm immediate publication to the public marketplace."
        >
          <div className="space-y-4 text-left">
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-950">
              <p className="font-semibold mb-1">
                You are approving: &quot;{approveConfirmListing.title}&quot;
              </p>
              <p>
                Once approved, this {approveConfirmListing.type.toLowerCase()} will immediately be indexable and visible
                to all public marketplace visitors. Your admin audit timestamp will be recorded.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-border-subtle">
              <Button
                variant="outline"
                size="sm"
                disabled={Boolean(actionLoadingId)}
                onClick={() => setApproveConfirmListing(null)}
              >
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                className="bg-emerald-700 hover:bg-emerald-800 text-white"
                disabled={Boolean(actionLoadingId)}
                onClick={() => handleApprove(approveConfirmListing)}
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

      {/* ========================================================================= */}
      {/* REJECT LISTING WITH REASON DIALOG */}
      {/* ========================================================================= */}
      {rejectListing && (
        <Dialog
          isOpen={Boolean(rejectListing)}
          onClose={() => {
            setRejectListing(null);
            setRejectionReason("");
            setRejectionError("");
          }}
          title="Reject Listing Submission"
          description="Provide a clear, actionable reason to the listing owner."
        >
          <div className="space-y-4 text-left">
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-950">
              <p className="font-semibold mb-1">
                Rejecting: &quot;{rejectListing.title}&quot;
              </p>
              <p>
                A rejection reason is required so the provider/owner knows why their listing did not meet community standards and can edit it for resubmission.
              </p>
            </div>

            <div>
              <label htmlFor="rejection-reason" className="block text-xs font-semibold text-dark-text mb-1.5">
                Rejection Reason (Required) <span className="text-red-600">*</span>
              </label>
              <textarea
                id="rejection-reason"
                rows={3}
                value={rejectionReason}
                onChange={(e) => {
                  setRejectionReason(e.target.value);
                  if (rejectionError) setRejectionError("");
                }}
                placeholder="e.g. Please upload clear photos of the premises and specify complete operating hours."
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
                disabled={Boolean(actionLoadingId)}
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
                onClick={handleReject}
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
