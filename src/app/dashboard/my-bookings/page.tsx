import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import mongoose from "mongoose";
import { requirePageAuth } from "@/lib/auth-guards";
import { connectToDatabase } from "@/lib/db";
import { Booking } from "@/models/Booking";
import { CustomerBookingList, BookingItem } from "@/components/bookings/CustomerBookingList";
import { Button } from "@/components/ui/Button";
import { CalendarCheck, Wrench, Search } from "lucide-react";

export const metadata: Metadata = {
  title: "My Service Bookings | Marketplace",
  description: "Track appointment requests, provider confirmations, and schedule updates.",
};

export default async function MyBookingsPage() {
  await connection();
  const session = await requirePageAuth("/dashboard/my-bookings");
  const { user } = session;

  await connectToDatabase();

  const rawDocs = await Booking.find({
    customerId: new mongoose.Types.ObjectId(user.id),
  })
    .sort({ createdAt: -1 })
    .populate("providerId", "name email image phone")
    .populate("listingId", "title slug serviceDetails photos location")
    .lean();

  const bookings: BookingItem[] = rawDocs.map((doc) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const provider = doc.providerId as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const listing = doc.listingId as any;

    return {
      id: doc._id.toString(),
      status: doc.status,
      requestedDate: doc.requestedDate.toISOString(),
      timeSlot: doc.timeSlot,
      serviceAddress: {
        line1: doc.serviceAddress.line1,
        locality: doc.serviceAddress.locality,
        city: doc.serviceAddress.city || undefined,
      },
      customerPhone: doc.customerPhone,
      customerNotes: doc.customerNotes || null,
      providerNotes: doc.providerNotes || null,
      alternativeDetails: doc.alternativeDetails
        ? {
            proposedDate: doc.alternativeDetails.proposedDate.toISOString(),
            proposedSlot: doc.alternativeDetails.proposedSlot,
            note: doc.alternativeDetails.note || null,
            proposedAt: doc.alternativeDetails.proposedAt?.toISOString() || new Date().toISOString(),
          }
        : null,
      createdAt: doc.createdAt.toISOString(),
      updatedAt: doc.updatedAt.toISOString(),
      provider: provider
        ? {
            id: provider._id?.toString(),
            name: provider.name || "Provider",
            email: provider.email,
            phone: provider.phone || null,
            image: provider.image || null,
          }
        : null,
      listing: listing
        ? {
            id: listing._id?.toString(),
            title: listing.title,
            slug: listing.slug,
            category: listing.serviceDetails?.category,
            pricingModel: listing.serviceDetails?.pricingModel,
            startingPrice: listing.serviceDetails?.startingPrice,
            locality: listing.location?.locality,
            city: listing.location?.city,
            photo: listing.photos?.[0]?.url || null,
          }
        : null,
    };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-2xl border border-border-subtle bg-white p-6 sm:p-7 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-purple-900 flex items-center gap-1 uppercase tracking-wider">
              <CalendarCheck className="w-3.5 h-3.5" /> Customer Appointments
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-dark-text tracking-tight">
            My Service Bookings
          </h1>
          <p className="text-xs text-muted-text mt-1">
            Track appointments you requested with local electricians, plumbers, cleaners, and other specialists.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/services">
            <Button variant="outline" size="sm" leftIcon={<Search className="w-3.5 h-3.5" />}>
              Find More Services
            </Button>
          </Link>
          <Link href="/dashboard/bookings">
            <Button variant="ghost" size="sm" leftIcon={<Wrench className="w-3.5 h-3.5" />}>
              Provider Queue
            </Button>
          </Link>
        </div>
      </div>

      {/* Bookings List */}
      <CustomerBookingList initialBookings={bookings} />
    </div>
  );
}
