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
 * Constructs the MongoDB query filter for approved public listings.
 * Shared between Server Components (getPublicListings) and Route Handlers (/api/v1/listings).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildListingFilter(params: GetListingsParams = {}): Record<string, any> {
  // Security: Query ONLY approved listings
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filter: Record<string, any> = {
    status: "APPROVED",
  };

  if (params.type) {
    filter.type = params.type;
  }

  // City Code handling:
  // If cityCode is explicitly provided, enforce it (unless "ALL").
  // If cityCode is not passed, and no specific locality or search query was requested,
  // default to configured NEXT_PUBLIC_LAUNCH_CITY_CODE (unless "ALL").
  const activeCityCode = params.cityCode;
  if (activeCityCode && activeCityCode !== "ALL") {
    filter["location.cityCode"] = activeCityCode.toUpperCase();
  } else if (
    !activeCityCode &&
    !params.locality &&
    !params.search &&
    process.env.NEXT_PUBLIC_LAUNCH_CITY_CODE &&
    process.env.NEXT_PUBLIC_LAUNCH_CITY_CODE !== "ALL"
  ) {
    filter["location.cityCode"] = process.env.NEXT_PUBLIC_LAUNCH_CITY_CODE.toUpperCase();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const andClauses: Record<string, any>[] = [];

  // 1. Locality / Area / City Place search
  if (params.locality && params.locality.trim()) {
    const cleanLocality = escapeRegex(params.locality.trim().replace(/\s+/g, " "));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const placeOr: Record<string, any>[] = [
      { "location.locality": { $regex: cleanLocality, $options: "i" } },
      { "location.city": { $regex: cleanLocality, $options: "i" } },
      { "location.cityCode": { $regex: cleanLocality, $options: "i" } },
    ];
    if (params.type === "SERVICE" || !params.type) {
      placeOr.push({ "serviceDetails.serviceAreas": { $regex: cleanLocality, $options: "i" } });
    }
    andClauses.push({ $or: placeOr });
  }

  // 2. Keyword Search filter
  if (params.search && params.search.trim()) {
    const cleanSearch = escapeRegex(params.search.trim().replace(/\s+/g, " "));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const searchOr: Record<string, any>[] = [
      { title: { $regex: cleanSearch, $options: "i" } },
      { description: { $regex: cleanSearch, $options: "i" } },
      { "location.locality": { $regex: cleanSearch, $options: "i" } },
      { "location.city": { $regex: cleanSearch, $options: "i" } },
    ];

    const lower = params.search.trim().toLowerCase();

    // Property-specific keyword mappings
    if (params.type === "PROPERTY" || !params.type) {
      if (/apartment|flat/i.test(lower)) searchOr.push({ "propertyDetails.propertyType": "APARTMENT" });
      if (/villa/i.test(lower)) searchOr.push({ "propertyDetails.propertyType": "VILLA" });
      if (/house|independent/i.test(lower)) searchOr.push({ "propertyDetails.propertyType": "INDEPENDENT_HOUSE" });
      if (/plot|land/i.test(lower)) searchOr.push({ "propertyDetails.propertyType": "PLOT" });
      if (/commercial|office|shop/i.test(lower)) searchOr.push({ "propertyDetails.propertyType": "COMMERCIAL" });
      if (/\brent\b/i.test(lower)) searchOr.push({ "propertyDetails.purpose": "FOR_RENT" });
      if (/\bsale\b|\bbuy\b/i.test(lower)) searchOr.push({ "propertyDetails.purpose": "FOR_SALE" });
      if (/pg|co-living|coliving/i.test(lower)) searchOr.push({ "propertyDetails.purpose": "PG_CO_LIVING" });
    }

    // Service-specific keyword mappings
    if (params.type === "SERVICE" || !params.type) {
      searchOr.push({ "serviceDetails.serviceAreas": { $regex: cleanSearch, $options: "i" } });
      searchOr.push({ "serviceDetails.category": { $regex: cleanSearch, $options: "i" } });

      const matchedCategories: string[] = [];
      if (/plumb/i.test(lower)) matchedCategories.push("PLUMBING");
      if (/electr/i.test(lower)) matchedCategories.push("ELECTRICAL");
      if (/carpent/i.test(lower)) matchedCategories.push("CARPENTRY");
      if (/clean/i.test(lower)) matchedCategories.push("CLEANING");
      if (/paint/i.test(lower)) matchedCategories.push("PAINTING");
      if (/appliance|repair|technician|ac\b|fridge|washing/i.test(lower)) matchedCategories.push("APPLIANCE_REPAIR");
      if (/pest|termite|cockroach/i.test(lower)) matchedCategories.push("PEST_CONTROL");
      if (/mover|pack|relocat/i.test(lower)) matchedCategories.push("MOVERS_PACKERS");

      if (matchedCategories.length > 0) {
        searchOr.push({ "serviceDetails.category": { $in: matchedCategories } });
      }
    }

    andClauses.push({ $or: searchOr });
  }

  // Combine clauses using $and if multiple groups exist
  if (andClauses.length === 1) {
    Object.assign(filter, andClauses[0]);
  } else if (andClauses.length > 1) {
    filter.$and = andClauses;
  }

  // Property filters
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

  // Service filters
  if (params.category) {
    filter["serviceDetails.category"] = params.category;
  }

  if (params.pricingModel) {
    filter["serviceDetails.pricingModel"] = params.pricingModel;
  }

  // Price range filters
  if (
    (params.minPrice !== undefined && !isNaN(params.minPrice)) ||
    (params.maxPrice !== undefined && !isNaN(params.maxPrice))
  ) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const priceBounds: Record<string, any> = {};
    if (params.minPrice !== undefined && !isNaN(params.minPrice)) priceBounds.$gte = params.minPrice;
    if (params.maxPrice !== undefined && !isNaN(params.maxPrice)) priceBounds.$lte = params.maxPrice;

    if (Object.keys(priceBounds).length > 0) {
      if (params.type === "SERVICE") {
        filter["serviceDetails.startingPrice"] = priceBounds;
      } else {
        filter["propertyDetails.price"] = priceBounds;
      }
    }
  }

  return filter;
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

    const filter = buildListingFilter(params);

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
            id: owner._id ? owner._id.toString() : doc.ownerId.toString(),
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
