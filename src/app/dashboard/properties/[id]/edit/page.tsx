import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { connection } from "next/server";
import mongoose from "mongoose";
import { requirePageAuth } from "@/lib/auth-guards";
import { connectToDatabase } from "@/lib/db";
import { Listing } from "@/models/Listing";
import { User } from "@/models/User";
import { PropertyForm } from "@/components/properties/PropertyForm";
import { ArrowLeft, Building2, ShieldAlert } from "lucide-react";

interface EditPropertyPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: EditPropertyPageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Edit Property Listing — Dashboard`,
    description: "Update your property details, photos, or pricing.",
  };
}

export default async function EditPropertyPage({ params }: EditPropertyPageProps) {
  await connection();
  const { id } = await params;

  if (!mongoose.isValidObjectId(id)) {
    notFound();
  }

  const session = await requirePageAuth(`/dashboard/properties/${id}/edit`);

  await connectToDatabase();
  const [listingDoc, dbUser] = await Promise.all([
    Listing.findById(id).lean(),
    User.findById(session.user.id).select("name phone whatsapp contactPreferences").lean(),
  ]);

  if (!listingDoc || listingDoc.status === "ARCHIVED" || listingDoc.type !== "PROPERTY") {
    notFound();
  }

  // Authorization: must be listing owner or admin
  const isOwner = listingDoc.ownerId.toString() === session.user.id;
  const isAdmin = session.user.role === "ADMIN";

  if (!isOwner && !isAdmin) {
    redirect("/dashboard/properties?error=unauthorized");
  }

  // Serialize Mongoose document to plain JSON-compatible object for client component
  const initialData = JSON.parse(JSON.stringify(listingDoc));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      {/* Breadcrumb / Back Link */}
      <div className="mb-6">
        <Link
          href="/dashboard/properties"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-text hover:text-forest-green transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to My Properties
        </Link>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="p-1.5 rounded-md bg-light-green text-forest-green">
            <Building2 className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-forest-green">
            Editing Property Listing
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-dark-text tracking-tight">
          {listingDoc.title}
        </h1>
        <p className="text-xs text-muted-text mt-1 max-w-xl">
          Update specs, images, or pricing. Note: material edits to an already approved listing will place it into pending review for quick re-verification.
        </p>

        {listingDoc.status === "REJECTED" && listingDoc.moderation?.rejectionReason && (
          <div className="mt-4 p-4 rounded-xl border border-rose-200 bg-rose-50 text-rose-900 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wider text-rose-800">
                Moderation Feedback: Action Required
              </h3>
              <p className="text-xs text-rose-700 mt-1 leading-relaxed">
                {listingDoc.moderation.rejectionReason}
              </p>
              <p className="text-[11px] text-rose-600 mt-2">
                Address the issue noted above and submit for review to publish your listing.
              </p>
            </div>
          </div>
        )}
      </div>

      <PropertyForm
        isEditing
        listingId={id}
        initialData={initialData}
        userProfile={{
          name: dbUser?.name || session.user.name,
          phone: dbUser?.phone,
          whatsapp: dbUser?.whatsapp,
        }}
      />
    </div>
  );
}
