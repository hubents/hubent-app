import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
  const sql = neon(process.env.DATABASE_URL!);

  console.log("=== Migration 0059: Bilateral Cross-Tenant Collaboration ===");

  // 1. Create event_collaborations table
  console.log("Creating event_collaborations table...");
  await sql`
    CREATE TABLE IF NOT EXISTS event_collaborations (
      id SERIAL PRIMARY KEY,
      event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
      host_org_id INTEGER NOT NULL REFERENCES organizations(id),
      guest_org_id INTEGER REFERENCES organizations(id),
      invitation_email TEXT,
      invitation_token TEXT UNIQUE,
      permissions JSON DEFAULT '{"general":"view","calendar":"view","tasks":"view","partners":"none","finances":"none","rsvp":"none","guests":"none","runsheet":"none"}',
      status TEXT NOT NULL DEFAULT 'pending',
      invited_by TEXT REFERENCES users(id),
      invited_at TIMESTAMP DEFAULT NOW(),
      accepted_at TIMESTAMP,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(event_id, guest_org_id)
    )
  `;
  console.log("  ✓ event_collaborations created");

  // 2. Add shared_with_host to tasks
  console.log("Adding shared_with_host to tasks...");
  await sql`ALTER TABLE tasks ADD COLUMN IF NOT EXISTS shared_with_host BOOLEAN DEFAULT FALSE`;
  console.log("  ✓ tasks.shared_with_host added");

  // 3. Add collaborator_org_id to task_participants
  console.log("Adding collaborator_org_id to task_participants...");
  await sql`ALTER TABLE task_participants ADD COLUMN IF NOT EXISTS collaborator_org_id INTEGER REFERENCES organizations(id)`;
  console.log("  ✓ task_participants.collaborator_org_id added");

  // 4. Migrate provider_event_access data
  console.log("Migrating provider_event_access data to event_collaborations...");
  const result = await sql`
    INSERT INTO event_collaborations (event_id, host_org_id, guest_org_id, status, invited_by, invited_at, accepted_at)
    SELECT
      pea.event_id,
      pea.planner_org_id,
      pea.provider_org_id,
      COALESCE(pea.status, 'active'),
      pea.invited_by,
      pea.invited_at,
      pea.accepted_at
    FROM provider_event_access pea
    ON CONFLICT (event_id, guest_org_id) DO NOTHING
    RETURNING id
  `;
  console.log(`  ✓ Migrated ${result.length} rows from provider_event_access`);

  // 5. Create indexes
  console.log("Creating indexes...");
  await sql`
    CREATE INDEX IF NOT EXISTS idx_event_collaborations_guest_org
      ON event_collaborations(guest_org_id, status)
  `;
  await sql`
    CREATE INDEX IF NOT EXISTS idx_event_collaborations_event
      ON event_collaborations(event_id, status)
  `;
  console.log("  ✓ Indexes created");

  console.log("\n✅ Migration 0059 applied successfully!");
}

main().catch((err) => {
  console.error("Migration 0059 FAILED:", err);
  process.exit(1);
});
