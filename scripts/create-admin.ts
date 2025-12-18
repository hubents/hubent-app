import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { users, platformAdmins } from "../src/db/schema";
import { eq } from "drizzle-orm";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function createDemoUsers() {
  console.log("🔐 Creating demo users...\n");

  // SuperAdmin user
  const adminEmail = "german@napsix.ai";
  console.log(`👑 SuperAdmin: ${adminEmail}`);

  let [adminUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, adminEmail));

  if (!adminUser) {
    [adminUser] = await db
      .insert(users)
      .values({
        id: crypto.randomUUID(),
        email: adminEmail,
        name: "German Gimenez",
        emailVerified: new Date(),
      })
      .returning();
    console.log(`   ✅ User created: ${adminUser.id}`);
  } else {
    console.log(`   ✅ User exists: ${adminUser.id}`);
  }

  const [existingAdmin] = await db
    .select()
    .from(platformAdmins)
    .where(eq(platformAdmins.userId, adminUser.id));

  if (!existingAdmin) {
    await db.insert(platformAdmins).values({
      userId: adminUser.id,
      level: "super_admin",
      permissions: ["*"],
    });
    console.log("   ✅ SuperAdmin privileges granted!");
  } else {
    console.log("   ✅ Already SuperAdmin");
  }

  // Normal user
  const userEmail = "gimenez.ger@gmail.com";
  console.log(`\n👤 Normal User: ${userEmail}`);

  let [normalUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, userEmail));

  if (!normalUser) {
    [normalUser] = await db
      .insert(users)
      .values({
        id: crypto.randomUUID(),
        email: userEmail,
        name: "German G",
        emailVerified: new Date(),
      })
      .returning();
    console.log(`   ✅ User created: ${normalUser.id}`);
  } else {
    console.log(`   ✅ User exists: ${normalUser.id}`);
  }

  console.log("\n" + "=".repeat(50));
  console.log("🎉 Demo users created successfully!\n");
  console.log("📧 SuperAdmin: german@napsix.ai");
  console.log("   → Login: https://hubents-new.vercel.app/login");
  console.log("   → Admin: https://hubents-new.vercel.app/admin");
  console.log("\n📧 Normal User: gimenez.ger@gmail.com");
  console.log("   → Login: https://hubents-new.vercel.app/login");
  console.log("   → Dashboard: https://hubents-new.vercel.app/dashboard");
  console.log("=".repeat(50));
}

createDemoUsers().catch(console.error);
