"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  AlertCircle,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Wrench,
  Search,
} from "lucide-react";

export interface BookingItem {
  id: string;
  status:
    | "PENDING"
    | "ACCEPTED"
    | "REJECTED"
    | "ALTERNATIVE_PROPOSED"
    | "CANCELLED"
    | "COMPLETED";
  requestedDate: string;
  timeSlot: string;
  serviceAddress: {
    line1: string;
    locality: string;
    city?: string;
  };
  customerPhone: string;
  customerNotes?: string | null;
  providerNotes?: string | null;
  alternativeDetails?: {
    proposedDate: string;
    proposedSlot: string;
    note?: string | null;
    proposedAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  provider?: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    image?: string | null;
  } | null;
  customer?: {
    id: string;
    name: string;
    email: string;
    phone?: string | null;
    image?: string | null;
  } | null;
  listing?: {
    id: string;
    title: string;
    slug: string;
    category?: string;
    pricingModel?: string;
    startingPrice?: number;
    locality?: string;
    city?: string;
    photo?: string | null;
  } | null;
}

interface CustomerBookingListProps {
  initialBookings: BookingItem[];
}

const STATUS_FILTERS = [
  { id: "ALL", label: "All Bookings" },
  { id: "PENDING", label: "Pending" },
  { id: "ACCEPTED", label: "Accepted" },
  { id: "ALTERNATIVE_PROPOSED", label: "Alternative Proposed" },
  { id: "COMPLETED", label: "Completed" },
  { id: "CANCELLED", label: "Cancelled" },
];

