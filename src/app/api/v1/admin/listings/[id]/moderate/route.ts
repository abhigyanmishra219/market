import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Listing } from "@/models/Listing";
import { AuditLog, AuditAction } from "@/models/AuditLog";
import { apiSuccess, handleRouteError } from "@/lib/api-response";
import { NotFoundError, ConflictError } from "@/lib/errors";
import { requireAdmin } from "@/lib/auth-guards";
import { z } from "zod";

const adminModerateSchema = z
  .object({
    action: z.enum(["APPROVE", "REJECT", "ARCHIVE", "PAUSE"]),
    rejectionReason: z.string().trim().max(500).optional(),
  })
  .refine(
    (data) => {
      if (data.action === "REJECT") {
        return !!data.rejectionReason && data.rejectionReason.length >= 5;
      }
      return true;
    },
    {
      message: "A specific rejection reason of at least 5 characters is required when rejecting a listing.",
      path: ["rejectionReason"],
    }
  );

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // Reusable server-side admin authorization verification
    const session = await requireAdmin();
    const { id } = await context.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Listing not found with valid identifier");
    }

    const body = await request.json();
    const { action, rejectionReason } = adminModerateSchema.parse(body);

    await connectToDatabase();

    const currentListing = await Listing.findById(id);
    if (!currentListing) {
      throw new NotFoundError("Listing not found");
    }

    const previousStatus = currentListing.status;
    const adminObjectId = new mongoose.Types.ObjectId(session.user.id);
    const now = new Date();

    let targetStatus: "APPROVED" | "REJECTED" | "ARCHIVED" | "PAUSED";
    let auditAction: AuditAction;
    const updateQuery: Record<string, unknown> = {};

    switch (action) {
      case "APPROVE":
        targetStatus = "APPROVED";
        auditAction = "APPROVE_LISTING";
        updateQuery.$set = {
          status: "APPROVED",
          moderation: {
            reviewedBy: adminObjectId,
            reviewedAt: now,
            rejectionReason: null,
          },
        };
        break;

      case "REJECT":
        targetStatus = "REJECTED";
        auditAction = "REJECT_LISTING";
        updateQuery.$set = {
          status: "REJECTED",
          moderation: {
            reviewedBy: adminObjectId,
            reviewedAt: now,
            rejectionReason: rejectionReason!,
          },
        };
        break;

      case "ARCHIVE":
        targetStatus = "ARCHIVED";
        auditAction = "ARCHIVE_LISTING";
        updateQuery.$set = {
          status: "ARCHIVED",
        };
        break;

      case "PAUSE":
        targetStatus = "PAUSED";
        auditAction = "PAUSE_LISTING";
        updateQuery.$set = {
          status: "PAUSED",
        };
        break;
    }

    // Atomic update preventing conflicting concurrent moderation actions
    const updatedListing = await Listing.findOneAndUpdate(
      {
        _id: currentListing._id,
        status: previousStatus, // Only update if status hasn't changed concurrently
      },
      updateQuery,
      { returnDocument: "after" }
    );

    if (!updatedListing) {
      throw new ConflictError(
        "Listing was concurrently updated by another moderation action. Please refresh the queue."
      );
    }

    // Record immutable audit log entry
    await AuditLog.create({
      adminUserId: adminObjectId,
      action: auditAction,
      targetCollection: "listings",
      targetId: updatedListing._id,
      previousState: { status: previousStatus },
      newState: { status: targetStatus },
      reason: rejectionReason || null,
      createdAt: now,
    });

    return apiSuccess({
      id: updatedListing._id.toString(),
      type: updatedListing.type,
      status: updatedListing.status,
      title: updatedListing.title,
      moderation: {
        reviewedBy: session.user.id,
        reviewedAt: now.toISOString(),
        rejectionReason: updatedListing.moderation?.rejectionReason || null,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
