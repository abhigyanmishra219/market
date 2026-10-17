import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getPublicListingByIdOrSlug } from "@/lib/listings-data";
import { PropertyDetailClient } from "@/components/listings/PropertyDetailClient";
import { ReportListingButton } from "@/components/listings/ReportListingButton";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import {
  Building2,
  BedDouble,
  Bath,
  Maximize2,
  MapPin,
  Calendar,
  Layers,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  Home,
  CheckCircle2,
} from "lucide-react";

export const instant = false;

interface PropertyDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PropertyDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const listing = await getPublicListingByIdOrSlug(id);

  if (!listing || listing.type !== "PROPERTY") {
    return {
      title: "Property Not Found | Marketplace",
      description: "The requested property listing could not be found.",
    };
  }

  const priceText = listing.propertyDetails?.price
    ? formatCurrency(listing.propertyDetails.price)
    : "Price on Request";

  return {
    title: `${listing.title} - ${priceText} | ${listing.location.locality}, ${listing.location.city}`,
    description: `${listing.description.slice(0, 160)}... Located in ${listing.location.locality}, ${listing.location.city}.`,
    openGraph: {
      title: listing.title,
      description: listing.description.slice(0, 160),
      images: listing.photos.length > 0 ? [{ url: listing.photos[0].url }] : [],
    },
  };
}

