import React from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Metadata } from "next";
import { getPublicListingByIdOrSlug } from "@/lib/listings-data";
import { getCurrentSession } from "@/lib/auth-guards";
import { ServiceDetailClient } from "@/components/listings/ServiceDetailClient";
import { ReportListingButton } from "@/components/listings/ReportListingButton";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import {
  Wrench,
  Clock,
  Calendar,
  MapPin,
  ShieldCheck,
  ChevronRight,
  Home,
  CheckCircle2,
  Award,
} from "lucide-react";

export const instant = false;

interface ServiceDetailPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: ServiceDetailPageProps): Promise<Metadata> {
  const { id } = await params;
  const listing = await getPublicListingByIdOrSlug(id);

  if (!listing || listing.type !== "SERVICE") {
    return {
      title: "Service Not Found | Marketplace",
      description: "The requested service professional listing could not be found.",
    };
  }

  const category = listing.serviceDetails?.category || "Specialist";
  const priceText = listing.serviceDetails?.startingPrice
    ? `Starts at ${formatCurrency(listing.serviceDetails.startingPrice)}`
    : "Price on request";

  return {
    title: `${listing.title} - ${category} | ${priceText}`,
    description: `${listing.description.slice(0, 160)}... Operating in ${listing.location.city}.`,
    openGraph: {
      title: listing.title,
      description: listing.description.slice(0, 160),
      images: listing.photos.length > 0 ? [{ url: listing.photos[0].url }] : [],
    },
  };
}

