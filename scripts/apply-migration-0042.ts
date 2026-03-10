import "dotenv/config";
import { neon } from "@neondatabase/serverless";

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("=== Migration 0042: Add event_id to form_instances ===");

  try {
    await sql`ALTER TABLE "form_instances" ADD COLUMN IF NOT EXISTS "event_id" integer REFERENCES "events"("id") ON DELETE CASCADE`;
    console.log("✅ Added event_id column");
  } catch (e: any) {
    if (e.message?.includes("already exists")) {
      console.log("⚠️  event_id column already exists");
    } else {
      throw e;
    }
  }

  try {
    await sql`CREATE INDEX IF NOT EXISTS "form_instances_event_idx" ON "form_instances" ("event_id") WHERE "event_id" IS NOT NULL`;
    console.log("✅ Created event_id index");
  } catch (e: any) {
    console.log("⚠️  Index:", e.message);
  }

  console.log("\n✅ Migration 0042 complete!");
}

main().catch((e) => {
  console.error("❌ Migration failed:", e);
  process.exit(1);
});
