"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import { ListingSummary } from "@/types/listing";
import {
  Wrench,
  CheckCircle2,
  Clock,
  Phone,
  CalendarCheck,
  MapPin,
  Loader2,
} from "lucide-react";

export interface ServiceCardProps {
  listing: ListingSummary;
  onContactClick?: (type: "phone" | "book") => void;
}

export function ServiceCard({ listing, onContactClick }: ServiceCardProps) {
  const router = useRouter();
  const [revealing, setRevealing] = useState(false);
  const [revealedPhone, setRevealedPhone] = useState<string | null>(null);
  const details = listing.serviceDetails;

  const categoryLabels: Record<string, string> = {
    PLUMBING: "Plumbing",
    ELECTRICAL: "Electrical",
    CARPENTRY: "Carpentry",
    CLEANING: "Deep Cleaning",
    PAINTING: "Painting",
    APPLIANCE_REPAIR: "Appliance Repair",
    PEST_CONTROL: "Pest Control",
    MOVERS_PACKERS: "Movers & Packers",
    OTHER: "Specialist",
  };

  const pricingModelLabels: Record<string, string> = {
    FIXED: "Fixed Price",
    HOURLY: "Hourly Rate",
    QUOTE_BASED: "Quote Based",
  };

  const detailUrl = `/services/${listing.slug || listing.id}`;

  const handleAction = async (e: React.MouseEvent, type: "phone" | "book") => {
    e.preventDefault();
    e.stopPropagation();

    if (onContactClick) {
      onContactClick(type);
      return;
    }

    if (type === "book") {
      router.push(detailUrl);
      return;
    }

    if (type === "phone" && revealedPhone) {
      window.location.href = `tel:${revealedPhone}`;
      return;
    }

    setRevealing(true);
    try {
      const res = await fetch(`/api/v1/listings/${listing.id}/contact-reveal`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success && data.data?.phone) {
        setRevealedPhone(data.data.phone);
        window.location.href = `tel:${data.data.phone}`;
      } else {
        router.push(detailUrl);
      }
    } catch {
      router.push(detailUrl);
    } finally {
      setRevealing(false);
    }
  };

  return (
    <div className="group rounded-xl border border-border-subtle bg-white overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between p-4">
      <div>
        {/* Header: Category Badge & Pricing Model */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <Badge variant="service" size="sm" className="font-semibold gap-1">
            <Wrench className="w-3 h-3 text-purple-700" />
            <span>
              {details?.category ? categoryLabels[details.category] || details.category : "Service"}
            </span>
          </Badge>
          <span className="text-[11px] font-medium text-muted-text bg-gray-100 px-2 py-0.5 rounded-md">
            {details?.pricingModel
              ? pricingModelLabels[details.pricingModel] || details.pricingModel
              : "Standard"}
          </span>
        </div>

        {/* Title with Link */}
        <Link href={detailUrl} className="block group-hover:text-forest-green transition-colors">
          <h4 className="font-semibold text-dark-text text-sm line-clamp-2 leading-snug mb-2">
            {listing.title}
          </h4>
        </Link>

        {/* Provider Profile Info */}
        <div className="flex items-center gap-2.5 py-2 mb-2 border-b border-border-subtle/50">
          <div className="w-8 h-8 rounded-full bg-light-purple flex items-center justify-center text-xs font-bold text-purple-900 shrink-0">
            {listing.providerAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={listing.providerAvatar}
                alt={listing.providerName || "Provider"}
                className="w-full h-full rounded-full object-cover"
              />
            ) : listing.providerName ? (
              listing.providerName.charAt(0)
            ) : (
              "P"
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <div className="flex items-center gap-1">
              <span className="text-xs font-semibold text-dark-text truncate">
                {listing.providerName || "Verified Provider"}
              </span>
              <CheckCircle2 className="w-3.5 h-3.5 text-forest-green shrink-0" />
            </div>
            {details?.experienceYears !== undefined && (
              <span className="text-[11px] text-muted-text">
                {details.experienceYears} years experience
              </span>
            )}
          </div>
        </div>

        {/* Coverage Localities */}
        {details?.serviceAreas && details.serviceAreas.length > 0 && (
          <div className="flex items-center gap-1 text-xs text-muted-text mb-3">
            <MapPin className="w-3.5 h-3.5 text-forest-green shrink-0" />
            <span className="truncate">Covers: {details.serviceAreas.join(", ")}</span>
          </div>
        )}
      </div>

      <div>
        {/* Starting Price & Hours */}
        <div className="pt-2 border-t border-border-subtle/60 flex items-center justify-between mb-3">
          <div className="flex flex-col">
            <span className="text-[10px] text-muted-text uppercase tracking-wider">Starts At</span>
            <span className="text-base font-bold text-forest-green">
              {details?.startingPrice ? formatCurrency(details.startingPrice) : "Free Inspection"}
            </span>
          </div>
          {details?.workingHours && (
            <div className="flex items-center gap-1 text-[11px] text-muted-text">
              <Clock className="w-3 h-3 text-muted-text" />
              <span>
                {details.workingHours.start} - {details.workingHours.end}
              </span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2">
          {listing.contactPreferences.showPhone ? (
            <Button
              variant="outline"
              size="sm"
              leftIcon={
                revealing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Phone className="w-3.5 h-3.5" />
                )
              }
              onClick={(e) => handleAction(e, "phone")}
              disabled={revealing}
            >
              {revealedPhone ? revealedPhone : "Call Pro"}
            </Button>
          ) : (
            <Link href={detailUrl} className="w-full">
              <Button variant="ghost" size="sm" className="w-full text-muted-text text-xs">
                View Details
              </Button>
            </Link>
          )}

          <Link href={detailUrl} className="w-full">
            <Button
              variant="service"
              size="sm"
              leftIcon={<CalendarCheck className="w-3.5 h-3.5" />}
              className="w-full"
            >
              Book / View
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
