import React from "react";
import Link from "next/link";
import { getPublicListings } from "@/lib/listings-data";
import { PropertyCard } from "@/components/listings/PropertyCard";
import { ServiceCard } from "@/components/listings/ServiceCard";
import { HomeSearchHero } from "@/components/home/HomeSearchHero";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { connection } from "next/server";
import {
  Building2,
  Wrench,
  ShieldCheck,
  PhoneCall,
  Clock,
  ArrowRight,
  Layers,
  Sparkles,
  Zap,
  Hammer,
  Paintbrush,
  SprayCan,
  Truck,
  PlusCircle,
  Inbox,
} from "lucide-react";

export default async function HomePage() {
  await connection();
  const cityName = process.env.NEXT_PUBLIC_LAUNCH_CITY_NAME || "Launch City";

  // Fetch approved listings from MongoDB Atlas
  const [{ items: featuredProperties }, { items: featuredServices }] = await Promise.all([
    getPublicListings({ type: "PROPERTY", limit: 3 }),
    getPublicListings({ type: "SERVICE", limit: 3 }),
  ]);

  const propertyTypes = [
    { id: "APARTMENT", label: "Apartments & Flats", icon: Building2 },
    { id: "INDEPENDENT_HOUSE", label: "Independent Houses", icon: Layers },
    { id: "VILLA", label: "Gated Villas", icon: Sparkles },
    { id: "PLOT", label: "Plots & Land", icon: Layers },
    { id: "COMMERCIAL", label: "Commercial Spaces", icon: Building2 },
  ];

  const serviceCategories = [
    { id: "PLUMBING", label: "Plumbing", icon: Wrench },
    { id: "ELECTRICAL", label: "Electrical", icon: Zap },
    { id: "CARPENTRY", label: "Carpentry", icon: Hammer },
    { id: "CLEANING", label: "Deep Cleaning", icon: SprayCan },
    { id: "PAINTING", label: "Painting", icon: Paintbrush },
    { id: "MOVERS_PACKERS", label: "Movers & Packers", icon: Truck },
  ];

  return (
    <div className="flex flex-col gap-12 pb-16">
      {/* 1. Main Search Hero Area */}
      <HomeSearchHero cityName={cityName} />

      {/* 2. Category Navigation: Browse Properties by Type */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-dark-text">Browse Properties by Type</h2>
          <p className="text-xs text-muted-text">Find your ideal living space in {cityName}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {propertyTypes.map((pt) => {
            const Icon = pt.icon;
            return (
              <Link
                key={pt.id}
                href={`/properties?propertyType=${pt.id}`}
                className="group p-4 rounded-xl border border-border-subtle bg-white hover:border-forest-green hover:shadow-xs transition-all flex flex-col items-center text-center"
              >
                <div className="w-10 h-10 rounded-lg bg-light-green text-forest-green flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-dark-text group-hover:text-forest-green transition-colors">
                  {pt.label}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 3. Featured Properties Section */}
      <section id="properties" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 pb-2 border-b border-border-subtle">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="property" size="sm">
                Real Estate
              </Badge>
              <span className="text-xs text-muted-text font-medium">Verified living spaces</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-dark-text">Featured Properties</h2>
          </div>
          <Link
            href="/properties"
            className="inline-flex items-center gap-1 text-xs font-semibold text-forest-green hover:underline mt-2 sm:mt-0"
          >
            <span>Explore all properties</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {featuredProperties.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredProperties.map((property) => (
              <PropertyCard key={property.id} listing={property} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border-subtle bg-white p-8 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-light-green/60 text-forest-green flex items-center justify-center mb-3">
              <Inbox className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-dark-text">No approved properties currently listed</h3>
            <p className="text-xs text-muted-text max-w-sm mt-1 mb-4 leading-relaxed">
              We haven&apos;t published any approved property listings in {cityName} yet. Listings will appear here as soon as they pass administrative review.
            </p>
            <Link href="/properties">
              <Button variant="outline" size="sm">
                Browse Property Directory
              </Button>
            </Link>
          </div>
        )}
      </section>

      {/* 4. Category Navigation: Discover Services by Category */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="mb-4">
          <h2 className="text-lg font-bold text-dark-text">Discover Services by Trade</h2>
          <p className="text-xs text-muted-text">Find certified local professionals in {cityName}</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {serviceCategories.map((sc) => {
            const Icon = sc.icon;
            return (
              <Link
                key={sc.id}
                href={`/services?category=${sc.id}`}
                className="group p-4 rounded-xl border border-border-subtle bg-white hover:border-purple-600 hover:shadow-xs transition-all flex flex-col items-center text-center"
              >
                <div className="w-10 h-10 rounded-lg bg-light-purple text-purple-900 flex items-center justify-center mb-2 group-hover:scale-105 transition-transform">
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-dark-text group-hover:text-purple-900 transition-colors">
                  {sc.label}
                </span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 5. Top-Rated Local Services Section */}
      <section id="services" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-6 pb-2 border-b border-border-subtle">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="service" size="sm">
                Local Services
              </Badge>
              <span className="text-xs text-muted-text font-medium">Skilled trade specialists</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-dark-text">Top-Rated Local Professionals</h2>
          </div>
          <Link
            href="/services"
            className="inline-flex items-center gap-1 text-xs font-semibold text-purple-900 hover:underline mt-2 sm:mt-0"
          >
            <span>Explore all services</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {featuredServices.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredServices.map((service) => (
              <ServiceCard key={service.id} listing={service} />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border-subtle bg-white p-8 text-center flex flex-col items-center">
            <div className="w-12 h-12 rounded-full bg-light-purple text-purple-900 flex items-center justify-center mb-3">
              <Inbox className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-dark-text">No verified service professionals currently listed</h3>
            <p className="text-xs text-muted-text max-w-sm mt-1 mb-4 leading-relaxed">
              We haven&apos;t published any approved service provider listings in {cityName} yet. Verified trade providers will appear here once approved.
            </p>
            <Link href="/services">
              <Button variant="outline" size="sm">
                Browse Service Directory
              </Button>
            </Link>
          </div>
        )}
      </section>

      {/* 6. Marketplace Trust & Transparency Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="rounded-2xl border border-border-subtle bg-white p-6 sm:p-8">
          <h3 className="text-lg font-bold text-dark-text mb-1">How the Marketplace Operates</h3>
          <p className="text-xs text-muted-text mb-6">
            Engineered for direct trust, transparent pricing, and zero middleman friction.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-light-green text-forest-green shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-dark-text">Pre-Publication Review</h4>
                <p className="text-xs text-muted-text mt-1 leading-relaxed">
                  Every newly submitted property and service listing undergoes administrative
                  moderation before appearing in public searches.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-light-green text-forest-green shrink-0">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-dark-text">Direct Phone & WhatsApp</h4>
                <p className="text-xs text-muted-text mt-1 leading-relaxed">
                  Connect immediately with owners and service professionals via native phone dialer or
                  context-rich WhatsApp deep links.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-light-purple text-purple-900 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-dark-text">Confirmed Service Bookings</h4>
                <p className="text-xs text-muted-text mt-1 leading-relaxed">
                  Request service appointments with preferred dates and time slots, confirmed directly
                  by local professionals.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Call to Action: Post a Listing */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="rounded-2xl bg-forest-green text-white p-6 sm:p-10 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-md">
          <div className="max-w-xl">
            <span className="text-xs font-semibold text-light-green uppercase tracking-wider">
              Grow Your Business & Fill Vacancies
            </span>
            <h3 className="text-xl sm:text-2xl font-bold mt-1 tracking-tight">
              List Your Property or Local Service on the Marketplace
            </h3>
            <p className="text-xs sm:text-sm text-white/80 mt-2 leading-relaxed">
              Connect with genuine tenants, buyers, and local residents in {cityName}. Zero brokerage commissions, direct WhatsApp communication, and verified listing badges.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0">
            <Link href="/auth/signin?callbackUrl=%2Fdashboard">
              <Button
                variant="secondary"
                size="lg"
                leftIcon={<PlusCircle className="w-4 h-4" />}
                className="font-semibold shadow-xs"
              >
                Post a Listing
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
