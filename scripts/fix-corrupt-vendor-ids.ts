import "dotenv/config";

/**
 * Finds and fixes task_participants entries where vendorId was incorrectly set
 * to organizations.id instead of the actual vendors.id. This was caused by the
 * old ParticipantSelector bug that passed org IDs as vendor IDs.
 *
 * Detection: vendorId matches an organizations.id AND the vendor at that ID
 * has a different providerOrgId (or none), meaning it's the wrong vendor.
 */

import { db } from "@/db";
import { taskParticipants, vendors, tasks, organizations } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";

const isDryRun = !process.argv.includes("--apply");

async function main() {
  console.log(`\n=== Fix Corrupt Vendor IDs ${isDryRun ? "(DRY RUN)" : "(APPLYING)"} ===\n`);

  const allWithVendor = await db
    .select({
      tpId: taskParticipants.id,
      taskId: taskParticipants.taskId,
      vendorId: taskParticipants.vendorId,
      vendorName: vendors.name,
      vendorProviderOrgId: vendors.providerOrgId,
    })
    .from(taskParticipants)
    .innerJoin(vendors, eq(vendors.id, taskParticipants.vendorId))
    .where(sql`${taskParticipants.vendorId} IS NOT NULL`);

  let fixed = 0;
  let removed = 0;

  for (const entry of allWithVendor) {
    if (!entry.vendorId) continue;

    // Check if this vendorId also matches an organizations.id
    const matchingOrg = await db.query.organizations.findFirst({
      where: eq(organizations.id, entry.vendorId),
      columns: { id: true, name: true, orgType: true },
    });

    if (!matchingOrg) continue;

    // vendorId coincides with an org ID. Check if the vendor is actually linked to that org.
    if (entry.vendorProviderOrgId === matchingOrg.id) continue;

    // Corrupt! vendorId points to a vendor for a different provider, but the ID matches an org.
    // Find the correct vendor for that org in the task's host organization.
    const task = await db.query.tasks.findFirst({
      where: eq(tasks.id, entry.taskId),
      columns: { organizationId: true },
    });

    if (!task) continue;

    const correctVendor = await db.query.vendors.findFirst({
      where: and(
        eq(vendors.organizationId, task.organizationId),
        eq(vendors.providerOrgId, matchingOrg.id),
      ),
      columns: { id: true, name: true },
    });

    if (correctVendor) {
      console.log(`[FIX] tpId=${entry.tpId} taskId=${entry.taskId}: vendorId ${entry.vendorId} ("${entry.vendorName}") -> ${correctVendor.id} ("${correctVendor.name}") [was org "${matchingOrg.name}"]`);
      if (!isDryRun) {
        await db.update(taskParticipants)
          .set({ vendorId: correctVendor.id })
          .where(eq(taskParticipants.id, entry.tpId));
      }
      fixed++;
    } else {
      console.log(`[REMOVE] tpId=${entry.tpId} taskId=${entry.taskId}: vendorId ${entry.vendorId} ("${entry.vendorName}") points to org "${matchingOrg.name}" but no CRM vendor exists`);
      if (!isDryRun) {
        await db.delete(taskParticipants).where(eq(taskParticipants.id, entry.tpId));
      }
      removed++;
    }
  }

  console.log(`\nFixed: ${fixed}, Removed: ${removed}`);
  if (isDryRun) console.log("Run with --apply to execute changes.");
  console.log();
  process.exit(0);
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
