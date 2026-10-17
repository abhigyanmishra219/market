import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Listing } from "@/models/Listing";
import { User } from "@/models/User";
import { apiSuccess, handleRouteError } from "@/lib/api-response";
import { NotFoundError, RateLimitError } from "@/lib/errors";
import { checkRateLimit } from "@/lib/rate-limiter";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id || typeof id !== "string") {
      throw new NotFoundError("Listing not found");
    }

    // Rate Limiting by Client IP (Anti-scraping: max 15 reveals per hour)
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      request.headers.get("x-real-ip") ||
      "127.0.0.1";

    const rateResult = checkRateLimit(ip, 15, 60 * 60 * 1000);
    if (!rateResult.allowed) {
      throw new RateLimitError(
        `Contact reveal limit exceeded (15 per hour). Please retry in ${rateResult.resetSeconds} seconds.`
      );
    }

    await connectToDatabase();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const filter: Record<string, any> = {
      status: "APPROVED",
    };

    if (mongoose.Types.ObjectId.isValid(id)) {
      filter._id = new mongoose.Types.ObjectId(id);
    } else {
      filter.slug = id.toLowerCase().trim();
    }

    const listing = await Listing.findOne(filter);
    if (!listing) {
      throw new NotFoundError("Listing not found or is no longer active");
    }

    const owner = await User.findById(listing.ownerId).select("phone whatsapp");

    const phone =
      listing.contactPreferences.showPhone
        ? listing.contactPreferences.phone || owner?.phone || null
        : null;

    const whatsapp =
      listing.contactPreferences.showWhatsapp
        ? listing.contactPreferences.whatsapp || owner?.whatsapp || null
        : null;

    let whatsappDeepLink: string | null = null;
    if (whatsapp) {
      const sanitizedPhone = whatsapp.replace(/[^0-9]/g, "");
      const host = request.headers.get("host") || "localhost:3000";
      const protocol = request.headers.get("x-forwarded-proto") || "http";
      const listingUrl = `${protocol}://${host}/${listing.type === "PROPERTY" ? "properties" : "services"}/${listing.slug || listing._id}`;
      const message = `Hello, I am interested in your listing '${listing.title}' on Marketplace. Link: ${listingUrl}. Is it still available?`;
      whatsappDeepLink = `https://wa.me/${sanitizedPhone}?text=${encodeURIComponent(message)}`;
    }

    // Increment reveal counter metric asynchronously
    Listing.updateOne({ _id: listing._id }, { $inc: { "metrics.contactReveals": 1 } }).exec();

    return apiSuccess({
      phone,
      whatsapp,
      whatsappDeepLink,
      showPhone: listing.contactPreferences.showPhone,
      showWhatsapp: listing.contactPreferences.showWhatsapp,
      rateLimit: {
        remaining: rateResult.remaining,
        resetSeconds: rateResult.resetSeconds,
      },
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
