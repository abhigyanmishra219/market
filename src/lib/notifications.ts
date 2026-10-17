/**
 * Notification service for booking lifecycle events.
 * Dispatches and logs structured notifications between customers and service providers.
 * Easily extensible to transactional email (SendGrid, Postmark) or SMS when configured.
 */

export interface BookingNotificationPayload {
  bookingId: string;
  recipientId: string;
  recipientRole: "CUSTOMER" | "PROVIDER";
  event:
    | "BOOKING_REQUESTED"
    | "BOOKING_ACCEPTED"
    | "BOOKING_REJECTED"
    | "ALTERNATIVE_PROPOSED"
    | "ALTERNATIVE_ACCEPTED"
    | "ALTERNATIVE_DECLINED"
    | "BOOKING_CANCELLED"
    | "BOOKING_COMPLETED";
  serviceTitle: string;
  dateOrSlot?: string;
  note?: string | null;
}

export async function sendBookingNotification(payload: BookingNotificationPayload): Promise<void> {
  const timestamp = new Date().toISOString();
  console.log(
    `[NOTIFICATION] [${timestamp}] Event: ${payload.event} | Booking: ${payload.bookingId} | To: ${payload.recipientRole} (${payload.recipientId}) | Service: "${payload.serviceTitle}"${
      payload.dateOrSlot ? ` | Slot: ${payload.dateOrSlot}` : ""
    }${payload.note ? ` | Note: "${payload.note}"` : ""}`
  );

  // If a transactional email provider is configured in future (e.g. SMTP/Resend/SendGrid),
  // hook into this dispatcher here.
}
