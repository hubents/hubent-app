import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("=== Migration 0040: Add vendor_id to task_schedule_items ===\n");

  try {
    await sql`ALTER TABLE "task_schedule_items" ADD COLUMN "vendor_id" integer`;
    console.log("✅ Added vendor_id column");
  } catch { console.log("⏭️  vendor_id column already exists"); }

  try {
    await sql`
      ALTER TABLE "task_schedule_items"
      ADD CONSTRAINT "task_schedule_items_vendor_id_vendors_id_fk"
      FOREIGN KEY ("vendor_id") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE NO ACTION
    `;
    console.log("✅ Added FK vendor_id -> vendors");
  } catch { console.log("⏭️  FK vendor_id already exists"); }

  try {
    await sql`CREATE INDEX IF NOT EXISTS "idx_task_schedule_items_vendor_id" ON "task_schedule_items" ("vendor_id")`;
    console.log("✅ Added index on vendor_id");
  } catch { console.log("⏭️  Index already exists"); }

  console.log("\n✅ Migration 0040 complete!");
}

main().catch(console.error);
