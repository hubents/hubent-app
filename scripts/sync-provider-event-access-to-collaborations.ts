import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("=== Sync provider_event_access -> event_collaborations ===");
  console.log("Finds PEA rows missing from event_collaborations and inserts them.\n");

  // Check how many PEA rows exist without a matching event_collaborations row
  const missing = await sql`
    SELECT COUNT(*) as count
    FROM provider_event_access pea
    WHERE NOT EXISTS (
      SELECT 1 FROM event_collaborations ec
      WHERE ec.event_id = pea.event_id AND ec.guest_org_id = pea.provider_org_id
    )
  `;
  console.log(`Found ${missing[0].count} provider_event_access rows without event_collaborations`);

  if (Number(missing[0].count) === 0) {
    console.log("\nNo rows to sync. All provider_event_access rows have matching event_collaborations.");
    return;
  }

  // List the missing rows for audit
  const missingRows = await sql`
    SELECT pea.id, pea.event_id, pea.planner_org_id, pea.provider_org_id, pea.status,
           e.name as event_name, host.name as host_name, guest.name as guest_name
    FROM provider_event_access pea
    LEFT JOIN events e ON e.id = pea.event_id
    LEFT JOIN organizations host ON host.id = pea.planner_org_id
    LEFT JOIN organizations guest ON guest.id = pea.provider_org_id
    WHERE NOT EXISTS (
      SELECT 1 FROM event_collaborations ec
      WHERE ec.event_id = pea.event_id AND ec.guest_org_id = pea.provider_org_id
    )
  `;

  console.log("\nRows to sync:");
  for (const row of missingRows) {
    console.log(`  PEA#${row.id}: event="${row.event_name}" (${row.event_id}) | host="${row.host_name}" (${row.planner_org_id}) -> guest="${row.guest_name}" (${row.provider_org_id}) | status=${row.status}`);
  }

  // Insert missing rows with default collaboration permissions
  const result = await sql`
    INSERT INTO event_collaborations (event_id, host_org_id, guest_org_id, status, invited_by, invited_at, accepted_at, permissions)
    SELECT
      pea.event_id,
      pea.planner_org_id,
      pea.provider_org_id,
      COALESCE(pea.status, 'active'),
      pea.invited_by,
      pea.invited_at,
      pea.accepted_at,
      '{"general":"view","calendar":"view","tasks":"view","partners":"none","finances":"none","rsvp":"none","guests":"none","runsheet":"none"}'::json
    FROM provider_event_access pea
    WHERE NOT EXISTS (
      SELECT 1 FROM event_collaborations ec
      WHERE ec.event_id = pea.event_id AND ec.guest_org_id = pea.provider_org_id
    )
    ON CONFLICT (event_id, guest_org_id) DO NOTHING
    RETURNING id, event_id, guest_org_id
  `;

  console.log(`\nInserted ${result.length} event_collaborations rows`);
  for (const row of result) {
    console.log(`  EC#${row.id}: event=${row.event_id} guest_org=${row.guest_org_id}`);
  }

  console.log("\nDone. All provider_event_access rows now have matching event_collaborations.");
}

main().catch((err) => {
  console.error("Sync FAILED:", err);
  process.exit(1);
});
