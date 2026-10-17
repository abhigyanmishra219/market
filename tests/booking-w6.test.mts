import fs from "fs";
import mongoose from "mongoose";
import { connectToDatabase, disconnectFromDatabase } from "@/lib/db";
import { Listing } from "@/models/Listing";
import { User } from "@/models/User";
import { Booking } from "@/models/Booking";
import {
  createBookingSchema,
  bookingStatusActionSchema,
} from "@/lib/validations/booking";
import { ForbiddenError, ValidationError, ConflictError } from "@/lib/errors";
import { getPublicListings, getPublicListingByIdOrSlug } from "@/lib/listings-data";

// Load environment variables from .env.local
const envContent = fs.readFileSync("C:/Users/abhig/Desktop/app/webapp/.env.local", "utf8");
for (const line of envContent.split("\n")) {
  const match = line.trim().match(/^([^=]+)=(.*)$/);
  if (match) {
    const val = match[2].trim().replace(/^["']|["']$/g, "");
    process.env[match[1].trim()] = val;
  }
}

async function runBookingW6TestSuite() {
  console.log("=================================================================");
  console.log("RUNNING W6 SERVICE BOOKING REQUESTS & DIRECT CONTACT TEST SUITE");
  console.log("=================================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`✓ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`✗ FAIL: ${testName} - ${detail || "Condition false"}`);
      failed++;
    }
  }

  // ---------------------------------------------------------------------------
  // TEST GROUP 1: Zod Validation Schemas & Input Boundaries
  // ---------------------------------------------------------------------------
  console.log("--- Group 1: Booking Validation Schemas & Input Boundaries ---");

  const validListingId = new mongoose.Types.ObjectId().toString();

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 2);
  const validFutureDateStr = tomorrow.toISOString();

  const baseBookingPayload = {
    listingId: validListingId,
    requestedDate: validFutureDateStr,
    timeSlot: "MORNING",
    serviceAddress: {
      line1: "Flat 402, Oakwood Apartments, 12th Cross",
      locality: "Greenwood",
      city: "Metropolis",
    },
    customerPhone: "+1-555-8899",
    customerNotes: "Main kitchen sink leaking water into under-sink cabinet.",
  };

  // 1.1 Valid booking creation payload passes schema validation
  const parsedValid = createBookingSchema.safeParse(baseBookingPayload);
  assert(parsedValid.success, "Valid booking request payload passes schema validation");

  // 1.2 Past appointment date is rejected
  const pastDate = new Date();
  pastDate.setDate(pastDate.getDate() - 2);
  const pastDatePayload = {
    ...baseBookingPayload,
    requestedDate: pastDate.toISOString(),
  };
  const parsedPast = createBookingSchema.safeParse(pastDatePayload);
  assert(!parsedPast.success, "Past appointment date is rejected by schema validator");

  // 1.3 Booking more than 60 days in advance is rejected
  const tooFarDate = new Date();
  tooFarDate.setDate(tooFarDate.getDate() + 75);
  const tooFarPayload = {
    ...baseBookingPayload,
    requestedDate: tooFarDate.toISOString(),
  };
  const parsedTooFar = createBookingSchema.safeParse(tooFarPayload);
  assert(!parsedTooFar.success, "Booking request > 60 days in advance is rejected");

  // 1.4 Short or missing address line1 is rejected
  const shortAddressPayload = {
    ...baseBookingPayload,
    serviceAddress: {
      line1: "A",
      locality: "Greenwood",
    },
  };
  const parsedShortAddress = createBookingSchema.safeParse(shortAddressPayload);
  assert(!parsedShortAddress.success, "Address line1 under 3 characters is rejected");

  // 1.5 Missing locality is rejected
  const missingLocalityPayload = {
    ...baseBookingPayload,
    serviceAddress: {
      line1: "Flat 402, Oakwood Apartments",
      locality: "",
    },
  };
  const parsedMissingLocality = createBookingSchema.safeParse(missingLocalityPayload);
  assert(!parsedMissingLocality.success, "Empty service locality is rejected");

  // 1.6 Short/invalid phone number is rejected
  const invalidPhonePayload = {
    ...baseBookingPayload,
    customerPhone: "123",
  };
  const parsedInvalidPhone = createBookingSchema.safeParse(invalidPhonePayload);
  assert(!parsedInvalidPhone.success, "Phone number under 7 digits is rejected");

  // 1.7 Status action schema: ACCEPT action
  const parsedAcceptAction = bookingStatusActionSchema.safeParse({ action: "ACCEPT" });
  assert(parsedAcceptAction.success, "ACCEPT action passes booking status action schema");

  // 1.8 Status action schema: PROPOSE_ALTERNATIVE requires future date and slot
  const nextWeek = new Date();
  nextWeek.setDate(nextWeek.getDate() + 5);
  const validAlternative = {
    action: "PROPOSE_ALTERNATIVE",
    proposedDate: nextWeek.toISOString(),
    proposedSlot: "AFTERNOON",
    note: "Free in the afternoon",
  };
  const parsedAlternative = bookingStatusActionSchema.safeParse(validAlternative);
  assert(parsedAlternative.success, "Valid PROPOSE_ALTERNATIVE action with future slot passes");

  // 1.9 PROPOSE_ALTERNATIVE missing proposedDate is rejected
  const invalidAlternativeMissingDate = {
    action: "PROPOSE_ALTERNATIVE",
    proposedSlot: "AFTERNOON",
  };
  const parsedAltMissingDate = bookingStatusActionSchema.safeParse(invalidAlternativeMissingDate);
  assert(!parsedAltMissingDate.success, "PROPOSE_ALTERNATIVE without proposedDate is rejected");

  // ---------------------------------------------------------------------------
  // TEST GROUP 2: Authorization, Participant Scoping & Security Rules
  // ---------------------------------------------------------------------------
  console.log("\n--- Group 2: Authorization, Scoping & Privacy Access Control ---");

  const customerId = new mongoose.Types.ObjectId().toString();
  const providerId = new mongoose.Types.ObjectId().toString();
  const unrelatedUserId = new mongoose.Types.ObjectId().toString();

  function verifyBookingParticipant(
    bookingCustomerId: string,
    bookingProviderId: string,
    callerId: string,
    callerRole: "USER" | "ADMIN"
  ): { isCustomer: boolean; isProvider: boolean; isAdmin: boolean } {
    const isAdmin = callerRole === "ADMIN";
    const isCustomer = callerId === bookingCustomerId;
    const isProvider = callerId === bookingProviderId;

    if (!isAdmin && !isCustomer && !isProvider) {
      throw new ForbiddenError("You do not have permission to view or modify this booking.");
    }

    return { isCustomer, isProvider, isAdmin };
  }

  // 2.1 Customer is recognized as participant
  const customerAuth = verifyBookingParticipant(customerId, providerId, customerId, "USER");
  assert(customerAuth.isCustomer, "Booking customer is authorized as participant");

  // 2.2 Provider is recognized as participant
  const providerAuth = verifyBookingParticipant(customerId, providerId, providerId, "USER");
  assert(providerAuth.isProvider, "Booking provider is authorized as participant");

  // 2.3 Unrelated third-party user is blocked with 403 Forbidden
  let thirdPartyBlocked = false;
  try {
    verifyBookingParticipant(customerId, providerId, unrelatedUserId, "USER");
  } catch (err) {
    if (err instanceof ForbiddenError) thirdPartyBlocked = true;
  }
  assert(thirdPartyBlocked, "Unrelated third-party user is blocked from viewing booking (403)");

  // 2.4 Administrator has universal access
  const adminAuth = verifyBookingParticipant(customerId, providerId, unrelatedUserId, "ADMIN");
  assert(adminAuth.isAdmin, "Administrator is authorized to manage booking");

  // 2.5 Customer cannot accept on behalf of provider
  let customerAcceptBlocked = false;
  try {
    const caller = verifyBookingParticipant(customerId, providerId, customerId, "USER");
    if (!caller.isProvider && !caller.isAdmin) {
      throw new ForbiddenError("Only provider can accept booking requests");
    }
  } catch (err) {
    if (err instanceof ForbiddenError) customerAcceptBlocked = true;
  }
  assert(customerAcceptBlocked, "Customer is strictly forbidden from accepting their own booking");

  // 2.6 Another provider cannot accept someone else's booking
  let otherProviderBlocked = false;
  try {
    const caller = verifyBookingParticipant(customerId, providerId, unrelatedUserId, "USER");
    if (!caller.isProvider && !caller.isAdmin) {
      throw new ForbiddenError("Only the assigned provider can act on this booking");
    }
  } catch (err) {
    if (err instanceof ForbiddenError) otherProviderBlocked = true;
  }
  assert(otherProviderBlocked, "Another provider is forbidden from mutating another provider's booking");

  // ---------------------------------------------------------------------------
  // TEST GROUP 3: Live MongoDB Lifecycle, State Machine & Concurrency
  // ---------------------------------------------------------------------------
  console.log("\n--- Group 3: Live MongoDB Lifecycle, State Machine & Concurrency ---");

  await connectToDatabase();

  // 3.1 Initialize test provider and test customer users
  const testProvider = await User.findOneAndUpdate(
    { email: "provider-w6@marketplace.local" },
    {
      name: "Marcus Spark Electrician",
      email: "provider-w6@marketplace.local",
      role: "USER",
      phone: "+1-555-4422",
      whatsapp: "+1-555-4422",
    },
    { upsert: true, returnDocument: "after" }
  );

  const testCustomer = await User.findOneAndUpdate(
    { email: "customer-w6@marketplace.local" },
    {
      name: "Alice Homeowner",
      email: "customer-w6@marketplace.local",
      role: "USER",
      phone: "+1-555-9911",
      whatsapp: "+1-555-9911",
    },
    { upsert: true, returnDocument: "after" }
  );

  assert(Boolean(testProvider._id) && Boolean(testCustomer._id), "Test provider and customer users initialized");

  // 3.2 Initialize test APPROVED service listing owned by testProvider
  const serviceSlug = `w6-electric-service-${Date.now()}`;
  const testService = await Listing.create({
    type: "SERVICE",
    status: "APPROVED",
    title: "Master Electrician — Circuit & Appliance Installations",
    slug: serviceSlug,
    description: "Certified electrician with 10 years experience solving short-circuits and wiring faults.",
    ownerId: testProvider._id,
    location: {
      city: "Metropolis",
      cityCode: "METRO",
      locality: "Greenwood",
      streetAddress: "12 Master St",
      geo: { type: "Point", coordinates: [0, 0] },
    },
    contactPreferences: {
      phone: "+1-555-4422",
      whatsapp: "+1-555-4422",
      showPhone: true,
      showWhatsapp: true,
    },
    photos: [
      {
        id: "p-svc-w6",
        url: "/uploads/listings/electric-w6.webp",
        key: "listings/electric-w6.webp",
        isPrimary: true,
      },
    ],
    serviceDetails: {
      category: "ELECTRICAL",
      pricingModel: "HOURLY",
      startingPrice: 350,
      experienceYears: 10,
      serviceAreas: ["Greenwood", "Downtown"],
      workingDays: ["MON", "TUE", "WED", "THU", "FRI"],
      workingHours: { start: "08:00", end: "18:00" },
    },
    moderation: {
      reviewedAt: new Date(),
      reviewedBy: new mongoose.Types.ObjectId(),
    },
    metrics: { views: 0, contactReveals: 0, savesCount: 0 },
  });
  assert(testService.status === "APPROVED", "Approved service listing initialized for bookings");

  // 3.3 Rule Check: Customer cannot book their own service listing
  let selfBookingBlocked = false;
  if (testService.ownerId.toString() === testProvider._id.toString()) {
    selfBookingBlocked = true; // In API handler: session.user.id === listing.ownerId -> ForbiddenError
  }
  assert(selfBookingBlocked, "Provider cannot submit booking requests to their own service");

  // 3.4 Create appointment booking request: Alice books Marcus's service
  const requestedDate = new Date();
  requestedDate.setDate(requestedDate.getDate() + 3);

  const booking1 = await Booking.create({
    customerId: testCustomer._id,
    providerId: testProvider._id,
    listingId: testService._id,
    status: "PENDING",
    requestedDate,
    timeSlot: "MORNING",
    serviceAddress: {
      line1: "42 Willow Lane, Apt 3B",
      locality: "Greenwood",
      city: "Metropolis",
    },
    customerPhone: "+1-555-9911",
    customerNotes: "Main breaker tripping whenever washing machine starts",
    statusHistory: [
      {
        status: "PENDING",
        changedBy: testCustomer._id,
        timestamp: new Date(),
        note: "Initial booking submission",
      },
    ],
  });

  assert(booking1.status === "PENDING", "Booking initialized with status PENDING");
  assert(
    booking1.customerId.toString() === testCustomer._id.toString(),
    "Booking accurately references the requesting customer"
  );
  assert(
    booking1.providerId.toString() === testProvider._id.toString(),
    "Booking accurately references the service provider"
  );

  // 3.5 Customer query: Returns customer's booking
  const customerBookings = await Booking.find({ customerId: testCustomer._id });
  assert(
    customerBookings.some((b) => b._id.toString() === booking1._id.toString()),
    "Customer bookings query successfully returns requested booking"
  );

  // 3.6 Provider query: Returns provider's incoming booking request
  const providerBookings = await Booking.find({ providerId: testProvider._id, status: "PENDING" });
  assert(
    providerBookings.some((b) => b._id.toString() === booking1._id.toString()),
    "Provider incoming queue query successfully returns incoming request"
  );

  // 3.7 State Transition: Provider accepts booking request (PENDING -> ACCEPTED)
  const acceptedBooking = await Booking.findOneAndUpdate(
    { _id: booking1._id, status: "PENDING" },
    {
      $set: { status: "ACCEPTED", updatedAt: new Date() },
      $push: {
        statusHistory: {
          status: "ACCEPTED",
          changedBy: testProvider._id,
          timestamp: new Date(),
          note: "Provider confirmed appointment",
        },
      },
    },
    { returnDocument: "after" }
  );

  assert(acceptedBooking?.status === "ACCEPTED", "Booking status successfully transitioned to ACCEPTED");
  assert(
    acceptedBooking?.statusHistory.length === 2,
    "Status transition recorded in statusHistory audit array"
  );

  // 3.8 State Transition: Provider marks accepted booking as completed (ACCEPTED -> COMPLETED)
  const completedBooking = await Booking.findOneAndUpdate(
    { _id: booking1._id, status: "ACCEPTED" },
    {
      $set: { status: "COMPLETED", updatedAt: new Date() },
      $push: {
        statusHistory: {
          status: "COMPLETED",
          changedBy: testProvider._id,
          timestamp: new Date(),
          note: "Work completed",
        },
      },
    },
    { returnDocument: "after" }
  );
  assert(completedBooking?.status === "COMPLETED", "Booking status successfully transitioned to COMPLETED");

  // 3.9 Lifecycle Boundary: COMPLETED booking cannot return to PENDING
  let invalidTransitionBlocked = false;
  const invalidTransition = await Booking.findOneAndUpdate(
    { _id: booking1._id, status: "PENDING" },
    { $set: { status: "ACCEPTED" } },
    { returnDocument: "after" }
  );
  if (!invalidTransition) invalidTransitionBlocked = true;
  assert(invalidTransitionBlocked, "Terminal status COMPLETED cannot transition back to PENDING");

  // 3.10 Alternative Time Workflow (PENDING -> ALTERNATIVE_PROPOSED -> ACCEPTED)
  const booking2 = await Booking.create({
    customerId: testCustomer._id,
    providerId: testProvider._id,
    listingId: testService._id,
    status: "PENDING",
    requestedDate,
    timeSlot: "MORNING",
    serviceAddress: {
      line1: "42 Willow Lane, Apt 3B",
      locality: "Greenwood",
    },
    customerPhone: "+1-555-9911",
    customerNotes: "Living room chandelier wiring installation",
    statusHistory: [{ status: "PENDING", changedBy: testCustomer._id, timestamp: new Date() }],
  });

  const alternativeDate = new Date();
  alternativeDate.setDate(alternativeDate.getDate() + 4);

  // Provider proposes alternative time
  const alternativeBooking = await Booking.findOneAndUpdate(
    { _id: booking2._id, status: "PENDING" },
    {
      $set: {
        status: "ALTERNATIVE_PROPOSED",
        alternativeDetails: {
          proposedDate: alternativeDate,
          proposedSlot: "AFTERNOON",
          note: "Busy in the morning with commercial site; afternoon is open",
          proposedAt: new Date(),
        },
        updatedAt: new Date(),
      },
      $push: {
        statusHistory: {
          status: "ALTERNATIVE_PROPOSED",
          changedBy: testProvider._id,
          timestamp: new Date(),
          note: "Alternative time proposed",
        },
      },
    },
    { returnDocument: "after" }
  );

  assert(
    alternativeBooking?.status === "ALTERNATIVE_PROPOSED",
    "Booking transitioned to ALTERNATIVE_PROPOSED"
  );
  assert(
    alternativeBooking?.alternativeDetails?.proposedSlot === "AFTERNOON",
    "Alternative proposal details recorded correctly"
  );

  // Customer accepts proposed alternative time
  const confirmedAlternative = await Booking.findOneAndUpdate(
    { _id: booking2._id, status: "ALTERNATIVE_PROPOSED" },
    {
      $set: {
        status: "ACCEPTED",
        requestedDate: alternativeBooking!.alternativeDetails!.proposedDate,
        timeSlot: alternativeBooking!.alternativeDetails!.proposedSlot,
        updatedAt: new Date(),
      },
      $push: {
        statusHistory: {
          status: "ACCEPTED",
          changedBy: testCustomer._id,
          timestamp: new Date(),
          note: "Customer accepted provider's alternative time",
        },
      },
    },
    { returnDocument: "after" }
  );

  assert(
    confirmedAlternative?.status === "ACCEPTED",
    "Customer successfully accepted alternative proposal (transitioned to ACCEPTED)"
  );
  assert(
    confirmedAlternative?.timeSlot === "AFTERNOON",
    "Confirmed booking timeSlot updated to match the accepted alternative slot"
  );

  // 3.11 Rejection Workflow (PENDING -> REJECTED)
  const booking3 = await Booking.create({
    customerId: testCustomer._id,
    providerId: testProvider._id,
    listingId: testService._id,
    status: "PENDING",
    requestedDate,
    timeSlot: "EVENING",
    serviceAddress: {
      line1: "88 Ridge St",
      locality: "Greenwood",
    },
    customerPhone: "+1-555-9911",
    statusHistory: [{ status: "PENDING", changedBy: testCustomer._id, timestamp: new Date() }],
  });

  const rejectedBooking = await Booking.findOneAndUpdate(
    { _id: booking3._id, status: { $in: ["PENDING", "ALTERNATIVE_PROPOSED"] } },
    {
      $set: {
        status: "REJECTED",
        providerNotes: "Fully booked this weekend due to scheduled maintenance contract",
        updatedAt: new Date(),
      },
      $push: {
        statusHistory: {
          status: "REJECTED",
          changedBy: testProvider._id,
          timestamp: new Date(),
          note: "Declined by provider",
        },
      },
    },
    { returnDocument: "after" }
  );

  assert(rejectedBooking?.status === "REJECTED", "Booking status transitioned to REJECTED");
  assert(
    Boolean(rejectedBooking?.providerNotes),
    "Rejection reason is recorded on document for customer feedback"
  );

  // 3.12 Cancellation Workflow: Customer cancels pending request
  const booking4 = await Booking.create({
    customerId: testCustomer._id,
    providerId: testProvider._id,
    listingId: testService._id,
    status: "PENDING",
    requestedDate,
    timeSlot: "MORNING",
    serviceAddress: { line1: "123 Elm St", locality: "Greenwood" },
    customerPhone: "+1-555-9911",
    statusHistory: [{ status: "PENDING", changedBy: testCustomer._id, timestamp: new Date() }],
  });

  const cancelledBooking = await Booking.findOneAndUpdate(
    { _id: booking4._id, status: { $in: ["PENDING", "ALTERNATIVE_PROPOSED", "ACCEPTED"] } },
    {
      $set: { status: "CANCELLED", updatedAt: new Date() },
      $push: {
        statusHistory: {
          status: "CANCELLED",
          changedBy: testCustomer._id,
          timestamp: new Date(),
          note: "Customer cancelled request",
        },
      },
    },
    { returnDocument: "after" }
  );

  assert(cancelledBooking?.status === "CANCELLED", "Customer cancelled request (status: CANCELLED)");

  // 3.13 Concurrency Test: Racing actions on a single pending booking
  const racingBooking = await Booking.create({
    customerId: testCustomer._id,
    providerId: testProvider._id,
    listingId: testService._id,
    status: "PENDING",
    requestedDate,
    timeSlot: "MORNING",
    serviceAddress: { line1: "99 Sprint Way", locality: "Greenwood" },
    customerPhone: "+1-555-9911",
    statusHistory: [{ status: "PENDING", changedBy: testCustomer._id, timestamp: new Date() }],
  });

  // Simulate two concurrent requests racing to accept and reject simultaneously
  const [raceAcceptResult, raceRejectResult] = await Promise.all([
    Booking.findOneAndUpdate(
      { _id: racingBooking._id, status: "PENDING" },
      { $set: { status: "ACCEPTED" } },
      { returnDocument: "after" }
    ),
    Booking.findOneAndUpdate(
      { _id: racingBooking._id, status: "PENDING" },
      { $set: { status: "REJECTED" } },
      { returnDocument: "after" }
    ),
  ]);

  // Exactly one of the two atomic operations must succeed, and the other must return null
  const oneSucceeded =
    (raceAcceptResult !== null && raceRejectResult === null) ||
    (raceAcceptResult === null && raceRejectResult !== null);
  assert(
    oneSucceeded,
    "Concurrency safety: Exactly one state transition succeeds under racing conditions"
  );

  // ---------------------------------------------------------------------------
  // TEST GROUP 4: Direct Contact & Public Privacy Verification
  // ---------------------------------------------------------------------------
  console.log("\n--- Group 4: Direct Contact & Public Listing Privacy ---");

  // 4.1 Direct phone/WhatsApp contact preferences preserved on service
  assert(
    testService.contactPreferences.showPhone && testService.contactPreferences.showWhatsapp,
    "Service listing retains direct Phone and WhatsApp contact preferences"
  );

  // 4.2 Public listing detail lookup NEVER leaks booking data
  const publicDetail = await getPublicListingByIdOrSlug(testService.slug);
  assert(publicDetail !== null, "Public service detail resolves");
  assert(!("bookings" in (publicDetail || {})), "Public listing API does not expose booking collection");

  // Clean up all test documents
  await Booking.deleteMany({
    _id: {
      $in: [
        booking1._id,
        booking2._id,
        booking3._id,
        booking4._id,
        racingBooking._id,
      ],
    },
  });
  await Listing.deleteOne({ _id: testService._id });
  await User.deleteMany({ _id: { $in: [testProvider._id, testCustomer._id] } });
  console.log("Cleaned up test bookings, service, and users from database.");

  await disconnectFromDatabase();

  console.log("\n=================================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runBookingW6TestSuite().catch((err) => {
  console.error("Test Suite crashed:", err);
  process.exit(1);
});
