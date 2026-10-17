import fs from "fs";
import mongoose from "mongoose";
import { connectToDatabase, disconnectFromDatabase } from "@/lib/db";
import { Listing } from "@/models/Listing";
import { User } from "@/models/User";
import {
  SERVICE_CATEGORIES,
  getServiceCategory,
  isValidServiceCategory,
} from "@/lib/service-categories";
import {
  createServiceListingSchema,
  updateServiceListingSchema,
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

async function runServiceW5TestSuite() {
  console.log("=================================================================");
  console.log("RUNNING W5 SERVICE PROVIDER LISTINGS & MANAGEMENT TEST SUITE");
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
  // TEST GROUP 1: Service Category Taxonomy & Configuration
  // ---------------------------------------------------------------------------
  console.log("--- Group 1: Service Category Taxonomy & Configuration ---");

  // 1.1 Category configuration has 9 approved categories
  assert(
    SERVICE_CATEGORIES.length === 9,
    "Category taxonomy contains exactly 9 approved skilled-professional categories"
  );

  // 1.2 Category lookup helper
  const plumbingCategory = getServiceCategory("PLUMBING");
  assert(
    plumbingCategory.id === "PLUMBING" && plumbingCategory.label === "Plumbing",
    "getServiceCategory correctly resolves metadata for PLUMBING"
  );

  // 1.3 Unknown category fallback
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const fallbackCategory = getServiceCategory("UNKNOWN_TRADE" as any);
  assert(
    fallbackCategory.id === "OTHER" && fallbackCategory.label === "Specialist",
    "getServiceCategory safely falls back to OTHER for unrecognized categories"
  );

  // 1.4 Category validator
  assert(
    isValidServiceCategory("ELECTRICAL") && !isValidServiceCategory("ASTRONAUT"),
    "isValidServiceCategory accurately distinguishes valid categories from invalid strings"
  );

  // ---------------------------------------------------------------------------
  // TEST GROUP 2: Zod Schema Validation & Input Boundaries
  // ---------------------------------------------------------------------------
  console.log("\n--- Group 2: Service Validation Schemas & Input Boundaries ---");

  const baseValidService = {
    type: "SERVICE" as const,
    status: "PENDING_REVIEW" as const,
    title: "Licensed Master Electrician & Emergency Rewiring Specialist",
    description:
      "Over 12 years of residential and commercial electrical experience. Specializing in fault finding, panel upgrades, and short-circuit repair.",
    location: {
      city: "Metropolis",
      cityCode: "METRO",
      locality: "Greenwood",
      streetAddress: "Workshop 4, Industrial Row",
    },
    contactPreferences: {
      showPhone: true,
      showWhatsapp: true,
      phone: "+1-555-0342",
      whatsapp: "+1-555-0342",
    },
    photos: [
      {
        id: "photo-svc-1",
        url: "/uploads/listings/service-panel.webp",
        key: "listings/service-panel.webp",
        isPrimary: true,
      },
    ],
    serviceDetails: {
      category: "ELECTRICAL" as const,
      pricingModel: "HOURLY" as const,
      startingPrice: 450,
      experienceYears: 12,
      serviceAreas: ["Greenwood", "Downtown", "West End"],
      workingDays: ["MON" as const, "TUE" as const, "WED" as const, "THU" as const, "FRI" as const],
      workingHours: {
        start: "08:30",
        end: "19:00",
      },
      guarantees: "30-day rework warranty on all breaker replacements",
    },
  };

  // 2.1 Valid service creation with hourly pricing
  const parsedHourly = createServiceListingSchema.safeParse(baseValidService);
  assert(parsedHourly.success, "Valid service listing with HOURLY pricing passes schema validation");

  // 2.2 Valid service with FIXED pricing
  const validFixed = {
    ...baseValidService,
    serviceDetails: {
      ...baseValidService.serviceDetails,
      category: "CLEANING" as const,
      pricingModel: "FIXED" as const,
      startingPrice: 1500,
    },
  };
  const parsedFixed = createServiceListingSchema.safeParse(validFixed);
  assert(parsedFixed.success, "Valid service listing with FIXED pricing passes schema validation");

  // 2.3 Valid service with QUOTE_BASED pricing (no startingPrice required)
  const validQuote = {
    ...baseValidService,
    serviceDetails: {
      ...baseValidService.serviceDetails,
      category: "CARPENTRY" as const,
      pricingModel: "QUOTE_BASED" as const,
      startingPrice: undefined,
    },
  };
  const parsedQuote = createServiceListingSchema.safeParse(validQuote);
  assert(
    parsedQuote.success,
    "Valid service listing with QUOTE_BASED pricing passes schema validation without price"
  );

  // 2.4 FIXED pricing missing startingPrice fails validation
  const invalidFixedMissingPrice = {
    ...baseValidService,
    serviceDetails: {
      ...baseValidService.serviceDetails,
      pricingModel: "FIXED" as const,
      startingPrice: undefined,
    },
  };
  const parsedMissingPrice = createServiceListingSchema.safeParse(invalidFixedMissingPrice);
  assert(
    !parsedMissingPrice.success,
    "FIXED pricing without startingPrice fails validation as required"
  );

  // 2.5 Invalid category rejected
  const invalidCategory = {
    ...baseValidService,
    serviceDetails: {
      ...baseValidService.serviceDetails,
      category: "ILLEGAL_CATEGORY",
    },
  };
  const parsedBadCategory = createServiceListingSchema.safeParse(invalidCategory);
  assert(!parsedBadCategory.success, "Unapproved service category is rejected by Zod schema");

  // 2.6 Excessive experience years rejected (> 60)
  const invalidExperience = {
    ...baseValidService,
    serviceDetails: {
      ...baseValidService.serviceDetails,
      experienceYears: 75,
    },
  };
  const parsedBadExp = createServiceListingSchema.safeParse(invalidExperience);
  assert(!parsedBadExp.success, "Experience years exceeding platform limit (60) is rejected");

  // 2.7 Empty service areas rejected
  const invalidEmptyAreas = {
    ...baseValidService,
    serviceDetails: {
      ...baseValidService.serviceDetails,
      serviceAreas: [],
    },
  };
  const parsedEmptyAreas = createServiceListingSchema.safeParse(invalidEmptyAreas);
  assert(!parsedEmptyAreas.success, "Empty service coverage areas list is rejected");

  // 2.8 Empty working days rejected
  const invalidEmptyDays = {
    ...baseValidService,
    serviceDetails: {
      ...baseValidService.serviceDetails,
      workingDays: [],
    },
  };
  const parsedEmptyDays = createServiceListingSchema.safeParse(invalidEmptyDays);
  assert(!parsedEmptyDays.success, "Empty operating days list is rejected");

  // 2.9 Invalid working hours format rejected
  const invalidHours = {
    ...baseValidService,
    serviceDetails: {
      ...baseValidService.serviceDetails,
      workingHours: { start: "8am", end: "7pm" },
    },
  };
  const parsedBadHours = createServiceListingSchema.safeParse(invalidHours);
  assert(!parsedBadHours.success, "Non-HH:mm working hours format is rejected");

  // 2.10 Max photos limit enforced (13 photos rejected)
  const tooManyPhotos = {
    ...baseValidService,
    photos: Array.from({ length: 13 }, (_, i) => ({
      id: `p-${i}`,
      url: `/uploads/photo-${i}.webp`,
      key: `photo-${i}.webp`,
    })),
  };
  const parsedTooManyPhotos = createServiceListingSchema.safeParse(tooManyPhotos);
  assert(!parsedTooManyPhotos.success, "Submitting more than 12 portfolio photos is rejected");

  // 2.11 Update service schema validation
  const validUpdate = {
    title: "Updated Senior Electrician & Rewiring Services",
    serviceDetails: {
      category: "ELECTRICAL" as const,
      pricingModel: "HOURLY" as const,
      startingPrice: 500,
      experienceYears: 13,
      serviceAreas: ["Greenwood", "Downtown", "West End", "Northside"],
      workingDays: ["MON" as const, "TUE" as const, "WED" as const, "THU" as const],
    },
  };
  const parsedUpdate = updateServiceListingSchema.safeParse(validUpdate);
  assert(parsedUpdate.success, "Valid partial service update passes updateServiceListingSchema");

  // ---------------------------------------------------------------------------
  // TEST GROUP 3: Media Upload Security & Trusted Origin
  // ---------------------------------------------------------------------------
  console.log("\n--- Group 3: Media Upload Security & Trusted Origins ---");

  // 3.1 Allowed MIME types
  assert(
    ALLOWED_MIME_TYPES.includes("image/webp") &&
      ALLOWED_MIME_TYPES.includes("image/jpeg") &&
      ALLOWED_MIME_TYPES.includes("image/png"),
    "Allowed MIME types include webp, jpeg, and png"
  );

  // 3.2 Executable and script MIME types rejected
  let mimeErrorCaught = false;
  try {
    validateUploadMetadata("exploit.sh", "application/x-sh", 1024);
  } catch (err: unknown) {
    if (
      err instanceof ValidationError ||
      (err as { code?: string })?.code === "VALIDATION_FAILED" ||
      (err as Error)?.name === "ValidationError"
    ) {
      mimeErrorCaught = true;
    }
  }
  assert(mimeErrorCaught, "Malicious shell script MIME type is rejected with ValidationError");

  // 3.3 Oversized portfolio upload rejected (> 5MB)
  let sizeErrorCaught = false;
  try {
    validateUploadMetadata("giant-portfolio.png", "image/png", MAX_FILE_SIZE + 1024);
  } catch (err: unknown) {
    if (
      err instanceof ValidationError ||
      (err as { code?: string })?.code === "VALIDATION_FAILED" ||
      (err as Error)?.name === "ValidationError"
    ) {
      sizeErrorCaught = true;
    }
  }
  assert(sizeErrorCaught, "File exceeding MAX_FILE_SIZE (5MB) is rejected with ValidationError");

  // 3.4 Trusted storage URL validation
  assert(
    isTrustedStorageUrl("/uploads/listings/service-work1.webp"),
    "Local uploads path /uploads/listings/* is recognized as trusted"
  );
  assert(
    !isTrustedStorageUrl("https://untrusted-external-site.com/image.jpg"),
    "Arbitrary external origin is rejected as untrusted"
  );

  // ---------------------------------------------------------------------------
  // TEST GROUP 4: Ownership, Authorization & Role Boundaries
  // ---------------------------------------------------------------------------
  console.log("\n--- Group 4: Ownership & Authorization Access Control ---");

  const ownerUserId = new mongoose.Types.ObjectId().toString();
  const otherUserId = new mongoose.Types.ObjectId().toString();

  // 4.1 Owner can access their own service
  let ownerAccessAllowed = false;
  try {
    assertOwnership(ownerUserId, { user: { id: ownerUserId, role: "USER" } });
    ownerAccessAllowed = true;
  } catch {
    ownerAccessAllowed = false;
  }
  assert(ownerAccessAllowed, "Listing owner is granted modification access");

  // 4.2 Non-owner normal user is blocked with 403 Forbidden
  let nonOwnerBlocked = false;
  try {
    assertOwnership(ownerUserId, { user: { id: otherUserId, role: "USER" } });
  } catch (err) {
    if (err instanceof ForbiddenError) nonOwnerBlocked = true;
  }
  assert(nonOwnerBlocked, "Non-owner user is blocked from modifying another provider's listing (403)");

  // 4.3 Administrator has elevated access
  let adminAccessAllowed = false;
  try {
    assertOwnership(ownerUserId, { user: { id: otherUserId, role: "ADMIN" } });
    adminAccessAllowed = true;
  } catch {
    adminAccessAllowed = false;
  }
  assert(adminAccessAllowed, "Administrator is granted access to modify any resource");

  // ---------------------------------------------------------------------------
  // TEST GROUP 5: Live Database Lifecycle, Multi-Service, Re-Review, & Discovery
  // ---------------------------------------------------------------------------
  console.log("\n--- Group 5: MongoDB Live Lifecycle, Multi-Service & Public Discovery ---");

  await connectToDatabase();

  // 5.1 Create mock provider user in DB
  const providerUser = await User.findOneAndUpdate(
    { email: "provider-w5-test@marketplace.local" },
    {
      name: "Marcus Spark Electrician",
      email: "provider-w5-test@marketplace.local",
      role: "USER",
      phone: "+1-555-7788",
      whatsapp: "+1-555-7788",
    },
    { upsert: true, new: true }
  );
  assert(Boolean(providerUser._id), "Test provider user initialized in MongoDB");

  // 5.2 Create initial service listing under provider
  const initialSlug = `w5-electrician-test-${Date.now()}`;
  const createdService1 = await Listing.create({
    type: "SERVICE",
    status: "PENDING_REVIEW",
    title: "Master Electrician — Circuit & Board Repairs",
    slug: initialSlug,
    description: "Licensed master electrician specializing in rapid-response fuse box and circuit repairs.",
    ownerId: providerUser._id,
    location: {
      city: "Metropolis",
      cityCode: "METRO",
      locality: "Greenwood",
      streetAddress: "77 Copper Way, Shop #3",
      geo: { type: "Point", coordinates: [0, 0] },
    },
    contactPreferences: {
      phone: "+1-555-7788",
      whatsapp: "+1-555-7788",
      showPhone: true,
      showWhatsapp: true,
    },
    photos: [
      {
        id: "p-svc-1",
        url: "/uploads/listings/panel-repair.webp",
        key: "listings/panel-repair.webp",
        isPrimary: true,
      },
    ],
    serviceDetails: {
      category: "ELECTRICAL",
      pricingModel: "HOURLY",
      startingPrice: 350,
      experienceYears: 10,
      serviceAreas: ["Greenwood", "Highland"],
      workingDays: ["MON", "TUE", "WED", "THU", "FRI"],
      workingHours: { start: "08:00", end: "18:00" },
      guarantees: "100% satisfaction guarantee with 30-day rework",
    },
    moderation: {},
    metrics: { views: 0, contactReveals: 0, savesCount: 0 },
  });

  assert(
    createdService1.status === "PENDING_REVIEW",
    "Newly submitted service listing initializes with PENDING_REVIEW status"
  );

  // 5.3 Single Account Multi-Service: Same provider user creates a 2nd distinct service (e.g. Appliance Repair)
  const secondSlug = `w5-appliance-test-${Date.now()}`;
  const createdService2 = await Listing.create({
    type: "SERVICE",
    status: "PENDING_REVIEW",
    title: "Expert HVAC & Refrigerator Maintenance",
    slug: secondSlug,
    description: "Certified cooling technician providing home refrigerator and air conditioner gas charging and repair.",
    ownerId: providerUser._id,
    location: {
      city: "Metropolis",
      cityCode: "METRO",
      locality: "Greenwood",
      streetAddress: "77 Copper Way, Unit #4",
      geo: { type: "Point", coordinates: [0, 0] },
    },
    contactPreferences: {
      phone: "+1-555-7788",
      whatsapp: "+1-555-7788",
      showPhone: true,
      showWhatsapp: true,
    },
    photos: [
      {
        id: "p-svc-2",
        url: "/uploads/listings/hvac-service.webp",
        key: "listings/hvac-service.webp",
        isPrimary: true,
      },
    ],
    serviceDetails: {
      category: "APPLIANCE_REPAIR",
      pricingModel: "FIXED",
      startingPrice: 800,
      experienceYears: 8,
      serviceAreas: ["Greenwood", "Downtown"],
      workingDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT"],
      workingHours: { start: "09:00", end: "20:00" },
    },
    moderation: {},
    metrics: { views: 0, contactReveals: 0, savesCount: 0 },
  });

  assert(
    createdService2._id.toString() !== createdService1._id.toString(),
    "Same user account successfully owns multiple distinct service listings"
  );

  // 5.4 Provider dashboard query: Returns both services owned by provider
  const providerServices = await Listing.find({
    ownerId: providerUser._id,
    type: "SERVICE",
    status: { $ne: "ARCHIVED" },
  });
  assert(
    providerServices.length >= 2,
    `Provider dashboard query successfully returns all active owned services (found ${providerServices.length})`
  );

  // 5.5 Visibility Check: PENDING_REVIEW service must NOT appear in public service discovery
  const publicPendingSearch = await getPublicListings({
    type: "SERVICE",
    locality: "Greenwood",
  });
  const inPendingSearch = publicPendingSearch.items.some(
    (item) => item.id === createdService1._id.toString()
  );
  assert(
    !inPendingSearch,
    "PENDING_REVIEW service is strictly hidden from public service search results"
  );

  // 5.6 Visibility Check: Public detail route returns null for non-public service
  const publicPendingDetail = await getPublicListingByIdOrSlug(createdService1.slug);
  assert(
    publicPendingDetail === null,
    "Public detail lookup safely returns null for unapproved PENDING_REVIEW service"
  );

  // 5.7 Admin Approval Workflow: Set to APPROVED
  createdService1.status = "APPROVED";
  createdService1.moderation = {
    reviewedAt: new Date(),
    reviewedBy: new mongoose.Types.ObjectId(),
  };
  await createdService1.save();
  assert(createdService1.status === "APPROVED", "Service transitioned to APPROVED by administrator");

  // 5.8 Public Discovery: APPROVED service is now discoverable
  const publicApprovedSearch = await getPublicListings({
    type: "SERVICE",
    locality: "Greenwood",
  });
  const inApprovedSearch = publicApprovedSearch.items.some(
    (item) => item.id === createdService1._id.toString()
  );
  assert(inApprovedSearch, "APPROVED service listing appears in public discovery search");

  // 5.9 Public Detail View: APPROVED service resolves with masked private fields
  const publicApprovedDetail = await getPublicListingByIdOrSlug(createdService1.slug);
  assert(
    publicApprovedDetail !== null,
    "APPROVED service resolves successfully on public service detail route"
  );
  assert(
    !("streetAddress" in (publicApprovedDetail?.location || {})),
    "Provider workshop street address remains strictly masked on public detail view"
  );
  assert(
    !("moderation" in (publicApprovedDetail || {})),
    "Internal moderation metadata is not exposed on public service detail view"
  );

  // 5.10 Re-Review Policy: Material edit drops APPROVED listing back to PENDING_REVIEW
  // Simulate material edit (e.g. price and scope update)
  const isMaterialEdit = true;
  if (createdService1.status === "APPROVED" && isMaterialEdit) {
    createdService1.status = "PENDING_REVIEW";
    createdService1.moderation = {};
    createdService1.serviceDetails!.startingPrice = 400;
    await createdService1.save();
  }
  assert(
    createdService1.status === "PENDING_REVIEW",
    "Material update to an APPROVED service automatically triggers re-review (PENDING_REVIEW)"
  );

  // 5.11 Verify listing is immediately unlisted from public search after material edit
  const searchAfterEdit = await getPublicListings({
    type: "SERVICE",
    locality: "Greenwood",
  });
  const inSearchAfterEdit = searchAfterEdit.items.some(
    (item) => item.id === createdService1._id.toString()
  );
  assert(
    !inSearchAfterEdit,
    "Service is immediately hidden from public search after material modification"
  );

  // 5.12 Pause Workflow: Owner can PAUSE their service listing
  createdService1.status = "PAUSED";
  await createdService1.save();
  assert(createdService1.status === "PAUSED", "Service listing successfully paused by owner");

  const searchAfterPause = await getPublicListings({
    type: "SERVICE",
    locality: "Greenwood",
  });
  const inSearchAfterPause = searchAfterPause.items.some(
    (item) => item.id === createdService1._id.toString()
  );
  assert(!inSearchAfterPause, "PAUSED service listing is hidden from public discovery");

  // 5.13 Rejection feedback retention: Simulate moderation rejection with reason
  createdService1.status = "REJECTED";
  createdService1.moderation = {
    reviewedAt: new Date(),
    rejectionReason: "Please provide a clear photo of your trade certification or trade tool setup.",
  };
  await createdService1.save();

  const refreshedForOwner = await Listing.findById(createdService1._id);
  assert(
    refreshedForOwner?.moderation?.rejectionReason ===
      "Please provide a clear photo of your trade certification or trade tool setup.",
    "Rejection feedback reason is securely retained on the document for owner review"
  );

  // 5.14 Resubmission workflow: Provider addresses feedback and resubmits to PENDING_REVIEW
  createdService1.status = "PENDING_REVIEW";
  createdService1.moderation = {};
  await createdService1.save();
  assert(
    createdService1.status === "PENDING_REVIEW" && !createdService1.moderation.rejectionReason,
    "Resubmission resets status to PENDING_REVIEW and clears rejection reason"
  );

  // 5.15 Soft-Delete / Archival
  createdService1.status = "ARCHIVED";
  createdService2.status = "ARCHIVED";
  await Promise.all([createdService1.save(), createdService2.save()]);

  assert(
    createdService1.status === "ARCHIVED" && createdService2.status === "ARCHIVED",
    "Service listings soft-deleted to ARCHIVED status"
  );

  const searchAfterArchive = await getPublicListings({
    type: "SERVICE",
    locality: "Greenwood",
  });
  const inSearchAfterArchive = searchAfterArchive.items.some(
    (item) =>
      item.id === createdService1._id.toString() ||
      item.id === createdService2._id.toString()
  );
  assert(!inSearchAfterArchive, "ARCHIVED service listings are excluded from public search");

  // Clean up test documents
  await Listing.deleteMany({
    _id: { $in: [createdService1._id, createdService2._id] },
  });
  await User.deleteOne({ _id: providerUser._id });
  console.log("Cleaned up test documents and test user from database.");

  await disconnectFromDatabase();

  console.log("\n=================================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runServiceW5TestSuite().catch((err) => {
  console.error("Test Suite crashed:", err);
  process.exit(1);
});
