import { db } from "@/db";
import { vendors, organizations, eventVendors, providerEventAccess, tasks, taskParticipants } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Get the provider organization ID linked to a vendor record.
 * Returns null if the vendor is not linked to a provider org.
 */
export async function getProviderOrgForVendor(vendorId: number): Promise<number | null> {
  const vendor = await db.query.vendors.findFirst({
    where: eq(vendors.id, vendorId),
    columns: { providerOrgId: true },
  });
  return vendor?.providerOrgId ?? null;
}

/**
 * Get the local vendor record in a planner's org that represents a provider org.
 * Returns null if no link exists.
 */
export async function getVendorForProviderOrg(
  plannerOrgId: number,
  providerOrgId: number
): Promise<number | null> {
  const vendor = await db.query.vendors.findFirst({
    where: and(
      eq(vendors.organizationId, plannerOrgId),
      eq(vendors.providerOrgId, providerOrgId)
    ),
    columns: { id: true },
  });
  return vendor?.id ?? null;
}

/**
 * Check if a vendor record is linked to a Hubents provider organization.
 */
export async function isProviderOrg(vendorId: number): Promise<boolean> {
  const orgId = await getProviderOrgForVendor(vendorId);
  return orgId !== null;
}

/**
 * Ensure a local vendor record exists in the planner's org for a provider org.
 * If it doesn't exist, create one with the provider's data.
 * Returns the vendor ID.
 */
export async function ensureVendorForProviderOrg(
  plannerOrgId: number,
  providerOrgId: number,
  createdBy: string
): Promise<number> {
  // Check if vendor already exists
  const existingVendorId = await getVendorForProviderOrg(plannerOrgId, providerOrgId);
  if (existingVendorId) return existingVendorId;

  // Get provider org data
  const providerOrg = await db.query.organizations.findFirst({
    where: eq(organizations.id, providerOrgId),
    columns: {
      name: true,
      phone: true,
      website: true,
      address: true,
      providerCategory: true,
      fiscalEmail: true,
    },
  });

  if (!providerOrg) {
    throw new Error(`Provider organization ${providerOrgId} not found`);
  }

  // Create vendor record linked to provider org
  const [newVendor] = await db
    .insert(vendors)
    .values({
      organizationId: plannerOrgId,
      name: providerOrg.name,
      category: providerOrg.providerCategory || undefined,
      email: providerOrg.fiscalEmail || undefined,
      phone: providerOrg.phone || undefined,
      website: providerOrg.website || undefined,
      address: providerOrg.address || undefined,
      providerOrgId: providerOrgId,
      createdBy,
    })
    .returning();

  return newVendor.id;
}

/**
 * Ensure an eventVendors record exists linking a vendor to an event.
 * If it doesn't exist, create one.
 */
export async function ensureEventVendor(
  eventId: number,
  vendorId: number,
  service?: string | null
): Promise<void> {
  const existing = await db.query.eventVendors.findFirst({
    where: and(
      eq(eventVendors.eventId, eventId),
      eq(eventVendors.vendorId, vendorId)
    ),
  });

  if (existing) return;

  await db.insert(eventVendors).values({
    eventId,
    vendorId,
    service: service || undefined,
    status: "confirmed",
  });
}

/**
 * Ensure a providerEventAccess row exists for a provider org on an event.
 * If none exists, creates one with status 'active'.
 * Used when a vendor linked to a provider org gets task participation.
 */
export async function ensureProviderEventAccess(
  providerOrgId: number,
  eventId: number,
  plannerOrgId: number,
  invitedBy: string
): Promise<void> {
  const existing = await db.query.providerEventAccess.findFirst({
    where: and(
      eq(providerEventAccess.providerOrgId, providerOrgId),
      eq(providerEventAccess.eventId, eventId)
    ),
  });

  if (existing) return;

  const vendorId = await getVendorForProviderOrg(plannerOrgId, providerOrgId);

  await db.insert(providerEventAccess).values({
    providerOrgId,
    eventId,
    plannerOrgId,
    vendorId,
    status: "active",
    invitedBy,
    invitedAt: new Date(),
    acceptedAt: new Date(),
  });
}

/**
 * Get all provider event access records for a given provider org.
 */
export async function getProviderAccessForOrg(providerOrgId: number) {
  return db
    .select()
    .from(providerEventAccess)
    .where(eq(providerEventAccess.providerOrgId, providerOrgId));
}

/**
 * Auto-link a vendor to all existing tasks in an event as task_participant.
 * Skips tasks where the vendor is already a participant.
 * Returns counts for logging.
 */
export async function autoLinkVendorToEventTasks(
  eventId: number,
  vendorId: number,
  addedBy: string
): Promise<{ linked: number; skipped: number }> {
  const eventTasks = await db
    .select({ id: tasks.id })
    .from(tasks)
    .where(eq(tasks.eventId, eventId));

  let linked = 0;
  let skipped = 0;

  for (const task of eventTasks) {
    const existing = await db.query.taskParticipants.findFirst({
      where: and(
        eq(taskParticipants.taskId, task.id),
        eq(taskParticipants.vendorId, vendorId)
      ),
    });

    if (existing) {
      skipped++;
      continue;
    }

    await db.insert(taskParticipants).values({
      taskId: task.id,
      vendorId,
      type: "vendor",
      canEdit: false,
      canComment: true,
      addedBy,
    });
    linked++;
  }

  console.log(`[autoLinkVendor] eventId=${eventId} vendorId=${vendorId}: linked=${linked} skipped=${skipped}`);
  return { linked, skipped };
}
