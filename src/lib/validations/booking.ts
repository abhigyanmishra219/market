import { z } from "zod";

/**
 * Validates a 24-character hexadecimal MongoDB ObjectId string.
 */
export const objectIdSchema = z
  .string()
  .trim()
  .regex(/^[0-9a-fA-F]{24}$/, "Invalid MongoDB ObjectId");

/**
 * Service address schema for booking request
 */
export const bookingServiceAddressSchema = z.object({
  line1: z
    .string()
    .trim()
    .min(3, "Street address must be at least 3 characters")
    .max(140, "Street address cannot exceed 140 characters"),
  locality: z
    .string()
    .trim()
    .min(2, "Locality must be at least 2 characters")
    .max(100, "Locality cannot exceed 100 characters"),
  city: z.string().trim().max(100).optional().nullable(),
});

/**
 * Schema for customer submitting a service booking request
 */
export const createBookingSchema = z
  .object({
    listingId: objectIdSchema,
    requestedDate: z.string().refine(
      (val) => {
        const date = new Date(val);
        if (isNaN(date.getTime())) return false;
        // Must be in the future (at least after today's midnight)
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return date > now;
      },
      {
        message: "Requested appointment date must be in the future",
      }
    ),
    timeSlot: z
      .string()
      .trim()
      .min(2, "Time slot must be specified (e.g. MORNING or 10:00 AM)")
      .max(50, "Time slot cannot exceed 50 characters"),
    serviceAddress: bookingServiceAddressSchema,
    customerPhone: z
      .string()
      .trim()
      .min(7, "Customer contact phone must be at least 7 digits")
      .max(30, "Phone number cannot exceed 30 characters"),
    customerNotes: z
      .string()
      .trim()
      .max(1000, "Notes cannot exceed 1000 characters")
      .optional()
      .nullable(),
  })
  .refine(
    (data) => {
      // Must not be more than 60 days in advance
      const date = new Date(data.requestedDate);
      const maxDate = new Date();
      maxDate.setDate(maxDate.getDate() + 60);
      return date <= maxDate;
    },
    {
      message: "Appointments can only be scheduled up to 60 days in advance",
      path: ["requestedDate"],
    }
  );

export type CreateBookingInput = z.infer<typeof createBookingSchema>;

/**
 * Schema for booking status transition actions
 */
export const bookingActionEnum = z.enum([
  "ACCEPT",
  "REJECT",
  "DECLINE", // alias for REJECT
  "PROPOSE_ALTERNATIVE",
  "RESCHEDULE", // alias for PROPOSE_ALTERNATIVE
  "ACCEPT_ALTERNATIVE",
  "DECLINE_ALTERNATIVE",
  "CANCEL",
  "COMPLETE",
]);

export const bookingStatusActionSchema = z
  .object({
    action: bookingActionEnum,
    proposedDate: z.string().optional(),
    proposedSlot: z.string().trim().max(50).optional(),
    note: z.string().trim().max(500).optional().nullable(),
    reason: z.string().trim().max(500).optional().nullable(),
  })
  .refine(
    (data) => {
      // If action is PROPOSE_ALTERNATIVE or RESCHEDULE, proposedDate and proposedSlot are required and proposedDate must be future
      if (data.action === "PROPOSE_ALTERNATIVE" || data.action === "RESCHEDULE") {
        if (!data.proposedDate || !data.proposedSlot) return false;
        const date = new Date(data.proposedDate);
        if (isNaN(date.getTime())) return false;
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return date > now;
      }
      return true;
    },
    {
      message: "Alternative date (future) and time slot are required when proposing a new time",
      path: ["proposedDate"],
    }
  );

export type BookingStatusActionInput = z.infer<typeof bookingStatusActionSchema>;
