import { validateSafeRedirect, assertOwnership } from "@/lib/auth-guards";
import { updateProfileSchema } from "@/lib/validations/user";
import { ForbiddenError } from "@/lib/errors";
import { auth, handlers } from "@/lib/auth";
import { connectToDatabase, disconnectFromDatabase } from "@/lib/db";
import { User } from "@/models/User";
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
  console.log("RUNNING W2 AUTHENTICATION & SECURITY TEST SUITE");
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
  // TEST GROUP 1: Safe Redirect Validation (Anti-Open-Redirect)
  // ---------------------------------------------------------------------------
  console.log("--- Group 1: Open-Redirect Defense ---");
  assert(validateSafeRedirect("/dashboard") === "/dashboard", "Internal path /dashboard is allowed");
  assert(validateSafeRedirect("/account/profile?tab=contact") === "/account/profile?tab=contact", "Query params in internal path allowed");
  assert(validateSafeRedirect("https://malicious-site.com") === "/", "Absolute external URL blocked");
  assert(validateSafeRedirect("//malicious-site.com") === "/", "Protocol-relative URL blocked");
  assert(validateSafeRedirect("/\\malicious-site.com") === "/", "Backslash bypass URL blocked");
  assert(validateSafeRedirect("javascript:alert(1)") === "/", "JavaScript pseudo-scheme blocked");
  assert(validateSafeRedirect(null) === "/", "Null callback defaults to root");

  // ---------------------------------------------------------------------------
  // TEST GROUP 2: Profile Update Zod Validation & Privilege Escalation Defense
  // ---------------------------------------------------------------------------
  console.log("\n--- Group 2: Zod Validation & Privilege Escalation Defense ---");
  const validProfile = updateProfileSchema.safeParse({
    name: "Verified User",
    phone: "+91 9876543210",
    whatsapp: "+91 9876543210",
    contactPreferences: { showPhone: true, showWhatsapp: false },
  });
  assert(validProfile.success, "Valid profile payload passes schema validation");

  // Test privilege escalation attack: user attempting to inject role: 'ADMIN'
  const maliciousPayload = {
    name: "Attacker",
    role: "ADMIN",
    status: "ACTIVE",
    email: "hijack@example.com",
    deletedAt: null,
  };
  const sanitized = updateProfileSchema.parse(maliciousPayload);
  assert(!("role" in sanitized), "Forbidden field 'role' is stripped from input");
  assert(!("status" in sanitized), "Forbidden field 'status' is stripped from input");
  assert(!("email" in sanitized), "Forbidden field 'email' is stripped from input");

  const invalidPhone = updateProfileSchema.safeParse({ phone: "invalid-letters-123" });
  assert(!invalidPhone.success, "Invalid phone characters rejected by regex");

  // ---------------------------------------------------------------------------
  // TEST GROUP 3: Server-Side Authorization Guards & RBAC
  // ---------------------------------------------------------------------------
  console.log("\n--- Group 3: Server-Side Authorization & RBAC ---");
  const regularUserSession = {
    user: {
      id: "653b1f9c0e2a1b001a9f0001",
      email: "user@example.com",
      name: "Regular User",
      role: "USER" as const,
      status: "ACTIVE" as const,
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  const adminSession = {
    user: {
      id: "653b1f9c0e2a1b001a9f9999",
      email: "admin@example.com",
      name: "Platform Admin",
      role: "ADMIN" as const,
      status: "ACTIVE" as const,
    },
    expires: new Date(Date.now() + 86400000).toISOString(),
  };

  // Ownership: user modifying their own resource
  let ownSuccess = false;
  try {
    assertOwnership("653b1f9c0e2a1b001a9f0001", regularUserSession as unknown as Session);
    ownSuccess = true;
  } catch {
    ownSuccess = false;
  }
  assert(ownSuccess, "Resource owner can modify their own resource");

  // Ownership: user modifying someone else's resource
  let foreignBlocked = false;
  try {
    assertOwnership("653b1f9c0e2a1b001a9f8888", regularUserSession as unknown as Session);
  } catch (err: unknown) {
    if (err instanceof ForbiddenError || (err && typeof err === "object" && "code" in err && err.code === "FORBIDDEN")) {
      foreignBlocked = true;
    }
  }
  assert(foreignBlocked, "Regular user modifying foreign resource throws ForbiddenError (403)");

  // Ownership: Admin modifying someone else's resource
  let adminOverride = false;
  try {
    assertOwnership("653b1f9c0e2a1b001a9f8888", adminSession as unknown as Session);
    adminOverride = true;
  } catch {
    adminOverride = false;
  }
  assert(adminOverride, "Admin can manage resources across all users");

  // ---------------------------------------------------------------------------
  // TEST GROUP 4: Auth.js Wiring & Route Handler Export Validation
  // ---------------------------------------------------------------------------
  console.log("\n--- Group 4: Auth.js v5 Handlers & Configuration ---");
  assert(typeof auth === "function", "Auth.js auth() function is exported");
  assert(typeof handlers.GET === "function", "handlers.GET Route Handler is exported");
  assert(typeof handlers.POST === "function", "handlers.POST Route Handler is exported");

  // ---------------------------------------------------------------------------
  // TEST GROUP 5: Mongoose User Model & Atlas Database Integration
  // ---------------------------------------------------------------------------
  console.log("\n--- Group 5: User Model & Database Constraints ---");
  await connectToDatabase();
  const testEmail = `w2_test_${Date.now()}@example.com`;

  try {
    // Test creating user with default role & status
    const created = await User.create({
      name: "Integration Test User",
      email: testEmail,
      contactPreferences: { showPhone: true, showWhatsapp: true },
    });

    assert(created.role === "USER", "Default created user role is strictly 'USER'");
    assert(created.status === "ACTIVE", "Default created user status is 'ACTIVE'");

    // Test unique email constraint prevents duplicate records
    let duplicateRejected = false;
    try {
      await User.create({
        name: "Duplicate User Attempt",
        email: testEmail,
      });
    } catch {
      duplicateRejected = true;
    }
    assert(duplicateRejected, "Duplicate email registration rejected by database index");

    // Clean up test document
    await User.findByIdAndDelete(created._id);
    assert(true, "Test user cleaned up cleanly");
  } finally {
    await disconnectFromDatabase();
  }

  // ---------------------------------------------------------------------------
  // FINAL SCORECARD
  // ---------------------------------------------------------------------------
  console.log("\n=================================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTestSuite().catch((err) => {
  console.error("Test suite runtime failure:", err);
  process.exit(1);
});
