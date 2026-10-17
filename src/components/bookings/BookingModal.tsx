"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Dialog } from "@/components/ui/Dialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { FormField } from "@/components/ui/FormField";
import {
  Calendar,
  Clock,
  MapPin,
  Phone,
  CheckCircle2,
  AlertCircle,
  LogIn,
} from "lucide-react";

interface BookingModalProps {
  isOpen: boolean;
  onClose: () => void;
  listingId: string;
  listingTitle: string;
  locality: string;
  categoryLabel?: string;
  startingPrice?: number;
  pricingModel?: string;
  isLoggedIn: boolean;
  isOwner: boolean;
  initialPhone?: string | null;
}

const TIME_SLOTS = [
  { id: "MORNING", label: "Morning (08:00 AM – 12:00 PM)" },
  { id: "AFTERNOON", label: "Afternoon (12:00 PM – 04:00 PM)" },
  { id: "EVENING", label: "Evening (04:00 PM – 08:00 PM)" },
];

export function BookingModal({
  isOpen,
  onClose,
  listingId,
  listingTitle,
  locality,
  categoryLabel,
  isLoggedIn,
  isOwner,
  initialPhone,
}: BookingModalProps) {
  // Form state
  const [requestedDate, setRequestedDate] = useState("");
  const [timeSlot, setTimeSlot] = useState("MORNING");
  const [customSlot, setCustomSlot] = useState("");
  const [line1, setLine1] = useState("");
  const [addressLocality, setAddressLocality] = useState(locality || "");
  const [customerPhone, setCustomerPhone] = useState(initialPhone || "");
  const [customerNotes, setCustomerNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successBookingId, setSuccessBookingId] = useState<string | null>(null);

  // Compute minimum selectable date (tomorrow) and maximum (60 days)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDateStr = tomorrow.toISOString().split("T")[0];

  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + 60);
  const maxDateStr = maxDate.toISOString().split("T")[0];

  const resetForm = () => {
    setError(null);
    setSuccessBookingId(null);
    setRequestedDate("");
    setLine1("");
    setCustomerNotes("");
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!requestedDate) {
      setError("Please choose a preferred appointment date.");
      return;
    }

    if (!line1.trim() || !addressLocality.trim()) {
      setError("Please provide your service street address and locality.");
      return;
    }

    if (!customerPhone.trim() || customerPhone.trim().length < 7) {
      setError("Please enter a valid mobile number with at least 7 digits.");
      return;
    }

    const finalSlot =
      timeSlot === "CUSTOM" && customSlot.trim() ? customSlot.trim() : timeSlot;

    setLoading(true);
    try {
      const res = await fetch("/api/v1/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          listingId,
          requestedDate: new Date(requestedDate).toISOString(),
          timeSlot: finalSlot,
          serviceAddress: {
            line1: line1.trim(),
            locality: addressLocality.trim(),
          },
          customerPhone: customerPhone.trim(),
          customerNotes: customerNotes.trim() || null,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || "Failed to submit booking request.");
      }

      setSuccessBookingId(data.data.id);
    } catch (err: unknown) {
      setError(
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while placing your booking."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog
      isOpen={isOpen}
      onClose={handleClose}
      title="Request Service Appointment"
      description="Select your preferred appointment date and provide your address details."
      className="max-w-xl"
    >
      {/* State A: User is Not Signed In */}
      {!isLoggedIn ? (
        <div className="py-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-light-purple text-purple-900 mx-auto flex items-center justify-center">
            <LogIn className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-base font-bold text-dark-text">Sign In Required</h4>
            <p className="text-xs text-muted-text max-w-sm mx-auto mt-1 leading-relaxed">
              To request a booking and receive direct appointment confirmations from this provider, please sign in to your marketplace account.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button variant="outline" size="sm" onClick={handleClose}>
              Cancel
            </Button>
            <Link href={`/auth/signin?callbackUrl=/services/${listingId}`}>
              <Button variant="primary" size="sm" leftIcon={<LogIn className="w-3.5 h-3.5" />}>
                Sign In to Book
              </Button>
            </Link>
          </div>
        </div>
      ) : isOwner ? (
        /* State B: User owns this service listing */
        <div className="py-6 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-700 mx-auto flex items-center justify-center">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h4 className="text-base font-bold text-dark-text">Own Listing</h4>
          <p className="text-xs text-muted-text max-w-sm mx-auto leading-relaxed">
            You are the owner of this service listing. You cannot submit booking requests to yourself. View your incoming client bookings from your provider dashboard.
          </p>
          <div className="pt-2">
            <Button variant="primary" size="sm" onClick={handleClose}>
              Close
            </Button>
          </div>
        </div>
      ) : successBookingId ? (
        /* State C: Successfully submitted confirmation */
        <div className="py-6 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-emerald-50 text-forest-green mx-auto flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-base font-bold text-dark-text">Booking Request Submitted!</h4>
            <p className="text-xs text-muted-text max-w-sm mx-auto mt-1 leading-relaxed">
              Your appointment request has been sent to the service provider. The provider will review your schedule and accept or propose an alternative time.
            </p>
          </div>
          <div className="p-3.5 rounded-xl bg-off-white border border-border-subtle max-w-sm mx-auto text-left text-xs space-y-1">
            <div className="font-semibold text-dark-text truncate">{listingTitle}</div>
            <div className="text-muted-text flex items-center gap-1.5">
              <Calendar className="w-3.5 h-3.5" />
              <span>Requested Date: {requestedDate}</span>
            </div>
            <div className="text-muted-text flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Slot: {timeSlot}</span>
            </div>
          </div>
          <div className="flex items-center justify-center gap-3 pt-3">
            <Button variant="outline" size="sm" onClick={handleClose}>
              Done
            </Button>
            <Link href="/dashboard/my-bookings">
              <Button variant="primary" size="sm">
                View My Bookings
              </Button>
            </Link>
          </div>
        </div>
      ) : (
        /* State D: Booking Form */
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Service Headline Chip */}
          <div className="p-3 rounded-xl bg-off-white border border-border-subtle flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-purple-900 block">
                {categoryLabel || "Skilled Trade"}
              </span>
              <h4 className="text-xs font-bold text-dark-text truncate">{listingTitle}</h4>
            </div>
            <div className="text-right shrink-0">
              <span className="text-xs text-muted-text flex items-center gap-1">
                <MapPin className="w-3 h-3 text-muted-text" /> {locality}
              </span>
            </div>
          </div>

          {error && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Date & Time Slot Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <FormField label="Preferred Date" required>
              <div className="relative">
                <Input
                  type="date"
                  min={minDateStr}
                  max={maxDateStr}
                  value={requestedDate}
                  onChange={(e) => setRequestedDate(e.target.value)}
                  required
                />
              </div>
            </FormField>

            <FormField label="Preferred Time Window" required>
              <select
                value={timeSlot}
                onChange={(e) => setTimeSlot(e.target.value)}
                className="w-full h-10 px-3 rounded-lg border border-border-subtle bg-white text-xs text-dark-text focus:outline-hidden focus:ring-2 focus:ring-forest-green"
              >
                {TIME_SLOTS.map((slot) => (
                  <option key={slot.id} value={slot.id}>
                    {slot.label}
                  </option>
                ))}
                <option value="CUSTOM">Specific Time...</option>
              </select>
            </FormField>
          </div>

          {timeSlot === "CUSTOM" && (
            <FormField label="Specify Time (e.g. 10:30 AM)" required>
              <Input
                value={customSlot}
                onChange={(e) => setCustomSlot(e.target.value)}
                placeholder="e.g. 10:30 AM"
                maxLength={50}
                required
              />
            </FormField>
          )}

          {/* Service Street Address & Locality */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="sm:col-span-2">
              <FormField
                label="Service Street Address"
                required
                helperText="House/flat number, street name for visit"
              >
                <Input
                  value={line1}
                  onChange={(e) => setLine1(e.target.value)}
                  placeholder="e.g. Flat 302, Palm Heights, Main St"
                  maxLength={140}
                  required
                />
              </FormField>
            </div>
            <div>
              <FormField label="Locality / Area" required>
                <Input
                  value={addressLocality}
                  onChange={(e) => setAddressLocality(e.target.value)}
                  placeholder="e.g. Greenwood"
                  maxLength={100}
                  required
                />
              </FormField>
            </div>
          </div>

          {/* Customer Contact Phone */}
          <FormField
            label="Your Contact Phone"
            required
            helperText="Technician will call this number prior to arrival"
          >
            <div className="relative">
              <Input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                maxLength={30}
                required
              />
              <div className="absolute right-3 top-2.5 text-muted-text">
                <Phone className="w-4 h-4" />
              </div>
            </div>
          </FormField>

          {/* Customer Problem Description / Task Notes */}
          <FormField
            label="Describe the Problem or Task (Optional)"
            helperText="Include any specific details or replacement parts needed"
          >
            <Textarea
              value={customerNotes}
              onChange={(e) => setCustomerNotes(e.target.value)}
              rows={3}
              placeholder="e.g. Kitchen tap is continuously leaking at the valve. I have the new ceramic washer ready."
              maxLength={1000}
            />
          </FormField>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-border-subtle">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={loading}
              leftIcon={<Calendar className="w-3.5 h-3.5" />}
            >
              Submit Booking Request
            </Button>
          </div>
        </form>
      )}
    </Dialog>
  );
}
