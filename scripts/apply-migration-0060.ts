import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("=== Migration 0060: Cross-Tenant Cleanup - vendors -> partners key ===");

  // 1. Migrate "vendors" key to "partners" in event_participants.permissions JSON
  console.log("Migrating permission key vendors -> partners in event_participants...");
  const participantsResult = await sql`
    UPDATE event_participants
    SET permissions = (permissions::jsonb - 'vendors') || jsonb_build_object('partners', permissions::jsonb->'vendors')
    WHERE permissions IS NOT NULL AND permissions::jsonb ? 'vendors'
    RETURNING id
  `;
  console.log(`  ✓ Updated ${participantsResult.length} event_participants rows`);

  // 2. Migrate event_collaborations permissions if any have "vendors" key
  console.log("Migrating permission key vendors -> partners in event_collaborations...");
  const collabResult = await sql`
    UPDATE event_collaborations
    SET permissions = (permissions::jsonb - 'vendors') || jsonb_build_object('partners', permissions::jsonb->'vendors')
    WHERE permissions IS NOT NULL AND permissions::jsonb ? 'vendors'
    RETURNING id
  `;
  console.log(`  ✓ Updated ${collabResult.length} event_collaborations rows`);

  console.log("\n✅ Migration 0060 applied successfully!");
}

main().catch((err) => {
  console.error("Migration 0060 FAILED:", err);
  process.exit(1);
});
