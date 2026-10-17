import fs from "fs";
import mongoose from "mongoose";
import { connectToDatabase, disconnectFromDatabase } from "@/lib/db";
import { Listing } from "@/models/Listing";
import { User } from "@/models/User";
import { getPublicListings, getPublicListingByIdOrSlug } from "@/lib/listings-data";
import { escapeRegex, listingQuerySchema } from "@/lib/validations/listing";
import { checkRateLimit } from "@/lib/rate-limiter";

// Load environment variables for test execution
const envContent = fs.readFileSync("C:/Users/abhig/Desktop/app/webapp/.env.local", "utf8");
for (const line of envContent.split("\n")) {
  const match = line.trim().match(/^([^=]+)=(.*)$/);
  if (match) {
    const val = match[2].trim().replace(/^["']|["']$/g, "");
    process.env[match[1].trim()] = val;
  }
}

async function runDiscoveryTestSuite() {
  console.log("=================================================================");
  console.log("RUNNING W3 PUBLIC DISCOVERY, SEARCH & SECURITY TEST SUITE");
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
  // TEST GROUP 1: Query Validation & Regex Injection Defense
  // ---------------------------------------------------------------------------
  console.log("--- Group 1: Query Validation & Security Boundaries ---");
  const testRegex = escapeRegex("Greenwood (Phase-2) [Block-A]*?+$");
  assert(
    testRegex === "Greenwood\\ \\(Phase\\-2\\)\\ \\[Block\\-A\\]\\*\\?\\+\\$",
    "escapeRegex escapes all special characters properly"
  );

  const parsedValid = listingQuerySchema.safeParse({
    type: "PROPERTY",
    purpose: "FOR_RENT",
    bedrooms: "2,3",
    minPrice: "10000",
    maxPrice: "50000",
    page: "2",
    limit: "25",
  });
  assert(parsedValid.success, "Valid query parameters parse and coerce correctly");
  if (parsedValid.success) {
    assert(parsedValid.data.page === 2, "Page number coerced to integer 2");
    assert(parsedValid.data.limit === 25, "Limit coerced to integer 25");
    assert(parsedValid.data.minPrice === 10000, "Min price coerced to number 10000");
  }

  const cappedLimit = listingQuerySchema.safeParse({
    limit: "999", // Exceeds max 50
  });
  assert(!cappedLimit.success, "Unbounded pagination limit (>50) rejected by Zod boundary");

  const invalidNegativePrice = listingQuerySchema.safeParse({
    minPrice: "-500",
  });
  assert(!invalidNegativePrice.success, "Negative price boundary rejected by Zod schema");

  const serviceCategoryParsed = listingQuerySchema.safeParse({
    type: "SERVICE",
    category: "PLUMBING",
    pricingModel: "HOURLY",
  });
  assert(serviceCategoryParsed.success, "Valid service query facets parse cleanly");

  // ---------------------------------------------------------------------------
  // TEST GROUP 2: Contact Anti-Scraping Rate Limiter
  // ---------------------------------------------------------------------------
  console.log("\n--- Group 2: Anti-Scraping Contact Reveal Rate Limiter ---");
  const testIp = `test-ip-${Date.now()}`;
  let allowedCount = 0;

  for (let i = 0; i < 15; i++) {
    const res = checkRateLimit(testIp, 15, 60 * 1000);
    if (res.allowed) allowedCount++;
  }
  assert(allowedCount === 15, "Allows exactly 15 reveals within window");

  const blockedReveal = checkRateLimit(testIp, 15, 60 * 1000);
  assert(!blockedReveal.allowed, "16th reveal attempt is strictly blocked (429 defense)");
  assert(blockedReveal.remaining === 0, "Remaining reveals reports 0 when blocked");

  // ---------------------------------------------------------------------------
  // TEST GROUP 3: Schema Validation & Model Adherence (Unit / Offline)
  // ---------------------------------------------------------------------------
  console.log("\n--- Group 3: Mongoose Listing Schema Integrity & Constraints ---");
  const validPropDoc = new Listing({
    type: "PROPERTY",
    title: "Beautiful 2BHK Apartment",
    slug: "beautiful-2bhk-apartment",
    description: "Detailed description of verified rental apartment in launch city.",
    ownerId: new mongoose.Types.ObjectId(),
    location: {
      city: "Metropolis",
      cityCode: "METRO",
      locality: "Greenwood Valley",
    },
    contactPreferences: { showPhone: true, showWhatsapp: true },
    propertyDetails: {
      purpose: "FOR_RENT",
      propertyType: "APARTMENT",
      price: 25000,
      bedrooms: 2,
      carpetArea: 1100,
      furnishing: "SEMI_FURNISHED",
      amenities: ["LIFT", "PARKING"],
    },
  });
  let propErr: Error | null = null;
  try {
    await validPropDoc.validate();
  } catch (e) {
    propErr = e as Error;
  }
  assert(!propErr, "Mongoose Property model validates required schema fields");
  assert(validPropDoc.status === "PENDING_REVIEW", "Default status is PENDING_REVIEW");

  const validServDoc = new Listing({
    type: "SERVICE",
    title: "Master Electrician and Wiring Specialist",
    slug: "master-electrician-specialist",
    description: "Certified wireman providing installation, MCB diagnostics, and repair.",
    ownerId: new mongoose.Types.ObjectId(),
    location: {
      city: "Metropolis",
      cityCode: "METRO",
      locality: "Central District",
    },
    contactPreferences: { showPhone: true, showWhatsapp: false },
    serviceDetails: {
      category: "ELECTRICAL",
      pricingModel: "HOURLY",
      startingPrice: 400,
      experienceYears: 8,
      serviceAreas: ["Central District"],
      workingDays: ["MON", "TUE", "WED"],
    },
  });
  let servErr: Error | null = null;
  try {
    await validServDoc.validate();
  } catch (e) {
    servErr = e as Error;
  }
  assert(!servErr, "Mongoose Service model validates required service schema fields");

  // Invalid enum test
  const invalidTypeDoc = new Listing({
    type: "INVALID_VERTICAL",
    title: "Invalid Listing",
  });
  let invalidErr: mongoose.Error.ValidationError | null = null;
  try {
    await invalidTypeDoc.validate();
  } catch (e) {
    invalidErr = e as mongoose.Error.ValidationError;
  }
  assert(!!invalidErr?.errors?.type, "Invalid listing type is rejected by Mongoose enum constraint");

  // ---------------------------------------------------------------------------
  // TEST GROUP 4: Database Live Queries (or Graceful Network Disclosure)
  // ---------------------------------------------------------------------------
  console.log("\n--- Group 4: Live Database Queries & Status Exclusions ---");
  let dbConnected = false;
  try {
    await connectToDatabase();
    dbConnected = true;
    console.log("Connected to MongoDB Atlas cluster.");
  } catch {
    console.warn(
      "⚠ NOTICE: Live MongoDB Atlas cluster unreachable (IP whitelist or network connection check required)."
    );
  }

  if (dbConnected) {
    const testSuffix = Date.now().toString();
    const testOwner = await User.create({
      name: "Test Discovery Owner",
      email: `owner-${testSuffix}@marketplace.test`,
      role: "USER",
      status: "ACTIVE",
      phone: "+919876543210",
      whatsapp: "+919876543210",
      contactPreferences: { showPhone: true, showWhatsapp: true },
    });

    // Create listings in different lifecycle states
    const approvedProperty = await Listing.create({
      type: "PROPERTY",
      status: "APPROVED",
      title: `Approved 2BHK Apartment ${testSuffix}`,
      slug: `approved-2bhk-apt-${testSuffix}`,
      description: "Spacious airy apartment in Greenwood Valley with covered parking.",
      ownerId: testOwner._id,
      location: {
        city: "Metropolis",
        cityCode: "METRO",
        locality: "Greenwood Valley",
        streetAddress: "Secret Flat 402, Private Towers", // Private field!
      },
      contactPreferences: { showPhone: true, showWhatsapp: true },
      propertyDetails: {
        purpose: "FOR_RENT",
        propertyType: "APARTMENT",
        price: 26000,
        bedrooms: 2,
        bathrooms: 2,
        carpetArea: 1200,
        furnishing: "SEMI_FURNISHED",
        amenities: ["LIFT", "PARKING"],
        availableFrom: new Date(),
      },
    });

    const pendingProperty = await Listing.create({
      type: "PROPERTY",
      status: "PENDING_REVIEW",
      title: `Pending 3BHK Villa ${testSuffix}`,
      slug: `pending-3bhk-villa-${testSuffix}`,
      description: "Unapproved villa awaiting moderator decision.",
      ownerId: testOwner._id,
      location: {
        city: "Metropolis",
        cityCode: "METRO",
        locality: "Greenwood Valley",
      },
      contactPreferences: { showPhone: true, showWhatsapp: true },
      propertyDetails: {
        purpose: "FOR_SALE",
        propertyType: "VILLA",
        price: 9000000,
        bedrooms: 3,
        carpetArea: 2500,
        furnishing: "FULLY_FURNISHED",
        amenities: [],
        availableFrom: new Date(),
      },
    });

    const rejectedProperty = await Listing.create({
      type: "PROPERTY",
      status: "REJECTED",
      title: `Rejected Plot ${testSuffix}`,
      slug: `rejected-plot-${testSuffix}`,
      description: "Inaccurate pricing and unverified ownership.",
      ownerId: testOwner._id,
      location: {
        city: "Metropolis",
        cityCode: "METRO",
        locality: "North Suburbs",
      },
      contactPreferences: { showPhone: false, showWhatsapp: false },
      moderation: {
        rejectionReason: "Fake listing flagged by moderator",
      },
      propertyDetails: {
        purpose: "FOR_SALE",
        propertyType: "PLOT",
        price: 500000,
        carpetArea: 1000,
        furnishing: "UNFURNISHED",
        amenities: [],
        availableFrom: new Date(),
      },
    });

    // Query tests
    const publicProperties = await getPublicListings({
      type: "PROPERTY",
      locality: "Greenwood Valley",
    });

    const foundIds = publicProperties.items.map((p) => p.id);
    assert(
      foundIds.includes(approvedProperty._id.toString()),
      "Approved property appears in public search"
    );
    assert(
      !foundIds.includes(pendingProperty._id.toString()),
      "PENDING_REVIEW property is strictly excluded from public search"
    );
    assert(
      !foundIds.includes(rejectedProperty._id.toString()),
      "REJECTED property is strictly excluded from public search"
    );

    // Detail privacy test
    const detail = await getPublicListingByIdOrSlug(approvedProperty.slug);
    assert(detail !== null, "Approved listing resolves by slug");
    assert(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (detail?.location as any)?.streetAddress === undefined,
      "Private streetAddress is masked from public detail response"
    );

    const pendingDetail = await getPublicListingByIdOrSlug(pendingProperty.slug);
    assert(pendingDetail === null, "Public detail returns null (404) for PENDING_REVIEW listing");

    const nonexistentDetail = await getPublicListingByIdOrSlug("nonexistent-slug-xyz");
    assert(nonexistentDetail === null, "Public detail returns null (404) for nonexistent slug");

    // Clean up
    await Listing.deleteMany({
      _id: { $in: [approvedProperty._id, pendingProperty._id, rejectedProperty._id] },
    });
    await User.deleteOne({ _id: testOwner._id });
    await disconnectFromDatabase();
  } else {
    console.log("ℹ External Atlas connection skipped in current network environment; schema & unit assertions verified.");
  }

  console.log("\n=================================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runDiscoveryTestSuite().catch((err) => {
  console.error("FATAL ERROR in discovery test suite:", err);
  process.exit(1);
});
