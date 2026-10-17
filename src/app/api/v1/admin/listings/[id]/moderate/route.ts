import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Listing } from "@/models/Listing";
import { apiSuccess, handleRouteError } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";
import { requireAdmin } from "@/lib/auth-guards";
import { z } from "zod";

const adminModerateSchema = z
  .object({
    action: z.enum(["APPROVE", "REJECT"]),
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

    const listing = await Listing.findById(id);

    if (!listing) {
      throw new NotFoundError("Listing not found");
    }

    const adminObjectId = new mongoose.Types.ObjectId(session.user.id);
    const now = new Date();

    if (action === "APPROVE") {
      listing.status = "APPROVED";
      listing.moderation = {
        reviewedBy: adminObjectId,
        reviewedAt: now,
        rejectionReason: null,
      };
    } else if (action === "REJECT") {
      listing.status = "REJECTED";
      listing.moderation = {
        reviewedBy: adminObjectId,
        reviewedAt: now,
        rejectionReason: rejectionReason!,
      };
    }

    await listing.save();

    return apiSuccess({
      id: listing._id.toString(),
      type: listing.type,
      status: listing.status,
      title: listing.title,
      moderation: {
        reviewedBy: session.user.id,
        reviewedAt: now.toISOString(),
        rejectionReason: listing.moderation.rejectionReason,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
