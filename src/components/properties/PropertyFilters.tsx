"use client";

import React, { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  SlidersHorizontal,
  X,
  Search,
  MapPin,
  RotateCcw,
  ArrowUpDown,
} from "lucide-react";

interface PropertyFiltersProps {
  totalCount: number;
}

export function PropertyFilters({ totalCount }: PropertyFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [mobileExpanded, setMobileExpanded] = useState(false);

  // Read current filter state from URL
  const purpose = searchParams.get("purpose") || "";
  const propertyType = searchParams.get("propertyType") || "";
  const bedrooms = searchParams.get("bedrooms") || "";
  const furnishing = searchParams.get("furnishing") || "";
  const minPrice = searchParams.get("minPrice") || "";
  const maxPrice = searchParams.get("maxPrice") || "";
  const locality = searchParams.get("locality") || "";
  const search = searchParams.get("search") || "";
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = searchParams.get("sortOrder") || "desc";

  // Local inputs for search and price to allow typing before submitting
  const [localLocality, setLocalLocality] = useState(locality);
  const [localSearch, setLocalSearch] = useState(search);
  const [localMinPrice, setLocalMinPrice] = useState(minPrice);
  const [localMaxPrice, setLocalMaxPrice] = useState(maxPrice);

  const updateFilters = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());

    // Reset to page 1 whenever filters change
    params.delete("page");

    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "") {
        params.delete(key);
      } else {
        params.set(key, value);
      }
    });

    router.push(`${pathname}?${params.toString()}`);
  };

  const handleApplyTextFilters = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({
      locality: localLocality.trim() || null,
      search: localSearch.trim() || null,
      minPrice: localMinPrice ? String(localMinPrice) : null,
      maxPrice: localMaxPrice ? String(localMaxPrice) : null,
    });
  };

  const clearAllFilters = () => {
    setLocalLocality("");
    setLocalSearch("");
    setLocalMinPrice("");
    setLocalMaxPrice("");
    router.push(pathname);
  };

  // Active filter items for chips
  const activeChips: { key: string; label: string }[] = [];
  if (purpose) {
    const map: Record<string, string> = {
      FOR_RENT: "Rent",
      FOR_SALE: "Sale",
      PG_CO_LIVING: "PG / Co-Living",
    };
    activeChips.push({ key: "purpose", label: `Purpose: ${map[purpose] || purpose}` });
  }
  if (propertyType) {
    activeChips.push({ key: "propertyType", label: `Type: ${propertyType}` });
  }
  if (bedrooms) {
    activeChips.push({ key: "bedrooms", label: `${bedrooms} BHK` });
  }
  if (furnishing) {
    const map: Record<string, string> = {
      UNFURNISHED: "Unfurnished",
      SEMI_FURNISHED: "Semi-Furnished",
      FULLY_FURNISHED: "Fully Furnished",
    };
    activeChips.push({ key: "furnishing", label: map[furnishing] || furnishing });
  }
  if (locality) {
    activeChips.push({ key: "locality", label: `Locality: ${locality}` });
  }
  if (search) {
    activeChips.push({ key: "search", label: `Keyword: "${search}"` });
  }
  if (minPrice || maxPrice) {
    activeChips.push({
      key: "price",
      label: `Price: ₹${minPrice || "0"} - ₹${maxPrice || "Any"}`,
    });
  }

  const removeChip = (key: string) => {
    if (key === "price") {
      setLocalMinPrice("");
      setLocalMaxPrice("");
      updateFilters({ minPrice: null, maxPrice: null });
    } else {
      if (key === "locality") setLocalLocality("");
      if (key === "search") setLocalSearch("");
      updateFilters({ [key]: null });
    }
  };

  const currentSortKey = `${sortBy}-${sortOrder}`;

  return (
    <div className="bg-white rounded-2xl border border-border-subtle p-4 sm:p-5 shadow-xs mb-8">
      {/* Top Bar: Purpose Tabs & Mobile Filter Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border-subtle">
        {/* Purpose Segmented Control */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "", label: "All Properties" },
            { id: "FOR_RENT", label: "For Rent" },
            { id: "FOR_SALE", label: "For Sale" },
            { id: "PG_CO_LIVING", label: "PG / Co-Living" },
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => updateFilters({ purpose: item.id || null })}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                purpose === item.id
                  ? "bg-forest-green text-white shadow-xs"
                  : "bg-off-white text-dark-text hover:bg-light-green/40"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Mobile Filter Toggle & Sort Dropdown */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            type="button"
            onClick={() => setMobileExpanded(!mobileExpanded)}
            className="sm:hidden flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border-subtle text-xs font-medium text-dark-text bg-off-white"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Filters ({activeChips.length})</span>
          </button>

          {/* Sort Selector */}
          <div className="flex items-center gap-1.5">
            <ArrowUpDown className="w-3.5 h-3.5 text-muted-text" />
            <select
              value={currentSortKey}
              onChange={(e) => {
                const [sb, so] = e.target.value.split("-");
                updateFilters({ sortBy: sb, sortOrder: so });
              }}
              className="h-8 rounded-lg border border-border-subtle bg-off-white px-2.5 text-xs font-medium text-dark-text focus:border-forest-green focus:outline-none"
              aria-label="Sort properties"
            >
              <option value="createdAt-desc">Newest First</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="title-asc">Title: A to Z</option>
            </select>
          </div>
        </div>
      </div>

      {/* Granular Filters Grid (Desktop visible, mobile collapsible) */}
      <div className={`mt-4 pt-1 ${mobileExpanded ? "block" : "hidden sm:block"}`}>
        <form onSubmit={handleApplyTextFilters} className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search Keyword */}
            <div>
              <label className="block text-[11px] font-semibold text-dark-text uppercase tracking-wider mb-1">
                Search Keyword
              </label>
              <Input
                placeholder="Title or description..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                leftIcon={<Search className="w-3.5 h-3.5" />}
                className="h-9 text-xs"
              />
            </div>

            {/* Locality Search */}
            <div>
              <label className="block text-[11px] font-semibold text-dark-text uppercase tracking-wider mb-1">
                Locality / Area
              </label>
              <Input
                placeholder="Neighborhood or sector..."
                value={localLocality}
                onChange={(e) => setLocalLocality(e.target.value)}
                leftIcon={<MapPin className="w-3.5 h-3.5" />}
                className="h-9 text-xs"
              />
            </div>

            {/* Property Type Dropdown */}
            <div>
              <label className="block text-[11px] font-semibold text-dark-text uppercase tracking-wider mb-1">
                Property Type
              </label>
              <select
                value={propertyType}
                onChange={(e) => updateFilters({ propertyType: e.target.value || null })}
                className="w-full h-9 rounded-lg border border-border-subtle bg-white px-3 text-xs font-medium text-dark-text focus:border-forest-green focus:outline-none"
              >
                <option value="">All Types</option>
                <option value="APARTMENT">Apartment</option>
                <option value="INDEPENDENT_HOUSE">Independent House</option>
                <option value="VILLA">Villa</option>
                <option value="PLOT">Plot / Land</option>
                <option value="COMMERCIAL">Commercial Space</option>
              </select>
            </div>

            {/* Furnishing Dropdown */}
            <div>
              <label className="block text-[11px] font-semibold text-dark-text uppercase tracking-wider mb-1">
                Furnishing
              </label>
              <select
                value={furnishing}
                onChange={(e) => updateFilters({ furnishing: e.target.value || null })}
                className="w-full h-9 rounded-lg border border-border-subtle bg-white px-3 text-xs font-medium text-dark-text focus:border-forest-green focus:outline-none"
              >
                <option value="">All Furnishing</option>
                <option value="FULLY_FURNISHED">Fully Furnished</option>
                <option value="SEMI_FURNISHED">Semi-Furnished</option>
                <option value="UNFURNISHED">Unfurnished</option>
              </select>
            </div>
          </div>

          {/* Second Row: Bedrooms & Min/Max Price */}
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-3 border-t border-border-subtle/60">
            {/* Bedroom Pills */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-semibold text-dark-text uppercase tracking-wider mr-1">
                Bedrooms:
              </span>
              {["", "1", "2", "3", "4"].map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => updateFilters({ bedrooms: b || null })}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                    bedrooms === b
                      ? "bg-forest-green text-white font-semibold"
                      : "bg-off-white text-dark-text hover:bg-light-green/40 border border-border-subtle"
                  }`}
                >
                  {b ? `${b} BHK` : "Any"}
                </button>
              ))}
            </div>

            {/* Min / Max Price & Submit */}
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-dark-text uppercase tracking-wider mr-1 hidden sm:inline">
                Price Range (₹):
              </span>
              <input
                type="number"
                placeholder="Min ₹"
                value={localMinPrice}
                onChange={(e) => setLocalMinPrice(e.target.value)}
                className="w-24 h-8 rounded-lg border border-border-subtle bg-white px-2.5 text-xs text-dark-text focus:border-forest-green focus:outline-none"
              />
              <span className="text-xs text-muted-text">-</span>
              <input
                type="number"
                placeholder="Max ₹"
                value={localMaxPrice}
                onChange={(e) => setLocalMaxPrice(e.target.value)}
                className="w-24 h-8 rounded-lg border border-border-subtle bg-white px-2.5 text-xs text-dark-text focus:border-forest-green focus:outline-none"
              />
              <Button type="submit" variant="primary" size="sm">
                Apply
              </Button>
            </div>
          </div>
        </form>
      </div>

      {/* Active Filter Chips Bar */}
      {activeChips.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap pt-3 mt-3 border-t border-border-subtle">
          <span className="text-xs text-muted-text font-medium">Active:</span>
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-light-green text-forest-green text-xs font-semibold"
            >
              <span>{chip.label}</span>
              <button
                type="button"
                onClick={() => removeChip(chip.key)}
                className="p-0.5 hover:text-dark-text rounded-full"
                aria-label={`Remove filter ${chip.label}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
          <button
            type="button"
            onClick={clearAllFilters}
            className="flex items-center gap-1 text-xs font-semibold text-muted-text hover:text-forest-green ml-auto transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset All</span>
          </button>
        </div>
      )}

      {/* Result Count Status */}
      <div className="mt-3 pt-2 text-xs text-muted-text flex items-center justify-between">
        <span>
          Found <strong className="text-dark-text">{totalCount}</strong> approved{" "}
          {totalCount === 1 ? "property" : "properties"}
        </span>
      </div>
    </div>
  );
}
