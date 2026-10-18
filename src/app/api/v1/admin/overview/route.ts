import { connectToDatabase } from "@/lib/db";
import { Listing } from "@/models/Listing";
import { User } from "@/models/User";
import { Report } from "@/models/Report";
import { apiSuccess, handleRouteError } from "@/lib/api-response";
import { requireAdmin } from "@/lib/auth-guards";

export async function GET() {
  try {
    // Reusable server-side admin authorization verification
    await requireAdmin();

    await connectToDatabase();

    // Query real statistics concurrently from actual database collections
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
      openReports,
      resolvedReports,
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
      Report.countDocuments({ status: "OPEN" }),
      Report.countDocuments({ status: "RESOLVED" }),
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
      openReports,
      resolvedReports,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
