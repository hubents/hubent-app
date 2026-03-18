import "dotenv/config";

/**
 * fix-provider-task-participants.ts
 * 
 * Repairs existing data: ensures all active provider event access records
 * have a vendorId and that vendors are linked as task_participants to event tasks.
 * 
 * Usage:
 *   npx tsx scripts/fix-provider-task-participants.ts          # dry-run
 *   npx tsx scripts/fix-provider-task-participants.ts --apply   # apply changes
 */

import { db } from "@/db";
import { providerEventAccess, vendors, tasks, taskParticipants, organizations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { ensureVendorForProviderOrg } from "@/lib/cross-org";

const isDryRun = !process.argv.includes("--apply");

async function main() {
  console.log(`\n=== Fix Provider Task Participants ${isDryRun ? "(DRY RUN)" : "(APPLYING)"} ===\n`);

  // Get all active provider event access records
  const accessRecords = await db
    .select()
    .from(providerEventAccess)
    .where(eq(providerEventAccess.status, "active"));

  console.log(`Found ${accessRecords.length} active providerEventAccess records\n`);

  let totalFixed = 0;
  let totalLinked = 0;
  let totalSkipped = 0;

  for (const access of accessRecords) {
    let vendorId = access.vendorId;

    // Fix null vendorId
    if (!vendorId) {
      console.log(`[FIX] accessId=${access.id} eventId=${access.eventId} providerOrgId=${access.providerOrgId}: vendorId is NULL`);

      // Get owner of planner org for createdBy
      const plannerOrg = await db.query.organizations.findFirst({
        where: eq(organizations.id, access.plannerOrgId),
        columns: { ownerId: true },
      });

      if (!plannerOrg?.ownerId) {
        console.log(`  SKIP: plannerOrg ${access.plannerOrgId} has no owner`);
        totalSkipped++;
        continue;
      }

      if (!isDryRun) {
        try {
          vendorId = await ensureVendorForProviderOrg(
            access.plannerOrgId,
            access.providerOrgId,
            plannerOrg.ownerId
          );

          // Update the access record with the vendorId
          await db
            .update(providerEventAccess)
            .set({ vendorId })
            .where(eq(providerEventAccess.id, access.id));

          console.log(`  FIXED: vendorId=${vendorId}`);
          totalFixed++;
        } catch (err) {
          console.error(`  ERROR fixing vendorId:`, err);
          totalSkipped++;
          continue;
        }
      } else {
        console.log(`  WOULD FIX: create vendor for providerOrg=${access.providerOrgId} in plannerOrg=${access.plannerOrgId}`);
        totalFixed++;
        continue; // Can't link tasks without a real vendorId in dry run
      }
    }

    // Get all tasks in this event
    const eventTasks = await db
      .select({ id: tasks.id })
      .from(tasks)
      .where(eq(tasks.eventId, access.eventId));

    for (const task of eventTasks) {
      const existing = await db.query.taskParticipants.findFirst({
        where: and(
          eq(taskParticipants.taskId, task.id),
          eq(taskParticipants.vendorId, vendorId!)
        ),
      });

      if (existing) {
        totalSkipped++;
        continue;
      }

      console.log(`[LINK] taskId=${task.id} eventId=${access.eventId} vendorId=${vendorId}`);

      if (!isDryRun) {
        const plannerOrg = await db.query.organizations.findFirst({
          where: eq(organizations.id, access.plannerOrgId),
          columns: { ownerId: true },
        });

        await db.insert(taskParticipants).values({
          taskId: task.id,
          vendorId: vendorId!,
          type: "vendor",
          canEdit: false,
          canComment: true,
          addedBy: plannerOrg?.ownerId || null,
        });
        console.log(`  LINKED`);
      } else {
        console.log(`  WOULD LINK`);
      }
      totalLinked++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`  Vendor IDs fixed: ${totalFixed}`);
  console.log(`  Task participants linked: ${totalLinked}`);
  console.log(`  Skipped (already exists): ${totalSkipped}`);
  if (isDryRun) {
    console.log(`\n  Run with --apply to execute changes.`);
  }
  console.log();

  process.exit(0);
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
