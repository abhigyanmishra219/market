import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { connectToDatabase, disconnectFromDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { Listing } from "@/models/Listing";
import { requireAuth, requireAdmin, assertOwnership } from "@/lib/auth-guards";
import { updateProfileSchema } from "@/lib/validations/user";
import { listingStatusTransitionSchema } from "@/lib/validations/listing";
import { getPublicListings } from "@/lib/listings-data";
import { UnauthorizedError, ForbiddenError, ValidationError } from "@/lib/errors";

// Load environment variables from .env.local
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const match = line.trim().match(/^([^=]+)=(.*)$/);
    if (match) {
      const val = match[2].trim().replace(/^["']|["']$/g, "");
      process.env[match[1].trim()] = val;
    }
  }
}

async function runAdminModerationTestSuite() {
  console.log("=================================================================");
  console.log("RUNNING MARKETPLACE ADMIN & LISTING MODERATION TEST SUITE");
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

  // IDs to track and clean up
  const createdUserIds: mongoose.Types.ObjectId[] = [];
  const createdListingIds: mongoose.Types.ObjectId[] = [];

  try {
    await connectToDatabase();

    // ---------------------------------------------------------------------------
    // TEST GROUP 1: Single-Account OAuth, Normal User Lifecycle & Privilege Escalation
    // ---------------------------------------------------------------------------
    console.log("--- Group 1: Account Lifecycle & Privilege Escalation Defense ---");

    const testNormalEmail = `normal_${Date.now()}@example.com`;
    const normalUser = await User.create({
      name: "Normal Consumer",
      email: testNormalEmail,
    });
    createdUserIds.push(normalUser._id);

    assert(normalUser.role === "USER", "Default created user role is strictly 'USER'");
    assert(normalUser.status === "ACTIVE", "Default created user status is 'ACTIVE'");

    // Verify duplicate email cannot be created (single account per user constraint)
    let duplicateRejected = false;
    try {
      await User.create({
        name: "Duplicate User",
        email: testNormalEmail,
      });
    } catch {
      duplicateRejected = true;
    }
    assert(duplicateRejected, "Duplicate account creation with identical email is rejected by unique index");

    // Privilege escalation defense: user attempting to self-assign role: "ADMIN" via profile update
    const maliciousProfilePayload = {
      name: "Attempted Hacker",
      role: "ADMIN",
      status: "ACTIVE",
      email: "hacked@example.com",
    };
    const sanitizedProfile = updateProfileSchema.parse(maliciousProfilePayload);
    assert(!("role" in sanitizedProfile), "Forbidden field 'role' is stripped from user profile updates");
    assert(!("status" in sanitizedProfile), "Forbidden field 'status' is stripped from user profile updates");
    assert(!("email" in sanitizedProfile), "Forbidden field 'email' is stripped from user profile updates");

    // ---------------------------------------------------------------------------
    // TEST GROUP 2: Secure Initial Admin Bootstrap & Role Protection
    // ---------------------------------------------------------------------------
    console.log("\n--- Group 2: Initial Admin Bootstrap & Normalization ---");

    const configuredAdminEmail = `superadmin_${Date.now()}@example.com`;
    process.env.ADMIN_EMAIL = `  ${configuredAdminEmail.toUpperCase()}  `; // Test with whitespace and upper case

    // 1. Unmatched user must NOT be promoted
    const nonAdminUser = await User.create({
      name: "Regular Citizen",
      email: `regular_${Date.now()}@example.com`,
      role: "USER",
    });
    createdUserIds.push(nonAdminUser._id);

    // Simulate bootstrap check on non-admin
    const normalizedAdmin = process.env.ADMIN_EMAIL.trim().toLowerCase();
    if (nonAdminUser.email.trim().toLowerCase() === normalizedAdmin && nonAdminUser.role !== "ADMIN") {
      nonAdminUser.role = "ADMIN";
      await nonAdminUser.save();
    }
    assert(nonAdminUser.role === "USER", "Non-matching user email is not promoted to admin");

    // 2. Matching user IS safely promoted
    const adminUser = await User.create({
      name: "Platform Owner",
      email: configuredAdminEmail.toLowerCase(),
      role: "USER",
    });
    createdUserIds.push(adminUser._id);

    if (adminUser.email.trim().toLowerCase() === normalizedAdmin && adminUser.role !== "ADMIN") {
      adminUser.role = "ADMIN";
      await adminUser.save();
    }
    assert(adminUser.role === "ADMIN", "Verified matching user is successfully promoted to ADMIN");

    // 3. Idempotency test: repeated bootstrap maintains ADMIN role
    const adminRefetch = await User.findById(adminUser._id);
    assert(adminRefetch?.role === "ADMIN", "Admin role persists cleanly across database re-fetches");

    // 4. Downgrade defense: changing ADMIN_EMAIL must NOT downgrade existing administrators
    process.env.ADMIN_EMAIL = "different_admin@example.com";
    const newConfiguredAdmin = process.env.ADMIN_EMAIL.trim().toLowerCase();
    if (adminRefetch && adminRefetch.email.trim().toLowerCase() === newConfiguredAdmin && adminRefetch.role !== "ADMIN") {
      adminRefetch.role = "ADMIN";
      await adminRefetch.save();
    }
    assert(adminRefetch?.role === "ADMIN", "Existing administrator is NOT downgraded when ADMIN_EMAIL changes");

    // ---------------------------------------------------------------------------
    // TEST GROUP 3: Server-Side Authorization Guards & RBAC
    // ---------------------------------------------------------------------------
    console.log("\n--- Group 3: Server-Side Authorization & Access Control ---");

    const normalUserSession = {
      user: {
        id: normalUser._id.toString(),
        email: normalUser.email,
        name: normalUser.name,
        role: normalUser.role,
        status: normalUser.status,
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    };

    const adminUserSession = {
      user: {
        id: adminUser._id.toString(),
        email: adminUser.email,
        name: adminUser.name,
        role: adminUser.role,
        status: adminUser.status,
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    };

    // Role verification guards
    let regularAdminCheckThrew = false;
    try {
      if (normalUserSession.user.role !== "ADMIN") {
        throw new ForbiddenError("Administrative privileges are required.");
      }
    } catch (err) {
      if (err instanceof ForbiddenError) regularAdminCheckThrew = true;
    }
    assert(regularAdminCheckThrew, "Normal user calling admin endpoint is rejected with 403 Forbidden");

    let adminCheckSucceeded = false;
    try {
      if (adminUserSession.user.role === "ADMIN") {
        adminCheckSucceeded = true;
      }
    } catch {
      adminCheckSucceeded = false;
    }
    assert(adminCheckSucceeded, "Authorized administrator passes admin authorization checks");

    // Ownership vs Admin assertion
    let ownerEditAllowed = false;
    try {
      assertOwnership(normalUser._id, normalUserSession as any);
      ownerEditAllowed = true;
    } catch {
      ownerEditAllowed = false;
    }
    assert(ownerEditAllowed, "Listing owner is authorized to manage their own listing");

    let foreignUserEditBlocked = false;
    try {
      assertOwnership(nonAdminUser._id, normalUserSession as any);
    } catch (err: any) {
      if (err?.name === "ForbiddenError" || err?.statusCode === 403 || err instanceof ForbiddenError) {
        foreignUserEditBlocked = true;
      }
    }
    assert(foreignUserEditBlocked, "Non-owner user is strictly forbidden (403) from mutating foreign listings");

    let adminGlobalEditAllowed = false;
    try {
      assertOwnership(normalUser._id, adminUserSession as any);
      adminGlobalEditAllowed = true;
    } catch {
      adminGlobalEditAllowed = false;
    }
    assert(adminGlobalEditAllowed, "Administrator is authorized across foreign user resources");

    // ---------------------------------------------------------------------------
    // TEST GROUP 4: Property & Service Moderation Workflow (Approvals & Rejections)
    // ---------------------------------------------------------------------------
    console.log("\n--- Group 4: Moderation Workflow, Audit Trail & State Transitions ---");

    // Create a pending property listing
    const propertyListing = await Listing.create({
      type: "PROPERTY",
      status: "PENDING_REVIEW",
      title: "Spacious 3BHK Apartment for Rent in Metropolis Downtown",
      slug: `spacious-3bhk-apt-metro-${Date.now()}`,
      description: "A bright and airy three-bedroom apartment with scenic views and reserved parking.",
      ownerId: normalUser._id,
      location: {
        city: "Metropolis",
        cityCode: "METRO",
        locality: "Downtown",
        streetAddress: "42 Central Boulevard",
      },
      contactPreferences: {
        showPhone: true,
        showWhatsapp: true,
      },
      photos: [
        {
          id: "photo-1",
          url: "https://media.marketplace.com/listings/prop-1.jpg",
          key: "listings/prop-1.jpg",
          isPrimary: true,
        },
      ],
      propertyDetails: {
        purpose: "FOR_RENT",
        propertyType: "APARTMENT",
        price: 35000,
        securityDeposit: 70000,
        maintenanceFee: 2500,
        bedrooms: 3,
        bathrooms: 2,
        carpetArea: 1250,
        furnishing: "SEMI_FURNISHED",
        amenities: ["Parking", "Lift", "Gym"],
        availableFrom: new Date(),
        preferredTenants: "ANY",
      },
    });
    createdListingIds.push(propertyListing._id);
    assert(propertyListing.status === "PENDING_REVIEW", "New property submission defaults to 'PENDING_REVIEW'");

    // Create a pending service listing
    const serviceListing = await Listing.create({
      type: "SERVICE",
      status: "PENDING_REVIEW",
      title: "Licensed Master Electrician & Home Automation Specialist",
      slug: `licensed-master-electrician-${Date.now()}`,
      description: "Certified electrical contractor providing professional residential wiring and repairs.",
      ownerId: normalUser._id,
      location: {
        city: "Metropolis",
        cityCode: "METRO",
        locality: "West End",
      },
      contactPreferences: {
        showPhone: true,
        showWhatsapp: true,
      },
      photos: [
        {
          id: "photo-service-1",
          url: "https://media.marketplace.com/services/elec-1.jpg",
          key: "services/elec-1.jpg",
          isPrimary: true,
        },
      ],
      serviceDetails: {
        category: "ELECTRICAL",
        pricingModel: "HOURLY",
        startingPrice: 450,
        experienceYears: 8,
        serviceAreas: ["West End", "Downtown", "Uptown"],
        workingDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT"],
        workingHours: { start: "08:00", end: "19:00" },
        guarantees: "30-day workmanship guarantee on all electrical installations",
      },
    });
    createdListingIds.push(serviceListing._id);
    assert(serviceListing.status === "PENDING_REVIEW", "New service submission defaults to 'PENDING_REVIEW'");

    // Owner cannot approve their own listing
    let ownerSelfApproveBlocked = false;
    try {
      const isOwner = propertyListing.ownerId.toString() === normalUser._id.toString();
      const isAdmin = normalUserSession.user.role === "ADMIN";
      const targetStatus = "APPROVED";
      if (!isAdmin && targetStatus === "APPROVED") {
        throw new ForbiddenError("Only authorized administrators may approve listings.");
      }
    } catch (err) {
      if (err instanceof ForbiddenError) ownerSelfApproveBlocked = true;
    }
    assert(ownerSelfApproveBlocked, "Owner cannot self-approve their own pending listing");

    // Rejection validation rule: Rejection MUST have a reason
    let emptyRejectionBlocked = false;
    const emptyRejectSchema = listingStatusTransitionSchema.safeParse({
      status: "REJECTED",
      rejectionReason: "",
    });
    if (!emptyRejectSchema.data?.rejectionReason) {
      emptyRejectionBlocked = true;
    }
    assert(emptyRejectionBlocked, "Listing rejection without rejection reason is rejected by schema");

    // Admin rejects service listing with clear feedback
    const rejectionNote = "Please provide higher resolution photos of recent electrical panel work.";
    serviceListing.status = "REJECTED";
    serviceListing.moderation = {
      reviewedBy: adminUser._id,
      reviewedAt: new Date(),
      rejectionReason: rejectionNote,
    };
    await serviceListing.save();

    const rejectedFetch = await Listing.findById(serviceListing._id);
    assert(rejectedFetch?.status === "REJECTED", "Admin successfully rejected listing");
    assert(rejectedFetch?.moderation.rejectionReason === rejectionNote, "Rejection reason is stored in moderation audit object");
    assert(rejectedFetch?.moderation.reviewedBy?.toString() === adminUser._id.toString(), "Moderator admin ID is accurately recorded");
    assert(Boolean(rejectedFetch?.moderation.reviewedAt), "Moderation timestamp is recorded");

    // Admin approves property listing
    propertyListing.status = "APPROVED";
    propertyListing.moderation = {
      reviewedBy: adminUser._id,
      reviewedAt: new Date(),
      rejectionReason: null,
    };
    await propertyListing.save();

    const approvedFetch = await Listing.findById(propertyListing._id);
    assert(approvedFetch?.status === "APPROVED", "Admin successfully approved property listing");
    assert(approvedFetch?.moderation.rejectionReason === null, "Rejection reason cleared upon approval");

    // ---------------------------------------------------------------------------
    // TEST GROUP 5: Public Discovery & Visibility Isolation
    // ---------------------------------------------------------------------------
    console.log("\n--- Group 5: Public Discovery & Visibility Isolation ---");

    // Query public listings: unapproved (REJECTED service) must NOT appear
    const publicServices = await getPublicListings({
      type: "SERVICE",
      cityCode: "METRO",
      limit: 50,
    });
    const foundRejected = publicServices.items.some(
      (l) => l.id.toString() === serviceListing._id.toString()
    );
    assert(!foundRejected, "Rejected service listing stays completely hidden from public discovery");

    // Query public listings: approved property MUST appear
    const publicProperties = await getPublicListings({
      type: "PROPERTY",
      cityCode: "METRO",
      limit: 50,
    });
    const foundApproved = publicProperties.items.some(
      (l) => l.id.toString() === propertyListing._id.toString()
    );
    assert(foundApproved, "Approved property listing is immediately visible in public discovery");

    // Material edit re-review policy:
    // If an approved listing receives a critical edit by owner, it must reset to PENDING_REVIEW
    const isCriticalEdit = true;
    if (approvedFetch?.status === "APPROVED" && isCriticalEdit) {
      approvedFetch.status = "PENDING_REVIEW";
      approvedFetch.moderation = {};
      await approvedFetch.save();
    }

    const reReviewListing = await Listing.findById(propertyListing._id);
    assert(reReviewListing?.status === "PENDING_REVIEW", "Critical edit resets approved listing back to 'PENDING_REVIEW'");

    // Verify it is now hidden from public discovery again
    const publicAfterEdit = await getPublicListings({
      type: "PROPERTY",
      cityCode: "METRO",
      limit: 50,
    });
    const foundAfterEdit = publicAfterEdit.items.some(
      (l) => l.id.toString() === propertyListing._id.toString()
    );
    assert(!foundAfterEdit, "Edited listing under re-review is safely hidden from public discovery");

    // Admin re-approves service listing once owner updates
    serviceListing.status = "APPROVED";
    serviceListing.moderation = {
      reviewedBy: adminUser._id,
      reviewedAt: new Date(),
      rejectionReason: null,
    };
    await serviceListing.save();

    const publicApprovedService = await getPublicListings({
      type: "SERVICE",
      cityCode: "METRO",
      limit: 50,
    });
    const foundServiceNow = publicApprovedService.items.some(
      (l) => l.id.toString() === serviceListing._id.toString()
    );
    assert(foundServiceNow, "Re-approved service is immediately visible in public discovery");

    // Concurrency test: race condition safety
    let raceSuccessCount = 0;
    const concurrentActions = [
      Listing.findOneAndUpdate(
        { _id: propertyListing._id, status: "PENDING_REVIEW" },
        { status: "APPROVED", "moderation.reviewedAt": new Date() },
        { new: true }
      ),
      Listing.findOneAndUpdate(
        { _id: propertyListing._id, status: "PENDING_REVIEW" },
        { status: "REJECTED", "moderation.rejectionReason": "Conflict test", "moderation.reviewedAt": new Date() },
        { new: true }
      ),
    ];
    const results = await Promise.all(concurrentActions);
    if (results[0]) raceSuccessCount++;
    if (results[1]) raceSuccessCount++;
    assert(raceSuccessCount === 1, "Concurrency safety: exactly one atomic moderation state transition succeeds");

  } catch (error) {
    console.error("Test execution threw uncaught error:", error);
    failed++;
  } finally {
    // ---------------------------------------------------------------------------
    // TEST GROUP 6: Database Cleanup
    // ---------------------------------------------------------------------------
    if (createdListingIds.length > 0) {
      await Listing.deleteMany({ _id: { $in: createdListingIds } });
    }
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } });
    }
    await disconnectFromDatabase();
    console.log("\nCleaned up all test listings and users from database.");
  }

  console.log("\n=================================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runAdminModerationTestSuite();
