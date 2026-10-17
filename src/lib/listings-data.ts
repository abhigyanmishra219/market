import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Listing } from "@/models/Listing";
import "@/models/User";
import { escapeRegex } from "@/lib/validations/listing";
import { ListingSummary } from "@/types/listing";

export interface GetListingsParams {
  type?: "PROPERTY" | "SERVICE";
  cityCode?: string;
  locality?: string;
  search?: string;
  purpose?: "FOR_RENT" | "FOR_SALE" | "PG_CO_LIVING";
  propertyType?: string;
  bedrooms?: string;
  furnishing?: "UNFURNISHED" | "SEMI_FURNISHED" | "FULLY_FURNISHED";
  category?: string;
  pricingModel?: "FIXED" | "HOURLY" | "QUOTE_BASED";
  minPrice?: number;
  maxPrice?: number;
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "price" | "title";
  sortOrder?: "asc" | "desc";
}

export interface GetListingsResult {
  items: ListingSummary[];
  pagination: {
    page: number;
    limit: number;
    totalCount: number;
    totalPages: number;
  };
}

/**
 * Defer database query to request time in Next.js Server Components,
 * preventing 'blocking-prerender-current-time' errors during static prerendering.
 */
async function markRequestTime(): Promise<void> {
  try {
    const { connection } = await import("next/server");
    await connection();
  } catch {
    // Outside Next.js request scope (e.g. standalone test scripts or CLI runners)
  }
}

/**
 * Fetch approved public listings directly from MongoDB for Server Components.
 */
export async function getPublicListings(params: GetListingsParams = {}): Promise<GetListingsResult> {
  await markRequestTime();
  const page = Math.max(1, params.page || 1);
  const limit = Math.min(50, Math.max(1, params.limit || 20));

  try {
    await connectToDatabase();

    // Security: Query ONLY approved listings
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {
      status: "APPROVED",
    };

    if (params.type) {
      filter.type = params.type;
    }

    const activeCityCode = params.cityCode || process.env.NEXT_PUBLIC_LAUNCH_CITY_CODE;
    if (activeCityCode && activeCityCode !== "ALL") {
      filter["location.cityCode"] = activeCityCode.toUpperCase();
    }

    if (params.locality) {
      filter["location.locality"] = {
        $regex: escapeRegex(params.locality),
        $options: "i",
      };
    }

    if (params.search) {
      const safeSearch = escapeRegex(params.search);
      filter.$or = [
        { title: { $regex: safeSearch, $options: "i" } },
        { description: { $regex: safeSearch, $options: "i" } },
        { "location.locality": { $regex: safeSearch, $options: "i" } },
      ];
    }

    if (params.purpose) {
      filter["propertyDetails.purpose"] = params.purpose;
    }

    if (params.propertyType) {
      const types = params.propertyType
        .split(",")
        .map((t) => t.trim().toUpperCase())
        .filter(Boolean);
      if (types.length > 0) {
        filter["propertyDetails.propertyType"] = { $in: types };
      }
    }

    if (params.bedrooms) {
      const bArray = params.bedrooms
        .split(",")
        .map((b) => parseInt(b.trim(), 10))
        .filter((n) => !isNaN(n));
      if (bArray.length > 0) {
        filter["propertyDetails.bedrooms"] = { $in: bArray };
      }
    }

    if (params.furnishing) {
      filter["propertyDetails.furnishing"] = params.furnishing;
    }

    if (params.category) {
      filter["serviceDetails.category"] = params.category;
    }

    if (params.pricingModel) {
      filter["serviceDetails.pricingModel"] = params.pricingModel;
    }

    if (params.minPrice !== undefined || params.maxPrice !== undefined) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const priceBounds: Record<string, any> = {};
      if (params.minPrice !== undefined) priceBounds.$gte = params.minPrice;
      if (params.maxPrice !== undefined) priceBounds.$lte = params.maxPrice;

      if (params.type === "SERVICE") {
        filter["serviceDetails.startingPrice"] = priceBounds;
      } else {
        filter["propertyDetails.price"] = priceBounds;
      }
    }

    const sortMultiplier = params.sortOrder === "asc" ? 1 : -1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let sortObj: Record<string, any> = { createdAt: -1 };

    if (params.sortBy === "price") {
      if (params.type === "SERVICE") {
        sortObj = { "serviceDetails.startingPrice": sortMultiplier };
      } else {
        sortObj = { "propertyDetails.price": sortMultiplier };
      }
    } else if (params.sortBy === "title") {
      sortObj = { title: sortMultiplier };
    } else {
      sortObj = { createdAt: sortMultiplier };
    }

    const skip = (page - 1) * limit;

    const [totalCount, docs] = await Promise.all([
      Listing.countDocuments(filter),
      Listing.find(filter)
        .select("-location.streetAddress -moderation") // Mask private fields
        .populate("ownerId", "name image")
        .sort(sortObj)
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const totalPages = Math.ceil(totalCount / limit);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: ListingSummary[] = docs.map((doc: any) => {
      const owner = doc.ownerId && typeof doc.ownerId === "object" ? doc.ownerId : null;
      return {
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
          geo: doc.location.geo,
        },
        contactPreferences: {
          showPhone: doc.contactPreferences.showPhone,
          showWhatsapp: doc.contactPreferences.showWhatsapp,
        },
        photos: doc.photos || [],
        propertyDetails: doc.propertyDetails
          ? {
              ...doc.propertyDetails,
              availableFrom: doc.propertyDetails.availableFrom
                ? new Date(doc.propertyDetails.availableFrom).toISOString()
                : (doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date(0).toISOString()),
            }
          : undefined,
        serviceDetails: doc.serviceDetails,
        providerName: owner?.name || undefined,
        providerAvatar: owner?.image || undefined,
        createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date(0).toISOString(),
      };
    });

    return {
      items,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
      },
    };
  } catch (error) {
    console.warn(
      "[LISTINGS_DATA_WARNING] Database unreachable or query failed in getPublicListings:",
      error instanceof Error ? error.message : error
    );
    return {
      items: [],
      pagination: {
        page,
        limit,
        totalCount: 0,
        totalPages: 0,
      },
    };
  }
}

