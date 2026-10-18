import mongoose, { Schema, Document, Model } from "mongoose";

export type ReportReason =
  | "SPAM"
  | "FAKE_PROPERTY"
  | "INACCURATE_PRICE"
  | "OFFENSIVE_CONTENT"
  | "OTHER";

export type ReportStatus = "OPEN" | "INVESTIGATING" | "RESOLVED" | "DISMISSED";

export interface IReport extends Document {
  _id: mongoose.Types.ObjectId;
  listingId: mongoose.Types.ObjectId;
  reporterId?: mongoose.Types.ObjectId | null;
  reporterEmail: string;
  reason: ReportReason;
  details: string;
  status: ReportStatus;
  adminNotes?: string | null;
  resolvedBy?: mongoose.Types.ObjectId | null;
  resolvedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<IReport>(
  {
    listingId: {
      type: Schema.Types.ObjectId,
      ref: "Listing",
      required: [true, "Listing ID is required"],
      index: true,
    },
    reporterId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    reporterEmail: {
      type: String,
      required: [true, "Reporter email is required"],
      lowercase: true,
      trim: true,
      maxlength: [150, "Email cannot exceed 150 characters"],
    },
    reason: {
      type: String,
      enum: ["SPAM", "FAKE_PROPERTY", "INACCURATE_PRICE", "OFFENSIVE_CONTENT", "OTHER"],
      required: [true, "Report reason is required"],
    },
    details: {
      type: String,
      required: [true, "Report details are required"],
      trim: true,
      minlength: [10, "Details must be at least 10 characters"],
      maxlength: [2000, "Details cannot exceed 2000 characters"],
    },
    status: {
      type: String,
      enum: ["OPEN", "INVESTIGATING", "RESOLVED", "DISMISSED"],
      default: "OPEN",
      index: true,
    },
    adminNotes: {
      type: String,
      default: null,
      trim: true,
      maxlength: [2000, "Admin notes cannot exceed 2000 characters"],
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    resolvedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    collection: "reports",
  }
);

// Compound index for status filtering and anti-spam duplicate tracking
ReportSchema.index({ status: 1, createdAt: -1 });
ReportSchema.index({ listingId: 1, reporterEmail: 1, status: 1 });

export const Report: Model<IReport> =
  mongoose.models.Report || mongoose.model<IReport>("Report", ReportSchema);
