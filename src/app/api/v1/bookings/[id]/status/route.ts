import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { requireAuth } from "@/lib/auth-guards";
import { apiSuccess, handleRouteError } from "@/lib/api-response";
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
  ConflictError,
} from "@/lib/errors";
import { Booking } from "@/models/Booking";
import { Listing } from "@/models/Listing";
import { bookingStatusActionSchema } from "@/lib/validations/booking";
import { sendBookingNotification } from "@/lib/notifications";

/**
 * PATCH /api/v1/bookings/[id]/status
 * State machine for booking lifecycle transitions.
 * Enforces role authorization and concurrent race-condition safety.
 */
export async function PATCH(
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

    const body = await req.json();
    const validatedData = bookingStatusActionSchema.parse(body);

    const booking = await Booking.findById(id);
    if (!booking) {
      throw new NotFoundError("Booking request not found.");
    }

    const currentUserId = session.user.id;
    const isCustomer = currentUserId === booking.customerId.toString();
    const isProvider = currentUserId === booking.providerId.toString();
    const isAdmin = session.user.role === "ADMIN";

    if (!isCustomer && !isProvider && !isAdmin) {
      throw new ForbiddenError("You do not have permission to modify this booking.");
    }

    // Normalize actions
    let action = validatedData.action;
    if (action === "RESCHEDULE") action = "PROPOSE_ALTERNATIVE";
    if (action === "DECLINE") action = "REJECT";

    const now = new Date();
    const listing = await Listing.findById(booking.listingId).select("title").lean();
    const serviceTitle = listing?.title || "Service";

    // -------------------------------------------------------------------------
    // 1. ACCEPT (Provider confirms original request)
    // -------------------------------------------------------------------------
    if (action === "ACCEPT") {
      if (!isProvider && !isAdmin) {
        throw new ForbiddenError("Only the service provider can accept a booking request.");
      }

      if (booking.status !== "PENDING") {
        throw new ValidationError(
          `Cannot accept request in '${booking.status}' status. Only PENDING requests can be accepted.`
        );
      }

      const updated = await Booking.findOneAndUpdate(
        { _id: booking._id, status: "PENDING" },
        {
          $set: { status: "ACCEPTED", updatedAt: now },
          $push: {
            statusHistory: {
              status: "ACCEPTED",
              changedBy: new mongoose.Types.ObjectId(currentUserId),
              timestamp: now,
              note: validatedData.note || "Provider accepted the appointment",
            },
          },
        },
        { new: true }
      );

      if (!updated) {
        throw new ConflictError(
          "Booking status was modified concurrently by another action."
        );
      }

      await sendBookingNotification({
        bookingId: updated._id.toString(),
        recipientId: updated.customerId.toString(),
        recipientRole: "CUSTOMER",
        event: "BOOKING_ACCEPTED",
        serviceTitle,
        dateOrSlot: `${updated.requestedDate.toLocaleDateString()} (${updated.timeSlot})`,
      });

      return apiSuccess({
        id: updated._id.toString(),
        status: updated.status,
        requestedDate: updated.requestedDate,
        timeSlot: updated.timeSlot,
        updatedAt: updated.updatedAt,
      });
    }

    // -------------------------------------------------------------------------
    // 2. REJECT / DECLINE (Provider rejects request)
    // -------------------------------------------------------------------------
    if (action === "REJECT") {
      if (!isProvider && !isAdmin) {
        throw new ForbiddenError("Only the service provider can reject this request.");
      }

      if (booking.status !== "PENDING" && booking.status !== "ALTERNATIVE_PROPOSED") {
        throw new ValidationError(
          `Cannot reject request in '${booking.status}' status.`
        );
      }

      const rejectionReason = validatedData.reason || validatedData.note || null;
      const updated = await Booking.findOneAndUpdate(
        { _id: booking._id, status: { $in: ["PENDING", "ALTERNATIVE_PROPOSED"] } },
        {
          $set: {
            status: "REJECTED",
            providerNotes: rejectionReason,
            updatedAt: now,
          },
          $push: {
            statusHistory: {
              status: "REJECTED",
              changedBy: new mongoose.Types.ObjectId(currentUserId),
              timestamp: now,
              note: rejectionReason || "Provider rejected the request",
            },
          },
        },
        { new: true }
      );

      if (!updated) {
        throw new ConflictError("Booking status was modified concurrently.");
      }

      await sendBookingNotification({
        bookingId: updated._id.toString(),
        recipientId: updated.customerId.toString(),
        recipientRole: "CUSTOMER",
        event: "BOOKING_REJECTED",
        serviceTitle,
        note: rejectionReason,
      });

      return apiSuccess({
        id: updated._id.toString(),
        status: updated.status,
        providerNotes: updated.providerNotes,
        updatedAt: updated.updatedAt,
      });
    }

    // -------------------------------------------------------------------------
    // 3. PROPOSE_ALTERNATIVE / RESCHEDULE (Provider offers another time)
    // -------------------------------------------------------------------------
    if (action === "PROPOSE_ALTERNATIVE") {
      if (!isProvider && !isAdmin) {
        throw new ForbiddenError("Only the service provider can propose an alternative time.");
      }

      if (booking.status !== "PENDING") {
        throw new ValidationError(
          `Cannot propose an alternative time for a request with status '${booking.status}'.`
        );
      }

      const proposedDate = new Date(validatedData.proposedDate!);
      const alternativeDetails = {
        proposedDate,
        proposedSlot: validatedData.proposedSlot!,
        note: validatedData.note || null,
        proposedAt: now,
      };

      const updated = await Booking.findOneAndUpdate(
        { _id: booking._id, status: "PENDING" },
        {
          $set: {
            status: "ALTERNATIVE_PROPOSED",
            alternativeDetails,
            updatedAt: now,
          },
          $push: {
            statusHistory: {
              status: "ALTERNATIVE_PROPOSED",
              changedBy: new mongoose.Types.ObjectId(currentUserId),
              timestamp: now,
              note: validatedData.note || "Provider proposed alternative appointment time",
            },
          },
        },
        { new: true }
      );

      if (!updated) {
        throw new ConflictError("Booking was modified concurrently.");
      }

      await sendBookingNotification({
        bookingId: updated._id.toString(),
        recipientId: updated.customerId.toString(),
        recipientRole: "CUSTOMER",
        event: "ALTERNATIVE_PROPOSED",
        serviceTitle,
        dateOrSlot: `${proposedDate.toLocaleDateString()} (${validatedData.proposedSlot})`,
        note: validatedData.note || null,
      });

      return apiSuccess({
        id: updated._id.toString(),
        status: updated.status,
        alternativeDetails: updated.alternativeDetails,
        updatedAt: updated.updatedAt,
      });
    }

    // -------------------------------------------------------------------------
    // 4. ACCEPT_ALTERNATIVE (Customer accepts provider's proposed time)
    // -------------------------------------------------------------------------
    if (action === "ACCEPT_ALTERNATIVE") {
      if (!isCustomer && !isAdmin) {
        throw new ForbiddenError("Only the customer can accept a proposed alternative time.");
      }

      if (booking.status !== "ALTERNATIVE_PROPOSED" || !booking.alternativeDetails) {
        throw new ValidationError(
          "There is no alternative time proposal pending for this booking."
        );
      }

      const confirmedDate = booking.alternativeDetails.proposedDate;
      const confirmedSlot = booking.alternativeDetails.proposedSlot;

      const updated = await Booking.findOneAndUpdate(
        { _id: booking._id, status: "ALTERNATIVE_PROPOSED" },
        {
          $set: {
            status: "ACCEPTED",
            requestedDate: confirmedDate,
            timeSlot: confirmedSlot,
            updatedAt: now,
          },
          $push: {
            statusHistory: {
              status: "ACCEPTED",
              changedBy: new mongoose.Types.ObjectId(currentUserId),
              timestamp: now,
              note: "Customer accepted provider's proposed alternative time",
            },
          },
        },
        { new: true }
      );

      if (!updated) {
        throw new ConflictError("Booking was modified concurrently.");
      }

      await sendBookingNotification({
        bookingId: updated._id.toString(),
        recipientId: updated.providerId.toString(),
        recipientRole: "PROVIDER",
        event: "ALTERNATIVE_ACCEPTED",
        serviceTitle,
        dateOrSlot: `${confirmedDate.toLocaleDateString()} (${confirmedSlot})`,
      });

      return apiSuccess({
        id: updated._id.toString(),
        status: updated.status,
        requestedDate: updated.requestedDate,
        timeSlot: updated.timeSlot,
        updatedAt: updated.updatedAt,
      });
    }

    // -------------------------------------------------------------------------
    // 5. DECLINE_ALTERNATIVE (Customer declines provider's proposal)
    // -------------------------------------------------------------------------
    if (action === "DECLINE_ALTERNATIVE") {
      if (!isCustomer && !isAdmin) {
        throw new ForbiddenError("Only the customer can decline the proposed time.");
      }

      if (booking.status !== "ALTERNATIVE_PROPOSED") {
        throw new ValidationError("Booking is not awaiting an alternative response.");
      }

      const updated = await Booking.findOneAndUpdate(
        { _id: booking._id, status: "ALTERNATIVE_PROPOSED" },
        {
          $set: { status: "CANCELLED", updatedAt: now },
          $push: {
            statusHistory: {
              status: "CANCELLED",
              changedBy: new mongoose.Types.ObjectId(currentUserId),
              timestamp: now,
              note: validatedData.reason || "Customer declined the alternative time",
            },
          },
        },
        { new: true }
      );

      if (!updated) {
        throw new ConflictError("Booking was modified concurrently.");
      }

      await sendBookingNotification({
        bookingId: updated._id.toString(),
        recipientId: updated.providerId.toString(),
        recipientRole: "PROVIDER",
        event: "ALTERNATIVE_DECLINED",
        serviceTitle,
        note: validatedData.reason || null,
      });

      return apiSuccess({
        id: updated._id.toString(),
        status: updated.status,
        updatedAt: updated.updatedAt,
      });
    }

    // -------------------------------------------------------------------------
    // 6. CANCEL (Customer or Provider cancels)
    // -------------------------------------------------------------------------
    if (action === "CANCEL") {
      if (
        booking.status !== "PENDING" &&
        booking.status !== "ALTERNATIVE_PROPOSED" &&
        booking.status !== "ACCEPTED"
      ) {
        throw new ValidationError(
          `Cannot cancel a booking that is already '${booking.status}'.`
        );
      }

      const cancelNote =
        validatedData.reason ||
        validatedData.note ||
        (isCustomer ? "Cancelled by customer" : "Cancelled by provider");

      const updated = await Booking.findOneAndUpdate(
        {
          _id: booking._id,
          status: { $in: ["PENDING", "ALTERNATIVE_PROPOSED", "ACCEPTED"] },
        },
        {
          $set: { status: "CANCELLED", updatedAt: now },
          $push: {
            statusHistory: {
              status: "CANCELLED",
              changedBy: new mongoose.Types.ObjectId(currentUserId),
              timestamp: now,
              note: cancelNote,
            },
          },
        },
        { new: true }
      );

      if (!updated) {
        throw new ConflictError("Booking was modified concurrently.");
      }

      const notifyRecipientId = isCustomer
        ? updated.providerId.toString()
        : updated.customerId.toString();
      const notifyRole = isCustomer ? "PROVIDER" : "CUSTOMER";

      await sendBookingNotification({
        bookingId: updated._id.toString(),
        recipientId: notifyRecipientId,
        recipientRole: notifyRole,
        event: "BOOKING_CANCELLED",
        serviceTitle,
        note: cancelNote,
      });

      return apiSuccess({
        id: updated._id.toString(),
        status: updated.status,
        updatedAt: updated.updatedAt,
      });
    }

    // -------------------------------------------------------------------------
    // 7. COMPLETE (Provider marks finished)
    // -------------------------------------------------------------------------
    if (action === "COMPLETE") {
      if (!isProvider && !isAdmin) {
        throw new ForbiddenError("Only the service provider can mark a booking completed.");
      }

      if (booking.status !== "ACCEPTED") {
        throw new ValidationError(
          `Cannot mark booking as completed from '${booking.status}' status. Only ACCEPTED bookings can be completed.`
        );
      }

      const updated = await Booking.findOneAndUpdate(
        { _id: booking._id, status: "ACCEPTED" },
        {
          $set: { status: "COMPLETED", updatedAt: now },
          $push: {
            statusHistory: {
              status: "COMPLETED",
              changedBy: new mongoose.Types.ObjectId(currentUserId),
              timestamp: now,
              note: validatedData.note || "Service work marked completed by provider",
            },
          },
        },
        { new: true }
      );

      if (!updated) {
        throw new ConflictError("Booking was modified concurrently.");
      }

      await sendBookingNotification({
        bookingId: updated._id.toString(),
        recipientId: updated.customerId.toString(),
        recipientRole: "CUSTOMER",
        event: "BOOKING_COMPLETED",
        serviceTitle,
      });

      return apiSuccess({
        id: updated._id.toString(),
        status: updated.status,
        updatedAt: updated.updatedAt,
      });
    }

    throw new ValidationError(`Unsupported status action '${action}'.`);
  } catch (error) {
    return handleRouteError(error);
  }
}
