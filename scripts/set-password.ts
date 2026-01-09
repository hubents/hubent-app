import "dotenv/config";
import { db } from "../src/db";
import { users } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "../src/lib/password";

async function setPassword() {
  const email = process.argv[2] || "german@napsix.ai";
  const newPassword = process.argv[3] || "Admin2025!";

  console.log(`Setting password for: ${email}`);
  console.log(`New password: ${newPassword}`);

  const user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    console.log(`❌ User ${email} not found`);
    process.exit(1);
  }

  const hashedPassword = await hashPassword(newPassword);

  await db
    .update(users)
    .set({ passwordHash: hashedPassword })
    .where(eq(users.email, email));

  console.log(`✅ Password updated for ${email}`);
  console.log(`\nYou can now login with:`);
  console.log(`  Email: ${email}`);
  console.log(`  Password: ${newPassword}`);

  process.exit(0);
}

setPassword().catch((e) => {
  console.error("Error:", e);
  process.exit(1);
});
