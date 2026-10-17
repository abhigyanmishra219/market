"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { FormField } from "@/components/ui/FormField";
import { BookingItem } from "./CustomerBookingList";
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  MessageSquare,
  AlertCircle,
  CheckCircle2,
  Inbox,
  User as UserIcon,
  HelpCircle,
  CalendarCheck,
} from "lucide-react";

interface ProviderBookingListProps {
  initialBookings: BookingItem[];
}

const PROVIDER_STATUS_FILTERS = [
  { id: "ALL", label: "All Requests" },
  { id: "PENDING", label: "Pending Review" },
  { id: "ACCEPTED", label: "Confirmed" },
  { id: "ALTERNATIVE_PROPOSED", label: "Alternative Proposed" },
  { id: "COMPLETED", label: "Completed" },
  { id: "REJECTED", label: "Declined" },
  { id: "CANCELLED", label: "Cancelled" },
];

const TIME_SLOTS = [
  { id: "MORNING", label: "Morning (08:00 AM – 12:00 PM)" },
  { id: "AFTERNOON", label: "Afternoon (12:00 PM – 04:00 PM)" },
  { id: "EVENING", label: "Evening (04:00 PM – 08:00 PM)" },
];

export function ProviderBookingList({ initialBookings }: ProviderBookingListProps) {
  const [bookings, setBookings] = useState<BookingItem[]>(initialBookings);
  const [filter, setFilter] = useState("ALL");
  const [loadingActionId, setLoadingActionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Alternative proposal modal state
  const [proposeTarget, setProposeTarget] = useState<BookingItem | null>(null);
  const [proposedDate, setProposedDate] = useState("");
  const [proposedSlot, setProposedSlot] = useState("MORNING");
  const [customSlot, setCustomSlot] = useState("");
  const [proposeNote, setProposeNote] = useState("");

  // Reject / Decline modal state
  const [rejectTarget, setRejectTarget] = useState<BookingItem | null>(null);
  const [rejectReason, setRejectReason] = useState("");

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDateStr = tomorrow.toISOString().split("T")[0];

  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 60);
  const maxDateStr = maxDate.toISOString().split("T")[0];

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

      setBookings((prev) =>
        prev.map((b) => {
          if (b.id !== bookingId) return b;
          return {
            ...b,
            status: data.data.status,
            requestedDate: data.data.requestedDate || b.requestedDate,
            timeSlot: data.data.timeSlot || b.timeSlot,
            alternativeDetails: data.data.alternativeDetails || b.alternativeDetails,
            providerNotes: data.data.providerNotes || b.providerNotes,
            updatedAt: data.data.updatedAt,
          };
        })
      );

      setProposeTarget(null);
      setRejectTarget(null);
      setProposedDate("");
      setProposeNote("");
      setRejectReason("");
    } catch (err: unknown) {
      setActionError(
        err instanceof Error ? err.message : "Error executing action."
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
            Action Required: Pending
          </Badge>
        );
      case "ACCEPTED":
        return (
          <Badge variant="success" size="sm">
            Confirmed Appointment
          </Badge>
        );
      case "ALTERNATIVE_PROPOSED":
        return (
          <Badge variant="service" size="sm">
            Alternative Offered
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
      {/* Status Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-border-subtle scrollbar-none">
        {PROVIDER_STATUS_FILTERS.map((tab) => (
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

      {/* Bookings Queue */}
      {filtered.length > 0 ? (
        <div className="space-y-4">
          {filtered.map((booking) => {
            const reqDate = new Date(booking.requestedDate).toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
              year: "numeric",
            });

            const cleanPhone = booking.customerPhone.replace(/[^0-9]/g, "");
            const whatsappMsg = `Hello ${booking.customer?.name || "Customer"}, this is regarding your booking request for '${booking.listing?.title}' on Marketplace.`;
            const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(whatsappMsg)}`;

            return (
              <div
                key={booking.id}
                className={`rounded-2xl border bg-white p-5 sm:p-6 shadow-xs transition-shadow hover:shadow-md ${
                  booking.status === "PENDING"
                    ? "border-amber-200 ring-1 ring-amber-100"
                    : "border-border-subtle"
                }`}
              >
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-border-subtle">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {getStatusBadge(booking.status)}
                      <span className="text-[11px] text-muted-text">
                        Received on {new Date(booking.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-dark-text">
                      {booking.listing?.title || "Service Offering"}
                    </h3>

                    <div className="flex items-center gap-2 text-xs text-muted-text mt-1">
                      <span className="inline-flex items-center gap-1 font-semibold text-dark-text">
                        <UserIcon className="w-3.5 h-3.5 text-muted-text" />
                        {booking.customer?.name || "Customer"}
                      </span>
                      <span>•</span>
                      <a
                        href={`tel:${booking.customerPhone}`}
                        className="text-forest-green hover:underline flex items-center gap-1 font-medium"
                      >
                        <Phone className="w-3 h-3" /> {booking.customerPhone}
                      </a>
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

                {/* Address & Problem Details */}
                <div className="py-3.5 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-muted-text block mb-1 font-semibold flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-forest-green" /> Job Location
                    </span>
                    <p className="text-dark-text font-medium">
                      {booking.serviceAddress.line1}, {booking.serviceAddress.locality}
                    </p>
                  </div>

                  {booking.customerNotes && (
                    <div>
                      <span className="text-muted-text block mb-1 font-semibold flex items-center gap-1">
                        <HelpCircle className="w-3.5 h-3.5 text-purple-700" /> Customer Work Note
                      </span>
                      <p className="text-dark-text leading-relaxed bg-off-white p-2.5 rounded-lg border border-border-subtle/60">
                        {booking.customerNotes}
                      </p>
                    </div>
                  )}
                </div>

                {/* State: ALTERNATIVE_PROPOSED */}
                {booking.status === "ALTERNATIVE_PROPOSED" && booking.alternativeDetails && (
                  <div className="my-2 p-3 rounded-xl bg-purple-50 border border-purple-200 text-xs text-purple-900">
                    <strong>Alternative offered to customer:</strong>{" "}
                    {new Date(booking.alternativeDetails.proposedDate).toLocaleDateString()} (
                    {booking.alternativeDetails.proposedSlot})
                    {booking.alternativeDetails.note && (
                      <span className="italic block mt-0.5">
                        &ldquo;{booking.alternativeDetails.note}&rdquo;
                      </span>
                    )}
                    <span className="text-muted-text block mt-1">
                      Awaiting customer acceptance or decline.
                    </span>
                  </div>
                )}

                {/* State: ACCEPTED Actions & Customer Direct Contact */}
                {booking.status === "ACCEPTED" && (
                  <div className="my-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-forest-green shrink-0" />
                      <span>
                        Confirmed for <strong>{reqDate}</strong> ({booking.timeSlot}). Coordinate arrival with customer.
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={`tel:${booking.customerPhone}`}
                        className="px-2.5 py-1 rounded-md bg-white border border-emerald-300 text-forest-green font-semibold hover:bg-emerald-100 flex items-center gap-1"
                      >
                        <Phone className="w-3 h-3" /> Call
                      </a>
                      <a
                        href={whatsappUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2.5 py-1 rounded-md bg-emerald-600 text-white font-semibold hover:bg-emerald-700 flex items-center gap-1"
                      >
                        <MessageSquare className="w-3 h-3" /> WhatsApp
                      </a>
                    </div>
                  </div>
                )}

                {/* State: REJECTED Note */}
                {booking.status === "REJECTED" && booking.providerNotes && (
                  <div className="my-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800">
                    <strong>Decline explanation:</strong> {booking.providerNotes}
                  </div>
                )}

                {/* Provider Actions Footer */}
                <div className="pt-3 border-t border-border-subtle flex items-center justify-between flex-wrap gap-3">
                  <div className="text-[11px] text-muted-text">
                    Customer: {booking.customer?.name} ({booking.customerPhone})
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {/* When PENDING: Accept, Reschedule, or Reject */}
                    {booking.status === "PENDING" && (
                      <>
                        <Button
                          variant="primary"
                          size="sm"
                          isLoading={loadingActionId === booking.id}
                          onClick={() => handleStatusAction(booking.id, "ACCEPT")}
                          leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                        >
                          Accept Booking
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setProposeTarget(booking);
                            setProposedDate("");
                            setProposeNote("");
                          }}
                          leftIcon={<Clock className="w-3.5 h-3.5" />}
                        >
                          Propose New Time
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setRejectTarget(booking);
                            setRejectReason("");
                          }}
                          className="text-red-600 hover:bg-red-50 text-xs"
                        >
                          Decline
                        </Button>
                      </>
                    )}

                    {/* When ACCEPTED: Mark Complete or Cancel */}
                    {booking.status === "ACCEPTED" && (
                      <>
                        <Button
                          variant="primary"
                          size="sm"
                          isLoading={loadingActionId === booking.id}
                          onClick={() => handleStatusAction(booking.id, "COMPLETE")}
                          leftIcon={<CalendarCheck className="w-3.5 h-3.5" />}
                        >
                          Mark as Completed
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setRejectTarget(booking);
                            setRejectReason("");
                          }}
                          className="text-red-600 hover:bg-red-50 text-xs"
                        >
                          Cancel Appointment
                        </Button>
                      </>
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
          <div className="w-14 h-14 rounded-full bg-light-green text-forest-green flex items-center justify-center mb-3">
            <Inbox className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-dark-text">No incoming booking requests</h3>
          <p className="text-xs text-muted-text max-w-sm mt-1 mb-6 leading-relaxed">
            {filter === "ALL"
              ? "When customers request appointment bookings for your published services, they will appear in this queue for your review."
              : `You have no incoming requests matching the "${filter}" filter.`}
          </p>
          <Link href="/dashboard/services">
            <Button variant="outline" size="md">
              Manage My Services
            </Button>
          </Link>
        </div>
      )}

      {/* Dialog: Propose Alternative Appointment Time */}
      <Dialog
        isOpen={Boolean(proposeTarget)}
        onClose={() => setProposeTarget(null)}
        title="Propose Alternative Appointment Time"
        description="Offer the customer a different date or time window when you are available."
      >
        <div className="space-y-4 pt-1">
          {proposeTarget && (
            <div className="p-3 rounded-lg bg-gray-50 border border-border-subtle text-xs text-muted-text">
              <strong className="text-dark-text block font-semibold">
                Customer requested:
              </strong>
              {new Date(proposeTarget.requestedDate).toLocaleDateString()} (
              {proposeTarget.timeSlot}) for &ldquo;{proposeTarget.listing?.title}&rdquo;
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField label="Proposed New Date" required>
              <Input
                type="date"
                min={minDateStr}
                max={maxDateStr}
                value={proposedDate}
                onChange={(e) => setProposedDate(e.target.value)}
                required
              />
            </FormField>

            <FormField label="Proposed Time Slot" required>
              <select
                value={proposedSlot}
                onChange={(e) => setProposedSlot(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border-subtle bg-white text-xs text-dark-text focus:outline-hidden focus:ring-2 focus:ring-forest-green"
              >
                {TIME_SLOTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
                <option value="CUSTOM">Specific Time...</option>
              </select>
            </FormField>
          </div>

          {proposedSlot === "CUSTOM" && (
            <FormField label="Custom Time (e.g. 11:30 AM)" required>
              <Input
                value={customSlot}
                onChange={(e) => setCustomSlot(e.target.value)}
                placeholder="e.g. 11:30 AM"
                maxLength={50}
                required
              />
            </FormField>
          )}

          <FormField
            label="Note for Customer (Optional)"
            helperText="Explain why you are proposing a different slot"
          >
            <Textarea
              value={proposeNote}
              onChange={(e) => setProposeNote(e.target.value)}
              rows={3}
              placeholder="e.g. Currently booked for a major panel wiring on Tuesday morning; Monday afternoon is completely free."
              maxLength={500}
            />
          </FormField>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-subtle">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setProposeTarget(null)}
              disabled={Boolean(loadingActionId)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              isLoading={Boolean(loadingActionId)}
              onClick={() => {
                if (!proposedDate) {
                  alert("Please choose a proposed date.");
                  return;
                }
                const slot =
                  proposedSlot === "CUSTOM" && customSlot.trim()
                    ? customSlot.trim()
                    : proposedSlot;
                if (proposeTarget) {
                  handleStatusAction(proposeTarget.id, "PROPOSE_ALTERNATIVE", {
                    proposedDate: new Date(proposedDate).toISOString(),
                    proposedSlot: slot,
                    note: proposeNote.trim() || null,
                  });
                }
              }}
            >
              Send Proposal to Customer
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Dialog: Decline / Reject Request */}
      <Dialog
        isOpen={Boolean(rejectTarget)}
        onClose={() => setRejectTarget(null)}
        title={rejectTarget?.status === "ACCEPTED" ? "Cancel Confirmed Appointment?" : "Decline Booking Request?"}
        description="Provide a brief explanation for the customer regarding why you cannot service this request."
      >
        <div className="space-y-4 pt-1">
          {rejectTarget && (
            <div className="p-3 rounded-lg bg-gray-50 border border-border-subtle text-xs text-muted-text">
              <strong className="text-dark-text block font-semibold">
                Customer: {rejectTarget.customer?.name}
              </strong>
              {rejectTarget.listing?.title} • {rejectTarget.serviceAddress.locality}
            </div>
          )}

          <FormField
            label="Reason for Declining (Optional)"
            helperText="Help the customer understand (e.g. outside operational zone, fully booked)"
          >
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
              placeholder="e.g. Outside my current service coverage locality this week."
              maxLength={500}
            />
          </FormField>

          <div className="mt-4 flex items-center justify-end gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectTarget(null)}
              disabled={Boolean(loadingActionId)}
            >
              Keep Request
            </Button>
            <Button
              variant="danger"
              size="sm"
              isLoading={Boolean(loadingActionId)}
              onClick={() => {
                if (rejectTarget) {
                  const action = rejectTarget.status === "ACCEPTED" ? "CANCEL" : "REJECT";
                  handleStatusAction(rejectTarget.id, action, {
                    reason: rejectReason.trim() || "Declined by service provider",
                  });
                }
              }}
            >
              Confirm & Decline
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
