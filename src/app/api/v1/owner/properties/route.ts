import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Listing } from "@/models/Listing";
import { apiSuccess, handleRouteError } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth-guards";

export async function GET(request: NextRequest) {
  try {
    const session = await requireAuth();
    const { searchParams } = new URL(request.url);

    const status = searchParams.get("status");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const sortBy = searchParams.get("sortBy") || "createdAt";
    const sortOrder = searchParams.get("sortOrder") === "asc" ? 1 : -1;

    await connectToDatabase();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {
      ownerId: new mongoose.Types.ObjectId(session.user.id),
      type: "PROPERTY",
    };

    if (status && status !== "ALL") {
      filter.status = status;
    } else {
      // By default, exclude archived unless explicitly requested
      filter.status = { $ne: "ARCHIVED" };
    }

    const skip = (page - 1) * limit;

    const [totalCount, docs] = await Promise.all([
      Listing.countDocuments(filter),
      Listing.find(filter)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = docs.map((doc: any) => ({
      id: doc._id.toString(),
      type: doc.type,
      status: doc.status,
      title: doc.title,
      slug: doc.slug,
      description: doc.description,
      location: {
        city: doc.location.city,
        cityCode: doc.location.cityCode,
        locality: doc.location.locality,
        streetAddress: doc.location.streetAddress || null,
        geo: doc.location.geo,
      },
      contactPreferences: doc.contactPreferences,
      photos: doc.photos || [],
      propertyDetails: doc.propertyDetails,
      moderation: {
        reviewedAt: doc.moderation?.reviewedAt ? new Date(doc.moderation.reviewedAt).toISOString() : null,
        rejectionReason: doc.moderation?.rejectionReason || null,
      },
      metrics: doc.metrics || { views: 0, contactReveals: 0, savesCount: 0 },
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date(0).toISOString(),
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date(0).toISOString(),
    }));

    return apiSuccess(items, 200, {
      page,
      limit,
      totalCount,
      totalPages,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
