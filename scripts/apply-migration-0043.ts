import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("=== Migration 0043: Add cover_image to forms ===\n");

  await sql`ALTER TABLE "forms" ADD COLUMN IF NOT EXISTS "cover_image" text`;
  console.log("✅ Added cover_image column to forms");

  console.log("\n✅ Migration 0043 complete!");
}

main().catch(console.error);
