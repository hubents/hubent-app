import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("=== Migration 0068: Add 'pending' value to verification_status enum ===");

  // PostgreSQL enums require ALTER TYPE to add new values
  // IF NOT EXISTS prevents errors on re-runs
  await sql`ALTER TYPE verification_status ADD VALUE IF NOT EXISTS 'pending' BEFORE 'verified'`;
  console.log("  ✓ 'pending' añadido a verification_status enum");

  console.log("\n✅ Migration 0068 applied successfully!");
}

main().catch((err) => {
  console.error("Migration 0068 FAILED:", err);
  process.exit(1);
});
