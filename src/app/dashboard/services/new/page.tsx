import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { requirePageAuth } from "@/lib/auth-guards";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { ServiceForm } from "@/components/services/ServiceForm";
import { ArrowLeft, Wrench } from "lucide-react";

export const metadata: Metadata = {
  title: "List a Service — Provider Dashboard",
  description: "Offer your skilled professional services on the marketplace. Submit for admin quality review.",
};

export default async function NewServicePage() {
  await connection();
  const session = await requirePageAuth("/dashboard/services/new");

  await connectToDatabase();
  const dbUser = await User.findById(session.user.id)
    .select("name phone whatsapp contactPreferences")
    .lean();

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
            Service Provider Submission
          </span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-dark-text tracking-tight">
          Create a Service Listing
        </h1>
        <p className="text-xs text-muted-text mt-1 max-w-xl">
          List your trade or specialized services to connect with local property owners and tenants. Listings undergo a quality review before going live.
        </p>
      </div>

      <ServiceForm
        userProfile={{
          name: dbUser?.name || session.user.name,
          phone: dbUser?.phone,
          whatsapp: dbUser?.whatsapp,
        }}
      />
    </div>
  );
}
