import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("=== Migration 0062: Add menu_options to rsvp_settings ===");

  await sql`
    ALTER TABLE rsvp_settings
    ADD COLUMN IF NOT EXISTS menu_options jsonb
    DEFAULT '["Carne", "Pescado", "Vegetariano"]'::jsonb
  `;
  console.log("  ✓ Added rsvp_settings.menu_options column");

  console.log("\n✅ Migration 0062 applied successfully!");
}

main().catch((err) => {
  console.error("Migration 0062 FAILED:", err);
  process.exit(1);
});
