import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Listing } from "@/models/Listing";
// Make sure User model is registered before population
import "@/models/User";
import { apiSuccess, handleRouteError } from "@/lib/api-response";
import {
  listingQuerySchema,
  createPropertyListingSchema,
  createServiceListingSchema,
} from "@/lib/validations/listing";
import { requireAuth } from "@/lib/auth-guards";
import { generateListingSlug } from "@/lib/slug";
import { isTrustedStorageUrl, verifyStorageFileExists } from "@/lib/storage";
import { ValidationError } from "@/lib/errors";
import { ListingSummary } from "@/types/listing";
import { buildListingFilter } from "@/lib/listings-data";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Parse & validate query parameters
    const query = listingQuerySchema.parse({
      type: searchParams.get("type") || undefined,
      cityCode: searchParams.get("cityCode") || undefined,
      locality: searchParams.get("locality") || undefined,
      search: searchParams.get("search") || undefined,
      purpose: searchParams.get("purpose") || undefined,
      propertyType: searchParams.get("propertyType") || undefined,
      bedrooms: searchParams.get("bedrooms") || undefined,
      furnishing: searchParams.get("furnishing") || undefined,
      category: searchParams.get("category") || undefined,
      pricingModel: searchParams.get("pricingModel") || undefined,
      minPrice: searchParams.get("minPrice") || undefined,
      maxPrice: searchParams.get("maxPrice") || undefined,
      page: searchParams.get("page") || undefined,
      limit: searchParams.get("limit") || undefined,
      sortBy: searchParams.get("sortBy") || undefined,
      sortOrder: searchParams.get("sortOrder") || undefined,
    });

    await connectToDatabase();

    const filter = buildListingFilter(query);

    // Sorting
    const sortMultiplier = query.sortOrder === "asc" ? 1 : -1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let sortObj: Record<string, any> = { createdAt: -1 };

    if (query.sortBy === "price") {
      if (query.type === "SERVICE") {
        sortObj = { "serviceDetails.startingPrice": sortMultiplier };
      } else {
        sortObj = { "propertyDetails.price": sortMultiplier };
      }
    } else if (query.sortBy === "title") {
      sortObj = { title: sortMultiplier };
    } else {
      sortObj = { createdAt: sortMultiplier };
    }

    const skip = (query.page - 1) * query.limit;

    const [totalCount, docs] = await Promise.all([
      Listing.countDocuments(filter),
      Listing.find(filter)
        .select("-location.streetAddress -moderation") // Mask street address and moderation notes
        .populate("ownerId", "name image")
        .sort(sortObj)
        .skip(skip)
        .limit(query.limit)
        .lean(),
    ]);

    const totalPages = Math.ceil(totalCount / query.limit);

    // Format output
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
        propertyDetails: doc.propertyDetails,
        serviceDetails: doc.serviceDetails,
        providerName: owner?.name || undefined,
        providerAvatar: owner?.image || undefined,
        createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
      };
    });

    return apiSuccess(items, 200, {
      page: query.page,
      limit: query.limit,
      totalCount,
      totalPages,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();

    const isService = body.type === "SERVICE";
    const defaultCityCode = process.env.NEXT_PUBLIC_LAUNCH_CITY_CODE || "METRO";

    await connectToDatabase();

    if (isService) {
      const validatedData = createServiceListingSchema.parse(body);

      // Validate photo URLs originate from trusted storage and exist
      if (validatedData.photos && validatedData.photos.length > 0) {
        for (const photo of validatedData.photos) {
          if (!isTrustedStorageUrl(photo.url)) {
            throw new ValidationError(
              `Image URL "${photo.url}" does not originate from authorized marketplace storage.`
            );
          }
          const exists = await verifyStorageFileExists(photo.url);
          if (!exists) {
            throw new ValidationError(
              `Referenced image "${photo.url}" does not exist in authorized storage. Please re-upload.`
            );
          }
        }
      }

      // Generate unique slug
      let slug = generateListingSlug(validatedData.title);
      let existingSlug = await Listing.findOne({ slug }).select("_id").lean();
      let attempts = 0;
      while (existingSlug && attempts < 5) {
        slug = generateListingSlug(validatedData.title);
        existingSlug = await Listing.findOne({ slug }).select("_id").lean();
        attempts++;
      }

      const photos = (validatedData.photos || []).map((photo, index) => ({
        ...photo,
        isPrimary: photo.isPrimary || index === 0,
      }));

      const newListing = await Listing.create({
        type: "SERVICE",
        status: validatedData.status || "PENDING_REVIEW",
        title: validatedData.title,
        slug,
        description: validatedData.description,
        ownerId: new mongoose.Types.ObjectId(session.user.id),
        location: {
          city: validatedData.location.city,
          cityCode: (validatedData.location.cityCode || defaultCityCode).toUpperCase(),
          locality: validatedData.location.locality,
          streetAddress: validatedData.location.streetAddress || null,
          geo: validatedData.location.geo || { type: "Point", coordinates: [0, 0] },
        },
        contactPreferences: {
          phone: validatedData.contactPreferences?.phone || session.user.phone || null,
          whatsapp: validatedData.contactPreferences?.whatsapp || session.user.whatsapp || null,
          showPhone: validatedData.contactPreferences?.showPhone ?? true,
          showWhatsapp: validatedData.contactPreferences?.showWhatsapp ?? true,
        },
        photos,
        serviceDetails: {
          category: validatedData.serviceDetails.category,
          pricingModel: validatedData.serviceDetails.pricingModel,
          startingPrice: validatedData.serviceDetails.startingPrice,
          experienceYears: validatedData.serviceDetails.experienceYears,
          serviceAreas: validatedData.serviceDetails.serviceAreas,
          workingDays: validatedData.serviceDetails.workingDays,
          workingHours: validatedData.serviceDetails.workingHours,
          guarantees: validatedData.serviceDetails.guarantees || undefined,
        },
        moderation: {},
        metrics: { views: 0, contactReveals: 0, savesCount: 0 },
      });

      return apiSuccess(
        {
          id: newListing._id.toString(),
          slug: newListing.slug,
          title: newListing.title,
          status: newListing.status,
          type: newListing.type,
          createdAt: newListing.createdAt,
        },
        201
      );
    } else {
      // Strict Zod schema validation
      const validatedData = createPropertyListingSchema.parse(body);

      // Validate photo URLs originate from trusted storage and exist
      if (validatedData.photos && validatedData.photos.length > 0) {
        for (const photo of validatedData.photos) {
          if (!isTrustedStorageUrl(photo.url)) {
            throw new ValidationError(
              `Image URL "${photo.url}" does not originate from authorized marketplace storage.`
            );
          }
          const exists = await verifyStorageFileExists(photo.url);
          if (!exists) {
            throw new ValidationError(
              `Referenced image "${photo.url}" does not exist in authorized storage. Please re-upload.`
            );
          }
        }
      }

      // Generate unique slug
      let slug = generateListingSlug(validatedData.title);
      let existingSlug = await Listing.findOne({ slug }).select("_id").lean();
      let attempts = 0;
      while (existingSlug && attempts < 5) {
        slug = generateListingSlug(validatedData.title);
        existingSlug = await Listing.findOne({ slug }).select("_id").lean();
        attempts++;
      }

      // Set primary photo if none marked
      const photos = (validatedData.photos || []).map((photo, index) => ({
        ...photo,
        isPrimary: photo.isPrimary || index === 0,
      }));

      // Create listing with owner strictly bound to authenticated session user
      const newListing = await Listing.create({
        type: "PROPERTY",
        status: validatedData.status || "PENDING_REVIEW",
        title: validatedData.title,
        slug,
        description: validatedData.description,
        ownerId: new mongoose.Types.ObjectId(session.user.id),
        location: {
          city: validatedData.location.city,
          cityCode: (validatedData.location.cityCode || defaultCityCode).toUpperCase(),
          locality: validatedData.location.locality,
          streetAddress: validatedData.location.streetAddress || null,
          geo: validatedData.location.geo || { type: "Point", coordinates: [0, 0] },
        },
        contactPreferences: {
          phone: validatedData.contactPreferences?.phone || session.user.phone || null,
          whatsapp: validatedData.contactPreferences?.whatsapp || session.user.whatsapp || null,
          showPhone: validatedData.contactPreferences?.showPhone ?? true,
          showWhatsapp: validatedData.contactPreferences?.showWhatsapp ?? true,
        },
        photos,
        propertyDetails: {
          purpose: validatedData.propertyDetails.purpose,
          propertyType: validatedData.propertyDetails.propertyType,
          price: validatedData.propertyDetails.price,
          securityDeposit: validatedData.propertyDetails.securityDeposit,
          maintenanceFee: validatedData.propertyDetails.maintenanceFee,
          bedrooms: validatedData.propertyDetails.bedrooms,
          bathrooms: validatedData.propertyDetails.bathrooms,
          balconies: validatedData.propertyDetails.balconies,
          carpetArea: validatedData.propertyDetails.carpetArea,
          superArea: validatedData.propertyDetails.superArea,
          furnishing: validatedData.propertyDetails.furnishing,
          floorNumber: validatedData.propertyDetails.floorNumber,
          totalFloors: validatedData.propertyDetails.totalFloors,
          amenities: validatedData.propertyDetails.amenities || [],
          availableFrom: validatedData.propertyDetails.availableFrom
            ? new Date(validatedData.propertyDetails.availableFrom)
            : new Date(),
          preferredTenants: validatedData.propertyDetails.preferredTenants,
        },
        moderation: {},
        metrics: { views: 0, contactReveals: 0, savesCount: 0 },
      });

      return apiSuccess(
        {
          id: newListing._id.toString(),
          slug: newListing.slug,
          title: newListing.title,
          status: newListing.status,
          type: newListing.type,
          createdAt: newListing.createdAt,
        },
        201
      );
    }
  } catch (error) {
    return handleRouteError(error);
  }
}

