import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("Applying migration 0036: contacts.user_id + invitations.metadata...");

  await sql`ALTER TABLE contacts ADD COLUMN IF NOT EXISTS user_id TEXT REFERENCES users(id)`;
  console.log("✅ contacts.user_id added");

  await sql`ALTER TABLE invitations ADD COLUMN IF NOT EXISTS metadata JSONB`;
  console.log("✅ invitations.metadata added");

  console.log("Migration 0036 complete!");
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Migration failed:", err);
    process.exit(1);
  });
