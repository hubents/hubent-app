/**
 * Fix Contact-Event Links — Idempotent script
 * For each contact that has a userId set, find all event_participants
 * with that contactId but missing userId, and update them.
 *
 * Usage: npx tsx scripts/fix-contact-event-links.ts
 */

import { db } from "../src/db";
import { contacts, eventParticipants } from "../src/db/schema";
import { eq, and, isNull, isNotNull } from "drizzle-orm";

async function main() {
  console.log("🔧 Fixing contact → event_participants userId links\n");

  // Find all contacts that have a userId linked
  const linkedContacts = await db
    .select({ id: contacts.id, userId: contacts.userId, name: contacts.name })
    .from(contacts)
    .where(isNotNull(contacts.userId));

  console.log(`Found ${linkedContacts.length} contacts with userId linked`);

  let totalFixed = 0;

  for (const contact of linkedContacts) {
    if (!contact.userId) continue;

    // Find event_participants for this contact that are missing userId
    const unlinked = await db
      .select({ id: eventParticipants.id, eventId: eventParticipants.eventId })
      .from(eventParticipants)
      .where(
        and(
          eq(eventParticipants.contactId, contact.id),
          isNull(eventParticipants.userId)
        )
      );

    if (unlinked.length > 0) {
      await db.update(eventParticipants)
        .set({ userId: contact.userId, acceptedAt: new Date() })
        .where(
          and(
            eq(eventParticipants.contactId, contact.id),
            isNull(eventParticipants.userId)
          )
        );

      console.log(`  ✅ Contact "${contact.name}" (${contact.id}): linked ${unlinked.length} event_participants`);
      totalFixed += unlinked.length;
    }
  }

  console.log(`\n🎉 Done! Fixed ${totalFixed} event_participants records.`);
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Script failed:", err);
  process.exit(1);
});
