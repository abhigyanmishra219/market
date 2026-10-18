import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { Listing } from "@/models/Listing";
import { apiSuccess, handleRouteError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guards";
import { escapeRegex } from "@/lib/validations/listing";
import { z } from "zod";

const adminUsersQuerySchema = z.object({
  search: z.string().trim().max(100).optional(),
  role: z.enum(["USER", "ADMIN", "ALL"]).default("ALL"),
  status: z.enum(["ACTIVE", "SUSPENDED", "DELETED", "ALL"]).default("ALL"),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const parsed = adminUsersQuerySchema.parse({
      search: searchParams.get("search") || undefined,
      role: searchParams.get("role") || "ALL",
      status: searchParams.get("status") || "ALL",
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 20,
    });

    await connectToDatabase();

    const filter: Record<string, unknown> = {};

    if (parsed.role !== "ALL") {
      filter.role = parsed.role;
    }

    if (parsed.status !== "ALL") {
      filter.status = parsed.status;
    }

    if (parsed.search) {
      const sanitized = escapeRegex(parsed.search);
      filter.$or = [
        { name: { $regex: sanitized, $options: "i" } },
        { email: { $regex: sanitized, $options: "i" } },
      ];
    }

    const skip = (parsed.page - 1) * parsed.limit;

    const [totalCount, usersDocs] = await Promise.all([
      User.countDocuments(filter),
      User.find(filter)
        .select("_id name email image role status createdAt updatedAt")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsed.limit)
        .lean(),
    ]);

    const userIds = usersDocs.map((u) => u._id);

    // Aggregate listing counts for the paginated users efficiently
    const listingCounts = await Listing.aggregate([
      { $match: { ownerId: { $in: userIds } } },
      {
        $group: {
          _id: {
            ownerId: "$ownerId",
            type: "$type",
          },
          count: { $sum: 1 },
        },
      },
    ]);

    const countsMap = new Map<string, { properties: number; services: number }>();
    for (const item of listingCounts) {
      const ownerIdStr = item._id.ownerId.toString();
      const current = countsMap.get(ownerIdStr) || { properties: 0, services: 0 };
      if (item._id.type === "PROPERTY") {
        current.properties = item.count;
      } else if (item._id.type === "SERVICE") {
        current.services = item.count;
      }
      countsMap.set(ownerIdStr, current);
    }

    const users = usersDocs.map((u) => {
      const userCounts = countsMap.get(u._id.toString()) || { properties: 0, services: 0 };
      return {
        id: u._id.toString(),
        name: u.name,
        email: u.email,
        image: u.image || null,
        role: u.role,
        status: u.status,
        propertiesCount: userCounts.properties,
        servicesCount: userCounts.services,
        createdAt: u.createdAt ? new Date(u.createdAt).toISOString() : new Date().toISOString(),
      };
    });

    return apiSuccess({
      users,
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
