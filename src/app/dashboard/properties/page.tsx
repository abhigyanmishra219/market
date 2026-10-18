import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import mongoose from "mongoose";
import { requirePageAuth } from "@/lib/auth-guards";
import { connectToDatabase } from "@/lib/db";
import { Listing } from "@/models/Listing";
import { OwnerPropertyList, OwnerPropertyItem } from "@/components/properties/OwnerPropertyList";
import { Button } from "@/components/ui/Button";
import { PlusCircle, ChevronRight, Home } from "lucide-react";

export const metadata: Metadata = {
  title: "My Properties — Owner Dashboard",
  description: "Manage your property listings, track review status, and update rental or sale terms.",
};

export default async function OwnerPropertiesPage() {
  await connection();
  const session = await requirePageAuth("/dashboard/properties");

  await connectToDatabase();

  const docs = await Listing.find({
    ownerId: new mongoose.Types.ObjectId(session.user.id),
    type: "PROPERTY",
  })
    .sort({ createdAt: -1 })
    .lean();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const properties: OwnerPropertyItem[] = docs.map((doc: any) => ({
    id: doc._id.toString(),
    type: doc.type,
    status: doc.status,
    title: doc.title,
    slug: doc.slug,
    description: doc.description,
    location: {
      city: doc.location.city,
      cityCode: doc.location.cityCode,
      locality: doc.location.locality,
      streetAddress: doc.location.streetAddress || null,
    },
    photos: doc.photos || [],
    propertyDetails: doc.propertyDetails
      ? {
          purpose: doc.propertyDetails.purpose,
          propertyType: doc.propertyDetails.propertyType,
          price: doc.propertyDetails.price,
          bedrooms: doc.propertyDetails.bedrooms,
          bathrooms: doc.propertyDetails.bathrooms,
          carpetArea: doc.propertyDetails.carpetArea,
          furnishing: doc.propertyDetails.furnishing,
        }
      : undefined,
    moderation: {
      reviewedAt: doc.moderation?.reviewedAt ? new Date(doc.moderation.reviewedAt).toISOString() : null,
      rejectionReason: doc.moderation?.rejectionReason || null,
    },
    metrics: doc.metrics || { views: 0, contactReveals: 0, savesCount: 0 },
    createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date(0).toISOString(),
  }));

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <nav className="flex items-center gap-1.5 text-xs text-muted-text">
        <Link href="/" className="hover:text-forest-green flex items-center gap-1">
          <Home className="w-3.5 h-3.5" /> Home
        </Link>
        <ChevronRight className="w-3 h-3" />
        <Link href="/dashboard" className="hover:text-forest-green">
          Dashboard
        </Link>
        <ChevronRight className="w-3 h-3" />
        <span className="font-semibold text-dark-text">My Properties</span>
      </nav>

      {/* Header Banner */}
      <div className="rounded-2xl border border-border-subtle bg-white p-6 sm:p-7 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-forest-green">Real Estate Inventory</span>
            <span className="text-xs text-muted-text font-normal">• {properties.length} Total</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-dark-text tracking-tight">
            My Property Listings
          </h1>
          <p className="text-xs text-muted-text mt-1 max-w-xl">
            Create, edit, pause, and submit residential and commercial properties. All new listings undergo pre-publication verification.
          </p>
        </div>

        <Link href="/dashboard/properties/new">
          <Button variant="primary" size="md" leftIcon={<PlusCircle className="w-4 h-4" />}>
            Post a Property
          </Button>
        </Link>
      </div>

      {/* Interactive Owner Property List */}
      <OwnerPropertyList initialProperties={properties} />
    </div>
  );
}
