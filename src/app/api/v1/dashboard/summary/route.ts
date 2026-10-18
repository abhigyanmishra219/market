import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guards";
import { apiSuccess, handleRouteError } from "@/lib/api-response";
import { Listing } from "@/models/Listing";
import { Booking } from "@/models/Booking";

export async function GET() {
  try {
    const session = await requireAuth();
    await connectToDatabase();

    const userId = new mongoose.Types.ObjectId(session.user.id);

    // Run parallel aggregation and count queries bounded to the authenticated user
    const [
      propertyStats,
      serviceStats,
      customerBookingStats,
      providerBookingStats,
      recentListingsDocs,
      recentCustomerBookingsDocs,
      recentProviderBookingsDocs,
    ] = await Promise.all([
      // Property status breakdown for this owner
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

      // Service status breakdown for this owner
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

      // Customer booking status breakdown (user as client)
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

      // Provider booking status breakdown (user as skilled professional)
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

      // Recent listings owned by the user (bounded to 5 items)
      Listing.find({
        ownerId: userId,
        status: { $ne: "ARCHIVED" },
      })
        .sort({ updatedAt: -1 })
        .limit(5)
        .select("title type status slug photos propertyDetails serviceDetails moderation createdAt updatedAt")
        .lean(),

      // Recent bookings requested by the user as customer (bounded to 4 items)
      Booking.find({ customerId: userId })
        .sort({ createdAt: -1 })
        .limit(4)
        .populate("providerId", "name email image phone")
        .populate("listingId", "title slug serviceDetails photos location")
        .lean(),

      // Recent incoming bookings for user's services as provider (bounded to 4 items)
      Booking.find({ providerId: userId })
        .sort({ createdAt: -1 })
        .limit(4)
        .populate("customerId", "name email image phone")
        .populate("listingId", "title slug serviceDetails photos location")
        .lean(),
    ]);

    // Helper to extract count for a status from aggregation results
    const getCount = (
      arr: Array<{ _id: string; count: number }>,
      status: string
    ): number => {
      const match = arr.find((item) => item._id === status);
      return match ? match.count : 0;
    };

    // Calculate property breakdowns
    const propertyApproved = getCount(propertyStats, "APPROVED");
    const propertyPending = getCount(propertyStats, "PENDING_REVIEW");
    const propertyRejected = getCount(propertyStats, "REJECTED");
    const propertyPaused = getCount(propertyStats, "PAUSED");
    const propertyDraft = getCount(propertyStats, "DRAFT");
    const propertyTotal =
      propertyApproved + propertyPending + propertyRejected + propertyPaused + propertyDraft;

    // Calculate service breakdowns
    const serviceApproved = getCount(serviceStats, "APPROVED");
    const servicePending = getCount(serviceStats, "PENDING_REVIEW");
    const serviceRejected = getCount(serviceStats, "REJECTED");
    const servicePaused = getCount(serviceStats, "PAUSED");
    const serviceDraft = getCount(serviceStats, "DRAFT");
    const serviceTotal =
      serviceApproved + servicePending + serviceRejected + servicePaused + serviceDraft;

    // Calculate customer bookings breakdown
    const customerPending = getCount(customerBookingStats, "PENDING");
    const customerAccepted = getCount(customerBookingStats, "ACCEPTED");
    const customerAlternative = getCount(customerBookingStats, "ALTERNATIVE_PROPOSED");
    const customerCompleted = getCount(customerBookingStats, "COMPLETED");
    const customerCancelled = getCount(customerBookingStats, "CANCELLED");
    const customerRejected = getCount(customerBookingStats, "REJECTED");
    const customerTotal = customerBookingStats.reduce((acc, curr) => acc + curr.count, 0);

    // Calculate provider bookings breakdown
    const providerPending = getCount(providerBookingStats, "PENDING");
    const providerAccepted = getCount(providerBookingStats, "ACCEPTED");
    const providerAlternative = getCount(providerBookingStats, "ALTERNATIVE_PROPOSED");
    const providerCompleted = getCount(providerBookingStats, "COMPLETED");
    const providerCancelled = getCount(providerBookingStats, "CANCELLED");
    const providerRejected = getCount(providerBookingStats, "REJECTED");
    const providerTotal = providerBookingStats.reduce((acc, curr) => acc + curr.count, 0);

    // Consolidated listings across verticals
    const totalListings = propertyTotal + serviceTotal;
    const listingsPendingApproval = propertyPending + servicePending;
    const listingsApproved = propertyApproved + serviceApproved;
    const listingsRejected = propertyRejected + serviceRejected;

    // Serialize recent listings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recentListings = recentListingsDocs.map((doc: any) => ({
      id: doc._id.toString(),
      type: doc.type,
      status: doc.status,
      title: doc.title,
      slug: doc.slug,
      photo: doc.photos?.[0]?.url || null,
      price: doc.propertyDetails?.price || doc.serviceDetails?.startingPrice || null,
      pricingModel: doc.serviceDetails?.pricingModel || null,
      category: doc.serviceDetails?.category || doc.propertyDetails?.propertyType || null,
      rejectionReason: doc.moderation?.rejectionReason || null,
      updatedAt: doc.updatedAt?.toISOString() || doc.createdAt?.toISOString(),
    }));

    // Serialize recent customer bookings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recentCustomerBookings = recentCustomerBookingsDocs.map((doc: any) => ({
      id: doc._id.toString(),
      role: "CUSTOMER" as const,
      status: doc.status,
      requestedDate: doc.requestedDate?.toISOString(),
      timeSlot: doc.timeSlot,
      serviceTitle: doc.listingId?.title || "Service",
      counterpartName: doc.providerId?.name || "Provider",
      counterpartImage: doc.providerId?.image || null,
      createdAt: doc.createdAt?.toISOString(),
    }));

    // Serialize recent provider bookings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recentProviderBookings = recentProviderBookingsDocs.map((doc: any) => ({
      id: doc._id.toString(),
      role: "PROVIDER" as const,
      status: doc.status,
      requestedDate: doc.requestedDate?.toISOString(),
      timeSlot: doc.timeSlot,
      serviceTitle: doc.listingId?.title || "Service",
      counterpartName: doc.customerId?.name || "Customer",
      counterpartImage: doc.customerId?.image || null,
      createdAt: doc.createdAt?.toISOString(),
    }));

    return apiSuccess({
      user: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: session.user.role,
      },
      counts: {
        properties: {
          total: propertyTotal,
          approved: propertyApproved,
          pendingReview: propertyPending,
          rejected: propertyRejected,
          paused: propertyPaused,
          draft: propertyDraft,
        },
        services: {
          total: serviceTotal,
          approved: serviceApproved,
          pendingReview: servicePending,
          rejected: serviceRejected,
          paused: servicePaused,
          draft: serviceDraft,
        },
        summary: {
          totalListings,
          listingsPendingApproval,
          listingsApproved,
          listingsRejected,
        },
        customerBookings: {
          total: customerTotal,
          pending: customerPending,
          accepted: customerAccepted,
          alternativeProposed: customerAlternative,
          completed: customerCompleted,
          cancelled: customerCancelled,
          rejected: customerRejected,
        },
        providerBookings: {
          total: providerTotal,
          pending: providerPending,
          accepted: providerAccepted,
          alternativeProposed: providerAlternative,
          completed: providerCompleted,
          cancelled: providerCancelled,
          rejected: providerRejected,
        },
      },
      recentListings,
      recentCustomerBookings,
      recentProviderBookings,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
