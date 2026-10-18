import fs from "fs";
import { connectToDatabase, disconnectFromDatabase } from "@/lib/db";
import { Listing } from "@/models/Listing";
import { User } from "@/models/User";
import { getPublicListings } from "@/lib/listings-data";

// Load environment variables for test execution
const envContent = fs.readFileSync(".env.local", "utf8");
for (const line of envContent.split("\n")) {
  const match = line.trim().match(/^([^=]+)=(.*)$/);
  if (match) {
    const val = match[2].trim().replace(/^["']|["']$/g, "");
    process.env[match[1].trim()] = val;
  }
}

async function runSearchTestSuite() {
  console.log("=================================================================");
  console.log("RUNNING MARKETPLACE SEARCH & FILTER REGRESSION TEST SUITE");
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

  await connectToDatabase();
  console.log("Connected to MongoDB Atlas.\n");

  // Create temporary owner and test listings with various lifecycle states
  const testSuffix = Date.now().toString();
  const testOwner = await User.create({
    name: "Search Flow Tester",
    email: `search-tester-${testSuffix}@marketplace.test`,
    role: "USER",
    status: "ACTIVE",
    phone: "+919876543299",
    whatsapp: "+919876543299",
    contactPreferences: { showPhone: true, showWhatsapp: true },
  });

  // Approved property in Roorkee
  const approvedRoorkeeProperty = await Listing.create({
    type: "PROPERTY",
    status: "APPROVED",
    title: `Roorkee Heights Luxury Flat ${testSuffix}`,
    slug: `roorkee-heights-${testSuffix}`,
    description: "Modern apartment located near IIT Roorkee with balcony.",
    ownerId: testOwner._id,
    location: {
      city: "Roorkee",
      cityCode: "METRO",
      locality: "Civil Lines",
      streetAddress: "Private Villa Road 4",
    },
    contactPreferences: { showPhone: true, showWhatsapp: true },
    propertyDetails: {
      purpose: "FOR_RENT",
      propertyType: "APARTMENT",
      price: 18000,
      bedrooms: 2,
      bathrooms: 2,
      carpetArea: 1050,
      furnishing: "FULLY_FURNISHED",
      amenities: ["LIFT", "PARKING"],
      availableFrom: new Date(),
    },
  });

  // Pending property (Must NEVER appear publicly)
  const pendingProperty = await Listing.create({
    type: "PROPERTY",
    status: "PENDING_REVIEW",
    title: `Pending Secret Villa ${testSuffix}`,
    slug: `pending-villa-${testSuffix}`,
    description: "Unmoderated property listing in Roorkee.",
    ownerId: testOwner._id,
    location: {
      city: "Roorkee",
      cityCode: "METRO",
      locality: "Civil Lines",
    },
    contactPreferences: { showPhone: true, showWhatsapp: true },
    propertyDetails: {
      purpose: "FOR_SALE",
      propertyType: "VILLA",
      price: 6500000,
      bedrooms: 3,
      carpetArea: 2200,
      furnishing: "UNFURNISHED",
      amenities: [],
      availableFrom: new Date(),
    },
  });

  // Approved Service in Roorkee
  const approvedPlumbingService = await Listing.create({
    type: "SERVICE",
    status: "APPROVED",
    title: `Fast Pipe Repairs & Drain Specialist ${testSuffix}`,
    slug: `fast-pipe-repairs-${testSuffix}`,
    description: "Certified professional offering 24/7 emergency water pipe leakage solutions.",
    ownerId: testOwner._id,
    location: {
      city: "Roorkee",
      cityCode: "METRO",
      locality: "Ramnagar",
    },
    contactPreferences: { showPhone: true, showWhatsapp: true },
    serviceDetails: {
      category: "PLUMBING",
      pricingModel: "HOURLY",
      startingPrice: 350,
      experienceYears: 7,
      serviceAreas: ["Civil Lines", "Ramnagar", "IIT Roorkee"],
      workingDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT"],
    },
  });

  try {
    // ---------------------------------------------------------------------------
    // Case 1: Search by complete property title
    // ---------------------------------------------------------------------------
    console.log("--- Test 1: Complete Property Title Search ---");
    const res1 = await getPublicListings({
      type: "PROPERTY",
      search: `Roorkee Heights Luxury Flat ${testSuffix}`,
    });
    assert(
      res1.items.some((i) => i.id === approvedRoorkeeProperty._id.toString()),
      "Finds property by exact complete title"
    );

    // ---------------------------------------------------------------------------
    // Case 2: Search by part of a property title
    // ---------------------------------------------------------------------------
    console.log("\n--- Test 2: Partial Property Title Search ---");
    const res2 = await getPublicListings({
      type: "PROPERTY",
      search: "Roorkee Heights",
    });
    assert(
      res2.items.some((i) => i.id === approvedRoorkeeProperty._id.toString()),
      "Finds property by partial title 'Roorkee Heights'"
    );

    // ---------------------------------------------------------------------------
    // Case 3: Search by locality matching city "Roorkee"
    // ---------------------------------------------------------------------------
    console.log("\n--- Test 3: Place / City Name Search ('Roorkee') ---");
    const res3 = await getPublicListings({
      type: "PROPERTY",
      locality: "Roorkee",
    });
    assert(
      res3.items.some((i) => i.id === approvedRoorkeeProperty._id.toString()),
      "Finds property when locality filter contains city name 'Roorkee'"
    );

    // Also verify neighborhood locality match
    const res3Locality = await getPublicListings({
      type: "PROPERTY",
      locality: "Civil Lines",
    });
    assert(
      res3Locality.items.some((i) => i.id === approvedRoorkeeProperty._id.toString()),
      "Finds property by exact locality 'Civil Lines'"
    );

    // ---------------------------------------------------------------------------
    // Case 4: Search using different capitalization (roorkee, ROORKEE, RoOrKeE)
    // ---------------------------------------------------------------------------
    console.log("\n--- Test 4: Case-Insensitive Place Search ---");
    const res4Lower = await getPublicListings({ type: "PROPERTY", locality: "roorkee" });
    const res4Upper = await getPublicListings({ type: "PROPERTY", locality: "ROORKEE" });
    const res4Mixed = await getPublicListings({ type: "PROPERTY", locality: "RoOrKeE" });
    assert(
      res4Lower.items.some((i) => i.id === approvedRoorkeeProperty._id.toString()) &&
      res4Upper.items.some((i) => i.id === approvedRoorkeeProperty._id.toString()) &&
      res4Mixed.items.some((i) => i.id === approvedRoorkeeProperty._id.toString()),
      "Locality search succeeds regardless of capitalization (roorkee / ROORKEE / RoOrKeE)"
    );

    // ---------------------------------------------------------------------------
    // Case 5: Service search by title, category, and keyword synonym ('plumber')
    // ---------------------------------------------------------------------------
    console.log("\n--- Test 5: Service Search (Title, Category, Synonym) ---");
    const res5Name = await getPublicListings({
      type: "SERVICE",
      search: "Fast Pipe Repairs",
    });
    assert(
      res5Name.items.some((i) => i.id === approvedPlumbingService._id.toString()),
      "Finds service by partial title 'Fast Pipe Repairs'"
    );

    const res5Cat = await getPublicListings({
      type: "SERVICE",
      category: "PLUMBING",
    });
    assert(
      res5Cat.items.some((i) => i.id === approvedPlumbingService._id.toString()),
      "Finds service by category filter 'PLUMBING'"
    );

    const res5Synonym = await getPublicListings({
      type: "SERVICE",
      search: "plumber",
    });
    assert(
      res5Synonym.items.some((i) => i.id === approvedPlumbingService._id.toString()),
      "Finds plumbing service by keyword synonym 'plumber'"
    );

    const res5Coverage = await getPublicListings({
      type: "SERVICE",
      locality: "Civil Lines",
    });
    assert(
      res5Coverage.items.some((i) => i.id === approvedPlumbingService._id.toString()),
      "Finds service by service area coverage ('Civil Lines')"
    );

    // ---------------------------------------------------------------------------
    // Case 6: Combined keyword and locality filters
    // ---------------------------------------------------------------------------
    console.log("\n--- Test 6: Combined Keyword + Locality Search ---");
    const res6 = await getPublicListings({
      type: "PROPERTY",
      locality: "Roorkee",
      search: "Luxury Flat",
    });
    assert(
      res6.items.some((i) => i.id === approvedRoorkeeProperty._id.toString()),
      "Combines locality 'Roorkee' and search 'Luxury Flat' with $and without clobbering"
    );

    // ---------------------------------------------------------------------------
    // Case 7: Combined property filters (purpose, bedrooms, furnishing, price)
    // ---------------------------------------------------------------------------
    console.log("\n--- Test 7: Granular Property Filters ---");
    const res7Match = await getPublicListings({
      type: "PROPERTY",
      locality: "Roorkee",
      purpose: "FOR_RENT",
      propertyType: "APARTMENT",
      bedrooms: "2",
      furnishing: "FULLY_FURNISHED",
      minPrice: 15000,
      maxPrice: 20000,
    });
    assert(
      res7Match.items.some((i) => i.id === approvedRoorkeeProperty._id.toString()),
      "Matches with purpose=FOR_RENT, 2 BHK, FULLY_FURNISHED, minPrice=15000, maxPrice=20000"
    );

    const res7MismatchPrice = await getPublicListings({
      type: "PROPERTY",
      locality: "Roorkee",
      minPrice: 50000, // Above price 18000
    });
    assert(
      !res7MismatchPrice.items.some((i) => i.id === approvedRoorkeeProperty._id.toString()),
      "Correctly excludes property when price is below minPrice boundary"
    );

    const res7MismatchBedrooms = await getPublicListings({
      type: "PROPERTY",
      locality: "Roorkee",
      bedrooms: "4", // Only 2 BHK
    });
    assert(
      !res7MismatchBedrooms.items.some((i) => i.id === approvedRoorkeeProperty._id.toString()),
      "Correctly excludes property when bedrooms filter does not match"
    );

    // ---------------------------------------------------------------------------
    // Case 8: Reset filters returns full unfiltered result set
    // ---------------------------------------------------------------------------
    console.log("\n--- Test 8: Unfiltered / Reset Query Result Set ---");
    const res8Unfiltered = await getPublicListings({ type: "PROPERTY", cityCode: "ALL" });
    assert(
      res8Unfiltered.pagination.totalCount >= 2,
      `Unfiltered query returns complete eligible dataset (found ${res8Unfiltered.pagination.totalCount})`
    );

    // ---------------------------------------------------------------------------
    // Case 9: Genuinely non-matching query returns zero results
    // ---------------------------------------------------------------------------
    console.log("\n--- Test 9: Zero-Match Empty State Handling ---");
    const res9Empty = await getPublicListings({
      type: "PROPERTY",
      search: "NonExistentListingStringQWERTY987654321",
    });
    assert(res9Empty.pagination.totalCount === 0 && res9Empty.items.length === 0, "Returns 0 items and count 0 for unmatched query");

    // ---------------------------------------------------------------------------
    // Case 10: Strict moderation enforcement (PENDING_REVIEW excluded)
    // ---------------------------------------------------------------------------
    console.log("\n--- Test 10: Moderation Security & Lifecycle Boundaries ---");
    const res10Pending = await getPublicListings({
      type: "PROPERTY",
      search: `Pending Secret Villa ${testSuffix}`,
    });
    assert(
      !res10Pending.items.some((i) => i.id === pendingProperty._id.toString()),
      "PENDING_REVIEW listing is strictly excluded from public search results"
    );

  } finally {
    // Cleanup test fixtures
    await Listing.deleteMany({
      _id: { $in: [approvedRoorkeeProperty._id, pendingProperty._id, approvedPlumbingService._id] },
    });
    await User.deleteOne({ _id: testOwner._id });
    await disconnectFromDatabase();
  }

  console.log("\n=================================================================");
  console.log(`SEARCH FLOW TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runSearchTestSuite().catch((err) => {
  console.error("FATAL ERROR in search test suite:", err);
  process.exit(1);
});
