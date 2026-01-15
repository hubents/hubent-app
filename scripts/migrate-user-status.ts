import "dotenv/config";
import { neon } from "@neondatabase/serverless";

async function migrate() {
  const sql = neon(process.env.DATABASE_URL!);
  
  try {
    // Create enum
    await sql`CREATE TYPE "user_status" AS ENUM ('active', 'suspended')`;
    console.log("✓ Enum user_status created");
  } catch (e: any) {
    if (e.message?.includes("already exists")) {
      console.log("⚠ Enum user_status already exists");
    } else {
      throw e;
    }
  }

  try {
    await sql`ALTER TABLE "users" ADD COLUMN "status" "user_status" DEFAULT 'active'`;
    console.log("✓ Column status added");
  } catch (e: any) {
    if (e.message?.includes("already exists")) {
      console.log("⚠ Column status already exists");
    } else {
      throw e;
    }
  }

  try {
    await sql`ALTER TABLE "users" ADD COLUMN "suspended_at" timestamp`;
    console.log("✓ Column suspended_at added");
  } catch (e: any) {
    if (e.message?.includes("already exists")) {
      console.log("⚠ Column suspended_at already exists");
    } else {
      throw e;
    }
  }

  try {
    await sql`ALTER TABLE "users" ADD COLUMN "suspended_by" text`;
    console.log("✓ Column suspended_by added");
  } catch (e: any) {
    if (e.message?.includes("already exists")) {
      console.log("⚠ Column suspended_by already exists");
    } else {
      throw e;
    }
  }

  try {
    await sql`ALTER TABLE "users" ADD COLUMN "suspended_reason" text`;
    console.log("✓ Column suspended_reason added");
  } catch (e: any) {
    if (e.message?.includes("already exists")) {
      console.log("⚠ Column suspended_reason already exists");
    } else {
      throw e;
    }
  }

  console.log("\n✅ Migration completed!");
}

migrate().catch(console.error);
