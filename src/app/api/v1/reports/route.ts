import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Report } from "@/models/Report";
import { Listing } from "@/models/Listing";
import { apiSuccess, handleRouteError } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth-guards";
import { NotFoundError, ConflictError, UnauthorizedError } from "@/lib/errors";
import { z } from "zod";

const createReportSchema = z.object({
  listingId: z
    .string()
    .trim()
    .refine((val) => mongoose.Types.ObjectId.isValid(val), {
      message: "A valid listing identifier is required",
    }),
  reason: z.enum(
    ["SPAM", "FAKE_PROPERTY", "INACCURATE_PRICE", "OFFENSIVE_CONTENT", "OTHER"],
    {
      message: "Please select a valid report reason",
    }
  ),
  details: z
    .string()
    .trim()
    .min(10, "Please provide at least 10 characters explaining your concern")
    .max(2000, "Details cannot exceed 2000 characters"),
});

export async function POST(request: NextRequest) {
  try {
    // Only signed-in users can report listings
    const session = await requireAuth();

    const body = await request.json();
    const { listingId, reason, details } = createReportSchema.parse(body);

    await connectToDatabase();

    const listing = await Listing.findById(listingId).select("_id title type status").lean();
    if (!listing) {
      throw new NotFoundError("The listing you are reporting does not exist");
    }

    if (!session.user.email) {
      throw new UnauthorizedError("A verified account email is required to submit a report");
    }

    const listingObjectId = new mongoose.Types.ObjectId(listingId);
    const reporterEmail = session.user.email.toLowerCase();

    // Basic anti-spam duplicate protection: prevent duplicate open/investigating reports by the same user
    const existingActiveReport = await Report.findOne({
      listingId: listingObjectId,
      reporterEmail,
      status: { $in: ["OPEN", "INVESTIGATING"] },
    });

    if (existingActiveReport) {
      throw new ConflictError(
        "You have already submitted a report for this listing that is currently under review by our moderation team."
      );
    }

    const report = await Report.create({
      listingId: listingObjectId,
      reporterId: new mongoose.Types.ObjectId(session.user.id),
      reporterEmail,
      reason,
      details,
      status: "OPEN",
    });

    return apiSuccess(
      {
        id: report._id.toString(),
        listingId: report.listingId.toString(),
        reason: report.reason,
        status: report.status,
        createdAt: report.createdAt.toISOString(),
      },
      201
    );
  } catch (error) {
    return handleRouteError(error);
  }
}