export default async function PropertyDetailPage({ params }: PropertyDetailPageProps) {
  const { id } = await params;
  const listing = await getPublicListingByIdOrSlug(id);

  if (!listing || listing.type !== "PROPERTY") {
    notFound();
  }

  const details = listing.propertyDetails;

  const purposeLabels: Record<string, string> = {
    FOR_RENT: "For Rent",
    FOR_SALE: "For Sale",
    PG_CO_LIVING: "PG / Co-Living",
  };

  const furnishingLabels: Record<string, string> = {
    UNFURNISHED: "Unfurnished",
    SEMI_FURNISHED: "Semi-Furnished",
    FULLY_FURNISHED: "Fully Furnished",
  };

  const propertyTypeLabels: Record<string, string> = {
    APARTMENT: "Apartment",
    INDEPENDENT_HOUSE: "Independent House",
    VILLA: "Villa",
    PLOT: "Plot / Land",
    COMMERCIAL: "Commercial Space",
  };

  const primaryPhoto = listing.photos.find((p) => p.isPrimary) || listing.photos[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-muted-text mb-6 flex-wrap" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-forest-green flex items-center gap-1 transition-colors">
          <Home className="w-3.5 h-3.5" />
          <span>Home</span>
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-border-subtle" />
        <Link href="/properties" className="hover:text-forest-green transition-colors">
          Properties
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-border-subtle" />
        {details?.purpose && (
          <>
            <Link
              href={`/properties?purpose=${details.purpose}`}
              className="hover:text-forest-green transition-colors"
            >
              {purposeLabels[details.purpose] || details.purpose}
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-border-subtle" />
          </>
        )}
        <span className="text-dark-text font-medium truncate max-w-xs">{listing.title}</span>
      </nav>

      {/* Main Grid: Gallery & Specs on Left, Contact Card on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-8">
          {/* Header Title & Badges */}
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="property" size="md" className="font-semibold">
                {details?.purpose ? purposeLabels[details.purpose] || details.purpose : "Property"}
              </Badge>
              {details?.propertyType && (
                <Badge variant="neutral" size="md">
                  {propertyTypeLabels[details.propertyType] || details.propertyType}
                </Badge>
              )}
              {details?.furnishing && (
                <Badge variant="neutral" size="md">
                  {furnishingLabels[details.furnishing] || details.furnishing}
                </Badge>
              )}
            </div>

            <h1 className="text-2xl sm:text-3xl font-bold text-dark-text tracking-tight leading-tight">
              {listing.title}
            </h1>

            <div className="flex items-center gap-1 text-sm text-muted-text mt-2">
              <MapPin className="w-4 h-4 text-forest-green shrink-0" />
              <span>
                {listing.location.locality}, {listing.location.city}
              </span>
            </div>
          </div>

          {/* Photo Gallery Banner */}
          <div className="rounded-2xl border border-border-subtle bg-white overflow-hidden shadow-xs">
            {primaryPhoto ? (
              <div className="relative aspect-16/9 w-full bg-light-green/20">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={primaryPhoto.url}
                  alt={listing.title}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="aspect-16/9 w-full bg-light-green/30 flex flex-col items-center justify-center text-forest-green/60">
                <Building2 className="w-16 h-16 mb-2 stroke-1" />
                <span className="text-sm font-medium">Verified Property Space</span>
              </div>
            )}

            {/* Additional Photo Thumbnails */}
            {listing.photos.length > 1 && (
              <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 p-3 bg-off-white border-t border-border-subtle">
                {listing.photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative aspect-square rounded-lg overflow-hidden border border-border-subtle"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.url}
                      alt={photo.caption || listing.title}
                      className="w-full h-full object-cover"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Key Specifications Grid */}
          <div className="rounded-2xl border border-border-subtle bg-white p-6 shadow-xs">
            <h2 className="text-base font-bold text-dark-text mb-4">Property Overview</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
              {details?.bedrooms !== undefined && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-off-white">
                  <div className="p-2 rounded-lg bg-light-green text-forest-green">
                    <BedDouble className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-text uppercase font-semibold">Bedrooms</span>
                    <p className="text-sm font-bold text-dark-text">{details.bedrooms} BHK</p>
                  </div>
                </div>
              )}

              {details?.bathrooms !== undefined && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-off-white">
                  <div className="p-2 rounded-lg bg-light-green text-forest-green">
                    <Bath className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-text uppercase font-semibold">Bathrooms</span>
                    <p className="text-sm font-bold text-dark-text">{details.bathrooms} Bath</p>
                  </div>
                </div>
              )}

              {details?.carpetArea !== undefined && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-off-white">
                  <div className="p-2 rounded-lg bg-light-green text-forest-green">
                    <Maximize2 className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-text uppercase font-semibold">Carpet Area</span>
                    <p className="text-sm font-bold text-dark-text">{details.carpetArea} sqft</p>
                  </div>
                </div>
              )}

              {details?.floorNumber !== undefined && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-off-white">
                  <div className="p-2 rounded-lg bg-light-green text-forest-green">
                    <Layers className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-text uppercase font-semibold">Floor Level</span>
                    <p className="text-sm font-bold text-dark-text">
                      {details.floorNumber} {details.totalFloors ? `of ${details.totalFloors}` : ""}
                    </p>
                  </div>
                </div>
              )}

              {details?.availableFrom && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-off-white">
                  <div className="p-2 rounded-lg bg-light-green text-forest-green">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-text uppercase font-semibold">Available From</span>
                    <p className="text-sm font-bold text-dark-text">
                      {new Date(details.availableFrom).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>
                </div>
              )}

              {details?.furnishing && (
                <div className="flex items-start gap-3 p-3 rounded-xl bg-off-white">
                  <div className="p-2 rounded-lg bg-light-green text-forest-green">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-text uppercase font-semibold">Furnishing</span>
                    <p className="text-sm font-bold text-dark-text">
                      {furnishingLabels[details.furnishing] || details.furnishing}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Description Block */}
          <div className="rounded-2xl border border-border-subtle bg-white p-6 shadow-xs">
            <h2 className="text-base font-bold text-dark-text mb-3">About this Property</h2>
            <div className="text-sm text-dark-text leading-relaxed whitespace-pre-line">
              {listing.description}
            </div>
          </div>

          {/* Amenities & Highlights */}
          {details?.amenities && details.amenities.length > 0 && (
            <div className="rounded-2xl border border-border-subtle bg-white p-6 shadow-xs">
              <h2 className="text-base font-bold text-dark-text mb-4">Amenities & Highlights</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {details.amenities.map((amenity) => (
                  <div
                    key={amenity}
                    className="flex items-center gap-2 p-2.5 rounded-lg border border-border-subtle bg-off-white text-xs font-medium text-dark-text"
                  >
                    <CheckCircle2 className="w-4 h-4 text-forest-green shrink-0" />
                    <span>{amenity.replace(/_/g, " ")}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Location & Neighborhood Summary */}
          <div className="rounded-2xl border border-border-subtle bg-white p-6 shadow-xs">
            <h2 className="text-base font-bold text-dark-text mb-2">Location & Neighborhood</h2>
            <p className="text-xs text-muted-text mb-4">
              To protect the privacy of current residents, exact unit numbers and street addresses are provided upon direct contact with the owner.
            </p>
            <div className="p-4 rounded-xl bg-light-green/30 border border-light-green flex items-start gap-3">
              <MapPin className="w-5 h-5 text-forest-green shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-dark-text">
                  {listing.location.locality}, {listing.location.city}
                </h3>
                <p className="text-xs text-muted-text mt-0.5">
                  Designated launch market: {listing.location.cityCode}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Sidebar: Price & Direct Contact */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-2xl border border-border-subtle bg-white p-6 shadow-md flex flex-col gap-5">
            {/* Price Box */}
            <div className="pb-4 border-b border-border-subtle">
              <span className="text-xs text-muted-text font-semibold uppercase tracking-wider">
                {details?.purpose === "FOR_RENT" ? "Monthly Rent" : "Asking Price"}
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-3xl font-extrabold text-forest-green">
                  {details?.price ? formatCurrency(details.price) : "Contact for Price"}
                </span>
                {details?.purpose === "FOR_RENT" && (
                  <span className="text-xs text-muted-text">/ month</span>
                )}
              </div>

              {/* Maintenance & Security Deposit notes */}
              {(details?.securityDeposit || details?.maintenanceFee) && (
                <div className="mt-2.5 pt-2 border-t border-border-subtle/50 text-xs text-muted-text flex flex-col gap-1">
                  {details?.securityDeposit ? (
                    <div className="flex justify-between">
                      <span>Security Deposit:</span>
                      <span className="font-semibold text-dark-text">
                        {formatCurrency(details.securityDeposit)}
                      </span>
                    </div>
                  ) : null}
                  {details?.maintenanceFee ? (
                    <div className="flex justify-between">
                      <span>Monthly Maintenance:</span>
                      <span className="font-semibold text-dark-text">
                        {formatCurrency(details.maintenanceFee)}
                      </span>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            {/* Owner Profile Card */}
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-light-green flex items-center justify-center text-sm font-bold text-forest-green shrink-0">
                {listing.owner?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={listing.owner.image}
                    alt={listing.owner.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  listing.owner?.name?.charAt(0) || "O"
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-dark-text truncate">
                    {listing.owner?.name || "Verified Owner"}
                  </span>
                  <ShieldCheck className="w-4 h-4 text-forest-green shrink-0" />
                </div>
                <span className="text-xs text-muted-text">
                  Direct Listing Owner • No Brokerage
                </span>
              </div>
            </div>

            {/* Client-Side Contact & WhatsApp Reveal Action */}
            <PropertyDetailClient
              listingId={listing.id}
              title={listing.title}
              showPhone={listing.contactPreferences.showPhone}
              showWhatsapp={listing.contactPreferences.showWhatsapp}
            />

            {/* Trust and Safety Badges */}
            <div className="p-3 rounded-xl bg-off-white text-[11px] text-muted-text flex flex-col gap-1.5 border border-border-subtle/50">
              <div className="flex items-center gap-1.5 text-forest-green font-semibold">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Zero Brokerage Guarantee</span>
              </div>
              <p className="leading-snug">
                Contact owners directly via phone or WhatsApp. Never pay any reservation deposit before physically inspecting the property.
              </p>
            </div>

            {/* Report listing */}
            <div className="pt-2 text-center">
              <ReportListingButton listingId={listing.id} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
