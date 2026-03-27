import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("Adding public profile fields to organizations...");

  await sql`ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "public_email" text`;
  await sql`ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "price_range" text`;
  await sql`ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "country" text`;
  await sql`ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "instagram_posts" json`;
  await sql`ALTER TABLE "organizations" ADD COLUMN IF NOT EXISTS "brochure_url" text`;

  console.log("Migration 0058 applied successfully!");
}

main().catch(console.error);
