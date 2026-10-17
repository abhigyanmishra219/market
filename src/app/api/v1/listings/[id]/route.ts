import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Listing } from "@/models/Listing";
import "@/models/User";
import { apiSuccess, handleRouteError } from "@/lib/api-response";
import { NotFoundError, ValidationError, ForbiddenError } from "@/lib/errors";
import { getCurrentSession, requireAuth, assertOwnership } from "@/lib/auth-guards";
import {
  updatePropertyListingSchema,
  updateServiceListingSchema,
} from "@/lib/validations/listing";
import { isTrustedStorageUrl } from "@/lib/storage";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id || typeof id !== "string") {
      throw new NotFoundError("Listing not found");
    }

    await connectToDatabase();

    // Query by MongoDB ObjectId or slug
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {};

    if (mongoose.Types.ObjectId.isValid(id)) {
      filter._id = new mongoose.Types.ObjectId(id);
    } else {
      filter.slug = id.toLowerCase().trim();
    }

    const doc = await Listing.findOne(filter)
      .populate("ownerId", "name image email createdAt")
      .lean();

    if (!doc) {
      throw new NotFoundError("Listing not found or has been unlisted");
    }

    const session = await getCurrentSession();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const owner = doc.ownerId && typeof doc.ownerId === "object" ? (doc.ownerId as any) : null;
    const isOwner = session?.user?.id && owner && owner._id?.toString() === session.user.id.toString();
    const isAdmin = session?.user?.role === "ADMIN";

    // Non-owners / non-admins may ONLY see APPROVED listings
    if (!isOwner && !isAdmin) {
      if (doc.status !== "APPROVED") {
        throw new NotFoundError("Listing not found or has been unlisted");
      }

      // Proactively increment view metric asynchronously for public views
      Listing.updateOne({ _id: doc._id }, { $inc: { "metrics.views": 1 } }).exec();
    }

    const data = {
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
        // Street address is disclosed only to owner or admin
        streetAddress: isOwner || isAdmin ? doc.location.streetAddress || null : null,
        geo: doc.location.geo,
      },
      contactPreferences: {
        phone: isOwner || isAdmin ? doc.contactPreferences.phone || null : null,
        whatsapp: isOwner || isAdmin ? doc.contactPreferences.whatsapp || null : null,
        showPhone: doc.contactPreferences.showPhone,
        showWhatsapp: doc.contactPreferences.showWhatsapp,
      },
      photos: doc.photos || [],
      propertyDetails: doc.propertyDetails,
      serviceDetails: doc.serviceDetails,
      owner: owner
        ? {
            id: owner._id.toString(),
            name: owner.name,
            image: owner.image,
            memberSince: owner.createdAt ? new Date(owner.createdAt).toISOString() : undefined,
          }
        : null,
      moderation: isOwner || isAdmin
        ? {
            reviewedBy: doc.moderation?.reviewedBy ? doc.moderation.reviewedBy.toString() : null,
            reviewedAt: doc.moderation?.reviewedAt ? new Date(doc.moderation.reviewedAt).toISOString() : null,
            rejectionReason: doc.moderation?.rejectionReason || null,
          }
        : undefined,
      metrics: {
        views: (doc.metrics?.views || 0) + (isOwner || isAdmin ? 0 : 1),
        contactReveals: doc.metrics?.contactReveals || 0,
        savesCount: doc.metrics?.savesCount || 0,
      },
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date(0).toISOString(),
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : new Date(0).toISOString(),
    };

    return apiSuccess(data);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await context.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Listing not found with valid identifier");
    }

    await connectToDatabase();
    const listing = await Listing.findById(id);

    if (!listing) {
      throw new NotFoundError("Listing not found");
    }

    // Ownership verification
    assertOwnership(listing.ownerId, session);

    const body = await request.json();
    const isService = listing.type === "SERVICE";
    const validatedData = isService
      ? updateServiceListingSchema.parse(body)
      : updatePropertyListingSchema.parse(body);

    // Validate photo URLs are from trusted storage
    if (validatedData.photos && validatedData.photos.length > 0) {
      for (const photo of validatedData.photos) {
        if (!isTrustedStorageUrl(photo.url)) {
          throw new ValidationError(
            `Image URL "${photo.url}" does not originate from authorized marketplace storage.`
          );
        }
      }
    }

    // Check if critical fields were edited
    const isCriticalEdit = Boolean(
      validatedData.title ||
        validatedData.description ||
        ("propertyDetails" in validatedData && validatedData.propertyDetails) ||
        ("serviceDetails" in validatedData && validatedData.serviceDetails) ||
        validatedData.location ||
        validatedData.photos
    );

    // State machine & re-review rule:
    // If an APPROVED listing receives a material edit, it transitions back to PENDING_REVIEW
    if (listing.status === "APPROVED" && isCriticalEdit) {
      listing.status = "PENDING_REVIEW";
      listing.moderation = {};
    } else if (listing.status === "REJECTED" && isCriticalEdit) {
      // Owner addressed issues on rejected listing
      listing.status = "PENDING_REVIEW";
      listing.moderation.rejectionReason = null;
    } else if (validatedData.status) {
      // Explicit status change by owner
      if (validatedData.status === "APPROVED" && session.user.role !== "ADMIN") {
        throw new ForbiddenError("Only authorized administrators may approve listings.");
      }
      listing.status = validatedData.status;
    }

    // Explicitly apply permitted updates (preventing mass-assignment)
    if (validatedData.title) listing.title = validatedData.title;
    if (validatedData.description) listing.description = validatedData.description;

    if (validatedData.location) {
      listing.location = {
        city: validatedData.location.city || listing.location.city,
        cityCode: (validatedData.location.cityCode || listing.location.cityCode).toUpperCase(),
        locality: validatedData.location.locality || listing.location.locality,
        streetAddress:
          validatedData.location.streetAddress !== undefined
            ? validatedData.location.streetAddress
            : listing.location.streetAddress,
        geo: validatedData.location.geo || listing.location.geo,
      };
    }

    if (validatedData.contactPreferences) {
      listing.contactPreferences = {
        phone:
          validatedData.contactPreferences.phone !== undefined
            ? validatedData.contactPreferences.phone
            : listing.contactPreferences.phone,
        whatsapp:
          validatedData.contactPreferences.whatsapp !== undefined
            ? validatedData.contactPreferences.whatsapp
            : listing.contactPreferences.whatsapp,
        showPhone:
          validatedData.contactPreferences.showPhone !== undefined
            ? validatedData.contactPreferences.showPhone
            : listing.contactPreferences.showPhone,
        showWhatsapp:
          validatedData.contactPreferences.showWhatsapp !== undefined
            ? validatedData.contactPreferences.showWhatsapp
            : listing.contactPreferences.showWhatsapp,
      };
    }

    if (validatedData.photos) {
      listing.photos = validatedData.photos.map((p, idx) => ({
        ...p,
        isPrimary: p.isPrimary || idx === 0,
      }));
    }

    if (!isService && "propertyDetails" in validatedData && validatedData.propertyDetails && listing.type === "PROPERTY") {
      listing.propertyDetails = {
        ...listing.propertyDetails,
        ...validatedData.propertyDetails,
        availableFrom: validatedData.propertyDetails.availableFrom
          ? new Date(validatedData.propertyDetails.availableFrom)
          : listing.propertyDetails?.availableFrom || new Date(),
      };
    }

    if (isService && "serviceDetails" in validatedData && validatedData.serviceDetails && listing.type === "SERVICE") {
      listing.serviceDetails = {
        category: validatedData.serviceDetails.category || listing.serviceDetails?.category || "OTHER",
        pricingModel: validatedData.serviceDetails.pricingModel || listing.serviceDetails?.pricingModel || "QUOTE_BASED",
        startingPrice:
          validatedData.serviceDetails.startingPrice !== undefined
            ? validatedData.serviceDetails.startingPrice
            : listing.serviceDetails?.startingPrice,
        experienceYears:
          validatedData.serviceDetails.experienceYears !== undefined
            ? validatedData.serviceDetails.experienceYears
            : listing.serviceDetails?.experienceYears || 0,
        serviceAreas: validatedData.serviceDetails.serviceAreas || listing.serviceDetails?.serviceAreas || [],
        workingDays: validatedData.serviceDetails.workingDays || listing.serviceDetails?.workingDays || [],
        workingHours:
          validatedData.serviceDetails.workingHours ||
          listing.serviceDetails?.workingHours || { start: "08:00", end: "20:00" },
        guarantees:
          validatedData.serviceDetails.guarantees !== undefined
            ? validatedData.serviceDetails.guarantees || undefined
            : listing.serviceDetails?.guarantees || undefined,
      };
    }

    await listing.save();

    return apiSuccess({
      id: listing._id.toString(),
      slug: listing.slug,
      title: listing.title,
      status: listing.status,
      updatedAt: listing.updatedAt,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAuth();
    const { id } = await context.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Listing not found with valid identifier");
    }

    await connectToDatabase();
    const listing = await Listing.findById(id);

    if (!listing) {
      throw new NotFoundError("Listing not found");
    }

    // Ownership verification
    assertOwnership(listing.ownerId, session);

    // Soft delete / archival policy
    listing.status = "ARCHIVED";
    await listing.save();

    return apiSuccess({
      message: "Listing successfully archived.",
      id: listing._id.toString(),
      status: listing.status,
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