export function CustomerBookingList({ initialBookings }: CustomerBookingListProps) {
  const [bookings, setBookings] = useState<BookingItem[]>(initialBookings);
  const [filter, setFilter] = useState("ALL");
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  const [cancelTarget, setCancelTarget] = useState<BookingItem | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = bookings.filter((b) => {
    if (filter === "ALL") return true;
    return b.status === filter;
  });

  const handleStatusAction = async (
    bookingId: string,
    action: string,
    payload: Record<string, unknown> = {}
  ) => {
    setActionError(null);
    setLoadingActionId(bookingId);
    try {
      const res = await fetch(`/api/v1/bookings/${bookingId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, ...payload }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to update booking status.");
      }

      // Update local state
      setBookings((prev) =>
        prev.map((b) => {
          if (b.id !== bookingId) return b;
          return {
            ...b,
            status: data.data.status,
            requestedDate: data.data.requestedDate || b.requestedDate,
            timeSlot: data.data.timeSlot || b.timeSlot,
            updatedAt: data.data.updatedAt,
          };
        })
      );
      setCancelTarget(null);
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "Error updating booking."
      );
    } finally {
      setLoadingActionId(null);
    }
  };

  const getStatusBadge = (status: BookingItem["status"]) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="warning" size="sm">
            Pending Provider Review
          </Badge>
        );
      case "ACCEPTED":
        return (
          <Badge variant="success" size="sm">
            Confirmed & Accepted
          </Badge>
        );
      case "ALTERNATIVE_PROPOSED":
        return (
          <Badge variant="service" size="sm">
            Alternative Time Proposed
          </Badge>
        );
      case "COMPLETED":
        return (
          <Badge variant="primary" size="sm">
            Completed
          </Badge>
        );
      case "REJECTED":
        return (
          <Badge variant="danger" size="sm">
            Declined
          </Badge>
        );
      case "CANCELLED":
        return (
          <Badge variant="neutral" size="sm">
            Cancelled
          </Badge>
        );
      default:
        return (
          <Badge variant="neutral" size="sm">
            {status}
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-border-subtle scrollbar-none">
        {STATUS_FILTERS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setFilter(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              filter === tab.id
                ? "bg-forest-green text-white shadow-xs"
                : "bg-white text-muted-text hover:text-dark-text border border-border-subtle"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {actionError && (
        <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{actionError}</span>
        </div>
      )}

      {/* Bookings List */}
      {filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map((booking) => {
            const reqDate = new Date(booking.requestedDate).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            return (
              <div
                key={booking.id}
                className="rounded-2xl border border-border-subtle bg-white p-5 sm:p-6 shadow-xs transition-shadow hover:shadow-md"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-border-subtle">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {getStatusBadge(booking.status)}
                      <span className="text-[11px] text-muted-text">
                        Requested on {new Date(booking.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-dark-text">
                      {booking.listing ? (
                        <Link
                          href={`/services/${booking.listing.slug || booking.listing.id}`}
                          className="hover:text-forest-green transition-colors"
                        >
                          {booking.listing.title}
                        </Link>
                      ) : (
                        "Skilled Service Appointment"
                      )}
                    </h3>
                    <div className="text-xs text-muted-text mt-0.5">
                      Provider: <span className="font-semibold text-dark-text">{booking.provider?.name || "Service Professional"}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-off-white border border-border-subtle text-xs font-semibold text-dark-text">
                      <Calendar className="w-3.5 h-3.5 text-forest-green" />
                      <span>{reqDate}</span>
                      <span className="text-muted-text">•</span>
                      <Clock className="w-3.5 h-3.5 text-muted-text" />
                      <span>{booking.timeSlot}</span>
                    </div>
                  </div>
                </div>

                {/* Appointment Address & Notes */}
                <div className="py-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-text block mb-1 font-semibold flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-forest-green" /> Service Address
                    </span>
                    <p className="text-dark-text">
                      {booking.serviceAddress.line1}, {booking.serviceAddress.locality}
                    </p>
                  </div>

                  {booking.customerNotes && (
                    <div>
                      <span className="text-muted-text block mb-1 font-semibold flex items-center gap-1">
                        <HelpCircle className="w-3.5 h-3.5 text-purple-700" /> Work Description
                      </span>
                      <p className="text-dark-text line-clamp-2">{booking.customerNotes}</p>
                    </div>
                  )}
                </div>

                {/* State-Specific Prompts: ALTERNATIVE_PROPOSED */}
                {booking.status === "ALTERNATIVE_PROPOSED" && booking.alternativeDetails && (
                  <div className="my-3 p-4 rounded-xl bg-purple-50 border border-purple-200 text-xs">
                    <div className="flex items-start gap-2">
                      <Clock className="w-4 h-4 text-purple-800 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-bold text-purple-950">Provider Proposed Another Time</h4>
                        <p className="text-purple-900 mt-0.5">
                          The provider cannot accommodate your initial request, but proposed:{" "}
                          <strong>
                            {new Date(booking.alternativeDetails.proposedDate).toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}{" "}
                            ({booking.alternativeDetails.proposedSlot})
                          </strong>
                        </p>
                        {booking.alternativeDetails.note && (
                          <p className="text-purple-800 italic mt-1">
                            &ldquo;{booking.alternativeDetails.note}&rdquo;
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-3">
                          <Button
                            variant="primary"
                            size="sm"
                            isLoading={loadingActionId === booking.id}
                            onClick={() =>
                              handleStatusAction(booking.id, "ACCEPT_ALTERNATIVE")
                            }
                            leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                          >
                            Accept New Time
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            isLoading={loadingActionId === booking.id}
                            onClick={() =>
                              handleStatusAction(booking.id, "DECLINE_ALTERNATIVE")
                            }
                            leftIcon={<XCircle className="w-3.5 h-3.5" />}
                          >
                            Decline
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Confirmed Appointment Notification */}
                {booking.status === "ACCEPTED" && (
                  <div className="my-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-forest-green shrink-0" />
                      <span>
                        Appointment confirmed! The technician will arrive on <strong>{reqDate}</strong> during <strong>{booking.timeSlot}</strong>.
                      </span>
                    </div>
                    {booking.provider?.phone && (
                      <a
                        href={`tel:${booking.provider.phone}`}
                        className="inline-flex items-center gap-1 font-semibold text-forest-green hover:underline shrink-0"
                      >
                        <Phone className="w-3 h-3" /> Call Provider
                      </a>
                    )}
                  </div>
                )}

                {/* Rejection / Decline Note */}
                {booking.status === "REJECTED" && booking.providerNotes && (
                  <div className="my-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
                    <strong>Provider decline note:</strong> {booking.providerNotes}
                  </div>
                )}

                {/* Action Bar */}
                <div className="pt-3 border-t border-border-subtle flex items-center justify-between flex-wrap gap-2">
                  <div className="text-[11px] text-muted-text">
                    Contact: {booking.customerPhone}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Cancellation option */}
                    {(booking.status === "PENDING" || booking.status === "ACCEPTED") && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCancelTarget(booking)}
                        className="text-red-600 hover:bg-red-50 hover:border-red-200 text-xs"
                      >
                        Cancel Request
                      </Button>
                    )}

                    {booking.listing && (
                      <Link href={`/services/${booking.listing.slug || booking.listing.id}`}>
                        <Button variant="ghost" size="sm" className="text-xs">
                          View Listing
                        </Button>
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Empty State */
        <div className="rounded-2xl border border-dashed border-border-subtle bg-white p-12 text-center flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-light-purple text-purple-900 flex items-center justify-center mb-3">
            <Wrench className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-dark-text">No service bookings found</h3>
          <p className="text-xs text-muted-text max-w-sm mt-1 mb-6 leading-relaxed">
            {filter === "ALL"
              ? "You haven't requested any service appointments yet. Find certified local professionals for plumbing, electrical, cleaning, and more."
              : `You have no service bookings matching the "${filter}" status filter.`}
          </p>
          <Link href="/services">
            <Button variant="primary" size="md" leftIcon={<Search className="w-4 h-4" />}>
              Find Local Services
            </Button>
          </Link>
        </div>
      )}

      {/* Confirmation Dialog for Cancellation */}
      <Dialog
        isOpen={Boolean(cancelTarget)}
        onClose={() => setCancelTarget(null)}
        title="Cancel Appointment Request?"
        description="Are you sure you want to cancel this booking request? The service provider will be notified immediately."
      >
        {cancelTarget && (
          <div className="p-3 rounded-lg bg-gray-50 border border-border-subtle text-xs text-dark-text mt-2">
            <div className="font-semibold text-forest-green">
              {cancelTarget.listing?.title || "Service Appointment"}
            </div>
            <div className="text-muted-text mt-0.5">
              Scheduled Date: {new Date(cancelTarget.requestedDate).toLocaleDateString()} (
              {cancelTarget.timeSlot})
            </div>
          </div>
        )}
        <div className="mt-4 flex items-center justify-end gap-3">
          <Button variant="outline" size="sm" onClick={() => setCancelTarget(null)}>
            Keep Booking
          </Button>
          <Button
            variant="danger"
            size="sm"
            isLoading={Boolean(loadingActionId)}
            onClick={() => {
              if (cancelTarget) {
                handleStatusAction(cancelTarget.id, "CANCEL", {
                  reason: "Cancelled by customer from dashboard",
                });
              }
            }}
          >
            Yes, Cancel Request
          </Button>
        </div>
      </Dialog>
    </div>
  );
}
