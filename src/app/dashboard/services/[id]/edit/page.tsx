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
import { ServiceForm } from "@/components/services/ServiceForm";
import { ArrowLeft, Wrench, ShieldAlert } from "lucide-react";

interface EditServicePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Edit Service Listing — Provider Dashboard",
    description: "Update your service scope, hourly rates, or coverage areas.",
  };
}

export default async function EditServicePage({ params }: EditServicePageProps) {
  await connection();
  const { id } = await params;

  if (!mongoose.isValidObjectId(id)) {
    notFound();
  }

  const session = await requirePageAuth(`/dashboard/services/${id}/edit`);

  await connectToDatabase();
  const [listingDoc, dbUser] = await Promise.all([
    Listing.findById(id).lean(),
    User.findById(session.user.id).select("name phone whatsapp contactPreferences").lean(),
  ]);

  if (!listingDoc || listingDoc.status === "ARCHIVED" || listingDoc.type !== "SERVICE") {
    notFound();
  }

  // Authorization: must be listing owner or admin
  const isOwner = listingDoc.ownerId.toString() === session.user.id;
  const isAdmin = session.user.role === "ADMIN";

  if (!isOwner && !isAdmin) {
    redirect("/dashboard/services?error=unauthorized");
  }

  // Plain JSON serialization for client component
  const initialData = JSON.parse(JSON.stringify(listingDoc));

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
      {/* Breadcrumb / Back Link */}
      <div className="mb-6">
        <Link
          href="/dashboard/services"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-text hover:text-forest-green transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to My Services
        </Link>
      </div>

      <div className="mb-8">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="p-1.5 rounded-md bg-light-purple text-purple-900">
            <Wrench className="w-4 h-4" />
          </div>
          <span className="text-xs font-semibold uppercase tracking-wider text-purple-900">
            Editing Service Listing
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-dark-text tracking-tight">
          {listingDoc.title}
        </h1>
        <p className="text-xs text-muted-text mt-1 max-w-xl">
          Update your scope, pricing model, portfolio photos, or operating hours. Note: material changes to an approved service require moderation review before appearing live.
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
                Make the required adjustments and submit for review to publish your service.
              </p>
            </div>
          </div>
        )}
      </div>

      <ServiceForm
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
