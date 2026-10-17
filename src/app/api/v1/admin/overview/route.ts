import { connectToDatabase } from "@/lib/db";
import { Listing } from "@/models/Listing";
import { User } from "@/models/User";
import { apiSuccess, handleRouteError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guards";

export async function GET() {
  try {
    // Reusable server-side admin authorization verification
    await requireAdmin();

    await connectToDatabase();

    // Query real statistics using Promise.all for fast concurrent execution
    const [
      propertiesTotal,
      servicesTotal,
      pendingProperties,
      pendingServices,
      approvedProperties,
      approvedServices,
      rejectedProperties,
      rejectedServices,
      pausedTotal,
      archivedTotal,
      usersTotal,
    ] = await Promise.all([
      Listing.countDocuments({ type: "PROPERTY" }),
      Listing.countDocuments({ type: "SERVICE" }),
      Listing.countDocuments({ type: "PROPERTY", status: "PENDING_REVIEW" }),
      Listing.countDocuments({ type: "SERVICE", status: "PENDING_REVIEW" }),
      Listing.countDocuments({ type: "PROPERTY", status: "APPROVED" }),
      Listing.countDocuments({ type: "SERVICE", status: "APPROVED" }),
      Listing.countDocuments({ type: "PROPERTY", status: "REJECTED" }),
      Listing.countDocuments({ type: "SERVICE", status: "REJECTED" }),
      Listing.countDocuments({ status: "PAUSED" }),
      Listing.countDocuments({ status: "ARCHIVED" }),
      User.countDocuments(),
    ]);

    return apiSuccess({
      propertiesTotal,
      servicesTotal,
      pendingProperties,
      pendingServices,
      approvedProperties,
      approvedServices,
      rejectedProperties,
      rejectedServices,
      pendingTotal: pendingProperties + pendingServices,
      approvedTotal: approvedProperties + approvedServices,
      rejectedTotal: rejectedProperties + rejectedServices,
      pausedTotal,
      archivedTotal,
      usersTotal,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
