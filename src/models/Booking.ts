import mongoose, { Schema, Document, Model } from "mongoose";
import {
  BookingStatus,
  BookingServiceAddress,
  BookingAlternativeDetails,
  BookingStatusHistoryItem,
} from "@/types/booking";

export interface IBookingDocument extends Document {
  _id: mongoose.Types.ObjectId;
  customerId: mongoose.Types.ObjectId;
  providerId: mongoose.Types.ObjectId;
  listingId: mongoose.Types.ObjectId;
  status: BookingStatus;
  requestedDate: Date;
  timeSlot: string;
  serviceAddress: BookingServiceAddress;
  customerPhone: string;
  customerNotes?: string | null;
  alternativeDetails?: BookingAlternativeDetails | null;
  providerNotes?: string | null;
  statusHistory: BookingStatusHistoryItem[];
  createdAt: Date;
  updatedAt: Date;
}

const ServiceAddressSchema = new Schema<BookingServiceAddress>(
  {
    line1: { type: String, required: true, trim: true, maxlength: 140 },
    locality: { type: String, required: true, trim: true, maxlength: 100 },
    city: { type: String, default: null, trim: true, maxlength: 100 },
  },
  { _id: false }
);

const AlternativeDetailsSchema = new Schema<BookingAlternativeDetails>(
  {
    proposedDate: { type: Date, required: true },
    proposedSlot: { type: String, required: true, trim: true },
    note: { type: String, default: null, trim: true, maxlength: 500 },
    proposedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const StatusHistoryItemSchema = new Schema(
  {
    status: {
      type: String,
      enum: [
        "PENDING",
        "ACCEPTED",
        "REJECTED",
        "ALTERNATIVE_PROPOSED",
        "CANCELLED",
        "COMPLETED",
      ],
      required: true,
    },
    changedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    timestamp: { type: Date, default: Date.now },
    note: { type: String, default: null, maxlength: 500 },
  },
  { _id: false }
);

const BookingSchema = new Schema<IBookingDocument>(
  {
    customerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Customer ID is required"],
      index: true,
    },
    providerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Provider ID is required"],
      index: true,
    },
    listingId: {
      type: Schema.Types.ObjectId,
      ref: "Listing",
      required: [true, "Listing ID is required"],
      index: true,
    },
    status: {
      type: String,
      enum: [
        "PENDING",
        "ACCEPTED",
        "REJECTED",
        "ALTERNATIVE_PROPOSED",
        "CANCELLED",
        "COMPLETED",
      ],
      default: "PENDING",
      index: true,
    },
    requestedDate: {
      type: Date,
      required: [true, "Requested date is required"],
    },
    timeSlot: {
      type: String,
      required: [true, "Time slot is required"],
      trim: true,
    },
    serviceAddress: {
      type: ServiceAddressSchema,
      required: [true, "Service address is required"],
    },
    customerPhone: {
      type: String,
      required: [true, "Customer phone number is required"],
      trim: true,
    },
    customerNotes: {
      type: String,
      default: null,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
      trim: true,
    },
    alternativeDetails: {
      type: AlternativeDetailsSchema,
      default: null,
    },
    providerNotes: {
      type: String,
      default: null,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
      trim: true,
    },
    statusHistory: {
      type: [StatusHistoryItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    collection: "bookings",
  }
);

// Compound queries for customer and provider booking lists
BookingSchema.index({ customerId: 1, status: 1, requestedDate: -1 });
BookingSchema.index({ providerId: 1, status: 1, requestedDate: -1 });
BookingSchema.index({ listingId: 1, status: 1 });
BookingSchema.index({ createdAt: -1 });

export const Booking: Model<IBookingDocument> =
  mongoose.models.Booking || mongoose.model<IBookingDocument>("Booking", BookingSchema);
