"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Building2, Wrench, Search, MapPin, Sparkles } from "lucide-react";

interface HomeSearchHeroProps {
  cityName: string;
}

export function HomeSearchHero({ cityName }: HomeSearchHeroProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"property" | "service">("property");
  const [propertyPurpose, setPropertyPurpose] = useState<string>("FOR_RENT");
  const [serviceCategory, setServiceCategory] = useState<string>("");
  const [query, setQuery] = useState("");

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();

    if (activeTab === "property") {
      if (propertyPurpose) params.set("purpose", propertyPurpose);
      if (query.trim()) params.set("locality", query.trim());
      router.push(`/properties?${params.toString()}`);
    } else {
      if (serviceCategory) params.set("category", serviceCategory);
      if (query.trim()) params.set("search", query.trim());
      router.push(`/services?${params.toString()}`);
    }
  };

  return (
    <section className="bg-white border-b border-border-subtle py-12 md:py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 text-center flex flex-col items-center">
        {/* Market Indicator Badge */}
        <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-light-green text-forest-green text-xs font-semibold mb-4 shadow-2xs">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Serving {cityName} • Direct Phone & WhatsApp • Zero Platform Brokerage</span>
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-dark-text tracking-tight max-w-3xl leading-tight">
          Discover Living Spaces & Skilled Local Professionals
        </h1>

        <p className="mt-4 text-base sm:text-lg text-muted-text max-w-2xl leading-relaxed">
          Browse verified rental apartments, homes for sale, and certified local tradespeople with
          direct, transparent communication.
        </p>

        {/* Dual-Vertical Search Box */}
        <div className="w-full max-w-2xl mt-8 rounded-2xl border border-border-subtle bg-off-white p-3.5 shadow-sm text-left">
          {/* Tabs */}
          <div className="flex items-center gap-2 mb-3">
            <button
              type="button"
              onClick={() => setActiveTab("property")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "property"
                  ? "bg-forest-green text-white shadow-xs"
                  : "text-dark-text hover:bg-white"
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Find Properties</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("service")}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeTab === "service"
                  ? "bg-purple-900 text-white shadow-xs"
                  : "text-dark-text hover:bg-white"
              }`}
            >
              <Wrench className="w-4 h-4" />
              <span>Find Local Services</span>
            </button>
          </div>

          {/* Search Form */}
          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2.5">
            {activeTab === "property" ? (
              <>
                <select
                  value={propertyPurpose}
                  onChange={(e) => setPropertyPurpose(e.target.value)}
                  className="h-10 rounded-lg border border-border-subtle bg-white px-3 text-xs font-medium text-dark-text focus:border-forest-green focus:outline-none"
                  aria-label="Property Purpose"
                >
                  <option value="FOR_RENT">For Rent</option>
                  <option value="FOR_SALE">For Sale</option>
                  <option value="PG_CO_LIVING">PG / Co-Living</option>
                </select>
                <div className="flex-1">
                  <Input
                    placeholder="Enter locality (e.g. Greenwood, Tech Corridor)..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    leftIcon={<MapPin className="w-4 h-4" />}
                    className="h-10 text-xs"
                  />
                </div>
              </>
            ) : (
              <>
                <select
                  value={serviceCategory}
                  onChange={(e) => setServiceCategory(e.target.value)}
                  className="h-10 rounded-lg border border-border-subtle bg-white px-3 text-xs font-medium text-dark-text focus:border-forest-green focus:outline-none"
                  aria-label="Service Category"
                >
                  <option value="">All Categories</option>
                  <option value="PLUMBING">Plumbing</option>
                  <option value="ELECTRICAL">Electrical</option>
                  <option value="CARPENTRY">Carpentry</option>
                  <option value="CLEANING">Deep Cleaning</option>
                  <option value="PAINTING">Painting</option>
                  <option value="APPLIANCE_REPAIR">Appliance Repair</option>
                  <option value="PEST_CONTROL">Pest Control</option>
                  <option value="MOVERS_PACKERS">Movers & Packers</option>
                </select>
                <div className="flex-1">
                  <Input
                    placeholder="Enter neighborhood or service keyword..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    leftIcon={<Search className="w-4 h-4" />}
                    className="h-10 text-xs"
                  />
                </div>
              </>
            )}

            <Button
              type="submit"
              variant={activeTab === "property" ? "primary" : "service"}
              size="md"
              leftIcon={<Search className="w-4 h-4" />}
              className="shrink-0 font-semibold"
            >
              Search
            </Button>
          </form>
        </div>
      </div>
    </section>
  );
}
