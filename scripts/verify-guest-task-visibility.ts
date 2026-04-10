import "dotenv/config";

/**
 * verify-guest-task-visibility.ts
 *
 * Post-migration verification script. Checks:
 *   1. All event_collaborations have a scope field
 *   2. No task_participants.vendorId points to a non-existent vendor
 *   3. All active provider_event_access have a matching event_collaborations
 *   4. Guests with scope="participant" don't have stale auto-added entries
 *
 * Usage:
 *   npx tsx scripts/verify-guest-task-visibility.ts
 */

import { db } from "@/db";
import {
  eventCollaborations,
  providerEventAccess,
  taskParticipants,
  tasks,
  vendors,
  organizations,
} from "@/db/schema";
import { eq, and, isNotNull, sql } from "drizzle-orm";

async function main() {
  console.log("\n=== Verify Guest Task Visibility ===\n");

  let issues = 0;

  // Check 1: All collaborations have scope
  console.log("--- Check 1: event_collaborations with missing scope ---");
  const allCollabs = await db
    .select({
      id: eventCollaborations.id,
      eventId: eventCollaborations.eventId,
      guestOrgId: eventCollaborations.guestOrgId,
      permissions: eventCollaborations.permissions,
      status: eventCollaborations.status,
    })
    .from(eventCollaborations);

  let missingScope = 0;
  for (const c of allCollabs) {
    const perms = (c.permissions || {}) as Record<string, string>;
    if (!perms.scope) {
      console.log(`  [WARN] collabId=${c.id} eventId=${c.eventId} guestOrgId=${c.guestOrgId}: missing scope`);
      missingScope++;
    }
  }
  console.log(`  ${missingScope === 0 ? "OK" : `${missingScope} issues found`}\n`);
  issues += missingScope;

  // Check 2: task_participants.vendorId validity
  console.log("--- Check 2: task_participants with invalid vendorId ---");
  const participantsWithVendor = await db
    .select({
      id: taskParticipants.id,
      vendorId: taskParticipants.vendorId,
      taskId: taskParticipants.taskId,
    })
    .from(taskParticipants)
    .where(isNotNull(taskParticipants.vendorId));

  const allVendors = await db.select({ id: vendors.id }).from(vendors);
  const validVendorIds = new Set(allVendors.map((v) => v.id));

  let invalidVendors = 0;
  for (const p of participantsWithVendor) {
    if (p.vendorId && !validVendorIds.has(p.vendorId)) {
      console.log(`  [WARN] participantId=${p.id} taskId=${p.taskId}: vendorId=${p.vendorId} not in vendors table`);
      invalidVendors++;
    }
  }
  console.log(`  ${invalidVendors === 0 ? "OK" : `${invalidVendors} issues found`}\n`);
  issues += invalidVendors;

  // Check 3: provider_event_access without event_collaborations
  console.log("--- Check 3: active provider_event_access without event_collaborations ---");
  const legacyRows = await db
    .select({
      id: providerEventAccess.id,
      eventId: providerEventAccess.eventId,
      providerOrgId: providerEventAccess.providerOrgId,
    })
    .from(providerEventAccess)
    .where(eq(providerEventAccess.status, "active"));

  let missingCollab = 0;
  for (const legacy of legacyRows) {
    if (!legacy.providerOrgId) continue;
    const collab = await db.query.eventCollaborations.findFirst({
      where: and(
        eq(eventCollaborations.eventId, legacy.eventId),
        eq(eventCollaborations.guestOrgId, legacy.providerOrgId),
      ),
    });
    if (!collab) {
      console.log(`  [WARN] providerEventAccessId=${legacy.id} eventId=${legacy.eventId} providerOrgId=${legacy.providerOrgId}: no event_collaborations`);
      missingCollab++;
    }
  }
  console.log(`  ${missingCollab === 0 ? "OK" : `${missingCollab} issues found`}\n`);
  issues += missingCollab;

  // Check 4: Guests with scope="participant" visibility summary
  console.log("--- Check 4: Guest visibility summary ---");
  const activeCollabs = allCollabs.filter((c) => c.status === "active" && c.guestOrgId);

  for (const c of activeCollabs) {
    const perms = (c.permissions || {}) as Record<string, string>;
    const scope = perms.scope || "full";

    const [totalTasksResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(tasks)
      .where(eq(tasks.eventId, c.eventId));

    const [participantTasksResult] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(taskParticipants)
      .innerJoin(tasks, eq(tasks.id, taskParticipants.taskId))
      .where(
        and(
          eq(tasks.eventId, c.eventId),
          eq(taskParticipants.collaboratorOrgId, c.guestOrgId!),
        ),
      );

    const totalTasks = totalTasksResult?.count || 0;
    const visibleTasks = participantTasksResult?.count || 0;

    const orgName = await db.query.organizations.findFirst({
      where: eq(organizations.id, c.guestOrgId!),
      columns: { name: true },
    });

    const flag = scope === "participant" && visibleTasks === totalTasks && totalTasks > 0 ? " [SUSPICIOUS]" : "";
    console.log(`  eventId=${c.eventId} guest="${orgName?.name}" scope=${scope}: ${visibleTasks}/${totalTasks} tasks visible${flag}`);
  }

  console.log(`\n=== Verification complete: ${issues} total issues ===\n`);

  process.exit(issues > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
