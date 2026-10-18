import { NextRequest } from "next/server";
import mongoose from "mongoose";
import { connectToDatabase } from "@/lib/db";
import { Report } from "@/models/Report";
import { AuditLog, AuditAction } from "@/models/AuditLog";
import { apiSuccess, handleRouteError } from "@/lib/api-response";
import { NotFoundError } from "@/lib/errors";
import { requireAdmin } from "@/lib/auth-guards";
import { z } from "zod";

const updateReportSchema = z.object({
  status: z.enum(["INVESTIGATING", "RESOLVED", "DISMISSED"]),
  adminNotes: z.string().trim().max(2000).optional(),
});

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await context.params;

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      throw new NotFoundError("Report not found with valid identifier");
    }

    const body = await request.json();
    const { status, adminNotes } = updateReportSchema.parse(body);

    await connectToDatabase();

    const report = await Report.findById(id);
    if (!report) {
      throw new NotFoundError("Report not found");
    }

    const adminObjectId = new mongoose.Types.ObjectId(session.user.id);
    const now = new Date();
    const previousStatus = report.status;

    report.status = status;
    if (adminNotes !== undefined) {
      report.adminNotes = adminNotes;
    }

    if (status === "RESOLVED" || status === "DISMISSED") {
      report.resolvedBy = adminObjectId;
      report.resolvedAt = now;
    }

    await report.save();

    // Determine audit action
    let auditAction: AuditAction;
    if (status === "RESOLVED") {
      auditAction = "RESOLVE_REPORT";
    } else if (status === "DISMISSED") {
      auditAction = "DISMISS_REPORT";
    } else {
      auditAction = "RESOLVE_REPORT"; // General moderation update
    }

    await AuditLog.create({
      adminUserId: adminObjectId,
      action: auditAction,
      targetCollection: "reports",
      targetId: report._id,
      previousState: { status: previousStatus },
      newState: { status: report.status },
      reason: adminNotes || null,
      createdAt: now,
    });

    return apiSuccess({
      id: report._id.toString(),
      listingId: report.listingId.toString(),
      status: report.status,
      adminNotes: report.adminNotes,
      resolvedBy: report.resolvedBy ? session.user.id : null,
      resolvedAt: report.resolvedAt ? report.resolvedAt.toISOString() : null,
      updatedAt: report.updatedAt.toISOString(),
    });
  } catch (error) {
    return handleRouteError(error);
  }
}
