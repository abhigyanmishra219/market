"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { formatCurrency } from "@/lib/utils";
import {
  Building2,
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

export interface OwnerPropertyItem {
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
  photos: Array<{ id: string; url: string; isPrimary: boolean; caption?: string | null }>;
  propertyDetails?: {
    purpose: string;
    propertyType: string;
    price: number;
    bedrooms?: number;
    bathrooms?: number;
    carpetArea: number;
    furnishing: string;
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
}

interface OwnerPropertyListProps {
  initialProperties: OwnerPropertyItem[];
}

export function OwnerPropertyList({ initialProperties }: OwnerPropertyListProps) {
  const [properties, setProperties] = useState<OwnerPropertyItem[]>(initialProperties);
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<OwnerPropertyItem | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const filteredProperties = properties.filter((p) => {
    if (filterStatus === "ALL") return p.status !== "ARCHIVED";
    return p.status === filterStatus;
  });

  // Fast Status Actions: Pause / Resume / Submit for Review
  const handleStatusChange = async (propertyId: string, newStatus: string) => {
    setActionLoadingId(propertyId);
    try {
      const res = await fetch(`/api/v1/listings/${propertyId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update status.");
      }

      setProperties((prev) =>
        prev.map((item) =>
          item.id === propertyId
            ? { ...item, status: newStatus as OwnerPropertyItem["status"], moderation: json.data?.moderation }
            : item
        )
      );

      showToast(
        newStatus === "PAUSED"
          ? "Listing has been paused and temporarily hidden from public search."
          : newStatus === "APPROVED"
          ? "Listing has been resumed and is now live."
          : newStatus === "PENDING_REVIEW"
          ? "Listing submitted for administrative review."
          : `Listing status updated to ${newStatus}.`
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to change listing status.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Archive / Soft Delete Action
  const handleArchiveConfirm = async () => {
    if (!archiveTarget) return;

    setActionLoadingId(archiveTarget.id);
    try {
      const res = await fetch(`/api/v1/listings/${archiveTarget.id}`, {
        method: "DELETE",
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to archive listing.");
      }

      setProperties((prev) =>
        prev.map((item) =>
          item.id === archiveTarget.id ? { ...item, status: "ARCHIVED" } : item
        )
      );

      showToast("Listing has been archived.");
      setArchiveTarget(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to archive listing.");
    } finally {
      setActionLoadingId(null);
    }
  };

  const getStatusBadge = (status: OwnerPropertyItem["status"]) => {
    switch (status) {
      case "APPROVED":
        return <Badge variant="success" size="sm">Live / Published</Badge>;
      case "PENDING_REVIEW":
        return <Badge variant="warning" size="sm">Under Review</Badge>;
      case "REJECTED":
        return <Badge variant="danger" size="sm">Action Needed</Badge>;
      case "DRAFT":
        return <Badge variant="neutral" size="sm">Draft</Badge>;
      case "PAUSED":
        return <Badge variant="neutral" size="sm">Paused</Badge>;
      case "ARCHIVED":
        return <Badge variant="neutral" size="sm">Archived</Badge>;
      default:
        return <Badge size="sm">{status}</Badge>;
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 rounded-xl bg-forest-green text-white px-4 py-3 shadow-lg text-xs font-medium flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle className="w-4 h-4 text-light-green shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { id: "ALL", label: "Active Listings" },
          { id: "APPROVED", label: "Published" },
          { id: "PENDING_REVIEW", label: "Under Review" },
          { id: "REJECTED", label: "Action Needed" },
          { id: "DRAFT", label: "Drafts" },
          { id: "PAUSED", label: "Paused" },
          { id: "ARCHIVED", label: "Archived" },
        ].map((tab) => {
          const count =
            tab.id === "ALL"
              ? properties.filter((p) => p.status !== "ARCHIVED").length
              : properties.filter((p) => p.status === tab.id).length;

          return (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors flex items-center gap-1.5 ${
                filterStatus === tab.id
                  ? "bg-forest-green text-white shadow-xs"
                  : "bg-white text-muted-text hover:text-dark-text border border-border-subtle hover:bg-gray-50"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  filterStatus === tab.id ? "bg-white/20 text-white" : "bg-gray-100 text-muted-text"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Property Cards List */}
      {filteredProperties.length > 0 ? (
        <div className="grid grid-cols-1 gap-4">
          {filteredProperties.map((property) => {
            const primaryPhoto =
              property.photos.find((p) => p.isPrimary) || property.photos[0];
            const isLoading = actionLoadingId === property.id;

            return (
              <div
                key={property.id}
                className="rounded-2xl border border-border-subtle bg-white p-5 sm:p-6 shadow-xs flex flex-col md:flex-row gap-5 transition-all hover:border-gray-300"
              >
                {/* Thumbnail Image */}
                <div className="relative w-full md:w-56 aspect-16/10 md:aspect-4/3 rounded-xl overflow-hidden bg-off-white shrink-0 border border-border-subtle">
                  {primaryPhoto?.url ? (
                    <Image
                      src={primaryPhoto.url}
                      alt={property.title}
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 100vw, 224px"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-text">
                      <Building2 className="w-8 h-8 opacity-40 mb-1" />
                      <span className="text-[11px]">No photo</span>
                    </div>
                  )}

                  <div className="absolute top-2 left-2">
                    {getStatusBadge(property.status)}
                  </div>
                </div>

                {/* Details Content */}
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    {/* Rejection Alert Box */}
                    {property.status === "REJECTED" && property.moderation?.rejectionReason && (
                      <div className="rounded-lg bg-red-50 border border-red-200 p-3 mb-3 text-xs flex items-start gap-2 text-red-900">
                        <ShieldAlert className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Moderation Feedback: </span>
                          <span>{property.moderation.rejectionReason}</span>
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row sm:items-baseline justify-between gap-2 mb-2">
                      <h3 className="text-base font-bold text-dark-text tracking-tight hover:text-forest-green transition-colors">
                        {property.title}
                      </h3>
                      {property.propertyDetails?.price && (
                        <span className="text-base font-extrabold text-forest-green shrink-0">
                          {formatCurrency(property.propertyDetails.price)}
                          {property.propertyDetails?.purpose !== "FOR_SALE" && (
                            <span className="text-xs font-normal text-muted-text">/mo</span>
                          )}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5 text-xs text-muted-text mb-3">
                      <MapPin className="w-3.5 h-3.5 shrink-0" />
                      <span>{property.location.locality}, {property.location.city}</span>
                      {property.location.streetAddress && (
                        <span className="text-gray-400 font-light truncate">
                          ({property.location.streetAddress})
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 mb-4">
                      {property.propertyDetails?.purpose && (
                        <Badge variant="property" size="sm">
                          {property.propertyDetails.purpose.replace("_", " ")}
                        </Badge>
                      )}
                      {property.propertyDetails?.propertyType && (
                        <Badge variant="neutral" size="sm">
                          {property.propertyDetails.propertyType.replace("_", " ")}
                        </Badge>
                      )}
                      {property.propertyDetails?.bedrooms !== undefined && property.propertyDetails.bedrooms > 0 && (
                        <Badge variant="neutral" size="sm">
                          {property.propertyDetails.bedrooms} BHK
                        </Badge>
                      )}
                      {property.propertyDetails?.carpetArea && (
                        <span className="text-xs text-muted-text">
                          {property.propertyDetails.carpetArea} sq.ft.
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions Toolbar */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-border-subtle mt-auto">
                    <div className="flex items-center gap-3 text-xs text-muted-text">
                      <span className="flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5" /> {property.metrics?.views || 0} views
                      </span>
                      <span>•</span>
                      <span>Created {new Date(property.createdAt).toLocaleDateString()}</span>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* View Public / Preview */}
                      {property.status === "APPROVED" ? (
                        <Link href={`/properties/${property.slug || property.id}`}>
                          <Button variant="outline" size="sm" leftIcon={<Eye className="w-3.5 h-3.5" />}>
                            View Live
                          </Button>
                        </Link>
                      ) : null}

                      {/* Edit Button */}
                      {property.status !== "ARCHIVED" && (
                        <Link href={`/dashboard/properties/${property.id}/edit`}>
                          <Button
                            variant="secondary"
                            size="sm"
                            leftIcon={<Edit3 className="w-3.5 h-3.5" />}
                          >
                            Edit
                          </Button>
                        </Link>
                      )}

                      {/* Submit for Review (if Draft or Rejected) */}
                      {(property.status === "DRAFT" || property.status === "REJECTED") && (
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handleStatusChange(property.id, "PENDING_REVIEW")}
                          isLoading={isLoading}
                          leftIcon={<Send className="w-3.5 h-3.5" />}
                        >
                          Submit for Review
                        </Button>
                      )}

                      {/* Pause / Resume Toggle */}
                      {property.status === "APPROVED" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStatusChange(property.id, "PAUSED")}
                          isLoading={isLoading}
                          leftIcon={<Pause className="w-3.5 h-3.5" />}
                        >
                          Pause
                        </Button>
                      )}

                      {property.status === "PAUSED" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleStatusChange(property.id, "APPROVED")}
                          isLoading={isLoading}
                          leftIcon={<Play className="w-3.5 h-3.5" />}
                        >
                          Resume
                        </Button>
                      )}

                      {/* Archive / Delete Button */}
                      {property.status !== "ARCHIVED" && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setArchiveTarget(property)}
                          className="text-red-600 hover:bg-red-50"
                          title="Archive property"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="rounded-2xl border border-dashed border-border-subtle bg-white p-12 text-center flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-light-green text-forest-green flex items-center justify-center mb-3">
            <Building2 className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-dark-text">No properties found</h3>
          <p className="text-xs text-muted-text max-w-sm mt-1 mb-6 leading-relaxed">
            {filterStatus === "ALL"
              ? "You haven't created any property listings yet. Post your first property in minutes to reach genuine buyers and tenants."
              : `You have no properties matching the "${filterStatus}" status filter.`}
          </p>
          <Link href="/dashboard/properties/new">
            <Button variant="primary" size="md" leftIcon={<PlusCircle className="w-4 h-4" />}>
              Post a Property Listing
            </Button>
          </Link>
        </div>
      )}

      {/* Confirmation Dialog for Archival */}
      <Dialog
        isOpen={Boolean(archiveTarget)}
        onClose={() => setArchiveTarget(null)}
        title="Archive Property Listing?"
        description="Are you sure you want to archive this property? It will be immediately delisted from public searches. You can still access historical records."
      >
        <div className="mt-4 flex items-center justify-end gap-3">
          <Button variant="outline" size="sm" onClick={() => setArchiveTarget(null)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleArchiveConfirm}
            isLoading={Boolean(actionLoadingId)}
          >
            Confirm & Archive
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
