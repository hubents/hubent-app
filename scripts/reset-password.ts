import "dotenv/config";
import { db } from "../src/db";
import { users } from "../src/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword } from "../src/lib/password";

async function resetPassword() {
  const email = process.argv[2];
  const newPassword = process.argv[3];

  if (!email || !newPassword) {
    console.error("Usage: npx tsx scripts/reset-password.ts <email> <newPassword>");
    process.exit(1);
  }

  console.log(`Resetting password for: ${email}`);

  const user = await db.query.users.findFirst({
    where: eq(users.email, email.toLowerCase()),
  });

  if (!user) {
    console.error(`User not found: ${email}`);
    process.exit(1);
  }

  console.log(`Found user: ${user.name} (${user.id})`);

  const passwordHash = await hashPassword(newPassword);

  await db
    .update(users)
    .set({ passwordHash })
    .where(eq(users.id, user.id));

  console.log(`Password reset successfully for ${email}`);
  process.exit(0);
}

resetPassword().catch(console.error);