export default async function ServiceDetailPage({ params }: ServiceDetailPageProps) {
  const { id } = await params;
  const [listing, session] = await Promise.all([
    getPublicListingByIdOrSlug(id),
    getCurrentSession(),
  ]);

  if (!listing || listing.type !== "SERVICE") {
    notFound();
  }

  const isOwner =
    session?.user?.id && listing.owner?.id
      ? session.user.id === listing.owner.id
      : false;

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
    OTHER: "Specialist Service",
  };

  const pricingModelLabels: Record<string, string> = {
    FIXED: "Fixed Price",
    HOURLY: "Hourly Rate",
    QUOTE_BASED: "Quote Based",
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-2 text-xs text-muted-text mb-6 flex-wrap" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-forest-green flex items-center gap-1 transition-colors">
          <Home className="w-3.5 h-3.5" />
          <span>Home</span>
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-border-subtle" />
        <Link href="/services" className="hover:text-forest-green transition-colors">
          Services
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-border-subtle" />
        {details?.category && (
          <>
            <Link
              href={`/services?category=${details.category}`}
              className="hover:text-forest-green transition-colors"
            >
              {categoryLabels[details.category] || details.category}
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-border-subtle" />
          </>
        )}
        <span className="text-dark-text font-medium truncate max-w-xs">{listing.title}</span>
      </nav>

      {/* Main Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 flex flex-col gap-8">
          {/* Header Title & Badges */}
          <div>
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <Badge variant="service" size="md" className="font-semibold gap-1">
                <Wrench className="w-3.5 h-3.5 text-purple-700" />
                <span>
                  {details?.category ? categoryLabels[details.category] || details.category : "Service"}
                </span>
              </Badge>
              {details?.pricingModel && (
                <Badge variant="neutral" size="md">
                  {pricingModelLabels[details.pricingModel] || details.pricingModel}
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

          {/* Provider Overview Card */}
          <div className="rounded-2xl border border-border-subtle bg-white p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full bg-light-purple flex items-center justify-center text-xl font-bold text-purple-900 shrink-0">
                {listing.owner?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={listing.owner.image}
                    alt={listing.owner.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  listing.owner?.name?.charAt(0) || "P"
                )}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="text-lg font-bold text-dark-text">
                    {listing.owner?.name || "Verified Professional"}
                  </h3>
                  <CheckCircle2 className="w-4 h-4 text-forest-green shrink-0" />
                </div>
                <p className="text-xs text-muted-text mt-0.5">
                  Certified Local Trade Specialist • {listing.location.city}
                </p>
                {listing.owner?.memberSince && (
                  <span className="text-[11px] text-muted-text">
                    Member since {new Date(listing.owner.memberSince).getFullYear()}
                  </span>
                )}
              </div>
            </div>

            {details?.experienceYears !== undefined && (
              <div className="flex sm:flex-col items-center sm:items-end justify-between border-t sm:border-t-0 pt-3 sm:pt-0 border-border-subtle">
                <span className="text-xs text-muted-text font-medium">Experience</span>
                <span className="text-lg font-bold text-forest-green">
                  {details.experienceYears} Years
                </span>
              </div>
            )}
          </div>

          {/* Service Description */}
          <div className="rounded-2xl border border-border-subtle bg-white p-6 shadow-xs">
            <h2 className="text-base font-bold text-dark-text mb-3">Service Scope & Description</h2>
            <div className="text-sm text-dark-text leading-relaxed whitespace-pre-line">
              {listing.description}
            </div>
          </div>

          {/* Service Guarantees & Terms */}
          {details?.guarantees && (
            <div className="rounded-2xl border border-border-subtle bg-white p-6 shadow-xs">
              <div className="flex items-center gap-2 mb-2 text-forest-green">
                <Award className="w-5 h-5" />
                <h2 className="text-base font-bold text-dark-text">Quality Guarantee & Warranty</h2>
              </div>
              <p className="text-sm text-dark-text leading-relaxed">{details.guarantees}</p>
            </div>
          )}

          {/* Operating Schedule & Service Areas */}
          <div className="rounded-2xl border border-border-subtle bg-white p-6 shadow-xs">
            <h2 className="text-base font-bold text-dark-text mb-4">Coverage & Operating Schedule</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Working Hours */}
              {details?.workingHours && (
                <div className="p-4 rounded-xl bg-off-white flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-light-purple text-purple-900">
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-text uppercase font-semibold">
                      Daily Operating Hours
                    </span>
                    <p className="text-sm font-bold text-dark-text mt-0.5">
                      {details.workingHours.start} - {details.workingHours.end}
                    </p>
                  </div>
                </div>
              )}

              {/* Working Days */}
              {details?.workingDays && details.workingDays.length > 0 && (
                <div className="p-4 rounded-xl bg-off-white flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-light-purple text-purple-900">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] text-muted-text uppercase font-semibold">
                      Operating Days
                    </span>
                    <p className="text-sm font-bold text-dark-text mt-0.5">
                      {details.workingDays.join(", ")}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Service Areas Tags */}
            {details?.serviceAreas && details.serviceAreas.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border-subtle/60">
                <span className="block text-xs font-semibold text-dark-text mb-2">
                  Neighborhoods & Sectors Served:
                </span>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {details.serviceAreas.map((area) => (
                    <span
                      key={area}
                      className="px-2.5 py-1 rounded-md bg-light-purple/40 text-purple-900 text-xs font-medium"
                    >
                      {area}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Portfolio Photos */}
          {listing.photos && listing.photos.length > 0 && (
            <div className="rounded-2xl border border-border-subtle bg-white p-6 shadow-xs">
              <h2 className="text-base font-bold text-dark-text mb-4">Past Work & Portfolio</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {listing.photos.map((photo) => (
                  <div
                    key={photo.id}
                    className="relative aspect-4/3 rounded-xl overflow-hidden border border-border-subtle bg-off-white"
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
            </div>
          )}
        </div>

        {/* Floating Sidebar: Pricing & Direct Actions */}
        <div className="lg:col-span-1">
          <div className="sticky top-24 rounded-2xl border border-border-subtle bg-white p-6 shadow-md flex flex-col gap-5">
            {/* Price Box */}
            <div className="pb-4 border-b border-border-subtle">
              <span className="text-xs text-muted-text font-semibold uppercase tracking-wider">
                Starting Baseline Price
              </span>
              <div className="flex items-baseline gap-1.5 mt-1">
                <span className="text-3xl font-extrabold text-forest-green">
                  {details?.startingPrice ? formatCurrency(details.startingPrice) : "Free Inspection"}
                </span>
                <span className="text-xs text-muted-text">
                  ({details?.pricingModel ? pricingModelLabels[details.pricingModel] : "Standard"})
                </span>
              </div>
              <p className="text-[11px] text-muted-text mt-1.5 leading-relaxed">
                Rates may vary depending on material requirements and task complexity.
              </p>
            </div>

            {/* Provider Verification Card */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-light-purple flex items-center justify-center text-sm font-bold text-purple-900 shrink-0">
                {listing.owner?.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={listing.owner.image}
                    alt={listing.owner.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  listing.owner?.name?.charAt(0) || "P"
                )}
              </div>
              <div className="flex flex-col min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-dark-text truncate">
                    {listing.owner?.name || "Verified Professional"}
                  </span>
                  <ShieldCheck className="w-4 h-4 text-forest-green shrink-0" />
                </div>
                <span className="text-xs text-muted-text">Direct Contact • No Commission</span>
              </div>
            </div>

            {/* Client-Side Contact & Booking Actions */}
            <ServiceDetailClient
              listingId={listing.id}
              title={listing.title}
              locality={listing.location.locality}
              categoryLabel={
                details?.category ? categoryLabels[details.category] || details.category : undefined
              }
              startingPrice={details?.startingPrice}
              pricingModel={details?.pricingModel}
              showPhone={listing.contactPreferences.showPhone}
              showWhatsapp={listing.contactPreferences.showWhatsapp}
              isLoggedIn={Boolean(session?.user)}
              isOwner={Boolean(isOwner)}
              userPhone={session?.user?.phone || null}
            />

            {/* Marketplace Quality Guarantee */}
            <div className="p-3 rounded-xl bg-off-white text-[11px] text-muted-text flex flex-col gap-1.5 border border-border-subtle/50">
              <div className="flex items-center gap-1.5 text-purple-900 font-semibold">
                <ShieldCheck className="w-3.5 h-3.5 text-forest-green" />
                <span>Direct Verified Contact</span>
              </div>
              <p className="leading-snug">
                Connect directly with service specialists. Always clarify scope, materials, and final pricing before commencement of work.
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
