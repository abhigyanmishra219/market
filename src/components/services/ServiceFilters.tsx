"use client";

import React, { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import {
  Wrench,
  Search,
  MapPin,
  X,
  RotateCcw,
} from "lucide-react";

interface ServiceFiltersProps {
  totalCount: number;
}

const CATEGORIES = [
  { id: "", label: "All Services" },
  { id: "PLUMBING", label: "Plumbing" },
  { id: "ELECTRICAL", label: "Electrical" },
  { id: "CARPENTRY", label: "Carpentry" },
  { id: "CLEANING", label: "Deep Cleaning" },
  { id: "PAINTING", label: "Painting" },
  { id: "APPLIANCE_REPAIR", label: "Appliance Repair" },
  { id: "PEST_CONTROL", label: "Pest Control" },
  { id: "MOVERS_PACKERS", label: "Movers & Packers" },
  { id: "OTHER", label: "Other Specialists" },
];

export function ServiceFilters({ totalCount }: ServiceFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const category = searchParams.get("category") || "";
  const pricingModel = searchParams.get("pricingModel") || "";
  const minPrice = searchParams.get("minPrice") || "";
  const maxPrice = searchParams.get("maxPrice") || "";
  const locality = searchParams.get("locality") || "";
  const search = searchParams.get("search") || "";
  const sortBy = searchParams.get("sortBy") || "createdAt";
  const sortOrder = searchParams.get("sortOrder") || "desc";

  const [localLocality, setLocalLocality] = useState(locality);
  const [localSearch, setLocalSearch] = useState(search);
  const [localMinPrice, setLocalMinPrice] = useState(minPrice);
  const [localMaxPrice, setLocalMaxPrice] = useState(maxPrice);

  const updateFilters = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
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

  const activeChips: { key: string; label: string }[] = [];
  if (category) {
    const found = CATEGORIES.find((c) => c.id === category);
    activeChips.push({ key: "category", label: `Category: ${found?.label || category}` });
  }
  if (pricingModel) {
    const map: Record<string, string> = {
      FIXED: "Fixed Price",
      HOURLY: "Hourly Rate",
      QUOTE_BASED: "Quote Based",
    };
    activeChips.push({ key: "pricingModel", label: map[pricingModel] || pricingModel });
  }
  if (locality) {
    activeChips.push({ key: "locality", label: `Coverage: ${locality}` });
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
      {/* Category Pills Bar (Horizontal scrolling on mobile) */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-3 border-b border-border-subtle">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => updateFilters({ category: cat.id || null })}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
              category === cat.id
                ? "bg-purple-900 text-white shadow-xs"
                : "bg-off-white text-dark-text hover:bg-light-purple/50"
            }`}
          >
            <Wrench className="w-3 h-3 text-purple-600" />
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Middle Bar: Search Form & Controls */}
      <div className="mt-4">
        <form onSubmit={handleApplyTextFilters} className="flex flex-col gap-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-dark-text uppercase tracking-wider mb-1">
                Search Service
              </label>
              <Input
                placeholder="Plumber, electrician, wiring..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                leftIcon={<Search className="w-3.5 h-3.5" />}
                className="h-9 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-dark-text uppercase tracking-wider mb-1">
                Service Area / Locality
              </label>
              <Input
                placeholder="Neighborhood covered..."
                value={localLocality}
                onChange={(e) => setLocalLocality(e.target.value)}
                leftIcon={<MapPin className="w-3.5 h-3.5" />}
                className="h-9 text-xs"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-dark-text uppercase tracking-wider mb-1">
                Pricing Model
              </label>
              <select
                value={pricingModel}
                onChange={(e) => updateFilters({ pricingModel: e.target.value || null })}
                className="w-full h-9 rounded-lg border border-border-subtle bg-white px-3 text-xs font-medium text-dark-text focus:border-forest-green focus:outline-none"
              >
                <option value="">All Pricing Models</option>
                <option value="FIXED">Fixed Rate</option>
                <option value="HOURLY">Hourly Rate</option>
                <option value="QUOTE_BASED">Quote Based</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-dark-text uppercase tracking-wider mb-1">
                Sort By
              </label>
              <select
                value={currentSortKey}
                onChange={(e) => {
                  const [sb, so] = e.target.value.split("-");
                  updateFilters({ sortBy: sb, sortOrder: so });
                }}
                className="w-full h-9 rounded-lg border border-border-subtle bg-white px-3 text-xs font-medium text-dark-text focus:border-forest-green focus:outline-none"
              >
                <option value="createdAt-desc">Newest First</option>
                <option value="price-asc">Starting Price: Low to High</option>
                <option value="price-desc">Starting Price: High to Low</option>
                <option value="title-asc">Title: A to Z</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-dark-text uppercase tracking-wider hidden sm:inline">
                Price (₹):
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

      {/* Active Filter Chips */}
      {activeChips.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap pt-3 mt-3 border-t border-border-subtle">
          <span className="text-xs text-muted-text font-medium">Active:</span>
          {activeChips.map((chip) => (
            <span
              key={chip.key}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-light-purple text-purple-900 text-xs font-semibold"
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
            className="flex items-center gap-1 text-xs font-semibold text-muted-text hover:text-purple-900 ml-auto transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset All</span>
          </button>
        </div>
      )}

      {/* Result Count Status */}
      <div className="mt-3 pt-2 text-xs text-muted-text flex items-center justify-between">
        <span>
          Found <strong className="text-dark-text">{totalCount}</strong> verified{" "}
          {totalCount === 1 ? "service professional" : "service professionals"}
        </span>
      </div>
    </div>
  );
}
