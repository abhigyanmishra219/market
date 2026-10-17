import fs from "fs";
import path from "path";
import { connectToDatabase, disconnectFromDatabase } from "@/lib/db";
import { User } from "@/models/User";

// Load .env.local if present
try {
  const envPath = path.resolve(process.cwd(), ".env.local");
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    for (const line of envContent.split("\n")) {
      const match = line.trim().match(/^([^=]+)=(.*)$/);
      if (match && !process.env[match[1].trim()]) {
        process.env[match[1].trim()] = match[2].trim().replace(/^["']|["']$/g, "");
      }
    }
  }
} catch {
  // Ignore env read error
}

async function bootstrapAdmin() {
  console.log("=================================================================");
  console.log("MARKETPLACE SECURE INITIAL ADMINISTRATOR PROVISIONING");
  console.log("=================================================================\n");

  const rawArg = process.argv[2];
  const targetEmail = (rawArg || process.env.ADMIN_EMAIL || "").trim().toLowerCase();

  if (!targetEmail) {
    console.error("ERROR: No admin email provided.");
    console.error("Please configure ADMIN_EMAIL in .env.local or pass an email argument:");
    console.error("  npx tsx --conditions=import scripts/bootstrap-admin.mts admin@example.com\n");
    process.exit(1);
  }

  // Basic email pattern check
  if (!targetEmail.includes("@") || !targetEmail.includes(".")) {
    console.error(`ERROR: "${targetEmail}" is not a valid email address.`);
    process.exit(1);
  }

  console.log(`Target Administrator Email: ${targetEmail}`);
  console.log("Connecting to MongoDB Atlas...");

  try {
    await connectToDatabase();
    console.log("Connected to database successfully.\n");

    const user = await User.findOne({ email: targetEmail });

    if (!user) {
      console.log(`NOTE: User record for "${targetEmail}" does not exist in the database yet.`);
      console.log(`Provisioning Policy:`);
      console.log(`  1. The ADMIN_EMAIL variable has been set to "${targetEmail}".`);
      console.log(`  2. When this Google account completes its first OAuth sign-in, the server-side`);
      console.log(`     bootstrap hook will automatically and idempotently assign the ADMIN role.`);
      console.log(`  3. No unverified or public user can claim this role.`);
    } else {
      if (user.role === "ADMIN") {
        console.log(`✓ User "${targetEmail}" is ALREADY an active Administrator (Role: ADMIN).`);
        console.log(`  User ID: ${user._id.toString()}`);
        console.log(`  Status:  ${user.status}`);
      } else {
        const previousRole = user.role;
        user.role = "ADMIN";
        await user.save();
        console.log(`✓ SUCCESS: Promoted user "${targetEmail}" from ${previousRole} to ADMIN.`);
        console.log(`  User ID: ${user._id.toString()}`);
        console.log(`  Status:  ${user.status}`);
      }
    }

    console.log("\n=================================================================");
    console.log("PROVISIONING SCRIPT COMPLETE");
    console.log("=================================================================");
  } catch (error) {
    console.error("Failed to bootstrap administrator:", error);
    process.exit(1);
  } finally {
    await disconnectFromDatabase();
  }
}

bootstrapAdmin();
