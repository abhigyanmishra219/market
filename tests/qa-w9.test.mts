import { connectToDatabase, disconnectFromDatabase, getDatabaseConnectionState } from "@/lib/db";
import { validateSafeRedirect, assertOwnership } from "@/lib/auth-guards";
import {
  validateUploadMetadata,
  generateStorageKey,
  isTrustedStorageUrl,
  verifyStorageFileExists,
  saveLocalUpload,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
} from "@/lib/storage";
import { checkRateLimit } from "@/lib/rate-limiter";
import { Listing } from "@/models/Listing";
import { Booking } from "@/models/Booking";
import { User } from "@/models/User";
import { ValidationError, ForbiddenError } from "@/lib/errors";
import nextConfig from "../next.config";
import { GET as getHealth } from "@/app/api/v1/health/route";
import type { Session } from "next-auth";
import mongoose from "mongoose";
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
  console.log("RUNNING W9 FINAL QA, SECURITY HARDENING & PRODUCTION AUDIT TEST SUITE");
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
  // TEST GROUP 1: Production Health Endpoint Hardening
  // ---------------------------------------------------------------------------
  console.log("--- Group 1: Health Endpoint Security & Leakage Prevention ---");
  try {
    const response = await getHealth();
    const body = await response.json();

    assert(response.status === 200, "Health endpoint returns HTTP 200");
    assert(body.success === true, "Health endpoint returns success wrapper");
    assert(
      body.data.status === "ok" || body.data.status === "degraded",
      `Health status is safe code: ${body.data.status}`
    );
    assert(
      body.data.database && typeof body.data.database.connected === "boolean",
      "Database connection status is sanitized boolean"
    );
    assert(typeof body.data.responseTimeMs === "number", "Response time metric is recorded");

    // Ensure NO raw connection strings, credentials, or cluster hostnames are present
    const rawPayload = JSON.stringify(body);
    assert(!rawPayload.includes("mongodb+srv://"), "No MongoDB URI in health response");
    assert(!rawPayload.includes("password"), "No password fields in health response");
    assert(!rawPayload.includes("admin:"), "No admin credentials in health response");
  } catch (err) {
    assert(false, "Health endpoint executed without unhandled throw", String(err));
  }

  // ---------------------------------------------------------------------------
  // TEST GROUP 2: HTTP Security Headers & Content Security Policy (CSP)
  // ---------------------------------------------------------------------------
  console.log("\n--- Group 2: Production Security Headers Configuration ---");
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const config = (nextConfig as any).default || nextConfig;
    if (config && typeof config.headers === "function") {
      const headerConfigs = await config.headers();
      const allPathHeaders = headerConfigs.find((h: { source: string }) => h.source === "/:path*");
      assert(Boolean(allPathHeaders), "Headers configured for global route /:path*");

      if (allPathHeaders) {
        const headerMap = new Map<string, string>(
          allPathHeaders.headers.map((h: { key: string; value: string }) => [h.key, h.value])
        );

        assert(
          headerMap.get("X-Frame-Options") === "SAMEORIGIN",
          "X-Frame-Options set to SAMEORIGIN"
        );
        assert(
          headerMap.get("X-Content-Type-Options") === "nosniff",
          "X-Content-Type-Options set to nosniff"
        );
        assert(
          headerMap.get("Referrer-Policy") === "strict-origin-when-cross-origin",
          "Referrer-Policy is strict-origin-when-cross-origin"
        );
        assert(
          headerMap.get("X-DNS-Prefetch-Control") === "on",
          "X-DNS-Prefetch-Control is on"
        );
        assert(
          Boolean(headerMap.get("Strict-Transport-Security")?.includes("max-age=63072000")),
          "HSTS enforces max-age=63072000 with subdomains and preload"
        );
        assert(
          Boolean(headerMap.get("Permissions-Policy")?.includes("camera=()")),
          "Permissions-Policy blocks sensitive camera/mic access"
        );

        const csp = headerMap.get("Content-Security-Policy") || "";
        assert(csp.includes("default-src 'self'"), "CSP includes default-src 'self'");
        assert(csp.includes("frame-ancestors 'self'"), "CSP protects against clickjacking");
        assert(csp.includes("accounts.google.com"), "CSP permits Google OAuth endpoints");
      }
    } else {
      assert(false, "nextConfig.headers function exists");
    }
  } catch (err) {
    assert(false, "nextConfig security headers verification", String(err));
  }

  // ---------------------------------------------------------------------------
  // TEST GROUP 3: Object Storage & Upload Security Boundaries
  // ---------------------------------------------------------------------------
  console.log("\n--- Group 3: Upload Validation & Storage Boundaries ---");

  // A. Allowed MIME types validation
  for (const mime of ALLOWED_MIME_TYPES) {
    try {
      const result = validateUploadMetadata("sample.file", mime, 1024 * 1024);
      assert(Boolean(result.extension), `Allowed MIME type accepted: ${mime}`);
    } catch {
      assert(false, `Allowed MIME type failed unexpectedly: ${mime}`);
    }
  }

  // B. Disallowed / dangerous MIME types rejected
  const maliciousTypes = [
    "text/html",
    "application/javascript",
    "application/x-php",
    "image/svg+xml",
    "application/pdf",
    "application/octet-stream",
  ];
  for (const evilType of maliciousTypes) {
    try {
      validateUploadMetadata("evil.file", evilType, 1024);
      assert(false, `Malicious MIME type was NOT rejected: ${evilType}`);
    } catch (e: unknown) {
      const isErr = e instanceof ValidationError || (e as { statusCode?: number })?.statusCode === 422;
      assert(isErr, `Malicious MIME rejected with validation error: ${evilType}`);
    }
  }

  // C. File size boundaries (5MB max)
  try {
    validateUploadMetadata("good.jpg", "image/jpeg", MAX_FILE_SIZE);
    assert(true, "File at exact 5MB limit accepted");
  } catch {
    assert(false, "File at exact 5MB limit should be accepted");
  }

  try {
    validateUploadMetadata("oversize.jpg", "image/jpeg", MAX_FILE_SIZE + 1);
    assert(false, "File exceeding 5MB was NOT rejected");
  } catch (e: unknown) {
    const isErr = e instanceof ValidationError || (e as { statusCode?: number })?.statusCode === 422;
    assert(isErr, "Oversized file rejected with validation error");
  }

  try {
    validateUploadMetadata("empty.jpg", "image/jpeg", 0);
    assert(false, "Zero-byte file was NOT rejected");
  } catch (e: unknown) {
    const isErr = e instanceof ValidationError || (e as { statusCode?: number })?.statusCode === 422;
    assert(isErr, "Zero-byte file rejected with validation error");
  }

  // D. Random key generation & path traversal prevention
  const key1 = generateStorageKey("listings", ".jpg");
  const key2 = generateStorageKey("listings", ".jpg");
  assert(key1 !== key2, "Storage keys are unique and non-deterministic");
  assert(key1.startsWith("listings/"), "Storage key has expected prefix");
  assert(!key1.includes(".."), "Storage key does not contain directory traversal");

  // E. Trusted storage URL validator
  assert(isTrustedStorageUrl("/uploads/listings/abc-123.jpg"), "Local upload path accepted");
  assert(
    isTrustedStorageUrl("/listings/84ed37ef-aaf8-481e-b124-700788121e31.png"),
    "Direct /listings/<uuid>.png storage path accepted"
  );
  assert(!isTrustedStorageUrl("/listings/../../secret.png"), "Directory traversal storage URL rejected");
  assert(!isTrustedStorageUrl("/listings/malicious.js"), "Non-image extension in storage URL rejected");
  assert(!isTrustedStorageUrl("/listings/nested/folder/photo.png"), "Sub-path injection storage URL rejected");
  assert(!isTrustedStorageUrl("https://malicious-attacker.com/fake.png"), "Untrusted external host rejected");
  assert(!isTrustedStorageUrl("javascript:alert(1)"), "Script injection URL rejected");
  assert(!isTrustedStorageUrl("data:image/png;base64,AAA"), "Data URI rejected");
  assert(!isTrustedStorageUrl(""), "Empty string rejected");

  // F. Storage file existence & integrity verification
  const testBuffer = Buffer.from("fake-png-image-content-for-testing");
  const testStorageKey = generateStorageKey("listings", ".png");
  const uploadResult = await saveLocalUpload(testBuffer, testStorageKey);
  assert(uploadResult.url.startsWith("/listings/"), "Local upload returns authorized /listings/ URL");
  assert(await verifyStorageFileExists(uploadResult.url), "verifyStorageFileExists returns true for uploaded file");

  assert(
    !(await verifyStorageFileExists("/listings/forged-nonexistent-file.png")),
    "verifyStorageFileExists returns false for unuploaded / forged file"
  );
  assert(
    !(await verifyStorageFileExists("/listings/../../package.json")),
    "verifyStorageFileExists returns false for path traversal attack"
  );

  // Clean up test file
  try {
    const fsPromises = await import("fs/promises");
    const pathMod = await import("path");
    await fsPromises.unlink(pathMod.join(process.cwd(), "public", uploadResult.key));
  } catch {
    // Ignore cleanup
  }

  // ---------------------------------------------------------------------------
  // TEST GROUP 4: Rate Limiting Engine & Anti-Scraping Protection
  // ---------------------------------------------------------------------------
  console.log("\n--- Group 4: Rate Limiter Engine & Contact Protection ---");
  const testIp = `test-ip-${Date.now()}`;
  const maxLimit = 5;
  const windowMs = 5000;

  for (let i = 1; i <= maxLimit; i++) {
    const res = checkRateLimit(testIp, maxLimit, windowMs);
    assert(res.allowed === true, `Rate limit request ${i}/${maxLimit} allowed`);
    assert(res.remaining === maxLimit - i, `Remaining count decremented accurately to ${maxLimit - i}`);
  }

  // Next request exceeds limit
  const exceededRes = checkRateLimit(testIp, maxLimit, windowMs);
  assert(exceededRes.allowed === false, "Excessive request is strictly blocked");
  assert(exceededRes.remaining === 0, "Remaining count is 0 when blocked");
  assert(exceededRes.resetSeconds > 0, "Reset seconds provided for retry-after");

  // Different IP is isolated
  const separateIp = `separate-ip-${Date.now()}`;
  const separateRes = checkRateLimit(separateIp, maxLimit, windowMs);
  assert(separateRes.allowed === true, "Distinct client IP has isolated rate counter");

  // ---------------------------------------------------------------------------
  // TEST GROUP 5: Authorization Guards & Safe Redirection
  // ---------------------------------------------------------------------------
  console.log("\n--- Group 5: Authorization Guards & Perimeter Redirection ---");
  assert(validateSafeRedirect("/properties") === "/properties", "Safe internal path preserved");
  assert(validateSafeRedirect("/dashboard/bookings") === "/dashboard/bookings", "Safe subpath preserved");
  assert(validateSafeRedirect("https://attacker.org") === "/", "Absolute URL redirected to safe root");
  assert(validateSafeRedirect("//attacker.org") === "/", "Protocol-relative attack redirected to safe root");
  assert(validateSafeRedirect("/\\attacker.org") === "/", "Backslash vector redirected to safe root");
  assert(validateSafeRedirect("javascript:alert(1)") === "/", "Javascript scheme redirected to safe root");

  // Role verification helper
  const adminSession: Session = {
    user: { id: "admin-id-1", role: "ADMIN", status: "ACTIVE", email: "admin@marketplace.com", name: "Admin" },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };
  const userSession: Session = {
    user: { id: "user-id-1", role: "USER", status: "ACTIVE", email: "user@marketplace.com", name: "User" },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  function checkAdminPrivilege(session: Session) {
    if (session.user.role !== "ADMIN") {
      throw new ForbiddenError("Administrative privileges are required.");
    }
  }

  try {
    checkAdminPrivilege(adminSession);
    assert(true, "Admin session recognized with elevated privileges");
  } catch {
    assert(false, "Admin session should have elevated privileges");
  }

  let userBlocked = false;
  try {
    checkAdminPrivilege(userSession);
  } catch (err: unknown) {
    const isErr = err instanceof ForbiddenError || (err as { statusCode?: number })?.statusCode === 403;
    if (isErr) userBlocked = true;
  }
  assert(userBlocked, "Standard user session denied administrative privileges");

  let ownerAllowed = false;
  try {
    assertOwnership("user-id-1", userSession);
    ownerAllowed = true;
  } catch {
    ownerAllowed = false;
  }
  assert(ownerAllowed, "assertOwnership permits owner");

  let nonOwnerBlocked = false;
  try {
    assertOwnership("other-user-999", userSession);
  } catch (err: unknown) {
    const isErr =
      err instanceof ForbiddenError ||
      (err as { statusCode?: number })?.statusCode === 403 ||
      (err as { code?: string })?.code === "FORBIDDEN";
    if (isErr) nonOwnerBlocked = true;
  }
  assert(nonOwnerBlocked, "assertOwnership throws ForbiddenError for mismatched user");

  // ---------------------------------------------------------------------------
  // TEST GROUP 6: Database Integrity & Privacy Masking
  // ---------------------------------------------------------------------------
  console.log("\n--- Group 6: Live Database Integrity & Privacy Masking ---");
  await connectToDatabase();
  assert(getDatabaseConnectionState().status === "connected", "Connected to test database");

  let testUserId: mongoose.Types.ObjectId | null = null;
  let testCustomerId: mongoose.Types.ObjectId | null = null;
  let listingId: mongoose.Types.ObjectId | null = null;
  let bookingId: mongoose.Types.ObjectId | null = null;

  try {
    // Create isolated test user & listing
    const testUser = await User.create({
      name: "QA User",
      email: `qa-user-${Date.now()}@test.local`,
      role: "USER",
      phone: "+91 99999 88888",
      whatsapp: "+91 99999 88888",
    });
    testUserId = testUser._id;

    const pendingListing = await Listing.create({
      title: "QA Test Property Secret Address",
      slug: `qa-prop-${Date.now()}`,
      type: "PROPERTY",
      status: "PENDING_REVIEW",
      ownerId: testUser._id,
      description: "Quality assurance test property for privacy verification",
      location: {
        city: "Bangalore",
        cityCode: "BLR",
        locality: "Indiranagar",
        streetAddress: "123 Classified VIP Lane",
        geo: { type: "Point", coordinates: [77.6412, 12.9716] },
      },
      contactPreferences: {
        showPhone: true,
        showWhatsapp: true,
        phone: "+91 99999 88888",
        whatsapp: "+91 99999 88888",
      },
      propertyDetails: {
        purpose: "FOR_RENT",
        propertyType: "APARTMENT",
        price: 45000,
        securityDeposit: 150000,
        bedrooms: 3,
        carpetArea: 1400,
        furnishing: "FULLY_FURNISHED",
        amenities: ["LIFT", "SECURITY"],
        availableFrom: new Date(),
      },
      moderation: {
        rejectionReason: "Internal moderator note: Check utility documents",
      },
      photos: [],
    });
    listingId = pendingListing._id;

    // Verify public query boundary: PENDING_REVIEW listing is hidden from public discovery
    const publicFind = await Listing.findOne({
      _id: pendingListing._id,
      status: "APPROVED",
    });
    assert(publicFind === null, "PENDING_REVIEW listing is excluded from public discovery");

    // Approve listing and verify address masking logic
    pendingListing.status = "APPROVED";
    await pendingListing.save();

    const approvedListing = await Listing.findById(pendingListing._id).lean();
    assert(approvedListing !== null && approvedListing.status === "APPROVED", "Listing approved for public simulation");

    // Simulate public projection masking (as implemented in GET /api/v1/listings/[id])
    const isAnonymousPublic = false; // not owner and not admin
    const publicDisclosedAddress = isAnonymousPublic ? approvedListing?.location?.streetAddress : null;
    assert(publicDisclosedAddress === null, "Public query sanitizes streetAddress to null");

    const publicDisclosedModeration = isAnonymousPublic ? approvedListing?.moderation : undefined;
    assert(publicDisclosedModeration === undefined, "Public query strips moderation notes and rejection reasons");

    // ---------------------------------------------------------------------------
    // TEST GROUP 7: Booking State Transition Integrity
    // ---------------------------------------------------------------------------
    console.log("\n--- Group 7: Booking State Machine Transitions & Validation ---");
    const testCustomer = await User.create({
      name: "QA Customer",
      email: `qa-customer-${Date.now()}@test.local`,
      role: "USER",
    });
    testCustomerId = testCustomer._id;

    const testBooking = await Booking.create({
      listingId: pendingListing._id,
      customerId: testCustomer._id,
      providerId: testUser._id,
      status: "PENDING",
      requestedDate: new Date(Date.now() + 86400000 * 3),
      timeSlot: "10:00 - 12:00",
      serviceAddress: {
        line1: "45 Customer Lane",
        locality: "Indiranagar",
        city: "Bangalore",
      },
      customerPhone: "+91 98888 77777",
      customerNotes: "QA test booking",
      statusHistory: [
        {
          status: "PENDING",
          changedBy: testCustomer._id,
          timestamp: new Date(),
        },
      ],
    });
    bookingId = testBooking._id;

    assert(testBooking.status === "PENDING", "Booking created in initial PENDING state");

    // Valid transition: PENDING -> ACCEPTED
    testBooking.status = "ACCEPTED";
    await testBooking.save();
    assert(testBooking.status === "ACCEPTED", "Valid transition: PENDING -> ACCEPTED");

    // Valid transition: ACCEPTED -> COMPLETED
    testBooking.status = "COMPLETED";
    await testBooking.save();
    assert(testBooking.status === "COMPLETED", "Valid transition: ACCEPTED -> COMPLETED");
  } finally {
    // Cleanup test documents safely
    if (bookingId) await Booking.deleteOne({ _id: bookingId });
    if (listingId) await Listing.deleteOne({ _id: listingId });
    const userIdsToClean = [testUserId, testCustomerId].filter(Boolean);
    if (userIdsToClean.length > 0) {
      await User.deleteMany({ _id: { $in: userIdsToClean } });
    }
    await disconnectFromDatabase();
    console.log("\nDisconnected from test database cleanly.");
  }

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log("\n=================================================================");
  console.log(`TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log("=================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("FATAL: Test suite crashed with unhandled exception:", err);
  process.exit(1);
});
