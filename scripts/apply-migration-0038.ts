import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("=== Migration 0038: Add Event Schedule Items ===\n");

  await sql`
    CREATE TABLE IF NOT EXISTS "event_schedule_items" (
      "id" serial PRIMARY KEY NOT NULL,
      "event_id" integer NOT NULL,
      "organization_id" integer NOT NULL,
      "title" text NOT NULL,
      "description" text,
      "date" timestamp NOT NULL,
      "start_time" text,
      "end_time" text,
      "location" text,
      "notes" text,
      "color" text,
      "sort_order" integer DEFAULT 0,
      "created_at" timestamp DEFAULT now(),
      "updated_at" timestamp DEFAULT now()
    )
  `;
  console.log("✅ Created event_schedule_items table");

  try {
    await sql`
      ALTER TABLE "event_schedule_items" 
      ADD CONSTRAINT "event_schedule_items_event_id_events_id_fk" 
      FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE cascade ON UPDATE no action
    `;
    console.log("✅ Added FK event_id -> events");
  } catch { console.log("⏭️  FK event_id already exists"); }

  try {
    await sql`
      ALTER TABLE "event_schedule_items" 
      ADD CONSTRAINT "event_schedule_items_organization_id_organizations_id_fk" 
      FOREIGN KEY ("organization_id") REFERENCES "organizations"("id") ON DELETE cascade ON UPDATE no action
    `;
    console.log("✅ Added FK organization_id -> organizations");
  } catch { console.log("⏭️  FK organization_id already exists"); }

  console.log("\n✅ Migration 0038 complete!");
}

main().catch(console.error);
