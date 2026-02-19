import "dotenv/config";
import { neon } from "@neondatabase/serverless";

async function run() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("\n🔄 Migración: contact_events → event_participants\n");

  // 1. Get all contact_events records
  const contactEventRows = await sql`
    SELECT ce.id, ce.contact_id, ce.event_id, ce.role
    FROM contact_events ce
  `;

  console.log(`📋 Registros en contact_events: ${contactEventRows.length}`);

  if (contactEventRows.length === 0) {
    console.log("✅ No hay datos para migrar");
    return;
  }

  let migrated = 0;
  let skipped = 0;

  for (const row of contactEventRows) {
    // Check if already exists in event_participants
    const existing = await sql`
      SELECT id FROM event_participants 
      WHERE event_id = ${row.event_id} AND contact_id = ${row.contact_id}
    `;

    if (existing.length > 0) {
      skipped++;
      continue;
    }

    // Insert into event_participants
    await sql`
      INSERT INTO event_participants (event_id, contact_id, type, role, invited_at)
      VALUES (${row.event_id}, ${row.contact_id}, 'contact', ${row.role}, NOW())
    `;
    migrated++;
  }

  console.log(`✅ Migrados: ${migrated}`);
  console.log(`⏭️  Ya existían: ${skipped}`);
  console.log(`📊 Total procesados: ${contactEventRows.length}`);
}

run().catch(console.error);
