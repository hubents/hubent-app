import "dotenv/config";

/**
 * Removes auto-added task_participants entries for collaborations with scope="participant".
 * These entries were created by the old auto-add logic before the scope feature was added.
 *
 * Criteria: task_participants.collaboratorOrgId = guestOrg AND task belongs to host org (not guest).
 */

import { db } from "@/db";
import { eventCollaborations, taskParticipants, tasks } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

async function main() {
  console.log("\n=== Cleanup auto-added task_participants for participant-scope collabs ===\n");

  const activeCollabs = await db
    .select({
      id: eventCollaborations.id,
      eventId: eventCollaborations.eventId,
      guestOrgId: eventCollaborations.guestOrgId,
      permissions: eventCollaborations.permissions,
    })
    .from(eventCollaborations)
    .where(eq(eventCollaborations.status, "active"));

  let totalDeleted = 0;

  for (const c of activeCollabs) {
    const perms = (c.permissions || {}) as Record<string, string>;
    if (perms.scope !== "participant") continue;
    if (!c.guestOrgId) continue;

    const autoAdded = await db
      .select({ tpId: taskParticipants.id, taskId: taskParticipants.taskId })
      .from(taskParticipants)
      .innerJoin(tasks, eq(tasks.id, taskParticipants.taskId))
      .where(
        and(
          eq(taskParticipants.collaboratorOrgId, c.guestOrgId),
          eq(tasks.eventId, c.eventId),
          sql`${tasks.organizationId} != ${c.guestOrgId}`,
        ),
      );

    if (autoAdded.length === 0) continue;

    console.log(`collabId=${c.id} eventId=${c.eventId} guestOrgId=${c.guestOrgId}: removing ${autoAdded.length} auto-added entries`);

    for (const entry of autoAdded) {
      await db.delete(taskParticipants).where(eq(taskParticipants.id, entry.tpId));
    }
    totalDeleted += autoAdded.length;
  }

  console.log(`\nTotal deleted: ${totalDeleted}\n`);
  process.exit(0);
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
