import { Types } from "mongoose";

/**
 * Booking Lifecycle Status Enums
 */
export type BookingStatus =
  | "PENDING"
  | "ACCEPTED"
  | "REJECTED"
  | "ALTERNATIVE_PROPOSED"
  | "CANCELLED"
  | "COMPLETED";

/**
 * Preferred Time Slots for Appointment Requests
 */
export type BookingTimeSlot = "MORNING" | "AFTERNOON" | "EVENING" | string;

export interface BookingServiceAddress {
  line1: string;
  locality: string;
  city?: string;
}

export interface BookingAlternativeDetails {
  proposedDate: Date;
  proposedSlot: string;
  note?: string | null;
  proposedAt: Date;
}

export interface BookingStatusHistoryItem {
  status: BookingStatus;
  changedBy: Types.ObjectId | string;
  timestamp: Date;
  note?: string | null;
}

export interface IBooking {
  _id: Types.ObjectId | string;
  customerId: Types.ObjectId | string;
  providerId: Types.ObjectId | string;
  listingId: Types.ObjectId | string;
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
