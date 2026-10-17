import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { requirePageAuth } from "@/lib/auth-guards";
import { connectToDatabase } from "@/lib/db";
import mongoose from "mongoose";
import { Listing } from "@/models/Listing";
import { Booking } from "@/models/Booking";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import {
  Building2,
  Wrench,
  CalendarCheck,
  Inbox,
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
  const [propertyCount, serviceCount, customerBookingCount, incomingBookingCount] = await Promise.all([
    Listing.countDocuments({
      ownerId: new mongoose.Types.ObjectId(user.id),
      type: "PROPERTY",
      status: { $ne: "ARCHIVED" },
    }),
    Listing.countDocuments({
      ownerId: new mongoose.Types.ObjectId(user.id),
      type: "SERVICE",
      status: { $ne: "ARCHIVED" },
    }),
    Booking.countDocuments({
      customerId: new mongoose.Types.ObjectId(user.id),
    }),
    Booking.countDocuments({
      providerId: new mongoose.Types.ObjectId(user.id),
      status: { $in: ["PENDING", "ACCEPTED", "ALTERNATIVE_PROPOSED"] },
    }),
  ]);

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

          <div className="flex flex-wrap items-center gap-2.5">
            <Link href="/dashboard/properties/new">
              <Button variant="outline" size="sm" leftIcon={<Building2 className="w-4 h-4" />}>
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

        <Link
          href="/dashboard/services"
          className="rounded-xl border border-border-subtle bg-white p-5 shadow-xs flex items-center justify-between hover:border-purple-600 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-light-purple text-purple-900 group-hover:scale-105 transition-transform">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-muted-text font-medium">My Services</span>
              <h3 className="text-xl font-bold text-dark-text">
                {serviceCount} {serviceCount === 1 ? "Listing" : "Listings"}
              </h3>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-text group-hover:text-purple-700 group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link
          href="/dashboard/my-bookings"
          className="rounded-xl border border-border-subtle bg-white p-5 shadow-xs flex items-center justify-between hover:border-forest-green hover:shadow-sm transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-800 group-hover:scale-105 transition-transform">
              <CalendarCheck className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-muted-text font-medium">My Bookings</span>
              <h3 className="text-xl font-bold text-dark-text">
                {customerBookingCount} {customerBookingCount === 1 ? "Booking" : "Bookings"}
              </h3>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-text group-hover:text-forest-green group-hover:translate-x-0.5 transition-all" />
        </Link>

        <Link
          href="/dashboard/bookings"
          className="rounded-xl border border-border-subtle bg-white p-5 shadow-xs flex items-center justify-between hover:border-purple-600 hover:shadow-sm transition-all group"
        >
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-lg bg-light-green text-forest-green group-hover:scale-105 transition-transform">
              <Inbox className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs text-muted-text font-medium">Incoming Requests</span>
              <h3 className="text-xl font-bold text-dark-text">
                {incomingBookingCount} {incomingBookingCount === 1 ? "Request" : "Requests"}
              </h3>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-muted-text group-hover:text-purple-700 group-hover:translate-x-0.5 transition-all" />
        </Link>
      </div>

      {/* Two-Column Action Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Property Quick Action Card */}
        <div className="rounded-2xl border border-border-subtle bg-white p-6 sm:p-7 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-light-green text-forest-green flex items-center justify-center mb-3">
              <Building2 className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-dark-text">Property Management</h3>
            <p className="text-xs text-muted-text mt-1 leading-relaxed">
              Create and manage listings for rent, sale, or PG/co-living. Upload photos, configure pricing, pause listings, or update terms.
            </p>
          </div>
          <div className="flex items-center gap-3 pt-6 mt-4 border-t border-border-subtle">
            <Link href="/dashboard/properties" className="flex-1">
              <Button variant="outline" size="sm" className="w-full justify-center">
                My Properties
              </Button>
            </Link>
            <Link href="/dashboard/properties/new" className="flex-1">
              <Button variant="primary" size="sm" leftIcon={<PlusCircle className="w-3.5 h-3.5" />} className="w-full justify-center">
                Post Property
              </Button>
            </Link>
          </div>
        </div>

        {/* Service Quick Action Card */}
        <div className="rounded-2xl border border-border-subtle bg-white p-6 sm:p-7 flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 rounded-xl bg-light-purple text-purple-900 flex items-center justify-center mb-3">
              <Wrench className="w-5 h-5" />
            </div>
            <h3 className="text-lg font-bold text-dark-text">Service Provider Management</h3>
            <p className="text-xs text-muted-text mt-1 leading-relaxed">
              Offer your skilled trades — plumbing, electrical, cleaning, carpentry, and appliance repairs. Manage your operating hours, rates, and service areas.
            </p>
          </div>
          <div className="flex items-center gap-3 pt-6 mt-4 border-t border-border-subtle">
            <Link href="/dashboard/services" className="flex-1">
              <Button variant="outline" size="sm" className="w-full justify-center">
                My Services
              </Button>
            </Link>
            <Link href="/dashboard/services/new" className="flex-1">
              <Button variant="primary" size="sm" leftIcon={<PlusCircle className="w-3.5 h-3.5" />} className="w-full justify-center">
                Post Service
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

