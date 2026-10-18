import mongoose, { Schema, Document, Model } from "mongoose";

export type AuditAction =
  | "APPROVE_LISTING"
  | "REJECT_LISTING"
  | "ARCHIVE_LISTING"
  | "PAUSE_LISTING"
  | "RESOLVE_REPORT"
  | "DISMISS_REPORT";

export type AuditTargetCollection = "listings" | "reports" | "users";

export interface IAuditLog extends Document {
  _id: mongoose.Types.ObjectId;
  adminUserId: mongoose.Types.ObjectId;
  action: AuditAction;
  targetCollection: AuditTargetCollection;
  targetId: mongoose.Types.ObjectId;
  previousState?: Record<string, unknown> | null;
  newState?: Record<string, unknown> | null;
  reason?: string | null;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    adminUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Admin user ID is required"],
      index: true,
    },
    action: {
      type: String,
      enum: [
        "APPROVE_LISTING",
        "REJECT_LISTING",
        "ARCHIVE_LISTING",
        "PAUSE_LISTING",
        "RESOLVE_REPORT",
        "DISMISS_REPORT",
      ],
      required: [true, "Audit action is required"],
    },
    targetCollection: {
      type: String,
      enum: ["listings", "reports", "users"],
      required: [true, "Target collection is required"],
      index: true,
    },
    targetId: {
      type: Schema.Types.ObjectId,
      required: [true, "Target document ID is required"],
      index: true,
    },
    previousState: {
      type: Schema.Types.Mixed,
      default: null,
    },
    newState: {
      type: Schema.Types.Mixed,
      default: null,
    },
    reason: {
      type: String,
      default: null,
      maxlength: [1000, "Reason cannot exceed 1000 characters"],
    },
    createdAt: {
      type: Date,
      default: Date.now,
      immutable: true,
    },
  },
  {
    timestamps: false,
    collection: "auditLogs",
  }
);

AuditLogSchema.index({ adminUserId: 1, createdAt: -1 });
AuditLogSchema.index({ targetCollection: 1, targetId: 1 });
AuditLogSchema.index({ createdAt: -1 });

export const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);
