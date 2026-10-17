import React from "react";
import Link from "next/link";
import { Metadata } from "next";
import { getPublicListings } from "@/lib/listings-data";
import { PropertyCard } from "@/components/listings/PropertyCard";
import { PropertyFilters } from "@/components/properties/PropertyFilters";
import { Button } from "@/components/ui/Button";
import { PropertyPurpose, FurnishingStatus } from "@/types/listing";
import {
  ChevronRight,
  ChevronLeft,
  SearchX,
  Home,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Properties for Rent & Sale | Public Marketplace",
  description:
    "Explore verified residential apartments, independent houses, villas, and PG accommodations with direct phone and WhatsApp contact.",
};

export const instant = false;

interface PropertiesPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function PropertiesPage({ searchParams }: PropertiesPageProps) {
  const resolvedParams = await searchParams;

  const cityName = process.env.NEXT_PUBLIC_LAUNCH_CITY_NAME || "Launch City";

  // Parse query parameters
  const page = typeof resolvedParams.page === "string" ? parseInt(resolvedParams.page, 10) : 1;
  const purpose = typeof resolvedParams.purpose === "string" ? (resolvedParams.purpose as PropertyPurpose) : undefined;
  const propertyType = typeof resolvedParams.propertyType === "string" ? resolvedParams.propertyType : undefined;
  const bedrooms = typeof resolvedParams.bedrooms === "string" ? resolvedParams.bedrooms : undefined;
  const furnishing = typeof resolvedParams.furnishing === "string" ? (resolvedParams.furnishing as FurnishingStatus) : undefined;
  const locality = typeof resolvedParams.locality === "string" ? resolvedParams.locality : undefined;
  const search = typeof resolvedParams.search === "string" ? resolvedParams.search : undefined;
  const minPrice = typeof resolvedParams.minPrice === "string" ? parseFloat(resolvedParams.minPrice) : undefined;
  const maxPrice = typeof resolvedParams.maxPrice === "string" ? parseFloat(resolvedParams.maxPrice) : undefined;
  const sortBy = typeof resolvedParams.sortBy === "string" && ["createdAt", "price", "title"].includes(resolvedParams.sortBy)
    ? (resolvedParams.sortBy as "createdAt" | "price" | "title")
    : "createdAt";
  const sortOrder = typeof resolvedParams.sortOrder === "string" && ["asc", "desc"].includes(resolvedParams.sortOrder)
    ? (resolvedParams.sortOrder as "asc" | "desc")
    : "desc";

  // Query database directly in Server Component
  const { items, pagination } = await getPublicListings({
    type: "PROPERTY",
    page,
    limit: 12,
    purpose,
    propertyType,
    bedrooms,
    furnishing,
    locality,
    search,
    minPrice,
    maxPrice,
    sortBy,
    sortOrder,
  });

  // Build pagination link helper
  const createPageUrl = (targetPage: number) => {
    const params = new URLSearchParams();
    Object.entries(resolvedParams).forEach(([key, val]) => {
      if (val && key !== "page") {
        params.set(key, Array.isArray(val) ? val[0] : val);
      }
    });
    params.set("page", targetPage.toString());
    return `/properties?${params.toString()}`;
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-2 text-xs text-muted-text mb-4" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-forest-green flex items-center gap-1 transition-colors">
          <Home className="w-3.5 h-3.5" />
          <span>Home</span>
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-border-subtle" />
        <span className="text-dark-text font-medium">Properties in {cityName}</span>
      </nav>

      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-dark-text tracking-tight">
          Properties in {cityName}
        </h1>
        <p className="text-sm text-muted-text mt-1">
          Verified rental flats, houses for sale, and co-living accommodations with zero middleman brokerage.
        </p>
      </div>

      {/* Filter Component */}
      <PropertyFilters totalCount={pagination.totalCount} />

      {/* Results Content */}
      {items.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {items.map((property) => (
              <PropertyCard key={property.id} listing={property} />
            ))}
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-12 pt-6 border-t border-border-subtle">
              {pagination.page > 1 ? (
                <Link href={createPageUrl(pagination.page - 1)}>
                  <Button variant="outline" size="sm" leftIcon={<ChevronLeft className="w-4 h-4" />}>
                    Previous
                  </Button>
                </Link>
              ) : (
                <Button variant="outline" size="sm" disabled leftIcon={<ChevronLeft className="w-4 h-4" />}>
                  Previous
                </Button>
              )}

              <div className="flex items-center gap-1 px-3 text-xs font-semibold text-dark-text">
                Page {pagination.page} of {pagination.totalPages}
              </div>

              {pagination.page < pagination.totalPages ? (
                <Link href={createPageUrl(pagination.page + 1)}>
                  <Button variant="outline" size="sm" rightIcon={<ChevronRight className="w-4 h-4" />}>
                    Next
                  </Button>
                </Link>
              ) : (
                <Button variant="outline" size="sm" disabled rightIcon={<ChevronRight className="w-4 h-4" />}>
                  Next
                </Button>
              )}
            </div>
          )}
        </>
      ) : (
        /* Empty State */
        <div className="rounded-2xl border border-dashed border-border-subtle bg-white p-12 text-center flex flex-col items-center">
          <div className="w-14 h-14 rounded-full bg-light-green/60 text-forest-green flex items-center justify-center mb-4">
            <SearchX className="w-7 h-7" />
          </div>
          <h2 className="text-lg font-bold text-dark-text">No properties found</h2>
          <p className="text-sm text-muted-text max-w-md mt-1 mb-6 leading-relaxed">
            We couldn&apos;t find any approved property listings matching your selected filters. Try broadening your price range or resetting your search.
          </p>
          <div className="flex items-center gap-3">
            <Link href="/properties">
              <Button variant="primary" size="md">
                Reset All Filters
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" size="md">
                Back to Homepage
              </Button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
