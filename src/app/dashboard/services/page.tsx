import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import mongoose from "mongoose";
import { requirePageAuth } from "@/lib/auth-guards";
import { connectToDatabase } from "@/lib/db";
import { Listing } from "@/models/Listing";
import { OwnerServiceList, OwnerServiceItem } from "@/components/services/OwnerServiceList";
import { Button } from "@/components/ui/Button";
import { PlusCircle, ChevronRight, Home, Wrench } from "lucide-react";

export const metadata: Metadata = {
  title: "My Services — Provider Dashboard",
  description: "Manage your professional service listings, operating areas, working hours, and review status.",
};

export default async function OwnerServicesPage() {
  await connection();
  const session = await requirePageAuth("/dashboard/services");

  await connectToDatabase();

  const docs = await Listing.find({
    ownerId: new mongoose.Types.ObjectId(session.user.id),
    type: "SERVICE",
  })
    .sort({ createdAt: -1 })
    .lean();

  // Serialize Mongoose documents into plain JSON for Client Component
  const initialServices: OwnerServiceItem[] = docs.map((doc) => ({
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
    photos: (doc.photos || []).map((p) => ({
      id: p.id,
      url: p.url,
      isPrimary: p.isPrimary,
      caption: p.caption || null,
    })),
    serviceDetails: doc.serviceDetails
      ? {
          category: doc.serviceDetails.category,
          pricingModel: doc.serviceDetails.pricingModel,
          startingPrice: doc.serviceDetails.startingPrice,
          experienceYears: doc.serviceDetails.experienceYears,
          serviceAreas: doc.serviceDetails.serviceAreas || [],
          workingDays: doc.serviceDetails.workingDays || [],
          workingHours: doc.serviceDetails.workingHours,
          guarantees: doc.serviceDetails.guarantees || null,
        }
      : undefined,
    moderation: {
      reviewedAt: doc.moderation?.reviewedAt
        ? new Date(doc.moderation.reviewedAt).toISOString()
        : null,
      rejectionReason: doc.moderation?.rejectionReason || null,
    },
    metrics: doc.metrics || { views: 0, contactReveals: 0, savesCount: 0 },
    createdAt: doc.createdAt
      ? new Date(doc.createdAt).toISOString()
      : new Date(0).toISOString(),
    updatedAt: doc.updatedAt
      ? new Date(doc.updatedAt).toISOString()
      : new Date(0).toISOString(),
  }));

  return (
    <div className="space-y-6">
      {/* Breadcrumb Navigation */}
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-xs text-muted-text">
          <li>
            <Link
              href="/"
              className="hover:text-forest-green flex items-center gap-1 transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
              <span>Home</span>
            </Link>
          </li>
          <li>
            <ChevronRight className="w-3 h-3 text-muted-text/60" />
          </li>
          <li>
            <Link href="/dashboard" className="hover:text-forest-green transition-colors">
              Dashboard
            </Link>
          </li>
          <li>
            <ChevronRight className="w-3 h-3 text-muted-text/60" />
          </li>
          <li className="font-semibold text-dark-text" aria-current="page">
            My Services
          </li>
        </ol>
      </nav>

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border-subtle bg-white p-6 sm:p-7 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-1.5 rounded-md bg-light-purple text-purple-900">
              <Wrench className="w-4 h-4" />
            </div>
            <span className="text-xs font-semibold uppercase tracking-wider text-purple-900">
              Provider Hub
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-dark-text tracking-tight">
            My Service Listings
          </h1>
          <p className="text-xs text-muted-text mt-1 max-w-xl">
            Manage your professional services, update coverage areas and hourly rates, pause active offerings, and monitor review progress.
          </p>
        </div>

        <Link href="/dashboard/services/new" className="shrink-0">
          <Button variant="primary" size="md" leftIcon={<PlusCircle className="w-4 h-4" />}>
            Post New Service
          </Button>
        </Link>
      </div>

      {/* Interactive Owner Service Management List */}
      <OwnerServiceList initialServices={initialServices} />
    </div>
  );
}
