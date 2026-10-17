import { NextRequest } from "next/server";
import { connectToDatabase } from "@/lib/db";
import { Listing } from "@/models/Listing";
import { apiSuccess, handleRouteError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guards";
import { escapeRegex } from "@/lib/validations/listing";
import { z } from "zod";

const adminListingQuerySchema = z.object({
  type: z.enum(["PROPERTY", "SERVICE", "ALL"]).default("ALL"),
  status: z
    .enum(["PENDING_REVIEW", "APPROVED", "REJECTED", "PAUSED", "ARCHIVED", "DRAFT", "ALL"])
    .default("PENDING_REVIEW"),
  search: z.string().trim().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(request: NextRequest) {
  try {
    // Reusable server-side admin authorization verification
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const parsed = adminListingQuerySchema.parse({
      type: searchParams.get("type") || "ALL",
      status: searchParams.get("status") || "PENDING_REVIEW",
      search: searchParams.get("search") || undefined,
      page: searchParams.get("page") || 1,
      limit: searchParams.get("limit") || 20,
    });

    await connectToDatabase();

    const filter: Record<string, unknown> = {};

    if (parsed.type !== "ALL") {
      filter.type = parsed.type;
    }

    if (parsed.status !== "ALL") {
      filter.status = parsed.status;
    }

    if (parsed.search) {
      const sanitized = escapeRegex(parsed.search);
      filter.$or = [
        { title: { $regex: sanitized, $options: "i" } },
        { "location.locality": { $regex: sanitized, $options: "i" } },
        { "location.city": { $regex: sanitized, $options: "i" } },
        { description: { $regex: sanitized, $options: "i" } },
      ];
    }

    const skip = (parsed.page - 1) * parsed.limit;

    const [totalCount, docs] = await Promise.all([
      Listing.countDocuments(filter),
      Listing.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parsed.limit)
        .populate("ownerId", "name email phone whatsapp role")
        .lean(),
    ]);

    interface PopulatedOwner {
      _id?: { toString(): string };
      name?: string;
      email?: string;
      phone?: string | null;
      whatsapp?: string | null;
      role?: string;
    }

    interface AdminPhotoDoc {
      id: string;
      url: string;
      isPrimary?: boolean;
      caption?: string | null;
    }

    const listings = docs.map((doc) => {
      const owner = doc.ownerId as unknown as PopulatedOwner | undefined;
      return {
        id: doc._id.toString(),
        type: doc.type,
        status: doc.status,
        title: doc.title,
        slug: doc.slug,
        description: doc.description,
        owner: owner
          ? {
              id: owner._id?.toString() || "",
              name: owner.name || "Unknown User",
              email: owner.email || "",
              phone: owner.phone || null,
              whatsapp: owner.whatsapp || null,
              role: owner.role || "USER",
            }
          : {
              id: "",
              name: "Unknown Owner",
              email: "",
              phone: null,
              whatsapp: null,
              role: "USER",
            },
        location: {
          city: doc.location?.city || "",
          cityCode: doc.location?.cityCode || "",
          locality: doc.location?.locality || "",
          streetAddress: doc.location?.streetAddress || null,
        },
        photos: ((doc.photos || []) as unknown as AdminPhotoDoc[]).map((p) => ({
          id: p.id,
          url: p.url,
          isPrimary: p.isPrimary,
          caption: p.caption || null,
        })),
        propertyDetails: doc.propertyDetails
        ? {
            purpose: doc.propertyDetails.purpose,
            propertyType: doc.propertyDetails.propertyType,
            price: doc.propertyDetails.price,
            securityDeposit: doc.propertyDetails.securityDeposit,
            maintenanceFee: doc.propertyDetails.maintenanceFee,
            bedrooms: doc.propertyDetails.bedrooms,
            bathrooms: doc.propertyDetails.bathrooms,
            carpetArea: doc.propertyDetails.carpetArea,
            furnishing: doc.propertyDetails.furnishing,
            amenities: doc.propertyDetails.amenities || [],
            availableFrom: doc.propertyDetails.availableFrom,
            preferredTenants: doc.propertyDetails.preferredTenants,
          }
        : undefined,
      serviceDetails: doc.serviceDetails
        ? {
            category: doc.serviceDetails.category,
            pricingModel: doc.serviceDetails.pricingModel,
            startingPrice: doc.serviceDetails.startingPrice,
            experienceYears: doc.serviceDetails.experienceYears,
            serviceAreas: doc.serviceDetails.serviceAreas || [],
            workingDays: doc.serviceDetails.workingDays || [],
            workingHours: doc.serviceDetails.workingHours,
            guarantees: doc.serviceDetails.guarantees || null,
          }
        : undefined,
      moderation: {
        reviewedBy: doc.moderation?.reviewedBy?.toString() || null,
        reviewedAt: doc.moderation?.reviewedAt || null,
        rejectionReason: doc.moderation?.rejectionReason || null,
      },
      metrics: {
        views: doc.metrics?.views || 0,
        contactReveals: doc.metrics?.contactReveals || 0,
        savesCount: doc.metrics?.savesCount || 0,
      },
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date(0).toISOString(),
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date(0).toISOString(),
    };
  });

    return apiSuccess({
      listings,
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
