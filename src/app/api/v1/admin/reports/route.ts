import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Report } from "@/models/Report";
import { apiSuccess, handleRouteError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guards";
import { z } from "zod";

const adminReportsQuerySchema = z.object({
  status: z
    .enum(["OPEN", "INVESTIGATING", "RESOLVED", "DISMISSED", "ALL"])
    .default("ALL"),
  reason: z
    .enum(["SPAM", "FAKE_PROPERTY", "INACCURATE_PRICE", "OFFENSIVE_CONTENT", "OTHER"])
    .optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const parsed = adminReportsQuerySchema.parse({
      status: searchParams.get("status") || "ALL",
      reason: searchParams.get("reason") || undefined,
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 20,
    });

    await connectToDatabase();

    const filter: Record<string, unknown> = {};

    if (parsed.status !== "ALL") {
      filter.status = parsed.status;
    }

    if (parsed.reason) {
      filter.reason = parsed.reason;
    }

    const skip = (parsed.page - 1) * parsed.limit;

    const [totalCount, docs] = await Promise.all([
      Report.countDocuments(filter),
      Report.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsed.limit)
        .populate("listingId", "title type slug status location photos")
        .populate("reporterId", "name email")
        .populate("resolvedBy", "name email")
        .lean(),
    ]);

    interface PopulatedDoc {
      _id: { toString(): string };
      listingId?: {
        _id: { toString(): string };
        title: string;
        type: string;
        slug: string;
        status: string;
        location?: { city: string; locality: string };
        photos?: Array<{ url: string }>;
      } | null;
      reporterId?: {
        _id: { toString(): string };
        name: string;
        email: string;
      } | null;
      reporterEmail: string;
      reason: string;
      details: string;
      status: string;
      adminNotes?: string | null;
      resolvedBy?: {
        _id: { toString(): string };
        name: string;
        email: string;
      } | null;
      resolvedAt?: Date | null;
      createdAt: Date;
      updatedAt: Date;
    }

    const reports = (docs as unknown as PopulatedDoc[]).map((doc) => ({
      id: doc._id.toString(),
      listing: doc.listingId
        ? {
            id: doc.listingId._id.toString(),
            title: doc.listingId.title,
            type: doc.listingId.type,
            slug: doc.listingId.slug,
            status: doc.listingId.status,
            location: doc.listingId.location,
            thumbnail: doc.listingId.photos?.[0]?.url || null,
          }
        : null,
      reporter: {
        id: doc.reporterId?._id ? doc.reporterId._id.toString() : null,
        name: doc.reporterId?.name || "Registered Member",
        email: doc.reporterEmail,
      },
      reason: doc.reason,
      details: doc.details,
      status: doc.status,
      adminNotes: doc.adminNotes || null,
      resolvedBy: doc.resolvedBy
        ? {
            id: doc.resolvedBy._id.toString(),
            name: doc.resolvedBy.name,
            email: doc.resolvedBy.email,
          }
        : null,
      resolvedAt: doc.resolvedAt ? new Date(doc.resolvedAt).toISOString() : null,
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date().toISOString(),
    }));

    return apiSuccess({
      reports,
      pagination: {
        page: parsed.page,
        limit: parsed.limit,
        totalCount,
        totalPages: Math.ceil(totalCount / parsed.limit) || 1,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
