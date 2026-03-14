/**
 * Diagnostic script: Check user role, eventScoped status, and event participation
 * Usage: npx tsx scripts/diagnose-user-access.ts <email>
 */
import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import * as fs from "fs";

// Load env
const envPath = fs.existsSync(".env.local") ? ".env.local" : ".env";
dotenv.config({ path: envPath });

async function diagnose() {
  const email = process.argv[2];
  if (!email) {
    console.error("Usage: npx tsx scripts/diagnose-user-access.ts <email>");
    process.exit(1);
  }

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("DATABASE_URL not set. Check your .env file.");
    process.exit(1);
  }

  const sql = neon(dbUrl);

  // 1. Find user
  const userRows = await sql`SELECT id, name, email FROM users WHERE email = ${email}`;
  if (userRows.length === 0) {
    console.error(`User not found: ${email}`);
    process.exit(1);
  }
  const user = userRows[0];
  console.log("\n=== USER ===");
  console.log(`ID: ${user.id}, Name: ${user.name}, Email: ${user.email}`);

  // 2. Check org memberships and roles
  const memberships = await sql`
    SELECT 
      om.organization_id as org_id,
      o.name as org_name,
      r.id as role_id,
      r.name as role_name,
      r.slug as role_slug,
      r.event_scoped
    FROM organization_members om
    JOIN organizations o ON om.organization_id = o.id
    JOIN roles r ON om.role_id = r.id
    WHERE om.user_id = ${user.id}
  `;
  console.log("\n=== MEMBERSHIPS ===");
  for (const m of memberships) {
    console.log(`  Org: ${m.org_name} (${m.org_id})`);
    console.log(`  Role: ${m.role_name} (${m.role_slug}), eventScoped: ${m.event_scoped}`);
  }

  // 3. Check role permissions
  for (const m of memberships) {
    const perms = await sql`
      SELECT p.name, p.slug 
      FROM role_permissions rp
      JOIN permissions p ON rp.permission_id = p.id
      WHERE rp.role_id = ${m.role_id}
      ORDER BY p.slug
    `;
    console.log(`\n=== PERMISSIONS for role ${m.role_name} ===`);
    for (const p of perms) {
      console.log(`  ${p.slug}`);
    }
  }

  // 4. Check event participations
  const participations = await sql`
    SELECT 
      ep.event_id,
      e.name as event_name,
      ep.role,
      ep.permissions
    FROM event_participants ep
    JOIN events e ON ep.event_id = e.id
    WHERE ep.user_id = ${user.id}
  `;
  console.log("\n=== EVENT PARTICIPATIONS ===");
  if (participations.length === 0) {
    console.log("  No event participations found");
  }
  for (const p of participations) {
    console.log(`  Event: ${p.event_name} (${p.event_id})`);
    console.log(`  Role: ${p.role}`);
    console.log(`  Permissions: ${JSON.stringify(p.permissions)}`);
  }

  // 5. Count tasks per event for this org
  for (const m of memberships) {
    const taskCounts = await sql`
      SELECT 
        t.event_id,
        e.name as event_name,
        COUNT(*)::int as task_count
      FROM tasks t
      LEFT JOIN events e ON t.event_id = e.id
      WHERE t.organization_id = ${m.org_id}
      GROUP BY t.event_id, e.name
      ORDER BY t.event_id NULLS FIRST
    `;
    console.log(`\n=== TASKS IN ORG ${m.org_name} ===`);
    for (const tc of taskCounts) {
      const eventName = tc.event_name || "(sin evento)";
      console.log(`  ${eventName} (eventId: ${tc.event_id}): ${tc.task_count} tasks`);
    }
  }

  console.log("\n=== DIAGNOSIS ===");
  for (const m of memberships) {
    if (!m.event_scoped) {
      console.log(`⚠️  Role "${m.role_name}" (${m.role_slug}) does NOT have event_scoped=true`);
      console.log(`   This user sees ALL tasks in org "${m.org_name}"`);
    } else {
      console.log(`✅ Role "${m.role_name}" (${m.role_slug}) is event_scoped`);
      console.log(`   User only sees tasks from events where they are a participant with tasks != "none"`);
      
      // Show which events' tasks they CAN see
      const accessibleEvents = participations.filter(p => {
        const perms = p.permissions as Record<string, string> | null;
        return perms && perms.tasks && perms.tasks !== "none";
      });
      if (accessibleEvents.length > 0) {
        console.log(`   Accessible events with tasks:`);
        for (const ae of accessibleEvents) {
          console.log(`     - ${ae.event_name} (${ae.event_id})`);
        }
      } else {
        console.log(`   ⚠️  NO events with tasks access found!`);
      }
    }
  }

  process.exit(0);
}

diagnose().catch(console.error);
