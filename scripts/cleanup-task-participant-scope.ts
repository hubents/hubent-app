import "dotenv/config";

/**
 * cleanup-task-participant-scope.ts
 *
 * Migrates existing data after the scope feature is added to event_collaborations.permissions.
 *
 * Actions:
 *   1. Add scope: "full" to all event_collaborations that don't have it (backward compat)
 *   2. Fix task_participants with incorrect vendorId (org ID used instead of vendor ID)
 *   3. Create event_collaborations for provider_event_access rows missing them
 *
 * Usage:
 *   npx tsx scripts/cleanup-task-participant-scope.ts          # dry-run
 *   npx tsx scripts/cleanup-task-participant-scope.ts --apply   # apply changes
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

const isDryRun = !process.argv.includes("--apply");

async function main() {
  console.log(`\n=== Cleanup Task Participant Scope ${isDryRun ? "(DRY RUN)" : "(APPLYING)"} ===\n`);

  await step1_addScopeToCollaborations();
  await step2_fixIncorrectVendorIds();
  await step3_createMissingCollaborations();

  if (isDryRun) {
    console.log(`\nRun with --apply to execute changes.\n`);
  }

  process.exit(0);
}

async function step1_addScopeToCollaborations() {
  console.log("--- Step 1: Add scope to existing event_collaborations ---");

  const allCollabs = await db
    .select({
      id: eventCollaborations.id,
      permissions: eventCollaborations.permissions,
    })
    .from(eventCollaborations);

  let updated = 0;
  for (const c of allCollabs) {
    const perms = (c.permissions || {}) as Record<string, string>;
    if (perms.scope) continue;

    const newPerms = { scope: "full" as const, ...perms };
    console.log(`  [UPDATE] collabId=${c.id}: adding scope="full"`);

    if (!isDryRun) {
      await db
        .update(eventCollaborations)
        .set({ permissions: newPerms as typeof eventCollaborations.$inferInsert.permissions })
        .where(eq(eventCollaborations.id, c.id));
    }
    updated++;
  }

  console.log(`  Total: ${updated} collaborations ${isDryRun ? "would be" : ""} updated\n`);
}

async function step2_fixIncorrectVendorIds() {
  console.log("--- Step 2: Fix task_participants with incorrect vendorId ---");

  const participantsWithVendor = await db
    .select({
      id: taskParticipants.id,
      vendorId: taskParticipants.vendorId,
      taskId: taskParticipants.taskId,
    })
    .from(taskParticipants)
    .where(isNotNull(taskParticipants.vendorId));

  const allVendorIds = await db
    .select({ id: vendors.id })
    .from(vendors);
  const validVendorIds = new Set(allVendorIds.map((v) => v.id));

  let fixed = 0;
  let removed = 0;

  for (const p of participantsWithVendor) {
    if (!p.vendorId) continue;
    if (validVendorIds.has(p.vendorId)) continue;

    // vendorId doesn't exist in vendors table -- likely an org ID
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, p.vendorId),
      columns: { id: true, name: true, orgType: true },
    });

    if (org) {
      // Find if there's a real vendor for this org in the task's tenant
      const task = await db.query.tasks.findFirst({
        where: eq(tasks.id, p.taskId),
        columns: { organizationId: true },
      });

      if (task) {
        const realVendor = await db.query.vendors.findFirst({
          where: and(
            eq(vendors.organizationId, task.organizationId),
            eq(vendors.providerOrgId, org.id),
          ),
          columns: { id: true },
        });

        if (realVendor) {
          console.log(`  [FIX] participantId=${p.id} taskId=${p.taskId}: vendorId ${p.vendorId} (org "${org.name}") -> ${realVendor.id} (real vendor)`);
          if (!isDryRun) {
            await db
              .update(taskParticipants)
              .set({ vendorId: realVendor.id })
              .where(eq(taskParticipants.id, p.id));
          }
          fixed++;
        } else {
          console.log(`  [REMOVE] participantId=${p.id} taskId=${p.taskId}: vendorId ${p.vendorId} points to org "${org.name}" with no vendor CRM entry`);
          if (!isDryRun) {
            await db
              .delete(taskParticipants)
              .where(eq(taskParticipants.id, p.id));
          }
          removed++;
        }
      }
    } else {
      console.log(`  [ORPHAN] participantId=${p.id}: vendorId ${p.vendorId} not in vendors or organizations`);
    }
  }

  console.log(`  Fixed: ${fixed}, Removed: ${removed}\n`);
}

async function step3_createMissingCollaborations() {
  console.log("--- Step 3: Create event_collaborations for legacy provider_event_access ---");

  const legacyRows = await db
    .select({
      id: providerEventAccess.id,
      eventId: providerEventAccess.eventId,
      providerOrgId: providerEventAccess.providerOrgId,
      plannerOrgId: providerEventAccess.plannerOrgId,
      status: providerEventAccess.status,
      invitedBy: providerEventAccess.invitedBy,
    })
    .from(providerEventAccess)
    .where(eq(providerEventAccess.status, "active"));

  let created = 0;
  let skipped = 0;

  for (const legacy of legacyRows) {
    if (!legacy.providerOrgId) {
      skipped++;
      continue;
    }

    const existing = await db.query.eventCollaborations.findFirst({
      where: and(
        eq(eventCollaborations.eventId, legacy.eventId),
        eq(eventCollaborations.guestOrgId, legacy.providerOrgId),
      ),
    });

    if (existing) {
      skipped++;
      continue;
    }

    console.log(`  [CREATE] eventId=${legacy.eventId} providerOrgId=${legacy.providerOrgId} plannerOrgId=${legacy.plannerOrgId}`);

    if (!isDryRun) {
      await db.insert(eventCollaborations).values({
        eventId: legacy.eventId,
        hostOrgId: legacy.plannerOrgId,
        guestOrgId: legacy.providerOrgId,
        permissions: {
          scope: "full",
          general: "view",
          calendar: "view",
          tasks: "view",
          partners: "none",
          finances: "none",
          rsvp: "none",
          guests: "none",
          runsheet: "none",
        },
        status: "active",
        invitedBy: legacy.invitedBy,
        acceptedAt: new Date(),
      });
    }
    created++;
  }

  console.log(`  Created: ${created}, Skipped: ${skipped}\n`);
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
