import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import mongoose from "mongoose";
import { requirePageAuth } from "@/lib/auth-guards";
import { connectToDatabase } from "@/lib/db";
import { Listing } from "@/models/Listing";
import { Booking } from "@/models/Booking";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/lib/utils";
import {
  Building2,
  Wrench,
  CalendarCheck,
  Inbox,
  PlusCircle,
  User as UserIcon,
  ArrowRight,
  ShieldAlert,
  Clock,
  ExternalLink,
  ChevronRight,
  Settings,
  Sparkles,
  Search,
} from "lucide-react";

export const metadata: Metadata = {
  title: "User Dashboard & Marketplace Hub — Marketplace",
  description: "Unified activity overview, listing management, and booking tracking.",
};

export default async function DashboardPage() {
  await connection();
  const session = await requirePageAuth("/dashboard");
  const { user } = session;

  await connectToDatabase();
  const userId = new mongoose.Types.ObjectId(user.id);

  // Parallel database queries with ownership boundaries
  const [
    propertyStats,
    serviceStats,
    customerBookingStats,
    providerBookingStats,
    recentListingsDocs,
    recentCustomerBookingsDocs,
    recentProviderBookingsDocs,
  ] = await Promise.all([
    // Property status counts
    Listing.aggregate([
      {
        $match: {
          ownerId: userId,
          type: "PROPERTY",
          status: { $ne: "ARCHIVED" },
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]),

    // Service status counts
    Listing.aggregate([
      {
        $match: {
          ownerId: userId,
          type: "SERVICE",
          status: { $ne: "ARCHIVED" },
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]),

    // Customer bookings status counts (user is customer)
    Booking.aggregate([
      {
        $match: {
          customerId: userId,
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]),

    // Provider bookings status counts (user is provider)
    Booking.aggregate([
      {
        $match: {
          providerId: userId,
        },
      },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]),

    // Recent listings (up to 4 items)
    Listing.find({
      ownerId: userId,
      status: { $ne: "ARCHIVED" },
    })
      .sort({ updatedAt: -1 })
      .limit(4)
      .select("title type status slug photos propertyDetails serviceDetails moderation createdAt updatedAt")
      .lean(),

    // Recent customer bookings (up to 3 items)
    Booking.find({ customerId: userId })
      .sort({ createdAt: -1 })
      .limit(3)
      .populate("providerId", "name email image phone")
      .populate("listingId", "title slug serviceDetails photos location")
      .lean(),

    // Recent provider bookings (up to 3 items)
    Booking.find({ providerId: userId })
      .sort({ createdAt: -1 })
      .limit(3)
      .populate("customerId", "name email image phone")
      .populate("listingId", "title slug serviceDetails photos location")
      .lean(),
  ]);

  // Count helper
  const getCount = (
    arr: Array<{ _id: string; count: number }>,
    status: string
  ): number => {
    const match = arr.find((item) => item._id === status);
    return match ? match.count : 0;
  };

  // Property counts
  const propertyApproved = getCount(propertyStats, "APPROVED");
  const propertyPending = getCount(propertyStats, "PENDING_REVIEW");
  const propertyRejected = getCount(propertyStats, "REJECTED");
  const propertyPaused = getCount(propertyStats, "PAUSED");
  const propertyTotal = propertyStats.reduce((sum, item) => sum + item.count, 0);

  // Service counts
  const serviceApproved = getCount(serviceStats, "APPROVED");
  const servicePending = getCount(serviceStats, "PENDING_REVIEW");
  const serviceRejected = getCount(serviceStats, "REJECTED");
  const servicePaused = getCount(serviceStats, "PAUSED");
  const serviceTotal = serviceStats.reduce((sum, item) => sum + item.count, 0);

  // Aggregated listing stats
  const totalListings = propertyTotal + serviceTotal;
  const listingsPendingApproval = propertyPending + servicePending;
  const listingsApproved = propertyApproved + serviceApproved;
  const listingsRejected = propertyRejected + serviceRejected;

  // Customer bookings
  const customerPending = getCount(customerBookingStats, "PENDING");
  const customerAccepted = getCount(customerBookingStats, "ACCEPTED");
  const customerAlternative = getCount(customerBookingStats, "ALTERNATIVE_PROPOSED");
  const customerTotal = customerBookingStats.reduce((sum, item) => sum + item.count, 0);

  // Provider bookings (incoming)
  const providerPending = getCount(providerBookingStats, "PENDING");
  const providerAccepted = getCount(providerBookingStats, "ACCEPTED");
  const providerAlternative = getCount(providerBookingStats, "ALTERNATIVE_PROPOSED");
  const providerTotal = providerBookingStats.reduce((sum, item) => sum + item.count, 0);

  const hasActivity = totalListings > 0 || customerTotal > 0 || providerTotal > 0;

  return (
    <div className="space-y-6">
      {/* 1. Welcome & Hub Header Banner */}
      <div className="rounded-2xl border border-border-subtle bg-white p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-semibold text-forest-green uppercase tracking-wider">
                User Activity Hub
              </span>
              <Badge variant={user.role === "ADMIN" ? "primary" : "neutral"} size="sm">
                {user.role}
              </Badge>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold text-dark-text tracking-tight">
              Welcome back, {user.name}
            </h1>
            <p className="text-xs text-muted-text mt-1">
              Signed in as {user.email}. Monitor your listings, track booking requests, and manage account preferences.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
            <Link href="/dashboard/properties/new">
              <Button variant="outline" size="sm" leftIcon={<Building2 className="w-4 h-4 text-forest-green" />}>
                Post Property
              </Button>
            </Link>
            <Link href="/dashboard/services/new">
              <Button variant="primary" size="sm" leftIcon={<PlusCircle className="w-4 h-4" />}>
                Post Service
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

      {/* 2. Actionable Alerts / Moderation Feedback Banners */}
      {listingsRejected > 0 && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50/80 p-5 shadow-xs flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <ShieldAlert className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold text-rose-950 uppercase tracking-wider">
                Action Required: {listingsRejected} {listingsRejected === 1 ? "Listing" : "Listings"} Rejected
              </h3>
              <p className="text-xs text-rose-800 mt-0.5 leading-relaxed">
                One or more of your listings were reviewed by moderation and require adjustments. Review moderator feedback and resubmit for publishing.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {propertyRejected > 0 && (
              <Link href="/dashboard/properties">
                <Button variant="outline" size="sm" className="border-rose-300 text-rose-900 hover:bg-rose-100 text-xs">
                  Review Properties
                </Button>
              </Link>
            )}
            {serviceRejected > 0 && (
              <Link href="/dashboard/services">
                <Button variant="outline" size="sm" className="border-rose-300 text-rose-900 hover:bg-rose-100 text-xs">
                  Review Services
                </Button>
              </Link>
            )}
          </div>
        </div>
      )}

      {listingsPendingApproval > 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5 shadow-xs flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <Clock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                {listingsPendingApproval} {listingsPendingApproval === 1 ? "Listing" : "Listings"} Pending Review
              </h3>
              <p className="text-xs text-amber-900 mt-0.5 leading-relaxed">
                Newly created or updated listings undergo review before indexing in public search to maintain community safety.
              </p>
            </div>
          </div>
          <Link href={propertyPending > 0 ? "/dashboard/properties" : "/dashboard/services"}>
            <span className="text-xs font-semibold text-amber-900 hover:underline flex items-center gap-1 shrink-0 pt-0.5">
              View Status <ChevronRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        </div>
      )}

      {providerPending > 0 && (
        <div className="rounded-2xl border border-purple-200 bg-purple-50/70 p-5 shadow-xs flex items-start justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <Inbox className="w-5 h-5 text-purple-700 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-xs font-bold text-purple-950 uppercase tracking-wider">
                {providerPending} New Incoming Appointment {providerPending === 1 ? "Request" : "Requests"}
              </h3>
              <p className="text-xs text-purple-900 mt-0.5 leading-relaxed">
                Clients are waiting for your confirmation or proposed alternative schedule.
              </p>
            </div>
          </div>
          <Link href="/dashboard/bookings">
            <Button variant="primary" size="sm" className="bg-purple-900 hover:bg-purple-950 text-white shrink-0">
              Manage Queue
            </Button>
          </Link>
        </div>
      )}

      {/* 3. Comprehensive Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {/* Card 1: My Properties */}
        <Link
          href="/dashboard/properties"
          className="rounded-2xl border border-border-subtle bg-white p-5 shadow-xs hover:border-forest-green hover:shadow-sm transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="p-3 rounded-xl bg-light-green text-forest-green group-hover:scale-105 transition-transform">
              <Building2 className="w-6 h-6" />
            </div>
            <ArrowRight className="w-4 h-4 text-muted-text group-hover:text-forest-green group-hover:translate-x-0.5 transition-all" />
          </div>
          <div className="mt-4">
            <span className="text-xs text-muted-text font-medium block">My Properties</span>
            <div className="text-2xl font-bold text-dark-text mt-0.5">
              {propertyTotal}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2.5 border-t border-border-subtle/70 text-[11px]">
              <span className="text-emerald-700 font-medium">{propertyApproved} Live</span>
              <span className="text-muted-text">•</span>
              <span className="text-amber-700 font-medium">{propertyPending} Review</span>
              {propertyPaused > 0 && (
                <>
                  <span className="text-muted-text">•</span>
                  <span className="text-gray-600 font-medium">{propertyPaused} Paused</span>
                </>
              )}
              {propertyRejected > 0 && (
                <>
                  <span className="text-muted-text">•</span>
                  <span className="text-rose-700 font-medium">{propertyRejected} Rejected</span>
                </>
              )}
            </div>
          </div>
        </Link>

        {/* Card 2: My Services */}
        <Link
          href="/dashboard/services"
          className="rounded-2xl border border-border-subtle bg-white p-5 shadow-xs hover:border-purple-600 hover:shadow-sm transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="p-3 rounded-xl bg-light-purple text-purple-900 group-hover:scale-105 transition-transform">
              <Wrench className="w-6 h-6" />
            </div>
            <ArrowRight className="w-4 h-4 text-muted-text group-hover:text-purple-700 group-hover:translate-x-0.5 transition-all" />
          </div>
          <div className="mt-4">
            <span className="text-xs text-muted-text font-medium block">My Services</span>
            <div className="text-2xl font-bold text-dark-text mt-0.5">
              {serviceTotal}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2.5 border-t border-border-subtle/70 text-[11px]">
              <span className="text-emerald-700 font-medium">{serviceApproved} Live</span>
              <span className="text-muted-text">•</span>
              <span className="text-amber-700 font-medium">{servicePending} Review</span>
              {servicePaused > 0 && (
                <>
                  <span className="text-muted-text">•</span>
                  <span className="text-gray-600 font-medium">{servicePaused} Paused</span>
                </>
              )}
              {serviceRejected > 0 && (
                <>
                  <span className="text-muted-text">•</span>
                  <span className="text-rose-700 font-medium">{serviceRejected} Rejected</span>
                </>
              )}
            </div>
          </div>
        </Link>

        {/* Card 3: Incoming Service Requests (Provider Queue) */}
        <Link
          href="/dashboard/bookings"
          className="rounded-2xl border border-border-subtle bg-white p-5 shadow-xs hover:border-forest-green hover:shadow-sm transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="p-3 rounded-xl bg-light-green text-forest-green group-hover:scale-105 transition-transform">
              <Inbox className="w-6 h-6" />
            </div>
            <ArrowRight className="w-4 h-4 text-muted-text group-hover:text-forest-green group-hover:translate-x-0.5 transition-all" />
          </div>
          <div className="mt-4">
            <span className="text-xs text-muted-text font-medium block">Incoming Bookings (Provider)</span>
            <div className="text-2xl font-bold text-dark-text mt-0.5">
              {providerTotal}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2.5 border-t border-border-subtle/70 text-[11px]">
              <span className="text-amber-800 font-medium">{providerPending} Pending</span>
              <span className="text-muted-text">•</span>
              <span className="text-emerald-800 font-medium">{providerAccepted} Accepted</span>
              {providerAlternative > 0 && (
                <>
                  <span className="text-muted-text">•</span>
                  <span className="text-purple-800 font-medium">{providerAlternative} Rescheduled</span>
                </>
              )}
            </div>
          </div>
        </Link>

        {/* Card 4: My Booking Requests (Customer) */}
        <Link
          href="/dashboard/my-bookings"
          className="rounded-2xl border border-border-subtle bg-white p-5 shadow-xs hover:border-purple-600 hover:shadow-sm transition-all group flex flex-col justify-between"
        >
          <div className="flex items-center justify-between">
            <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 group-hover:scale-105 transition-transform">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <ArrowRight className="w-4 h-4 text-muted-text group-hover:text-purple-700 group-hover:translate-x-0.5 transition-all" />
          </div>
          <div className="mt-4">
            <span className="text-xs text-muted-text font-medium block">My Bookings (Customer)</span>
            <div className="text-2xl font-bold text-dark-text mt-0.5">
              {customerTotal}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2.5 border-t border-border-subtle/70 text-[11px]">
              <span className="text-amber-800 font-medium">{customerPending} Pending</span>
              <span className="text-muted-text">•</span>
              <span className="text-emerald-800 font-medium">{customerAccepted} Confirmed</span>
              {customerAlternative > 0 && (
                <>
                  <span className="text-muted-text">•</span>
                  <span className="text-purple-800 font-medium">{customerAlternative} Reschedule</span>
                </>
              )}
            </div>
          </div>
        </Link>
      </div>

      {/* 4. Quick Actions Hub */}
      <div className="rounded-2xl border border-border-subtle bg-white p-6 shadow-xs">
        <h2 className="text-sm font-bold text-dark-text uppercase tracking-wider mb-4">
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          <Link
            href="/dashboard/properties/new"
            className="p-3.5 rounded-xl border border-border-subtle bg-off-white/40 hover:bg-light-green/30 hover:border-forest-green/30 transition-all flex items-center gap-2.5 group"
          >
            <div className="p-2 rounded-lg bg-light-green text-forest-green group-hover:scale-105 transition-transform">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="text-left min-w-0">
              <span className="text-xs font-bold text-dark-text block truncate">Post Property</span>
              <span className="text-[10px] text-muted-text block truncate">Rent, Sale, PG</span>
            </div>
          </Link>

          <Link
            href="/dashboard/services/new"
            className="p-3.5 rounded-xl border border-border-subtle bg-off-white/40 hover:bg-light-purple/30 hover:border-purple-300 transition-all flex items-center gap-2.5 group"
          >
            <div className="p-2 rounded-lg bg-light-purple text-purple-900 group-hover:scale-105 transition-transform">
              <PlusCircle className="w-4 h-4" />
            </div>
            <div className="text-left min-w-0">
              <span className="text-xs font-bold text-dark-text block truncate">Post Service</span>
              <span className="text-[10px] text-muted-text block truncate">Trades & crafts</span>
            </div>
          </Link>

          <Link
            href="/dashboard/properties"
            className="p-3.5 rounded-xl border border-border-subtle bg-off-white/40 hover:bg-light-green/30 hover:border-forest-green/30 transition-all flex items-center gap-2.5 group"
          >
            <div className="p-2 rounded-lg bg-light-green text-forest-green group-hover:scale-105 transition-transform">
              <Building2 className="w-4 h-4" />
            </div>
            <div className="text-left min-w-0">
              <span className="text-xs font-bold text-dark-text block truncate">My Properties</span>
              <span className="text-[10px] text-muted-text block truncate">{propertyTotal} items</span>
            </div>
          </Link>

          <Link
            href="/dashboard/services"
            className="p-3.5 rounded-xl border border-border-subtle bg-off-white/40 hover:bg-light-purple/30 hover:border-purple-300 transition-all flex items-center gap-2.5 group"
          >
            <div className="p-2 rounded-lg bg-light-purple text-purple-900 group-hover:scale-105 transition-transform">
              <Wrench className="w-4 h-4" />
            </div>
            <div className="text-left min-w-0">
              <span className="text-xs font-bold text-dark-text block truncate">My Services</span>
              <span className="text-[10px] text-muted-text block truncate">{serviceTotal} offerings</span>
            </div>
          </Link>

          <Link
            href="/dashboard/my-bookings"
            className="p-3.5 rounded-xl border border-border-subtle bg-off-white/40 hover:bg-emerald-50 hover:border-emerald-300 transition-all flex items-center gap-2.5 group"
          >
            <div className="p-2 rounded-lg bg-emerald-50 text-emerald-800 group-hover:scale-105 transition-transform">
              <CalendarCheck className="w-4 h-4" />
            </div>
            <div className="text-left min-w-0">
              <span className="text-xs font-bold text-dark-text block truncate">My Bookings</span>
              <span className="text-[10px] text-muted-text block truncate">As customer</span>
            </div>
          </Link>

          <Link
            href="/dashboard/bookings"
            className="p-3.5 rounded-xl border border-border-subtle bg-off-white/40 hover:bg-light-green/30 hover:border-forest-green/30 transition-all flex items-center gap-2.5 group"
          >
            <div className="p-2 rounded-lg bg-light-green text-forest-green group-hover:scale-105 transition-transform">
              <Inbox className="w-4 h-4" />
            </div>
            <div className="text-left min-w-0">
              <span className="text-xs font-bold text-dark-text block truncate">Incoming Bookings</span>
              <span className="text-[10px] text-muted-text block truncate">Provider queue</span>
            </div>
          </Link>

          <Link
            href="/account/profile"
            className="p-3.5 rounded-xl border border-border-subtle bg-off-white/40 hover:bg-off-white hover:border-border-subtle transition-all flex items-center gap-2.5 group"
          >
            <div className="p-2 rounded-lg bg-off-white text-dark-text group-hover:scale-105 transition-transform">
              <UserIcon className="w-4 h-4" />
            </div>
            <div className="text-left min-w-0">
              <span className="text-xs font-bold text-dark-text block truncate">Edit Profile</span>
              <span className="text-[10px] text-muted-text block truncate">Contact numbers</span>
            </div>
          </Link>

          <Link
            href="/account/settings"
            className="p-3.5 rounded-xl border border-border-subtle bg-off-white/40 hover:bg-off-white hover:border-border-subtle transition-all flex items-center gap-2.5 group"
          >
            <div className="p-2 rounded-lg bg-off-white text-dark-text group-hover:scale-105 transition-transform">
              <Settings className="w-4 h-4" />
            </div>
            <div className="text-left min-w-0">
              <span className="text-xs font-bold text-dark-text block truncate">Account Settings</span>
              <span className="text-[10px] text-muted-text block truncate">Security & policies</span>
            </div>
          </Link>
        </div>
      </div>

      {/* 5. Recent Activity Feed / Adaptive Overview */}
      {hasActivity ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Listings */}
          <div className="rounded-2xl border border-border-subtle bg-white p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-border-subtle">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-dark-text">Recent Listings</span>
                  <Badge variant="neutral" size="sm">
                    {recentListingsDocs.length}
                  </Badge>
                </div>
                <Link
                  href="/dashboard/properties"
                  className="text-xs font-semibold text-forest-green hover:underline flex items-center gap-1"
                >
                  Manage All <ChevronRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              {recentListingsDocs.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-xs text-muted-text">No active listings created yet.</p>
                  <div className="flex items-center justify-center gap-2 mt-3">
                    <Link href="/dashboard/properties/new">
                      <Button variant="outline" size="sm">
                        Post Property
                      </Button>
                    </Link>
                    <Link href="/dashboard/services/new">
                      <Button variant="primary" size="sm">
                        Post Service
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {recentListingsDocs.map((doc) => {
                    const id = doc._id.toString();
                    const isProperty = doc.type === "PROPERTY";
                    const editHref = isProperty
                      ? `/dashboard/properties/${id}/edit`
                      : `/dashboard/services/${id}/edit`;
                    const publicHref = isProperty
                      ? `/properties/${id}`
                      : `/services/${id}`;
                    const status = doc.status;

                    return (
                      <div
                        key={id}
                        className="p-3 rounded-xl border border-border-subtle bg-off-white/40 flex items-center justify-between gap-3 hover:bg-off-white transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {doc.photos?.[0]?.url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={doc.photos[0].url}
                              alt={doc.title}
                              className="w-12 h-12 rounded-lg object-cover border border-border-subtle shrink-0"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-light-green/60 text-forest-green flex items-center justify-center shrink-0">
                              {isProperty ? <Building2 className="w-5 h-5" /> : <Wrench className="w-5 h-5" />}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 mb-0.5">
                              <Badge
                                variant={isProperty ? "property" : "service"}
                                size="sm"
                                className="text-[9px] uppercase px-1.5 py-0"
                              >
                                {isProperty ? "Property" : "Service"}
                              </Badge>
                              <Badge
                                variant={
                                  status === "APPROVED"
                                    ? "success"
                                    : status === "PENDING_REVIEW"
                                    ? "warning"
                                    : status === "REJECTED"
                                    ? "danger"
                                    : "neutral"
                                }
                                size="sm"
                                className="text-[9px] uppercase px-1.5 py-0"
                              >
                                {status.replace("_", " ")}
                              </Badge>
                            </div>
                            <span className="text-xs font-bold text-dark-text truncate block">
                              {doc.title}
                            </span>
                            <span className="text-[11px] text-muted-text block">
                              {isProperty && doc.propertyDetails
                                ? `${formatCurrency(doc.propertyDetails.price)} • ${doc.propertyDetails.propertyType}`
                                : doc.serviceDetails
                                ? `${doc.serviceDetails.category} • ${doc.serviceDetails.pricingModel}`
                                : "Active Listing"}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {status === "APPROVED" && (
                            <Link href={publicHref} target="_blank">
                              <Button variant="ghost" size="sm" className="p-1.5 h-8 w-8" title="View Public Listing">
                                <ExternalLink className="w-3.5 h-3.5 text-muted-text" />
                              </Button>
                            </Link>
                          )}
                          <Link href={editHref}>
                            <Button variant="outline" size="sm" className="text-xs h-8 px-2.5">
                              Edit
                            </Button>
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-border-subtle flex items-center justify-between text-xs text-muted-text">
              <span>{listingsApproved} approved of {totalListings} total</span>
              <div className="flex gap-2">
                <Link href="/dashboard/properties" className="text-forest-green hover:underline">
                  Properties
                </Link>
                <span>•</span>
                <Link href="/dashboard/services" className="text-forest-green hover:underline">
                  Services
                </Link>
              </div>
            </div>
          </div>

          {/* Recent Booking Requests */}
          <div className="rounded-2xl border border-border-subtle bg-white p-6 shadow-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-4 mb-4 border-b border-border-subtle">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-dark-text">Recent Bookings</span>
                  <Badge variant="neutral" size="sm">
                    {recentCustomerBookingsDocs.length + recentProviderBookingsDocs.length}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Link href="/dashboard/my-bookings" className="text-forest-green hover:underline">
                    My Requests
                  </Link>
                  <span className="text-muted-text">•</span>
                  <Link href="/dashboard/bookings" className="text-forest-green hover:underline">
                    Provider Queue
                  </Link>
                </div>
              </div>

              {recentCustomerBookingsDocs.length === 0 && recentProviderBookingsDocs.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-xs text-muted-text">No service appointments or booking requests yet.</p>
                  <div className="mt-3">
                    <Link href="/services">
                      <Button variant="outline" size="sm" leftIcon={<Search className="w-3.5 h-3.5" />}>
                        Explore Available Services
                      </Button>
                    </Link>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {/* Provider Bookings First (Actionable) */}
                  {recentProviderBookingsDocs.map((doc) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const customer = doc.customerId as any;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const listing = doc.listingId as any;
                    const dateStr = doc.requestedDate
                      ? new Date(doc.requestedDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      : "Date TBD";

                    return (
                      <div
                        key={doc._id.toString()}
                        className="p-3 rounded-xl border border-border-subtle bg-purple-50/30 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <Badge variant="service" size="sm" className="text-[9px] uppercase px-1.5 py-0">
                              Incoming Request
                            </Badge>
                            <Badge
                              variant={
                                doc.status === "ACCEPTED"
                                  ? "success"
                                  : doc.status === "PENDING"
                                  ? "warning"
                                  : doc.status === "REJECTED"
                                  ? "danger"
                                  : "neutral"
                              }
                              size="sm"
                              className="text-[9px] uppercase px-1.5 py-0"
                            >
                              {doc.status}
                            </Badge>
                          </div>
                          <span className="text-xs font-bold text-dark-text truncate block">
                            {listing?.title || "Service Appointment"}
                          </span>
                          <span className="text-[11px] text-muted-text block">
                            Client: {customer?.name || "Customer"} • {dateStr} ({doc.timeSlot})
                          </span>
                        </div>

                        <Link href="/dashboard/bookings">
                          <Button variant="outline" size="sm" className="text-xs h-8 px-2.5">
                            Manage
                          </Button>
                        </Link>
                      </div>
                    );
                  })}

                  {/* Customer Bookings */}
                  {recentCustomerBookingsDocs.map((doc) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const provider = doc.providerId as any;
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const listing = doc.listingId as any;
                    const dateStr = doc.requestedDate
                      ? new Date(doc.requestedDate).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })
                      : "Date TBD";

                    return (
                      <div
                        key={doc._id.toString()}
                        className="p-3 rounded-xl border border-border-subtle bg-off-white/40 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <Badge variant="neutral" size="sm" className="text-[9px] uppercase px-1.5 py-0">
                              My Appointment
                            </Badge>
                            <Badge
                              variant={
                                doc.status === "ACCEPTED"
                                  ? "success"
                                  : doc.status === "PENDING"
                                  ? "warning"
                                  : doc.status === "REJECTED"
                                  ? "danger"
                                  : "neutral"
                              }
                              size="sm"
                              className="text-[9px] uppercase px-1.5 py-0"
                            >
                              {doc.status}
                            </Badge>
                          </div>
                          <span className="text-xs font-bold text-dark-text truncate block">
                            {listing?.title || "Service Appointment"}
                          </span>
                          <span className="text-[11px] text-muted-text block">
                            Provider: {provider?.name || "Professional"} • {dateStr} ({doc.timeSlot})
                          </span>
                        </div>

                        <Link href="/dashboard/my-bookings">
                          <Button variant="outline" size="sm" className="text-xs h-8 px-2.5">
                            Details
                          </Button>
                        </Link>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-border-subtle flex items-center justify-between text-xs text-muted-text">
              <span>{customerTotal} requested • {providerTotal} incoming</span>
              <Link href="/dashboard/my-bookings" className="text-forest-green hover:underline">
                View All Bookings
              </Link>
            </div>
          </div>
        </div>
      ) : (
        /* Empty State Onboarding: User has no listings or bookings yet */
        <div className="rounded-2xl border border-border-subtle bg-white p-8 sm:p-10 shadow-xs text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-light-green text-forest-green flex items-center justify-center mx-auto">
            <Sparkles className="w-7 h-7" />
          </div>
          <div className="max-w-lg mx-auto space-y-2">
            <h2 className="text-xl font-bold text-dark-text">Get Started on the Marketplace</h2>
            <p className="text-xs text-muted-text leading-relaxed">
              You haven&apos;t listed any properties, registered any professional services, or submitted appointment requests yet. Choose an option below to get started in minutes.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-3xl mx-auto pt-2 text-left">
            <div className="p-5 rounded-2xl border border-border-subtle bg-off-white/50 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-light-green text-forest-green flex items-center justify-center mb-3">
                  <Building2 className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-dark-text">List a Property</h3>
                <p className="text-xs text-muted-text mt-1 leading-relaxed">
                  Rent or sell apartments, villas, PG accommodations, or commercial offices.
                </p>
              </div>
              <div className="pt-4 mt-3">
                <Link href="/dashboard/properties/new" className="block">
                  <Button variant="primary" size="sm" className="w-full justify-center">
                    Post Property
                  </Button>
                </Link>
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-border-subtle bg-off-white/50 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-light-purple text-purple-900 flex items-center justify-center mb-3">
                  <Wrench className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-dark-text">Offer Your Services</h3>
                <p className="text-xs text-muted-text mt-1 leading-relaxed">
                  Connect with homeowners and tenants seeking plumbing, electrical, carpentry, or cleaning.
                </p>
              </div>
              <div className="pt-4 mt-3">
                <Link href="/dashboard/services/new" className="block">
                  <Button variant="primary" size="sm" className="w-full justify-center">
                    Register Service
                  </Button>
                </Link>
              </div>
            </div>

            <div className="p-5 rounded-2xl border border-border-subtle bg-off-white/50 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-800 flex items-center justify-center mb-3">
                  <Search className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-bold text-dark-text">Browse Directory</h3>
                <p className="text-xs text-muted-text mt-1 leading-relaxed">
                  Explore available properties or discover top-rated skilled professionals in your locality.
                </p>
              </div>
              <div className="pt-4 mt-3">
                <Link href="/properties" className="block">
                  <Button variant="outline" size="sm" className="w-full justify-center">
                    Explore Marketplace
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
