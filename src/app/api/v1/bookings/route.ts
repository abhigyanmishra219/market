import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guards";
import { apiSuccess, handleRouteError } from "@/lib/api-response";
import { ValidationError, NotFoundError, ForbiddenError } from "@/lib/errors";
import { Booking } from "@/models/Booking";
import { Listing } from "@/models/Listing";
import { createBookingSchema } from "@/lib/validations/booking";
import { sendBookingNotification } from "@/lib/notifications";

/**
 * POST /api/v1/bookings
 * Customer submits a new appointment booking request for an approved service.
 */
export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    await connectToDatabase();

    const body = await req.json();
    const validatedData = createBookingSchema.parse(body);

    // Verify service listing exists and is eligible for bookings
    const listing = await Listing.findById(validatedData.listingId);
    if (!listing) {
      throw new NotFoundError("The requested service listing was not found.");
    }

    if (listing.type !== "SERVICE") {
      throw new ValidationError("Booking requests can only be placed on service listings.");
    }

    if (listing.status !== "APPROVED") {
      throw new ValidationError(
        "This service listing is currently not active or available for booking."
      );
    }

    // Customer cannot book their own service
    if (listing.ownerId.toString() === session.user.id) {
      throw new ForbiddenError("You cannot submit a booking request for your own service listing.");
    }

    const requestedDate = new Date(validatedData.requestedDate);

    // Create the booking document with initial PENDING status
    const newBooking = await Booking.create({
      customerId: new mongoose.Types.ObjectId(session.user.id),
      providerId: listing.ownerId,
      listingId: listing._id,
      status: "PENDING",
      requestedDate,
      timeSlot: validatedData.timeSlot,
      serviceAddress: {
        line1: validatedData.serviceAddress.line1,
        locality: validatedData.serviceAddress.locality,
        city: validatedData.serviceAddress.city || listing.location.city,
      },
      customerPhone: validatedData.customerPhone,
      customerNotes: validatedData.customerNotes || null,
      statusHistory: [
        {
          status: "PENDING",
          changedBy: new mongoose.Types.ObjectId(session.user.id),
          timestamp: new Date(),
          note: "Booking request submitted by customer",
        },
      ],
    });

    // Notify provider of new incoming request
    await sendBookingNotification({
      bookingId: newBooking._id.toString(),
      recipientId: listing.ownerId.toString(),
      recipientRole: "PROVIDER",
      event: "BOOKING_REQUESTED",
      serviceTitle: listing.title,
      dateOrSlot: `${requestedDate.toLocaleDateString()} (${validatedData.timeSlot})`,
      note: validatedData.customerNotes || null,
    });

    return apiSuccess(
      {
        id: newBooking._id.toString(),
        status: newBooking.status,
        requestedDate: newBooking.requestedDate,
        timeSlot: newBooking.timeSlot,
        createdAt: newBooking.createdAt,
      },
      201
    );
  } catch (error) {
    return handleRouteError(error);
  }
}

/**
 * GET /api/v1/bookings
 * Retrieves bookings for the current authenticated user (as customer or provider).
 */
export async function GET(req: NextRequest) {
  try {
    const session = await requireAuth();
    await connectToDatabase();

    const url = new URL(req.url);
    const role = url.searchParams.get("role") === "provider" ? "provider" : "customer";
    const statusParam = url.searchParams.get("status");
    const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") || "10", 10)));
    const skip = (page - 1) * limit;

    // Filter query based on role
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const query: Record<string, any> = {};
    if (role === "provider") {
      query.providerId = new mongoose.Types.ObjectId(session.user.id);
    } else {
      query.customerId = new mongoose.Types.ObjectId(session.user.id);
    }

    if (statusParam && statusParam !== "ALL") {
      query.status = statusParam.toUpperCase();
    }

    const [totalCount, docs] = await Promise.all([
      Booking.countDocuments(query),
      Booking.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate("customerId", "name email image phone")
        .populate("providerId", "name email image phone")
        .populate("listingId", "title slug serviceDetails photos location")
        .lean(),
    ]);

    const bookings = docs.map((doc) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const customer = doc.customerId as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const provider = doc.providerId as any;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const listing = doc.listingId as any;

      return {
        id: doc._id.toString(),
        status: doc.status,
        requestedDate: doc.requestedDate,
        timeSlot: doc.timeSlot,
        serviceAddress: doc.serviceAddress,
        customerPhone: doc.customerPhone,
        customerNotes: doc.customerNotes,
        alternativeDetails: doc.alternativeDetails,
        providerNotes: doc.providerNotes,
        statusHistory: doc.statusHistory,
        createdAt: doc.createdAt,
        updatedAt: doc.updatedAt,
        customer: customer
          ? {
              id: customer._id?.toString(),
              name: customer.name || "Customer",
              email: customer.email,
              phone: customer.phone,
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
      };
    });

    return apiSuccess(bookings, 200, {
      page,
      limit,
      totalCount,
      totalPages: Math.ceil(totalCount / limit),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
