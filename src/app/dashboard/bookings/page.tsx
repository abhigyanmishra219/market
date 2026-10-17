import React from "react";
import { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import mongoose from "mongoose";
import { requirePageAuth } from "@/lib/auth-guards";
import { connectToDatabase } from "@/lib/db";
import { Booking } from "@/models/Booking";
import { ProviderBookingList } from "@/components/bookings/ProviderBookingList";
import { BookingItem } from "@/components/bookings/CustomerBookingList";
import { Button } from "@/components/ui/Button";
import { Inbox, CalendarCheck, PlusCircle } from "lucide-react";

export const metadata: Metadata = {
  title: "Incoming Service Bookings | Provider Dashboard",
  description: "Manage client appointment requests, accept bookings, or propose alternative times.",
};

export default async function ProviderBookingsPage() {
  await connection();
  const session = await requirePageAuth("/dashboard/bookings");
  const { user } = session;

  await connectToDatabase();

  const rawDocs = await Booking.find({
    providerId: new mongoose.Types.ObjectId(user.id),
  })
    .sort({ createdAt: -1 })
    .populate("customerId", "name email image phone")
    .populate("listingId", "title slug serviceDetails photos location")
    .lean();

  const bookings: BookingItem[] = rawDocs.map((doc) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const customer = doc.customerId as any;
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
      customer: customer
        ? {
            id: customer._id?.toString(),
            name: customer.name || "Customer",
            email: customer.email,
            phone: customer.phone || null,
            image: customer.image || null,
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold text-forest-green flex items-center gap-1">
              <Inbox className="w-3.5 h-3.5" /> Provider Appointment Requests
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-dark-text tracking-tight">
            Incoming Service Bookings
          </h1>
          <p className="text-xs text-muted-text mt-1">
            Review appointment requests from local clients, confirm schedules, or propose alternative times.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/dashboard/my-bookings">
            <Button variant="outline" size="sm" leftIcon={<CalendarCheck className="w-3.5 h-3.5" />}>
              My Bookings (As Customer)
            </Button>
          </Link>
          <Link href="/dashboard/services/new">
            <Button variant="primary" size="sm" leftIcon={<PlusCircle className="w-3.5 h-3.5" />}>
              Post New Service
            </Button>
          </Link>
        </div>
      </div>

      {/* Provider Bookings List */}
      <ProviderBookingList initialBookings={bookings} />
    </div>
  );
}
