import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Listing } from "@/models/Listing";
import { apiSuccess, handleRouteError } from "@/lib/api-response";
import { NotFoundError, ForbiddenError, ValidationError } from "@/lib/errors";
import { requireAuth } from "@/lib/auth-guards";
import { listingStatusTransitionSchema } from "@/lib/validations/listing";

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await context.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Listing not found with valid identifier");
    }

    await connectToDatabase();
    const listing = await Listing.findById(id);

    if (!listing) {
      throw new NotFoundError("Listing not found");
    }

    const body = await request.json();
    const { status: targetStatus, rejectionReason } = listingStatusTransitionSchema.parse(body);

    const isOwner = listing.ownerId.toString() === session.user.id.toString();
    const isAdmin = session.user.role === "ADMIN";

    // Only owner or admin can update listing status
    if (!isOwner && !isAdmin) {
      throw new ForbiddenError("You do not have permission to modify this listing's status.");
    }

    // Role-based status transition rules
    if (!isAdmin) {
      // Owner-specific rules:
      // 1. Owner CANNOT approve their own listing
      if (targetStatus === "APPROVED") {
        // Exception: If listing was previously APPROVED and currently PAUSED, owner can unpause (resume)
        if (listing.status === "PAUSED") {
          listing.status = "APPROVED";
        } else {
          throw new ForbiddenError("Only authorized administrators may approve listings.");
        }
      } else if (targetStatus === "PAUSED") {
        if (listing.status !== "APPROVED") {
          throw new ValidationError("Only active approved listings can be paused.");
        }
        listing.status = "PAUSED";
      } else if (targetStatus === "PENDING_REVIEW") {
        if (listing.status !== "DRAFT" && listing.status !== "REJECTED") {
          throw new ValidationError(
            `Cannot submit listing in "${listing.status}" state for review.`
          );
        }
        listing.status = "PENDING_REVIEW";
        if (listing.moderation) {
          listing.moderation.rejectionReason = null;
        }
      } else if (targetStatus === "ARCHIVED") {
        listing.status = "ARCHIVED";
      } else if (targetStatus === "DRAFT") {
        listing.status = "DRAFT";
      } else {
        throw new ForbiddenError(`Unauthorized status transition to ${targetStatus}.`);
      }
    } else {
      // Administrator rules:
      if (targetStatus === "APPROVED") {
        listing.status = "APPROVED";
        listing.moderation = {
          reviewedBy: new mongoose.Types.ObjectId(session.user.id),
          reviewedAt: new Date(),
          rejectionReason: null,
        };
      } else if (targetStatus === "REJECTED") {
        if (!rejectionReason) {
          throw new ValidationError("A rejection reason is mandatory when rejecting a listing.");
        }
        listing.status = "REJECTED";
        listing.moderation = {
          reviewedBy: new mongoose.Types.ObjectId(session.user.id),
          reviewedAt: new Date(),
          rejectionReason,
        };
      } else {
        listing.status = targetStatus;
      }
    }

    await listing.save();

    return apiSuccess({
      id: listing._id.toString(),
      status: listing.status,
      title: listing.title,
      moderation: listing.moderation,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
