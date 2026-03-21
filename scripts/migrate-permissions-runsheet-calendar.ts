import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config();

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("=== Migration: Add runsheet & calendar to event_participants permissions ===\n");

  // Fetch all participants with non-null permissions
  const rows = await sql`
    SELECT id, permissions 
    FROM event_participants 
    WHERE permissions IS NOT NULL
  `;

  console.log(`Found ${rows.length} participants with permissions`);

  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const perms = row.permissions as Record<string, string> | null;
    if (!perms || typeof perms !== "object") {
      skipped++;
      continue;
    }

    // Skip if already has both keys
    if ("runsheet" in perms && "calendar" in perms) {
      skipped++;
      continue;
    }

    // Copy from general (or default to "none")
    const generalLevel = perms.general || "none";
    const newPerms = {
      ...perms,
      runsheet: perms.runsheet || generalLevel,
      calendar: perms.calendar || generalLevel,
    };

    await sql`
      UPDATE event_participants 
      SET permissions = ${JSON.stringify(newPerms)}::jsonb
      WHERE id = ${row.id}
    `;
    updated++;
  }

  console.log(`✅ Updated: ${updated}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log("\n✅ Migration complete!");
}

main().catch(console.error);
