"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import { ListingSummary } from "@/types/listing";
import {
  Building2,
  BedDouble,
  Bath,
  Maximize2,
  MapPin,
  Phone,
  MessageSquare,
  Heart,
  Loader2,
} from "lucide-react";

export interface PropertyCardProps {
  listing: ListingSummary;
  onContactClick?: (type: "phone" | "whatsapp") => void;
}

export function PropertyCard({ listing, onContactClick }: PropertyCardProps) {
  const router = useRouter();
  const [isSaved, setIsSaved] = useState(false);
  const [revealing, setRevealing] = useState(false);
  const [revealedPhone, setRevealedPhone] = useState<string | null>(null);
  const details = listing.propertyDetails;

  const purposeLabels: Record<string, string> = {
    FOR_RENT: "For Rent",
    FOR_SALE: "For Sale",
    PG_CO_LIVING: "PG / Co-Living",
  };

  const detailUrl = `/properties/${listing.slug || listing.id}`;

  const handleAction = async (e: React.MouseEvent, type: "phone" | "whatsapp") => {
    e.preventDefault();
    e.stopPropagation();

    if (onContactClick) {
      onContactClick(type);
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
      if (data.success && data.data) {
        if (type === "phone" && data.data.phone) {
          setRevealedPhone(data.data.phone);
          window.location.href = `tel:${data.data.phone}`;
        } else if (type === "whatsapp" && data.data.whatsappDeepLink) {
          window.open(data.data.whatsappDeepLink, "_blank", "noopener,noreferrer");
        } else {
          router.push(detailUrl);
        }
      } else {
        alert(data.error?.message || "Could not retrieve contact details at this time.");
      }
    } catch {
      router.push(detailUrl);
    } finally {
      setRevealing(false);
    }
  };

  return (
    <div className="group rounded-xl border border-border-subtle bg-white overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
      <div>
        {/* Clickable Image Banner */}
        <Link href={detailUrl} className="block relative aspect-16/10 w-full bg-light-green/40 overflow-hidden">
          {listing.photos && listing.photos.length > 0 ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={listing.photos[0].url}
              alt={listing.title}
              className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-forest-green/70">
              <Building2 className="w-10 h-10 mb-1 stroke-1" />
              <span className="text-[11px] font-medium tracking-wide">Verified Space</span>
            </div>
          )}

          {/* Purpose Badge */}
          <div className="absolute top-3 left-3">
            <Badge variant="property" size="sm" className="shadow-xs font-semibold">
              {details?.purpose ? purposeLabels[details.purpose] || details.purpose : "Property"}
            </Badge>
          </div>

          {/* Save Toggle */}
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsSaved(!isSaved);
            }}
            className="absolute top-3 right-3 p-1.5 rounded-full bg-white/90 text-dark-text hover:text-red-500 shadow-xs transition-colors"
            aria-label={isSaved ? "Remove from saved" : "Save property"}
          >
            <Heart className={`w-4 h-4 ${isSaved ? "fill-red-500 text-red-500" : ""}`} />
          </button>
        </Link>

        {/* Property Info Content */}
        <div className="p-4">
          {/* Price */}
          <div className="flex items-baseline gap-1.5 mb-1.5">
            <span className="text-xl font-bold text-forest-green">
              {details?.price ? formatCurrency(details.price) : "Contact for Price"}
            </span>
            {details?.purpose === "FOR_RENT" && (
              <span className="text-xs text-muted-text font-normal">/ month</span>
            )}
          </div>

          {/* Title with link */}
          <Link href={detailUrl} className="block group-hover:text-forest-green transition-colors">
            <h4 className="font-semibold text-dark-text text-sm line-clamp-1 leading-snug mb-1">
              {listing.title}
            </h4>
          </Link>

          {/* Locality */}
          <div className="flex items-center gap-1 text-xs text-muted-text mb-3">
            <MapPin className="w-3.5 h-3.5 text-forest-green shrink-0" />
            <span className="truncate">
              {listing.location.locality}, {listing.location.city}
            </span>
          </div>

          {/* Quick Specs Pills */}
          <div className="grid grid-cols-3 gap-2 py-2 border-y border-border-subtle/60 text-xs text-dark-text">
            {details?.bedrooms !== undefined && (
              <div className="flex items-center gap-1">
                <BedDouble className="w-3.5 h-3.5 text-muted-text shrink-0" />
                <span className="font-medium truncate">{details.bedrooms} BHK</span>
              </div>
            )}
            {details?.bathrooms !== undefined && (
              <div className="flex items-center gap-1">
                <Bath className="w-3.5 h-3.5 text-muted-text shrink-0" />
                <span className="font-medium truncate">{details.bathrooms} Bath</span>
              </div>
            )}
            {details?.carpetArea !== undefined && (
              <div className="flex items-center gap-1">
                <Maximize2 className="w-3.5 h-3.5 text-muted-text shrink-0" />
                <span className="font-medium truncate">{details.carpetArea} sqft</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Direct Contact Actions */}
      <div className="p-4 pt-0">
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
              {revealedPhone ? revealedPhone : "Call"}
            </Button>
          ) : (
            <Link href={detailUrl} className="w-full">
              <Button variant="outline" size="sm" className="w-full">
                View Details
              </Button>
            </Link>
          )}

          {listing.contactPreferences.showWhatsapp ? (
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<MessageSquare className="w-3.5 h-3.5" />}
              onClick={(e) => handleAction(e, "whatsapp")}
              disabled={revealing}
            >
              WhatsApp
            </Button>
          ) : (
            <Link href={detailUrl} className="w-full">
              <Button variant="ghost" size="sm" className="w-full text-xs">
                Learn More
              </Button>
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
