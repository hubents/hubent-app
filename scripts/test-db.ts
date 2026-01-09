import "dotenv/config";
import { db } from "../src/db";
import { users, platformAdmins } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function auditAdmins() {
  try {
    console.log("🔍 Auditing platform admins...\n");

    // Get all platform admins with user info including password hash
    const admins = await db
      .select({
        adminId: platformAdmins.id,
        level: platformAdmins.level,
        userId: platformAdmins.userId,
        userName: users.name,
        userEmail: users.email,
        emailVerified: users.emailVerified,
        hasPassword: users.passwordHash,
        createdAt: platformAdmins.createdAt,
      })
      .from(platformAdmins)
      .leftJoin(users, eq(platformAdmins.userId, users.id));

    if (admins.length === 0) {
      console.log("❌ No platform admins found in database!");
      console.log("\nTo add an admin, run:");
      console.log("  npx tsx scripts/add-super-admin.ts your@email.com");
    } else {
      console.log(`✅ Found ${admins.length} platform admin(s):\n`);
      admins.forEach((admin, i) => {
        console.log(`${i + 1}. ${admin.userEmail}`);
        console.log(`   Name: ${admin.userName || "Not set"}`);
        console.log(`   Level: ${admin.level}`);
        console.log(`   Email Verified: ${admin.emailVerified ? "Yes" : "No"}`);
        console.log(`   Has Password: ${admin.hasPassword ? "YES" : "NO"}`);
        console.log(`   Created: ${admin.createdAt}`);
        console.log("");
      });
    }

    // Also check total users
    const allUsers = await db.select().from(users);
    console.log(`\n📊 Total users in database: ${allUsers.length}`);
    
    if (allUsers.length > 0) {
      console.log("\nAll users:");
      allUsers.forEach((u, i) => {
        console.log(`  ${i + 1}. ${u.email} (${u.name || "No name"}) - Has Password: ${u.passwordHash ? "YES" : "NO"}`);
      });
    }

    process.exit(0);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log("❌ Database error:", errorMessage);
    process.exit(1);
  }
}

auditAdmins();
