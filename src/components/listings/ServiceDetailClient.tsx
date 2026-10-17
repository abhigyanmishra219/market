"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/Button";
import {
  Phone,
  MessageSquare,
  CalendarCheck,
  Share2,
  Check,
  Loader2,
  ShieldAlert,
  Heart,
  Info,
} from "lucide-react";

interface ServiceDetailClientProps {
  listingId: string;
  title: string;
  showPhone: boolean;
  showWhatsapp: boolean;
  initialPhone?: string | null;
}

export function ServiceDetailClient({
  listingId,
  title,
  showPhone,
  showWhatsapp,
  initialPhone,
}: ServiceDetailClientProps) {
  const [revealing, setRevealing] = useState(false);
  const [phone, setPhone] = useState<string | null>(initialPhone || null);
  const [whatsappLink, setWhatsappLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [bookingNotice, setBookingNotice] = useState(false);

  const handleRevealOrCall = async () => {
    if (phone) {
      window.location.href = `tel:${phone}`;
      return;
    }

    setRevealing(true);
    try {
      const res = await fetch(`/api/v1/listings/${listingId}/contact-reveal`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success && data.data?.phone) {
        setPhone(data.data.phone);
        if (data.data.whatsappDeepLink) {
          setWhatsappLink(data.data.whatsappDeepLink);
        }
        window.location.href = `tel:${data.data.phone}`;
      } else {
        alert(data.error?.message || "Could not unmask contact at this time.");
      }
    } catch {
      alert("Failed to connect to the server. Please check your network.");
    } finally {
      setRevealing(false);
    }
  };

  const handleWhatsApp = async () => {
    if (whatsappLink) {
      window.open(whatsappLink, "_blank", "noopener,noreferrer");
      return;
    }

    setRevealing(true);
    try {
      const res = await fetch(`/api/v1/listings/${listingId}/contact-reveal`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success && data.data?.whatsappDeepLink) {
        setWhatsappLink(data.data.whatsappDeepLink);
        window.open(data.data.whatsappDeepLink, "_blank", "noopener,noreferrer");
      } else if (data.data?.whatsapp) {
        const sanitized = data.data.whatsapp.replace(/[^0-9]/g, "");
        const message = `Hello, I am interested in your service '${title}' on Marketplace. Are you available for a job?`;
        const link = `https://wa.me/${sanitized}?text=${encodeURIComponent(message)}`;
        setWhatsappLink(link);
        window.open(link, "_blank", "noopener,noreferrer");
      } else {
        alert(data.error?.message || "WhatsApp contact is unavailable.");
      }
    } catch {
      alert("Failed to connect to the server.");
    } finally {
      setRevealing(false);
    }
  };

  const handleShare = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Booking Notice Modal / Banner */}
      {bookingNotice && (
        <div className="p-3.5 rounded-xl bg-light-purple border border-purple-200 text-xs text-purple-950 flex flex-col gap-2">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-purple-800 shrink-0 mt-0.5" />
            <div className="flex-1">
              <strong className="block font-semibold">Online Booking Request Workflow</strong>
              <p className="mt-0.5 text-purple-900 leading-relaxed">
                Structured calendar appointment requests activate in Phase W6. In the meantime, connect directly with this provider via direct phone call or WhatsApp for immediate scheduling.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setBookingNotice(false)}
            className="text-[11px] font-semibold text-purple-900 hover:underline self-end"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Primary Action: Book or Contact */}
      <Button
        variant="service"
        size="lg"
        leftIcon={<CalendarCheck className="w-4 h-4" />}
        onClick={() => setBookingNotice(true)}
        className="w-full justify-center text-sm font-semibold shadow-xs"
      >
        Request Service Booking
      </Button>

      {/* Call Provider */}
      {showPhone ? (
        <Button
          variant="outline"
          size="lg"
          leftIcon={
            revealing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Phone className="w-4 h-4" />
            )
          }
          onClick={handleRevealOrCall}
          disabled={revealing}
          className="w-full justify-center text-sm font-semibold"
        >
          {phone ? `Call ${phone}` : "Call Provider"}
        </Button>
      ) : (
        <div className="p-3 rounded-lg bg-gray-50 border border-border-subtle text-xs text-muted-text flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-muted-text shrink-0" />
          <span>Direct phone calls disabled by provider.</span>
        </div>
      )}

      {/* WhatsApp Action */}
      {showWhatsapp && (
        <Button
          variant="secondary"
          size="lg"
          leftIcon={<MessageSquare className="w-4 h-4" />}
          onClick={handleWhatsApp}
          disabled={revealing}
          className="w-full justify-center text-sm font-semibold shadow-xs"
        >
          Chat on WhatsApp
        </Button>
      )}

      {/* Save & Share */}
      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border-subtle/60 mt-1">
        <Button
          variant="outline"
          size="sm"
          leftIcon={
            <Heart className={`w-3.5 h-3.5 ${saved ? "fill-red-500 text-red-500" : ""}`} />
          }
          onClick={() => setSaved(!saved)}
          className="w-full justify-center text-xs"
        >
          {saved ? "Saved" : "Save"}
        </Button>

        <Button
          variant="outline"
          size="sm"
          leftIcon={
            copied ? (
              <Check className="w-3.5 h-3.5 text-forest-green" />
            ) : (
              <Share2 className="w-3.5 h-3.5" />
            )
          }
          onClick={handleShare}
          className="w-full justify-center text-xs"
        >
          {copied ? "Link Copied" : "Share"}
        </Button>
      </div>
    </div>
  );
}
