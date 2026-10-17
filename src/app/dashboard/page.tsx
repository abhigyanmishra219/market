import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { requirePageAuth } from "@/lib/auth-guards";
import { connectToDatabase } from "@/lib/db";
import { Listing } from "@/models/Listing";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Building2,
  Wrench,
  Bookmark,
  CalendarCheck,
  PlusCircle,
  User as UserIcon,
  ArrowRight,
} from "lucide-react";

export const metadata: Metadata = {
  title: "Dashboard & Marketplace Activity — Marketplace",
  description: "Monitor your listings, bookings, and saved favorite items.",
};

export default async function DashboardPage() {
  await connection();
  const session = await requirePageAuth("/dashboard");
  const { user } = session;

  await connectToDatabase();
  const propertyCount = await Listing.countDocuments({
    owner: user.id,
    type: "PROPERTY",
    deletedAt: null,
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Welcome Banner */}
      <div className="rounded-2xl border border-border-subtle bg-white p-6 sm:p-8 mb-8 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-forest-green">User Activity Hub</span>
              <Badge variant={user.role === "ADMIN" ? "primary" : "neutral"} size="sm">
                {user.role}
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-dark-text tracking-tight">
              Welcome back, {user.name}
            </h1>
            <p className="text-xs text-muted-text mt-1">
              Signed in as {user.email}. Manage your marketplace listings and incoming booking requests.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link href="/dashboard/properties/new">
              <Button variant="primary" size="sm" leftIcon={<PlusCircle className="w-4 h-4" />}>
                Post a Property
              </Button>
            </Link>
            <Link href="/account/profile">
              <Button variant="outline" size="sm" leftIcon={<UserIcon className="w-4 h-4" />}>
                Profile
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Quick Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <Link
          href="/dashboard/properties"
          className="rounded-xl border border-border-subtle bg-white p-5 shadow-xs flex items-center justify-between hover:border-forest-green hover:shadow-sm transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-light-green text-forest-green group-hover:scale-105 transition-transform">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-muted-text font-medium">My Properties</span>
              <h3 className="text-xl font-bold text-dark-text">
                {propertyCount} {propertyCount === 1 ? "Listing" : "Listings"}
              </h3>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-text group-hover:text-forest-green group-hover:translate-x-0.5 transition-all" />
        </Link>

        <div className="rounded-xl border border-border-subtle bg-white p-5 shadow-xs flex items-center gap-4 opacity-75">
          <div className="p-3 rounded-lg bg-light-purple text-purple-900">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-muted-text font-medium">My Services</span>
            <h3 className="text-xl font-bold text-dark-text">0 Active</h3>
          </div>
        </div>

        <div className="rounded-xl border border-border-subtle bg-white p-5 shadow-xs flex items-center gap-4 opacity-75">
          <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800">
            <CalendarCheck className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-muted-text font-medium">Bookings</span>
            <h3 className="text-xl font-bold text-dark-text">0 Pending</h3>
          </div>
        </div>

        <div className="rounded-xl border border-border-subtle bg-white p-5 shadow-xs flex items-center gap-4 opacity-75">
          <div className="p-3 rounded-lg bg-off-white text-dark-text border border-border-subtle">
            <Bookmark className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xs text-muted-text font-medium">Saved Items</span>
            <h3 className="text-xl font-bold text-dark-text">0 Saved</h3>
          </div>
        </div>
      </div>

      {/* Property Quick Action Card */}
      <div className="rounded-2xl border border-border-subtle bg-white p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
        <div className="max-w-xl">
          <div className="w-10 h-10 rounded-xl bg-light-green text-forest-green flex items-center justify-center mb-3">
            <Building2 className="w-5 h-5" />
          </div>
          <h3 className="text-lg font-bold text-dark-text">Property Listing Management</h3>
          <p className="text-xs text-muted-text mt-1 leading-relaxed">
            Create and manage your property listings for rent, sale, or PG/co-living. Upload high-resolution photos, manage pricing, pause active listings, or resubmit modified drafts for admin moderation.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          <Link href="/dashboard/properties" className="w-full sm:w-auto">
            <Button variant="outline" size="md" className="w-full sm:w-auto">
              View My Properties
            </Button>
          </Link>
          <Link href="/dashboard/properties/new" className="w-full sm:w-auto">
            <Button variant="primary" size="md" leftIcon={<PlusCircle className="w-4 h-4" />} className="w-full sm:w-auto">
              Post New Property
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