/**
 * Fetch a single approved listing by ObjectId or slug directly from MongoDB for Server Components.
 */
export async function getPublicListingByIdOrSlug(idOrSlug: string) {
  if (!idOrSlug) return null;
  await markRequestTime();

  try {
    await connectToDatabase();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {
      status: "APPROVED",
    };

    if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
      filter._id = new mongoose.Types.ObjectId(idOrSlug);
    } else {
      filter.slug = idOrSlug.toLowerCase().trim();
    }

    const doc = await Listing.findOne(filter)
      .select("-location.streetAddress -moderation") // Privacy: omit private address & admin notes
      .populate("ownerId", "name image createdAt")
      .lean();

    if (!doc) return null;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const owner = doc.ownerId && typeof doc.ownerId === "object" ? (doc.ownerId as any) : null;

    return {
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
        geo: doc.location.geo,
      },
      contactPreferences: {
        phone: doc.contactPreferences.phone || null,
        whatsapp: doc.contactPreferences.whatsapp || null,
        showPhone: doc.contactPreferences.showPhone,
        showWhatsapp: doc.contactPreferences.showWhatsapp,
      },
      photos: doc.photos || [],
      propertyDetails: doc.propertyDetails
        ? {
            ...doc.propertyDetails,
            availableFrom: doc.propertyDetails.availableFrom
              ? new Date(doc.propertyDetails.availableFrom).toISOString()
              : (doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date(0).toISOString()),
          }
        : undefined,
      serviceDetails: doc.serviceDetails,
      owner: owner
        ? {
            name: owner.name,
            image: owner.image,
            memberSince: owner.createdAt ? new Date(owner.createdAt).toISOString() : undefined,
          }
        : null,
      metrics: {
        views: doc.metrics?.views || 0,
        contactReveals: doc.metrics?.contactReveals || 0,
        savesCount: doc.metrics?.savesCount || 0,
      },
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date(0).toISOString(),
      updatedAt: doc.updatedAt
        ? new Date(doc.updatedAt).toISOString()
        : (doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date(0).toISOString()),
    };
  } catch (error) {
    console.warn(
      "[LISTINGS_DATA_WARNING] Database unreachable or query failed in getPublicListingByIdOrSlug:",
      error instanceof Error ? error.message : error
    );
    return null;
  }
}
