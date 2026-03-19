import "dotenv/config";
import { db } from "../src/db";
import { providerEventAccess, eventParticipants, vendors, events, organizations } from "../src/db/schema";
import { eq, and } from "drizzle-orm";

const DEFAULT_VENDOR_PERMISSIONS = {
  general: "view" as const,
  tasks: "view" as const,
  guests: "none" as const,
  rsvp: "none" as const,
  vendors: "view" as const,
  finances: "none" as const,
  settings: "none" as const,
};

async function main() {
  const applyMode = process.argv.includes("--apply");
  console.log(`\n🔍 Mode: ${applyMode ? "APPLY (will create missing records)" : "DRY-RUN (report only)"}\n`);

  // Get all active provider_event_access records
  const activeAccess = await db
    .select({
      id: providerEventAccess.id,
      providerOrgId: providerEventAccess.providerOrgId,
      eventId: providerEventAccess.eventId,
      vendorId: providerEventAccess.vendorId,
      invitedBy: providerEventAccess.invitedBy,
      plannerOrgId: providerEventAccess.plannerOrgId,
    })
    .from(providerEventAccess)
    .where(eq(providerEventAccess.status, "active"));

  console.log(`Found ${activeAccess.length} active provider_event_access records\n`);

  let missing = 0;
  let existing = 0;
  let created = 0;
  let skippedNoVendor = 0;

  for (const access of activeAccess) {
    if (!access.vendorId) {
      skippedNoVendor++;
      console.log(`  ⚠️  PEA #${access.id} | eventId=${access.eventId} | providerOrgId=${access.providerOrgId} → NO vendorId, skipped`);
      continue;
    }

    // Check if event_participants record exists for this vendor+event
    const [existingParticipant] = await db
      .select({ id: eventParticipants.id })
      .from(eventParticipants)
      .where(
        and(
          eq(eventParticipants.eventId, access.eventId),
          eq(eventParticipants.vendorId, access.vendorId)
        )
      )
      .limit(1);

    if (existingParticipant) {
      existing++;
      continue;
    }

    // Fetch names for logging
    const [event] = await db
      .select({ name: events.name })
      .from(events)
      .where(eq(events.id, access.eventId))
      .limit(1);

    const [vendor] = await db
      .select({ name: vendors.name })
      .from(vendors)
      .where(eq(vendors.id, access.vendorId))
      .limit(1);

    const [providerOrg] = await db
      .select({ name: organizations.name })
      .from(organizations)
      .where(eq(organizations.id, access.providerOrgId))
      .limit(1);

    console.log(`  ❌ MISSING | eventId=${access.eventId} (${event?.name || "?"}) | vendorId=${access.vendorId} (${vendor?.name || "?"}) | providerOrg=${providerOrg?.name || "?"}`);
    missing++;

    if (applyMode) {
      await db.insert(eventParticipants).values({
        eventId: access.eventId,
        vendorId: access.vendorId,
        type: "vendor",
        role: "vendor",
        permissions: DEFAULT_VENDOR_PERMISSIONS,
        invitedBy: access.invitedBy,
      });
      created++;
      console.log(`    ✅ Created event_participant`);
    }
  }

  console.log(`\n📊 Summary:`);
  console.log(`  Total active PEA records: ${activeAccess.length}`);
  console.log(`  Already have event_participant: ${existing}`);
  console.log(`  Missing event_participant: ${missing}`);
  console.log(`  Skipped (no vendorId): ${skippedNoVendor}`);
  if (applyMode) {
    console.log(`  Created: ${created}`);
  } else if (missing > 0) {
    console.log(`\n💡 Run with --apply to create missing records`);
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Script failed:", err);
  process.exit(1);
});
