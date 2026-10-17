import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guards";
import { apiSuccess, handleRouteError } from "@/lib/api-response";
import { NotFoundError, ForbiddenError, ValidationError } from "@/lib/errors";
import { Booking } from "@/models/Booking";

/**
 * GET /api/v1/bookings/[id]
 * Retrieves authorized booking details.
 * Strictly limited to the booking's customer, provider, or an administrator.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    await connectToDatabase();

    const { id } = await params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new ValidationError("Invalid booking ID format.");
    }

    const booking = await Booking.findById(id)
      .populate("customerId", "name email image phone")
      .populate("providerId", "name email image phone")
      .populate("listingId", "title slug serviceDetails photos location")
      .lean();

    if (!booking) {
      throw new NotFoundError("Booking request not found.");
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const customer = booking.customerId as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const provider = booking.providerId as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const listing = booking.listingId as any;

    const customerIdStr = (customer?._id || customer).toString();
    const providerIdStr = (provider?._id || provider).toString();
    const currentUserId = session.user.id;
    const isAdmin = session.user.role === "ADMIN";

    // Privacy & Authorization boundary: Must be participant or admin
    if (!isAdmin && currentUserId !== customerIdStr && currentUserId !== providerIdStr) {
      throw new ForbiddenError("You do not have permission to view this booking record.");
    }

    const isCustomer = currentUserId === customerIdStr;

    return apiSuccess({
      id: booking._id.toString(),
      status: booking.status,
      requestedDate: booking.requestedDate,
      timeSlot: booking.timeSlot,
      serviceAddress: booking.serviceAddress,
      customerPhone: booking.customerPhone,
      customerNotes: booking.customerNotes,
      alternativeDetails: booking.alternativeDetails,
      providerNotes: booking.providerNotes,
      statusHistory: booking.statusHistory,
      createdAt: booking.createdAt,
      updatedAt: booking.updatedAt,
      // Participant details
      customer: customer
        ? {
            id: customer._id?.toString(),
            name: customer.name || "Customer",
            email: customer.email,
            phone: isCustomer || !isCustomer ? customer.phone : null, // visible for appointment execution
            image: customer.image,
          }
        : null,
      provider: provider
        ? {
            id: provider._id?.toString(),
            name: provider.name || "Service Provider",
            email: provider.email,
            phone: provider.phone,
            image: provider.image,
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
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
