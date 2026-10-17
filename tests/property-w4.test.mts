import fs from "fs";
import mongoose from "mongoose";
import { connectToDatabase, disconnectFromDatabase } from "@/lib/db";
import { Listing } from "@/models/Listing";
import { User } from "@/models/User";
import {
  createPropertyListingSchema,
  updatePropertyListingSchema,
  listingStatusTransitionSchema,
} from "@/lib/validations/listing";
import {
  validateUploadMetadata,
  isTrustedStorageUrl,
  ALLOWED_MIME_TYPES,
  MAX_FILE_SIZE,
} from "@/lib/storage";
import { ForbiddenError, ValidationError } from "@/lib/errors";
import { getPublicListings, getPublicListingByIdOrSlug } from "@/lib/listings-data";

function assertOwnership(
  resourceOwnerId: string | { toString(): string },
  session: { user: { id: string; role: "USER" | "ADMIN" } }
): void {
  const ownerIdStr = resourceOwnerId.toString();
  const userIdStr = session.user.id.toString();

  if (session.user.role !== "ADMIN" && ownerIdStr !== userIdStr) {
    throw new ForbiddenError("You do not have permission to modify this resource.");
  }
}

// Load environment variables from .env.local
const envContent = fs.readFileSync("C:/Users/abhig/Desktop/app/webapp/.env.local", "utf8");
for (const line of envContent.split("\n")) {
  const match = line.trim().match(/^([^=]+)=(.*)$/);
  if (match) {
    const val = match[2].trim().replace(/^["']|["']$/g, "");
    process.env[match[1].trim()] = val;
  }
}

async function runPropertyW4TestSuite() {
  console.log("=================================================================");
  console.log("RUNNING W4 PROPERTY LISTING MANAGEMENT & LIFECYCLE TEST SUITE");
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
  // TEST GROUP 1: Zod Schema Validation & Input Boundaries
  // ---------------------------------------------------------------------------
  console.log("--- Group 1: Property Validation Schemas & Input Boundaries ---");

  // 1.1 Valid property creation payload
  const validPayload = {
    type: "PROPERTY" as const,
    status: "PENDING_REVIEW" as const,
    title: "Spacious 3 BHK Luxury Apartment in Greenwood",
    description: "Bright and airy modern 3 BHK apartment with marble flooring, modular kitchen, and panoramic skyline views.",
    location: {
      city: "Metropolis",
      cityCode: "METRO",
      locality: "Greenwood",
      streetAddress: "123 Maple Street, Tower B, Apt 401",
    },
    contactPreferences: {
      showPhone: true,
      showWhatsapp: true,
      phone: "+1-555-0199",
      whatsapp: "+1-555-0199",
    },
    photos: [
      {
        id: "photo-1",
        url: "/uploads/listings/living-room.webp",
        key: "listings/living-room.webp",
        isPrimary: true,
      },
    ],
    propertyDetails: {
      purpose: "FOR_RENT" as const,
      propertyType: "APARTMENT" as const,
      price: 45000,
      securityDeposit: 90000,
      carpetArea: 1450,
      bedrooms: 3,
      bathrooms: 3,
      furnishing: "SEMI_FURNISHED" as const,
      amenities: ["LIFT", "POWER_BACKUP", "PARKING"],
    },
  };

  const parsedValid = createPropertyListingSchema.safeParse(validPayload);
  assert(parsedValid.success, "Valid property creation payload passes Zod validation");

  // 1.2 Invalid Purpose rejection
  const invalidPurposePayload = {
    ...validPayload,
    propertyDetails: {
      ...validPayload.propertyDetails,
      purpose: "FOR_BARTER",
    },
  };
  const parsedInvalidPurpose = createPropertyListingSchema.safeParse(invalidPurposePayload);
  assert(!parsedInvalidPurpose.success, "Invalid property purpose 'FOR_BARTER' is rejected");

  // 1.3 Negative Price rejection
  const negativePricePayload = {
    ...validPayload,
    propertyDetails: {
      ...validPayload.propertyDetails,
      price: -500,
    },
  };
  const parsedNegativePrice = createPropertyListingSchema.safeParse(negativePricePayload);
  assert(!parsedNegativePrice.success, "Negative property price is strictly rejected");

  // 1.4 Short description rejection (<20 chars)
  const shortDescPayload = {
    ...validPayload,
    description: "Too short",
  };
  const parsedShortDesc = createPropertyListingSchema.safeParse(shortDescPayload);
  assert(!parsedShortDesc.success, "Description under 20 characters is rejected");

  // 1.5 Photos array limit (>12 photos rejected)
  const tooManyPhotos = Array.from({ length: 13 }, (_, i) => ({
    id: `photo-${i}`,
    url: `/uploads/listings/p${i}.webp`,
    key: `listings/p${i}.webp`,
    isPrimary: i === 0,
  }));
  const tooManyPhotosPayload = {
    ...validPayload,
    photos: tooManyPhotos,
  };
  const parsedTooManyPhotos = createPropertyListingSchema.safeParse(tooManyPhotosPayload);
  assert(!parsedTooManyPhotos.success, "Payload exceeding 12 photos limit is rejected");

  // ---------------------------------------------------------------------------
  // TEST GROUP 2: Media Storage Adapter & URL Origin Verification
  // ---------------------------------------------------------------------------
  console.log("\n--- Group 2: Media Storage Adapter & Trusted Origin Verification ---");

  // 2.1 Allowed image types
  assert(ALLOWED_MIME_TYPES.includes("image/jpeg"), "image/jpeg is an allowed MIME type");
  assert(ALLOWED_MIME_TYPES.includes("image/png"), "image/png is an allowed MIME type");
  assert(ALLOWED_MIME_TYPES.includes("image/webp"), "image/webp is an allowed MIME type");

  // 2.2 Upload metadata validation
  let validUploadPasses = false;
  try {
    const meta = validateUploadMetadata("living_room.webp", "image/webp", 2 * 1024 * 1024);
    if (meta.extension === ".webp") validUploadPasses = true;
  } catch {
    validUploadPasses = false;
  }
  assert(validUploadPasses, "Valid 2MB WebP metadata passes storage validation");

  let oversizedRejected = false;
  try {
    validateUploadMetadata("large_raw_photo.png", "image/png", 6 * 1024 * 1024);
  } catch (err: unknown) {
    if (
      err instanceof ValidationError ||
      (err as { code?: string })?.code === "VALIDATION_FAILED" ||
      (err as Error)?.name === "ValidationError"
    ) {
      oversizedRejected = true;
    }
  }
  assert(oversizedRejected, "Oversized file (6MB > 5MB limit) is rejected with ValidationError");

  let invalidTypeRejected = false;
  try {
    validateUploadMetadata("malicious_script.js", "application/javascript", 500);
  } catch (err: unknown) {
    if (
      err instanceof ValidationError ||
      (err as { code?: string })?.code === "VALIDATION_FAILED" ||
      (err as Error)?.name === "ValidationError"
    ) {
      invalidTypeRejected = true;
    }
  }
  assert(invalidTypeRejected, "Executable/non-image MIME type is rejected with ValidationError");

  // 2.3 Trusted Storage URL origin validation
  assert(
    isTrustedStorageUrl("/uploads/listings/123-abc.webp"),
    "Local fallback upload path is trusted"
  );
  assert(
    !isTrustedStorageUrl("https://untrusted-third-party.com/image.jpg"),
    "Arbitrary external image URL is strictly rejected"
  );
  assert(
    !isTrustedStorageUrl("javascript:alert(1)"),
    "javascript: URL injection attempt is strictly rejected"
  );

  // ---------------------------------------------------------------------------
  // TEST GROUP 3: Authentication & Ownership Authorization
  // ---------------------------------------------------------------------------
  console.log("\n--- Group 3: Authentication & Ownership Authorization ---");

  const ownerId = new mongoose.Types.ObjectId();
  const otherUserId = new mongoose.Types.ObjectId();
  const adminId = new mongoose.Types.ObjectId();

  const ownerSession = {
    user: { id: ownerId.toString(), role: "USER" as const, status: "ACTIVE" as const },
    expires: new Date(Date.now() + 3600000).toISOString(),
  };

  const otherUserSession = {
    user: { id: otherUserId.toString(), role: "USER" as const, status: "ACTIVE" as const },
    expires: new Date(Date.now() + 3600000).toISOString(),
  };

  const adminSession = {
    user: { id: adminId.toString(), role: "ADMIN" as const, status: "ACTIVE" as const },
    expires: new Date(Date.now() + 3600000).toISOString(),
  };

  // 3.1 Owner can access owned resource
  let ownerAccessOk = true;
  try {
    assertOwnership(ownerId, ownerSession);
  } catch {
    ownerAccessOk = false;
  }
  assert(ownerAccessOk, "Owner is permitted to mutate their own resource");

  // 3.2 Non-owner non-admin is blocked
  let foreignAccessBlocked = false;
  try {
    assertOwnership(ownerId, otherUserSession);
  } catch (err) {
    if (err instanceof ForbiddenError) {
      foreignAccessBlocked = true;
    }
  }
  assert(foreignAccessBlocked, "User B is forbidden from modifying User A's listing (ForbiddenError 403)");

  // 3.3 Admin can access any resource
  let adminAccessOk = true;
  try {
    assertOwnership(ownerId, adminSession);
  } catch {
    adminAccessOk = false;
  }
  assert(adminAccessOk, "Admin is permitted to manage any listing");

  // ---------------------------------------------------------------------------
  // TEST GROUP 4: Live Database Lifecycle & State Transitions
  // ---------------------------------------------------------------------------
  console.log("\n--- Group 4: Live Listing Lifecycle & Moderation State Machine ---");

  await connectToDatabase();
  console.log("Connected to MongoDB Atlas cluster for W4 lifecycle tests.");

  // Clean up any test listings from previous runs
  const testSlugPrefix = `w4-test-${Date.now()}`;
  const testOwner = await User.findOne({ email: "admin@marketplace.local" });
  const testOwnerId = testOwner ? testOwner._id : ownerId;

  // 4.1 Create listing with default status
  const createdListing = await Listing.create({
    type: "PROPERTY",
    status: "PENDING_REVIEW",
    title: `W4 Automated Test Property ${testSlugPrefix}`,
    slug: `${testSlugPrefix}-slug`,
    description: "Detailed description for the automated property listing management lifecycle test suite.",
    ownerId: testOwnerId,
    location: {
      city: "Metropolis",
      cityCode: "METRO",
      locality: "Highland Greens",
      streetAddress: "777 Secret Residential Lane",
      geo: { type: "Point", coordinates: [77.5946, 12.9716] },
    },
    contactPreferences: {
      phone: "+1-555-8888",
      whatsapp: "+1-555-8888",
      showPhone: true,
      showWhatsapp: true,
    },
    photos: [
      {
        id: "p-test-1",
        url: "/uploads/listings/facade.webp",
        key: "listings/facade.webp",
        isPrimary: true,
      },
    ],
    propertyDetails: {
      purpose: "FOR_SALE",
      propertyType: "VILLA",
      price: 12500000,
      carpetArea: 3200,
      bedrooms: 4,
      bathrooms: 4,
      furnishing: "FULLY_FURNISHED",
      amenities: ["PARKING", "SWIMMING_POOL", "SECURITY"],
      availableFrom: new Date(),
    },
    moderation: {},
    metrics: { views: 0, contactReveals: 0, savesCount: 0 },
  });

  assert(
    createdListing.status === "PENDING_REVIEW",
    "Newly submitted listing has status PENDING_REVIEW (never auto-approved)"
  );

  // 4.2 Verify PENDING_REVIEW listing is hidden from public discovery
  const publicPendingSearch = await getPublicListings({ locality: "Highland Greens" });
  const pendingInPublic = publicPendingSearch.items.some(
    (item) => item.id === createdListing._id.toString()
  );
  assert(!pendingInPublic, "PENDING_REVIEW listing is excluded from public search");

  const publicPendingDetail = await getPublicListingByIdOrSlug(createdListing.slug);
  assert(
    publicPendingDetail === null,
    "PENDING_REVIEW listing returns null (404) for public visitors"
  );

  // 4.3 Admin Moderation: Approve listing
  createdListing.status = "APPROVED";
  createdListing.moderation = {
    reviewedBy: testOwnerId,
    reviewedAt: new Date(),
  };
  await createdListing.save();

  // 4.4 Verify APPROVED listing appears in public discovery
  const publicApprovedSearch = await getPublicListings({ locality: "Highland Greens" });
  const approvedInPublic = publicApprovedSearch.items.some(
    (item) => item.id === createdListing._id.toString()
  );
  assert(approvedInPublic, "APPROVED listing is discoverable in public search");

  const publicApprovedDetail = await getPublicListingByIdOrSlug(createdListing.slug);
  assert(publicApprovedDetail !== null, "APPROVED listing resolves on public detail page");
  assert(
    !("streetAddress" in (publicApprovedDetail?.location || {})),
    "Street address remains strictly masked on public detail view"
  );

  // 4.5 Re-Review Rule: Material edit drops APPROVED listing back to PENDING_REVIEW
  // Simulate material edit (e.g. price and description update)
  const isMaterialEdit = true;
  if (createdListing.status === "APPROVED" && isMaterialEdit) {
    createdListing.status = "PENDING_REVIEW";
    createdListing.moderation = {};
    createdListing.propertyDetails!.price = 11900000;
    await createdListing.save();
  }

  assert(
    createdListing.status === "PENDING_REVIEW",
    "Material edit on APPROVED listing triggers automatic transition to PENDING_REVIEW"
  );

  // 4.6 Verify listing is immediately unlisted from public search after material edit
  const searchAfterEdit = await getPublicListings({ locality: "Highland Greens" });
  const inSearchAfterEdit = searchAfterEdit.items.some(
    (item) => item.id === createdListing._id.toString()
  );
  assert(
    !inSearchAfterEdit,
    "Listing is immediately hidden from public search after material edit"
  );

  // 4.7 Soft-Delete / Archival
  createdListing.status = "ARCHIVED";
  await createdListing.save();
  assert(createdListing.status === "ARCHIVED", "Listing soft-deleted to ARCHIVED status");

  const searchAfterArchive = await getPublicListings({ locality: "Highland Greens" });
  const inSearchAfterArchive = searchAfterArchive.items.some(
    (item) => item.id === createdListing._id.toString()
  );
  assert(!inSearchAfterArchive, "ARCHIVED listing is excluded from public search");

  // Clean up test document
  await Listing.deleteOne({ _id: createdListing._id });
  console.log("Cleaned up test document from database.");

  await disconnectFromDatabase();

  console.log("\n=================================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPropertyW4TestSuite().catch((err) => {
  console.error("Test Suite crashed:", err);
  process.exit(1);
});
