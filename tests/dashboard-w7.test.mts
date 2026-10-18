import { validateSafeRedirect, assertOwnership } from "@/lib/auth-guards";
import { updateProfileSchema } from "@/lib/validations/user";
import { ForbiddenError } from "@/lib/errors";
import { connectToDatabase, disconnectFromDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { Listing } from "@/models/Listing";
import { Booking } from "@/models/Booking";
import type { Session } from "next-auth";
import fs from "fs";

// Load environment variables for testing
const envContent = fs.readFileSync("C:/Users/abhig/Desktop/app/webapp/.env.local", "utf8");
for (const line of envContent.split("\n")) {
  const match = line.trim().match(/^([^=]+)=(.*)$/);
  if (match) {
    const val = match[2].trim().replace(/^["']|["']$/g, "");
    process.env[match[1].trim()] = val;
  }
}

async function runTestSuite() {
  console.log("=================================================================");
  console.log("RUNNING W7 USER DASHBOARD, ACCOUNT & ACTIVITY TEST SUITE");
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
  // TEST GROUP 1: Route Guards, Perimeter Protection & Redirection
  // ---------------------------------------------------------------------------
  console.log("--- Group 1: Perimeter Protection & Safe Navigation ---");
  assert(validateSafeRedirect("/dashboard") === "/dashboard", "Internal path /dashboard is allowed");
  assert(validateSafeRedirect("/dashboard/properties") === "/dashboard/properties", "Subroute /dashboard/properties is allowed");
  assert(validateSafeRedirect("/dashboard/services/new") === "/dashboard/services/new", "Subroute /dashboard/services/new is allowed");
  assert(validateSafeRedirect("/account/profile") === "/account/profile", "Subroute /account/profile is allowed");
  assert(validateSafeRedirect("/account/settings") === "/account/settings", "Subroute /account/settings is allowed");
  assert(validateSafeRedirect("https://attacker.com/dashboard") === "/", "External attack redirect sanitized to root");
  assert(validateSafeRedirect("//attacker.com") === "/", "Protocol-relative attack sanitized to root");
  assert(validateSafeRedirect("/\\attacker.com") === "/", "Backslash attack sanitized to root");
  assert(validateSafeRedirect("javascript:alert(1)") === "/", "JavaScript injection attack sanitized to root");

  // ---------------------------------------------------------------------------
  // TEST GROUP 2: Profile Update Validation & Privilege Escalation Defense
  // ---------------------------------------------------------------------------
  console.log("\n--- Group 2: Profile Security & Privilege Escalation Defense ---");
  const validProfileUpdate = {
    name: "Alex Rivera",
    phone: "+91 98765 43210",
    whatsapp: "+91 98765 43210",
    contactPreferences: {
      showPhone: true,
      showWhatsapp: true,
    },
  };
  const parsedValid = updateProfileSchema.safeParse(validProfileUpdate);
  assert(parsedValid.success, "Valid profile update payload passes schema validation");

  // Verify stripping forbidden fields
  const maliciousElevationPayload = {
    ...validProfileUpdate,
    role: "ADMIN",
    status: "SUSPENDED",
    email: "hacked@example.com",
    _id: "653b1f9c0e2a1b001a9f9999",
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sanitized: any = updateProfileSchema.parse(maliciousElevationPayload);
  assert(sanitized.role === undefined, "Privilege escalation: forbidden 'role' field is stripped");
  assert(sanitized.status === undefined, "Privilege escalation: forbidden 'status' field is stripped");
  assert(sanitized.email === undefined, "Identity integrity: forbidden 'email' field is stripped");
  assert(sanitized._id === undefined, "Document integrity: forbidden '_id' field is stripped");

  // Phone regex check
  const invalidPhone = updateProfileSchema.safeParse({ phone: "123" });
  assert(!invalidPhone.success, "Invalid short phone number rejected by validator");

  // ---------------------------------------------------------------------------
  // TEST GROUP 3: Server-Side Authorization & Ownership Isolation
  // ---------------------------------------------------------------------------
  console.log("\n--- Group 3: Server-Side Authorization & Ownership Scoping ---");
  const userASession: Session = {
    user: { id: "507f1f77bcf86cd799439011", name: "User A", email: "usera@example.com", role: "USER", status: "ACTIVE" },
    expires: "2099-01-01",
  };
  const userBSession: Session = {
    user: { id: "507f1f77bcf86cd799439022", name: "User B", email: "userb@example.com", role: "USER", status: "ACTIVE" },
    expires: "2099-01-01",
  };
  const adminSession: Session = {
    user: { id: "507f1f77bcf86cd799439099", name: "Admin", email: "admin@example.com", role: "ADMIN", status: "ACTIVE" },
    expires: "2099-01-01",
  };

  let userAOwnOk = false;
  try {
    assertOwnership("507f1f77bcf86cd799439011", userASession);
    userAOwnOk = true;
  } catch {
    userAOwnOk = false;
  }
  assert(userAOwnOk, "Resource owner is authorized to manage their own resources");

  let foreignBlocked = false;
  try {
    assertOwnership("507f1f77bcf86cd799439011", userBSession);
  } catch (err: unknown) {
    if (
      err instanceof ForbiddenError ||
      (err && typeof err === "object" && "code" in err && (err as { code: string }).code === "FORBIDDEN") ||
      (err && typeof err === "object" && "statusCode" in err && (err as { statusCode: number }).statusCode === 403)
    ) {
      foreignBlocked = true;
    }
  }
  assert(foreignBlocked, "Unauthorized User B attempting to mutate User A resource throws ForbiddenError (403)");

  let adminAllowed = false;
  try {
    assertOwnership("507f1f77bcf86cd799439011", adminSession);
    adminAllowed = true;
  } catch {
    adminAllowed = false;
  }
  assert(adminAllowed, "Administrator is authorized across foreign user resources");

  // ---------------------------------------------------------------------------
  // TEST GROUP 4: Live MongoDB Aggregation, Accurate Counts & Vertical Scoping
  // ---------------------------------------------------------------------------
  console.log("\n--- Group 4: Live MongoDB Aggregations & Strict Data Scoping ---");
  await connectToDatabase();

  const timestamp = Date.now();
  const userAEmail = `test-w7-usera-${timestamp}@example.com`;
  const userBEmail = `test-w7-userb-${timestamp}@example.com`;

  // Create test users
  const dbUserA = await User.create({
    name: "W7 User Alpha",
    email: userAEmail,
    role: "USER",
    status: "ACTIVE",
    phone: "+919876543210",
  });
  const dbUserB = await User.create({
    name: "W7 User Beta",
    email: userBEmail,
    role: "USER",
    status: "ACTIVE",
    phone: "+919876543211",
  });

  const userAId = dbUserA._id;
  const userBId = dbUserB._id;

  // Create listings for User A:
  // 1 Approved Property, 1 Pending Property, 1 Rejected Property, 1 Archived Property
  const propA1 = await Listing.create({
    type: "PROPERTY",
    status: "APPROVED",
    title: `Approved Penthouse ${timestamp}`,
    slug: `approved-penthouse-${timestamp}`,
    description: "Spacious luxury penthouse with panoramic city views and private terrace.",
    ownerId: userAId,
    location: { city: "Metropolis", cityCode: "METRO", locality: "Downtown", streetAddress: "123 Main St" },
    contactPreferences: { showPhone: true, showWhatsapp: true },
    photos: [{ id: "p1", url: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800", key: "k1", isPrimary: true }],
    propertyDetails: {
      purpose: "FOR_RENT",
      propertyType: "APARTMENT",
      price: 65000,
      carpetArea: 1400,
      furnishing: "FULLY_FURNISHED",
      amenities: ["GYM", "LIFT"],
      availableFrom: new Date(),
    },
  });

  const propA2 = await Listing.create({
    type: "PROPERTY",
    status: "PENDING_REVIEW",
    title: `Pending 2BHK Flat ${timestamp}`,
    slug: `pending-2bhk-${timestamp}`,
    description: "Modern 2BHK apartment near metro station with reserved parking.",
    ownerId: userAId,
    location: { city: "Metropolis", cityCode: "METRO", locality: "Uptown", streetAddress: "456 High St" },
    contactPreferences: { showPhone: true, showWhatsapp: true },
    photos: [{ id: "p2", url: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800", key: "k2", isPrimary: true }],
    propertyDetails: {
      purpose: "FOR_RENT",
      propertyType: "APARTMENT",
      price: 35000,
      carpetArea: 950,
      furnishing: "SEMI_FURNISHED",
      amenities: ["PARKING"],
      availableFrom: new Date(),
    },
  });

  const propA3 = await Listing.create({
    type: "PROPERTY",
    status: "REJECTED",
    title: `Rejected Villa ${timestamp}`,
    slug: `rejected-villa-${timestamp}`,
    description: "Independent 4-bedroom villa with private garden.",
    ownerId: userAId,
    location: { city: "Metropolis", cityCode: "METRO", locality: "Suburbs", streetAddress: "789 Pine Rd" },
    contactPreferences: { showPhone: true, showWhatsapp: true },
    photos: [{ id: "p3", url: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800", key: "k3", isPrimary: true }],
    propertyDetails: {
      purpose: "FOR_SALE",
      propertyType: "VILLA",
      price: 25000000,
      carpetArea: 3200,
      furnishing: "UNFURNISHED",
      amenities: ["GARDEN"],
      availableFrom: new Date(),
    },
    moderation: {
      reviewedAt: new Date(),
      rejectionReason: "Property ownership document required for high-value villa listings.",
    },
  });

  const propA4 = await Listing.create({
    type: "PROPERTY",
    status: "ARCHIVED",
    title: `Archived Property ${timestamp}`,
    slug: `archived-prop-${timestamp}`,
    description: "Soft deleted historical property that should never appear in active dashboard.",
    ownerId: userAId,
    location: { city: "Metropolis", cityCode: "METRO", locality: "Oldtown" },
    contactPreferences: { showPhone: false, showWhatsapp: false },
    photos: [{ id: "p4", url: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800", key: "k4", isPrimary: true }],
    propertyDetails: {
      purpose: "FOR_RENT",
      propertyType: "APARTMENT",
      price: 20000,
      carpetArea: 600,
      furnishing: "UNFURNISHED",
      amenities: [],
      availableFrom: new Date(),
    },
  });

  // Create service listings for User A:
  // 1 Approved Service, 1 Pending Service
  const servA1 = await Listing.create({
    type: "SERVICE",
    status: "APPROVED",
    title: `Licensed Master Electrician ${timestamp}`,
    slug: `master-electrician-${timestamp}`,
    description: "Certified industrial and residential electrical installations, wiring, and panel repairs.",
    ownerId: userAId,
    location: { city: "Metropolis", cityCode: "METRO", locality: "Central Hub" },
    contactPreferences: { showPhone: true, showWhatsapp: true },
    photos: [{ id: "s1", url: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800", key: "sk1", isPrimary: true }],
    serviceDetails: {
      category: "ELECTRICAL",
      pricingModel: "HOURLY",
      startingPrice: 500,
      experienceYears: 12,
      serviceAreas: ["Downtown", "Uptown"],
      workingDays: ["MON", "TUE", "WED", "THU", "FRI"],
      workingHours: { start: "08:00", end: "18:00" },
    },
  });

  const servA2 = await Listing.create({
    type: "SERVICE",
    status: "PENDING_REVIEW",
    title: `Deep Cleaning Experts ${timestamp}`,
    slug: `cleaning-experts-${timestamp}`,
    description: "Comprehensive home and office deep cleaning and sanitization services.",
    ownerId: userAId,
    location: { city: "Metropolis", cityCode: "METRO", locality: "Northside" },
    contactPreferences: { showPhone: true, showWhatsapp: true },
    photos: [{ id: "s2", url: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800", key: "sk2", isPrimary: true }],
    serviceDetails: {
      category: "CLEANING",
      pricingModel: "FIXED",
      startingPrice: 2000,
      experienceYears: 5,
      serviceAreas: ["Northside"],
      workingDays: ["SAT", "SUN"],
      workingHours: { start: "09:00", end: "17:00" },
    },
  });

  // Create listings for User B:
  // 1 Approved Property, 1 Approved Service
  const propB1 = await Listing.create({
    type: "PROPERTY",
    status: "APPROVED",
    title: `User B Studio Apartment ${timestamp}`,
    slug: `userb-studio-${timestamp}`,
    description: "Cozy studio apartment owned strictly by User B.",
    ownerId: userBId,
    location: { city: "Metropolis", cityCode: "METRO", locality: "Eastside" },
    contactPreferences: { showPhone: true, showWhatsapp: true },
    photos: [{ id: "pb1", url: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800", key: "kpb1", isPrimary: true }],
    propertyDetails: {
      purpose: "FOR_RENT",
      propertyType: "APARTMENT",
      price: 25000,
      carpetArea: 500,
      furnishing: "FULLY_FURNISHED",
      amenities: ["WIFI"],
      availableFrom: new Date(),
    },
  });

  const servB1 = await Listing.create({
    type: "SERVICE",
    status: "APPROVED",
    title: `User B Plumbing Specialist ${timestamp}`,
    slug: `userb-plumbing-${timestamp}`,
    description: "Emergency plumbing repairs and pipe maintenance.",
    ownerId: userBId,
    location: { city: "Metropolis", cityCode: "METRO", locality: "Eastside" },
    contactPreferences: { showPhone: true, showWhatsapp: true },
    photos: [{ id: "sb1", url: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=800", key: "ksb1", isPrimary: true }],
    serviceDetails: {
      category: "PLUMBING",
      pricingModel: "HOURLY",
      startingPrice: 400,
      experienceYears: 8,
      serviceAreas: ["Eastside"],
      workingDays: ["MON", "TUE", "WED", "THU", "FRI"],
    },
  });

  // Create Bookings:
  // 1. Booking 1: User A requests service from User B (User A is Customer)
  const booking1 = await Booking.create({
    customerId: userAId,
    providerId: userBId,
    listingId: servB1._id,
    status: "PENDING",
    requestedDate: new Date(Date.now() + 86400000 * 3),
    timeSlot: "10:00 - 12:00",
    serviceAddress: { line1: "123 Alpha St", locality: "Downtown", city: "Metropolis" },
    customerPhone: "+919876543210",
    statusHistory: [{ status: "PENDING", changedBy: userAId, timestamp: new Date() }],
  });

  // 2. Booking 2: User B requests service from User A (User A is Provider)
  const booking2 = await Booking.create({
    customerId: userBId,
    providerId: userAId,
    listingId: servA1._id,
    status: "ACCEPTED",
    requestedDate: new Date(Date.now() + 86400000 * 5),
    timeSlot: "14:00 - 16:00",
    serviceAddress: { line1: "456 Beta Ave", locality: "Eastside", city: "Metropolis" },
    customerPhone: "+919876543211",
    statusHistory: [{ status: "ACCEPTED", changedBy: userAId, timestamp: new Date() }],
  });

  // Verify User A Dashboard Metrics
  const userAProps = await Listing.find({ ownerId: userAId, type: "PROPERTY", status: { $ne: "ARCHIVED" } });
  const userAServs = await Listing.find({ ownerId: userAId, type: "SERVICE", status: { $ne: "ARCHIVED" } });
  const userAPendingListings = await Listing.find({ ownerId: userAId, status: "PENDING_REVIEW" });
  const userAApprovedListings = await Listing.find({ ownerId: userAId, status: "APPROVED" });
  const userARejectedListings = await Listing.find({ ownerId: userAId, status: "REJECTED" });
  const userACustomerBookings = await Booking.find({ customerId: userAId });
  const userAProviderBookings = await Booking.find({ providerId: userAId });

  assert(userAProps.length === 3, `User A owns exactly 3 active properties (found: ${userAProps.length})`);
  assert(userAServs.length === 2, `User A owns exactly 2 active services (found: ${userAServs.length})`);
  assert(userAPendingListings.length === 2, `User A has exactly 2 listings pending approval (1 property + 1 service)`);
  assert(userAApprovedListings.length === 2, `User A has exactly 2 approved listings (1 property + 1 service)`);
  assert(userARejectedListings.length === 1, `User A has exactly 1 rejected listing`);
  assert(userARejectedListings[0].moderation.rejectionReason?.includes("document required") === true, `Owner can see rejection reason for their rejected listing`);

  // Verify archived exclusion
  const userAArchivedCount = await Listing.countDocuments({ ownerId: userAId, status: "ARCHIVED" });
  assert(userAArchivedCount === 1, `User A has 1 archived listing stored`);
  const activeCountTotal = await Listing.countDocuments({ ownerId: userAId, status: { $ne: "ARCHIVED" } });
  assert(activeCountTotal === 5, `Archived listing is excluded from active dashboard count (expected 5, got ${activeCountTotal})`);

  // Verify customer vs provider booking count separation
  assert(userACustomerBookings.length === 1, `User A has exactly 1 customer booking request`);
  assert(userAProviderBookings.length === 1, `User A has exactly 1 incoming provider booking request`);
  assert(userACustomerBookings[0]._id.toString() === booking1._id.toString(), `Customer booking correctly references booking1`);
  assert(userAProviderBookings[0]._id.toString() === booking2._id.toString(), `Provider booking correctly references booking2`);

  // Verify cross-user isolation
  const userBProps = await Listing.find({ ownerId: userBId, type: "PROPERTY", status: { $ne: "ARCHIVED" } });
  assert(userBProps.length === 1, `User B sees only their 1 property`);
  assert(userBProps[0]._id.toString() === propB1._id.toString(), `User B sees strictly their own property`);
  const userBSeeingUserA = await Listing.countDocuments({ ownerId: userBId, _id: { $in: [propA1._id, propA2._id, propA3._id] } });
  assert(userBSeeingUserA === 0, `User B has 0 of User A's properties in their dashboard query`);

  // ---------------------------------------------------------------------------
  // TEST GROUP 5: State Machine, Resubmission & Clean Teardown
  // ---------------------------------------------------------------------------
  console.log("\n--- Group 5: State Transitions & Resubmission Workflow ---");

  // Simulate User A fixing and resubmitting rejected property
  const resubmitted = await Listing.findOneAndUpdate(
    { _id: propA3._id, ownerId: userAId },
    {
      $set: {
        status: "PENDING_REVIEW",
        "moderation.rejectionReason": null,
        description: "Updated description providing required verified ownership deed documentation.",
        updatedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  );

  assert(resubmitted?.status === "PENDING_REVIEW", "Resubmitting rejected listing resets status to PENDING_REVIEW");
  assert(resubmitted?.moderation.rejectionReason === null, "Resubmitting clears prior rejection feedback");

  // Post-resubmission counts
  const pendingAfterResubmit = await Listing.countDocuments({ ownerId: userAId, status: "PENDING_REVIEW" });
  const rejectedAfterResubmit = await Listing.countDocuments({ ownerId: userAId, status: "REJECTED" });
  assert(pendingAfterResubmit === 3, `Pending review count increments to 3 after resubmission`);
  assert(rejectedAfterResubmit === 0, `Rejected count decrements to 0 after resubmission`);

  // Cleanup all test documents
  await Listing.deleteMany({ _id: { $in: [propA1._id, propA2._id, propA3._id, propA4._id, servA1._id, servA2._id, propB1._id, servB1._id] } });
  await Booking.deleteMany({ _id: { $in: [booking1._id, booking2._id] } });
  await User.deleteMany({ _id: { $in: [userAId, userBId] } });

  console.log("\nCleaned up all test documents and users from database.");

  await disconnectFromDatabase();

  console.log("\n=================================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Test suite execution failed:", err);
  process.exit(1);
});
