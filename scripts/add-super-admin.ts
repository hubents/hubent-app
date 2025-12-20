import { db } from "../src/db";
import { users, platformAdmins } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function addSuperAdmin() {
  const email = process.argv[2] || "german@napsix.ai";
  
  console.log(`Adding super admin for: ${email}`);

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    console.log(`User with email ${email} not found. Creating user...`);
    
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        name: "German Gimenez",
        emailVerified: new Date(),
        onboardingCompleted: true,
      })
      .returning();

    await db.insert(platformAdmins).values({
      userId: newUser.id,
      level: "super_admin",
    });

    console.log(`Created user and added as super_admin: ${newUser.id}`);
    return;
  }

  const existingAdmin = await db.query.platformAdmins.findFirst({
    where: eq(platformAdmins.userId, user.id),
  });

  if (existingAdmin) {
    console.log(`User ${email} is already a platform admin (${existingAdmin.level})`);
    
    if (existingAdmin.level !== "super_admin") {
      await db
        .update(platformAdmins)
        .set({ level: "super_admin" })
        .where(eq(platformAdmins.userId, user.id));
      console.log(`Upgraded to super_admin`);
    }
    return;
  }

  await db.insert(platformAdmins).values({
    userId: user.id,
    level: "super_admin",
  });

  console.log(`Added ${email} as super_admin`);
}

addSuperAdmin()
  .then(() => {
    console.log("Done!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
