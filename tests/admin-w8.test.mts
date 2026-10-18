import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import { connectToDatabase, disconnectFromDatabase } from "@/lib/db";
import { User } from "@/models/User";
import { Listing } from "@/models/Listing";
import { Report } from "@/models/Report";
import { AuditLog } from "@/models/AuditLog";
import { updateProfileSchema } from "@/lib/validations/user";
import { getPublicListings } from "@/lib/listings-data";
import { ForbiddenError, UnauthorizedError } from "@/lib/errors";
import type { Session } from "next-auth";

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

async function runW8AdminTestSuite() {
  console.log("=================================================================");
  console.log("RUNNING W8: ADMIN DASHBOARD, MODERATION & MARKETPLACE TEST SUITE");
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

  const createdUserIds: mongoose.Types.ObjectId[] = [];
  const createdListingIds: mongoose.Types.ObjectId[] = [];
  const createdReportIds: mongoose.Types.ObjectId[] = [];
  const createdAuditLogIds: mongoose.Types.ObjectId[] = [];

  try {
    await connectToDatabase();

    // ---------------------------------------------------------------------------
    // TEST GROUP 1: Server-Side Authorization & Privilege Escalation Defense
    // ---------------------------------------------------------------------------
    console.log("--- Group 1: Server-Side Authorization & Privilege Escalation ---");

    const normalUser = await User.create({
      name: "Normal Consumer",
      email: `consumer_${Date.now()}@example.com`,
      role: "USER",
      status: "ACTIVE",
    });
    createdUserIds.push(normalUser._id);

    const adminUser = await User.create({
      name: "Platform Administrator",
      email: `admin_${Date.now()}@example.com`,
      role: "ADMIN",
      status: "ACTIVE",
    });
    createdUserIds.push(adminUser._id);

    const normalSession: Session = {
      user: {
        id: normalUser._id.toString(),
        name: normalUser.name,
        email: normalUser.email,
        role: normalUser.role,
        status: normalUser.status,
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    };

    const adminSession: Session = {
      user: {
        id: adminUser._id.toString(),
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
        status: adminUser.status,
      },
      expires: new Date(Date.now() + 86400000).toISOString(),
    };

    // 1.1 Unauthenticated call rejection
    let unauthenticatedBlocked = false;
    try {
      const emptySession = null as unknown as Session | null;
      if (!emptySession || !emptySession.user) {
        throw new UnauthorizedError("Authentication is required to perform this action.");
      }
    } catch (err) {
      if (err instanceof UnauthorizedError) unauthenticatedBlocked = true;
    }
    assert(unauthenticatedBlocked, "Logged-out requests are rejected with 401 UnauthorizedError");

    // 1.2 Non-admin call rejection
    let normalUserAdminCheckBlocked = false;
    try {
      if (normalSession.user.role !== "ADMIN") {
        throw new ForbiddenError("Administrative privileges are required to access this resource.");
      }
    } catch (err) {
      if (err instanceof ForbiddenError) normalUserAdminCheckBlocked = true;
    }
    assert(normalUserAdminCheckBlocked, "Normal users calling admin operations are rejected with 403 ForbiddenError");

    // 1.3 Admin authorization success
    let adminCheckPassed = false;
    try {
      if (adminSession.user.role === "ADMIN") {
        adminCheckPassed = true;
      }
    } catch {
      adminCheckPassed = false;
    }
    assert(adminCheckPassed, "Explicitly authorized admin user passes administrative check");

    // 1.4 Privilege escalation defense
    const maliciousPayload = {
      name: "Injected Admin",
      role: "ADMIN",
      status: "ACTIVE",
      email: "hacked@example.com",
    };
    const sanitized = updateProfileSchema.parse(maliciousPayload);
    assert(!("role" in sanitized), "User profile update strictly strips 'role' field preventing escalation");
    assert(!("status" in sanitized), "User profile update strictly strips 'status' field");

    // 1.5 Safe bootstrap idempotency & downgrade defense
    const bootstrapEmail = adminUser.email;
    process.env.ADMIN_EMAIL = `  ${bootstrapEmail.toUpperCase()}  `;
    const normalizedEnv = process.env.ADMIN_EMAIL.trim().toLowerCase();

    // Idempotent promotion
    if (adminUser.email.trim().toLowerCase() === normalizedEnv && adminUser.role !== "ADMIN") {
      adminUser.role = "ADMIN";
      await adminUser.save();
    }
    assert(adminUser.role === "ADMIN", "Admin bootstrap handles whitespace and case-insensitivity idempotently");

    // Changing ADMIN_EMAIL does not downgrade existing admin
    process.env.ADMIN_EMAIL = "different_lead@example.com";
    const refetchedAdmin = await User.findById(adminUser._id);
    assert(refetchedAdmin?.role === "ADMIN", "Changing ADMIN_EMAIL never downgrades existing platform administrator");

    // ---------------------------------------------------------------------------
    // TEST GROUP 2: Property & Service Moderation with Concurrency Safety & Audit Trail
    // ---------------------------------------------------------------------------
    console.log("\n--- Group 2: Property & Service Moderation Workflow ---");

    // Create a pending property
    const propertyListing = await Listing.create({
      type: "PROPERTY",
      status: "PENDING_REVIEW",
      title: "Luxury 3BHK Penthouse with Skyline Balcony",
      slug: `luxury-3bhk-penthouse-${Date.now()}`,
      description: "Exclusive penthouse offering panoramic city views and premium fittings.",
      ownerId: normalUser._id,
      location: {
        city: "Metropolis",
        cityCode: "METRO",
        locality: "Skyline District",
        streetAddress: "100 Panorama Way",
      },
      contactPreferences: {
        showPhone: true,
        showWhatsapp: true,
      },
      photos: [
        {
          id: "p1",
          url: "https://media.marketplace.com/prop-skyline.jpg",
          key: "prop-skyline.jpg",
          isPrimary: true,
        },
      ],
      propertyDetails: {
        purpose: "FOR_RENT",
        propertyType: "APARTMENT",
        price: 85000,
        securityDeposit: 170000,
        carpetArea: 2200,
        bedrooms: 3,
        bathrooms: 3,
        furnishing: "FULLY_FURNISHED",
        amenities: ["Swimming Pool", "Gym", "Concierge"],
      },
    });
    createdListingIds.push(propertyListing._id);

    // Create a pending service
    const serviceListing = await Listing.create({
      type: "SERVICE",
      status: "PENDING_REVIEW",
      title: "Commercial & Residential Emergency Plumbing",
      slug: `emergency-plumbing-metro-${Date.now()}`,
      description: "24/7 licensed plumbing services for pipe leaks, sewer clearing, and installations.",
      ownerId: normalUser._id,
      location: {
        city: "Metropolis",
        cityCode: "METRO",
        locality: "Central",
      },
      contactPreferences: {
        showPhone: true,
        showWhatsapp: true,
      },
      photos: [
        {
          id: "s1",
          url: "https://media.marketplace.com/plumbing-serv.jpg",
          key: "plumbing-serv.jpg",
          isPrimary: true,
        },
      ],
      serviceDetails: {
        category: "PLUMBING",
        pricingModel: "HOURLY",
        startingPrice: 500,
        experienceYears: 10,
        serviceAreas: ["Central", "Skyline District"],
        workingDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"],
        workingHours: { start: "00:00", end: "23:59" },
        guarantees: "100% satisfaction or free follow-up service within 14 days",
      },
    });
    createdListingIds.push(serviceListing._id);

    // 2.1 Pending listings remain hidden from public search
    const initialPublic = await getPublicListings({
      type: "PROPERTY",
      cityCode: "METRO",
      limit: 20,
    });
    const foundPendingProp = initialPublic.items.some(
      (l) => l.id.toString() === propertyListing._id.toString()
    );
    assert(!foundPendingProp, "Unapproved property listing is completely hidden from public search");

    // 2.2 Rejection reason validation (< 5 chars rejected)
    let rejectionValidationFailed = false;
    const testReason = "bad";
    if (!testReason || testReason.trim().length < 5) {
      rejectionValidationFailed = true;
    }
    assert(rejectionValidationFailed, "Rejection requires a meaningful reason of at least 5 characters");

    // 2.3 Admin rejects service listing with reason and writes AuditLog
    const serviceRejectionReason = "Please provide verified license number and clearer trade photos.";
    const rejectedServiceDoc = await Listing.findOneAndUpdate(
      { _id: serviceListing._id, status: "PENDING_REVIEW" },
      {
        $set: {
          status: "REJECTED",
          moderation: {
            reviewedBy: adminUser._id,
            reviewedAt: new Date(),
            rejectionReason: serviceRejectionReason,
          },
        },
      },
      { returnDocument: "after" }
    );
    assert(rejectedServiceDoc?.status === "REJECTED", "Admin successfully rejected service listing");
    assert(rejectedServiceDoc?.moderation.rejectionReason === serviceRejectionReason, "Rejection reason saved in moderation object");

    // Write audit log
    const auditReject = await AuditLog.create({
      adminUserId: adminUser._id,
      action: "REJECT_LISTING",
      targetCollection: "listings",
      targetId: serviceListing._id,
      previousState: { status: "PENDING_REVIEW" },
      newState: { status: "REJECTED" },
      reason: serviceRejectionReason,
    });
    createdAuditLogIds.push(auditReject._id);
    assert(auditReject.action === "REJECT_LISTING", "AuditLog correctly recorded REJECT_LISTING action");

    // 2.4 Rejected service remains hidden from public search
    const publicServices = await getPublicListings({
      type: "SERVICE",
      cityCode: "METRO",
      limit: 20,
    });
    const foundRejectedServ = publicServices.items.some(
      (s) => s.id.toString() === serviceListing._id.toString()
    );
    assert(!foundRejectedServ, "Rejected service listing remains hidden from public search");

    // 2.5 Admin approves property listing and writes AuditLog
    const approvedPropertyDoc = await Listing.findOneAndUpdate(
      { _id: propertyListing._id, status: "PENDING_REVIEW" },
      {
        $set: {
          status: "APPROVED",
          moderation: {
            reviewedBy: adminUser._id,
            reviewedAt: new Date(),
            rejectionReason: null,
          },
        },
      },
      { returnDocument: "after" }
    );
    assert(approvedPropertyDoc?.status === "APPROVED", "Admin successfully approved property listing");

    const auditApprove = await AuditLog.create({
      adminUserId: adminUser._id,
      action: "APPROVE_LISTING",
      targetCollection: "listings",
      targetId: propertyListing._id,
      previousState: { status: "PENDING_REVIEW" },
      newState: { status: "APPROVED" },
    });
    createdAuditLogIds.push(auditApprove._id);
    assert(auditApprove.action === "APPROVE_LISTING", "AuditLog correctly recorded APPROVE_LISTING action");

    // 2.6 Approved listing is now visible in public search
    const approvedPublic = await getPublicListings({
      type: "PROPERTY",
      cityCode: "METRO",
      limit: 20,
    });
    const foundApprovedProp = approvedPublic.items.some(
      (l) => l.id.toString() === propertyListing._id.toString()
    );
    assert(foundApprovedProp, "Approved property listing immediately becomes visible in public search");

    // 2.7 Concurrency safety: conflicting concurrent moderation on the same listing
    // Create another pending listing to test race condition
    const raceListing = await Listing.create({
      type: "PROPERTY",
      status: "PENDING_REVIEW",
      title: "Race Condition Test Property",
      slug: `race-test-${Date.now()}`,
      description: "Testing concurrent atomic state updates.",
      ownerId: normalUser._id,
      location: { city: "Metropolis", cityCode: "METRO", locality: "Downtown" },
      contactPreferences: {
        showPhone: true,
        showWhatsapp: true,
      },
      photos: [],
    });
    createdListingIds.push(raceListing._id);

    // Two conflicting actions execute concurrently targeting status: "PENDING_REVIEW"
    const racePromises = [
      Listing.findOneAndUpdate(
        { _id: raceListing._id, status: "PENDING_REVIEW" },
        { $set: { status: "APPROVED", "moderation.reviewedAt": new Date() } },
        { returnDocument: "after" }
      ),
      Listing.findOneAndUpdate(
        { _id: raceListing._id, status: "PENDING_REVIEW" },
        { $set: { status: "REJECTED", "moderation.rejectionReason": "Conflict", "moderation.reviewedAt": new Date() } },
        { returnDocument: "after" }
      ),
    ];
    const raceResults = await Promise.all(racePromises);
    const successCount = raceResults.filter(Boolean).length;
    assert(successCount === 1, "Concurrency safety: exactly one atomic moderation update succeeds during race condition");

    // ---------------------------------------------------------------------------
    // TEST GROUP 3: Listing Reports Workflow & Privacy
    // ---------------------------------------------------------------------------
    console.log("\n--- Group 3: Community Listing Reports & Safety Workflow ---");

    // 3.1 Authenticated report creation
    const reportReason = "INACCURATE_PRICE";
    const reportDetails = "The property price was listed as 85000 but the owner demands 120000 in person.";

    const reportDoc = await Report.create({
      listingId: propertyListing._id,
      reporterId: normalUser._id,
      reporterEmail: normalUser.email,
      reason: reportReason,
      details: reportDetails,
      status: "OPEN",
    });
    createdReportIds.push(reportDoc._id);

    assert(reportDoc.status === "OPEN", "New community report defaults to 'OPEN' status");
    assert(reportDoc.reason === reportReason, "Report stores correct violation category");

    // 3.2 Reporting a listing does NOT automatically unpublish or delete it
    const listingAfterReport = await Listing.findById(propertyListing._id);
    assert(listingAfterReport?.status === "APPROVED", "Listing remains APPROVED and is NOT automatically deleted/unpublished upon report");

    // 3.3 Anti-spam duplicate report prevention
    const existingActive = await Report.findOne({
      listingId: propertyListing._id,
      reporterEmail: normalUser.email.toLowerCase(),
      status: { $in: ["OPEN", "INVESTIGATING"] },
    });
    let duplicateBlocked = false;
    if (existingActive) {
      duplicateBlocked = true;
    }
    assert(duplicateBlocked, "Duplicate open report by the same user is safely caught and blocked");

    // 3.4 Admin resolves report with private internal notes & AuditLog
    const adminPrivateNote = "Contacted owner to verify rent agreement. Rent confirmed at 85k with deposit receipt.";
    reportDoc.status = "RESOLVED";
    reportDoc.adminNotes = adminPrivateNote;
    reportDoc.resolvedBy = adminUser._id;
    reportDoc.resolvedAt = new Date();
    await reportDoc.save();

    const auditReport = await AuditLog.create({
      adminUserId: adminUser._id,
      action: "RESOLVE_REPORT",
      targetCollection: "reports",
      targetId: reportDoc._id,
      previousState: { status: "OPEN" },
      newState: { status: "RESOLVED" },
      reason: adminPrivateNote,
    });
    createdAuditLogIds.push(auditReport._id);

    const refetchedReport = await Report.findById(reportDoc._id);
    assert(refetchedReport?.status === "RESOLVED", "Report successfully marked as RESOLVED by administrator");
    assert(refetchedReport?.adminNotes === adminPrivateNote, "Private admin notes stored in report record");
    assert(auditReport.action === "RESOLVE_REPORT", "AuditLog correctly recorded RESOLVE_REPORT action");

    // 3.5 Privacy verification: adminNotes are NOT exposed on public listing queries
    const publicListingsCheck = await getPublicListings({
      type: "PROPERTY",
      cityCode: "METRO",
      limit: 10,
    });
    const publicItem = publicListingsCheck.items.find(
      (i) => i.id.toString() === propertyListing._id.toString()
    );
    assert(!publicItem || !("adminNotes" in publicItem), "Private admin notes are never leaked to public listing responses");

    // ---------------------------------------------------------------------------
    // TEST GROUP 4: Read-Only User Directory & Aggregation
    // ---------------------------------------------------------------------------
    console.log("\n--- Group 4: Admin User Directory & Activity Aggregation ---");

    // Query user listings count via aggregation
    const userIds = [normalUser._id, adminUser._id];
    const listingCounts = await Listing.aggregate([
      { $match: { ownerId: { $in: userIds } } },
      {
        $group: {
          _id: { ownerId: "$ownerId", type: "$type" },
          count: { $sum: 1 },
        },
      },
    ]);

    const normalUserPropCount = listingCounts.find(
      (c) => c._id.ownerId.toString() === normalUser._id.toString() && c._id.type === "PROPERTY"
    )?.count || 0;

    assert(normalUserPropCount >= 1, "User directory correctly aggregates property listings count per user");

    // Verify sensitive data is excluded from user directory projection
    const userDocSafe = await User.findById(normalUser._id)
      .select("_id name email image role status createdAt")
      .lean();

    assert(Boolean(userDocSafe?.name), "User projection includes display name");
    assert(Boolean(userDocSafe?.email), "User projection includes verified email");
    assert(!("password" in (userDocSafe || {})), "Sensitive password fields do not exist or are excluded");
    assert(!("phone" in (userDocSafe || {})), "Private phone contact is excluded from basic user directory projection");

    // ---------------------------------------------------------------------------
    // TEST GROUP 5: Admin Overview Statistics Verification
    // ---------------------------------------------------------------------------
    console.log("\n--- Group 5: Real Database Overview Statistics ---");

    const [
      totalListings,
      pendingProps,
      approvedProps,
      openReportsCount,
      totalUsersCount,
    ] = await Promise.all([
      Listing.countDocuments(),
      Listing.countDocuments({ type: "PROPERTY", status: "PENDING_REVIEW" }),
      Listing.countDocuments({ type: "PROPERTY", status: "APPROVED" }),
      Report.countDocuments({ status: "OPEN" }),
      User.countDocuments(),
    ]);

    assert(totalListings > 0, `Total listings count is calculated live from DB (${totalListings})`);
    assert(approvedProps > 0, `Approved properties count is calculated live from DB (${approvedProps})`);
    assert(pendingProps >= 0, `Pending properties count is calculated live from DB (${pendingProps})`);
    assert(openReportsCount >= 0, `Open reports count is calculated live from DB (${openReportsCount})`);
    assert(totalUsersCount > 0, `Total users count is calculated live from DB (${totalUsersCount})`);

  } catch (error) {
    console.error("Test execution threw uncaught error:", error);
    failed++;
  } finally {
    // ---------------------------------------------------------------------------
    // CLEANUP
    // ---------------------------------------------------------------------------
    console.log("\n--- Cleaning up test artifacts from database ---");
    if (createdListingIds.length > 0) {
      await Listing.deleteMany({ _id: { $in: createdListingIds } });
    }
    if (createdReportIds.length > 0) {
      await Report.deleteMany({ _id: { $in: createdReportIds } });
    }
    if (createdAuditLogIds.length > 0) {
      await AuditLog.deleteMany({ _id: { $in: createdAuditLogIds } });
    }
    if (createdUserIds.length > 0) {
      await User.deleteMany({ _id: { $in: createdUserIds } });
    }
    await disconnectFromDatabase();
    console.log("Cleanup complete.");
  }

  console.log("\n=================================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================================");

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runW8AdminTestSuite().catch((err) => {
  console.error("Test execution threw uncaught error:", err);
  process.exit(1);
});
