import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("=== Migration 0039: Add Event Schedule Indexes ===\n");

  await sql`CREATE INDEX IF NOT EXISTS idx_event_schedule_items_event_id ON event_schedule_items(event_id)`;
  console.log("✅ idx_event_schedule_items_event_id");

  await sql`CREATE INDEX IF NOT EXISTS idx_event_schedule_items_org_date ON event_schedule_items(organization_id, date)`;
  console.log("✅ idx_event_schedule_items_org_date");

  console.log("\n✅ Migration 0039 complete!");
}

main().catch(console.error);
