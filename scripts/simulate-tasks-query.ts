/**
 * Simulate what GET /api/tasks returns for a specific user with NEW security filters
 */
import { neon } from "@neondatabase/serverless";
import * as dotenv from "dotenv";
import * as fs from "fs";

const envPath = fs.existsSync(".env.local") ? ".env.local" : ".env";
dotenv.config({ path: envPath });

async function simulate() {
  const email = process.argv[2] || "german@napsix.com";
  const sql = neon(process.env.DATABASE_URL!);

  const [user] = await sql`SELECT id, name FROM users WHERE email = ${email}`;
  if (!user) { console.error("User not found"); process.exit(1); }

  const [mem] = await sql`
    SELECT om.organization_id, r.event_scoped
    FROM organization_members om
    JOIN roles r ON om.role_id = r.id
    WHERE om.user_id = ${user.id}
  `;

  console.log(`\nUser: ${email} (${user.id}) — ${user.name}`);
  console.log(`Org: ${mem.organization_id}, eventScoped: ${mem.event_scoped}`);

  if (!mem.event_scoped) {
    console.log("\n⚠️  User is NOT eventScoped — sees ALL tasks (no change needed)");
    process.exit(0);
  }

  // Show event participations with permissions
  const participations = await sql`
    SELECT ep.event_id, e.name, ep.permissions
    FROM event_participants ep
    JOIN events e ON ep.event_id = e.id
    WHERE ep.user_id = ${user.id}
  `;
  console.log("\n=== EVENT PARTICIPATIONS ===");
  for (const p of participations) {
    const perms = p.permissions as Record<string, string> || {};
    console.log(`  Event: ${p.name} (${p.event_id}) — tasks: ${perms.tasks || "none"}, finances: ${perms.finances || "none"}`);
  }

  // Show task_participants for this user
  const taskParts = await sql`
    SELECT tp.task_id, t.title
    FROM task_participants tp
    JOIN tasks t ON tp.task_id = t.id
    WHERE tp.user_id = ${user.id}
  `;
  console.log(`\n=== TASK PARTICIPATIONS (${taskParts.length}) ===`);
  for (const tp of taskParts) {
    console.log(`  [${tp.task_id}] "${tp.title}"`);
  }

  // Show tasks assigned to or created by this user
  const ownTasks = await sql`
    SELECT id, title, assigned_to, created_by
    FROM tasks
    WHERE (assigned_to = ${user.id} OR created_by = ${user.id})
      AND organization_id = ${mem.organization_id}
  `;
  console.log(`\n=== TASKS ASSIGNED/CREATED BY USER (${ownTasks.length}) ===`);
  for (const t of ownTasks) {
    const rel = [];
    if (t.assigned_to === user.id) rel.push("assigned");
    if (t.created_by === user.id) rel.push("created");
    console.log(`  [${t.id}] "${t.title}" (${rel.join(", ")})`);
  }

  // NEW FILTER: Simulate the updated query
  console.log("\n=== NEW FILTER: GET /api/tasks (participation-based) ===");
  const tasks = await sql`
    SELECT t.id, t.title, t.event_id, e.name as event_name
    FROM tasks t
    LEFT JOIN events e ON t.event_id = e.id
    WHERE t.organization_id = ${mem.organization_id}
      AND (
        t.event_id IN (
          SELECT ep.event_id FROM event_participants ep
          WHERE ep.user_id = ${user.id}
            AND ep.permissions->>'tasks' = 'edit'
        )
        OR t.id IN (
          SELECT tp.task_id FROM task_participants tp
          WHERE tp.user_id = ${user.id}
        )
        OR t.assigned_to = ${user.id}
        OR t.created_by = ${user.id}
      )
    ORDER BY t.created_at DESC
  `;
  console.log(`Tasks returned: ${tasks.length}`);
  for (const t of tasks) {
    console.log(`  [${t.id}] "${t.title}" — event: ${t.event_name} (${t.event_id})`);
  }

  // Compare with OLD filter
  console.log("\n=== OLD FILTER (for comparison) ===");
  const oldTasks = await sql`
    SELECT t.id, t.title, t.event_id, e.name as event_name
    FROM tasks t
    LEFT JOIN events e ON t.event_id = e.id
    WHERE t.organization_id = ${mem.organization_id}
      AND t.event_id IN (
        SELECT ep.event_id FROM event_participants ep
        WHERE ep.user_id = ${user.id}
          AND ep.permissions->>'tasks' IS NOT NULL
          AND ep.permissions->>'tasks' != 'none'
      )
    ORDER BY t.created_at DESC
  `;
  console.log(`Tasks returned: ${oldTasks.length}`);
  console.log(`\n=== SUMMARY ===`);
  console.log(`OLD filter: ${oldTasks.length} tasks (ALL event tasks)`);
  console.log(`NEW filter: ${tasks.length} tasks (only participant/assigned/created)`);
  console.log(`Blocked: ${oldTasks.length - tasks.length} tasks no longer visible`);

  process.exit(0);
}

simulate().catch(console.error);
