import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { requirePageAuth } from "@/lib/auth-guards";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { PropertyForm } from "@/components/properties/PropertyForm";
import { ArrowLeft, Building2 } from "lucide-react";

export const metadata: Metadata = {
  title: "List a Property — Dashboard",
  description: "Create and submit a residential or commercial property listing for admin review.",
};

export default async function NewPropertyPage() {
  await connection();
  const session = await requirePageAuth("/dashboard/properties/new");

  await connectToDatabase();
  const dbUser = await User.findById(session.user.id)
    .select("name phone whatsapp contactPreferences")
    .lean();

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
            Property Submission
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-dark-text tracking-tight">
          Create a Property Listing
        </h1>
        <p className="text-xs text-muted-text mt-1 max-w-xl">
          Fill in the details below to list your property. All listings undergo a quick safety and quality moderation review before going live.
        </p>
      </div>

      <PropertyForm
        userProfile={{
          name: dbUser?.name || session.user.name,
          phone: dbUser?.phone,
          whatsapp: dbUser?.whatsapp,
        }}
      />
    </div>
  );
}
