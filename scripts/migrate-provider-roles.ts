/**
 * migrate-provider-roles.ts
 *
 * One-time migration: rename provider-specific role slugs to unified roles.
 *   provider_owner → owner
 *   provider_admin → admin
 *   provider_tech  → staff
 *   planner        → manager
 *   assistant      → staff
 *
 * Safe to run multiple times (idempotent — skips if target slug already has rows).
 * Memberships reference roleId (not slug), so users keep their access.
 *
 * After running this, run: npx tsx scripts/hard-reset-permissions.ts
 *
 * Usage: npx tsx scripts/migrate-provider-roles.ts
 */

import { db } from "../src/db";
import { roles } from "../src/db/schema";
import { eq, and, isNull } from "drizzle-orm";

const ROLE_RENAMES: Array<{ from: string; to: string; newName: string }> = [
  { from: "provider_owner", to: "owner", newName: "Owner" },
  { from: "provider_admin", to: "admin", newName: "Admin" },
  { from: "provider_tech", to: "staff", newName: "Staff" },
  { from: "planner", to: "manager", newName: "Manager" },
  { from: "assistant", to: "staff", newName: "Staff" },
];

async function main() {
  console.log("=== MIGRATE PROVIDER ROLES TO UNIFIED ROLES ===\n");

  for (const { from, to, newName } of ROLE_RENAMES) {
    // Find source role (system-level, organizationId IS NULL)
    const sourceRole = await db.query.roles.findFirst({
      where: and(eq(roles.slug, from), isNull(roles.organizationId)),
    });

    if (!sourceRole) {
      console.log(`  SKIP: "${from}" not found (already migrated or never existed)`);
      continue;
    }

    // Check if target role already exists
    const targetRole = await db.query.roles.findFirst({
      where: and(eq(roles.slug, to), isNull(roles.organizationId)),
    });

    if (targetRole && targetRole.id !== sourceRole.id) {
      // Target exists as a separate row — merge memberships from source into target
      // Update all organizationMembers pointing to sourceRole to use targetRole
      const { organizationMembers } = await import("../src/db/schema");
      const updated = await db
        .update(organizationMembers)
        .set({ roleId: targetRole.id })
        .where(eq(organizationMembers.roleId, sourceRole.id))
        .returning();

      console.log(`  MERGE: "${from}" (id=${sourceRole.id}) → "${to}" (id=${targetRole.id}): ${updated.length} memberships moved`);

      // Also update invitation roleId references
      const { invitations } = await import("../src/db/schema");
      const updatedInvites = await db
        .update(invitations)
        .set({ roleId: targetRole.id })
        .where(eq(invitations.roleId, sourceRole.id))
        .returning();

      if (updatedInvites.length > 0) {
        console.log(`         ${updatedInvites.length} invitations updated`);
      }

      // Delete the now-orphaned source role
      await db.delete(roles).where(eq(roles.id, sourceRole.id));
      console.log(`         Deleted orphan role "${from}" (id=${sourceRole.id})`);
    } else if (!targetRole) {
      // No target exists — just rename the source
      await db
        .update(roles)
        .set({ slug: to, name: newName })
        .where(eq(roles.id, sourceRole.id));

      console.log(`  RENAME: "${from}" (id=${sourceRole.id}) → "${to}"`);
    } else {
      // sourceRole IS targetRole (same id) — already correct
      console.log(`  OK: "${from}" already is "${to}" (id=${sourceRole.id})`);
    }
  }

  // Ensure eventScoped is correct for the new role names
  const eventScopedSlugs = ["staff", "viewer", "client"];
  console.log("\nEnsuring eventScoped flags...");
  for (const slug of eventScopedSlugs) {
    const role = await db.query.roles.findFirst({
      where: and(eq(roles.slug, slug), isNull(roles.organizationId)),
    });
    if (role && !role.eventScoped) {
      await db.update(roles).set({ eventScoped: true }).where(eq(roles.id, role.id));
      console.log(`  SET eventScoped=true for "${slug}"`);
    }
  }

  // Ensure non-eventScoped roles are correct
  const nonEventScopedSlugs = ["owner", "admin", "manager", "accountant"];
  for (const slug of nonEventScopedSlugs) {
    const role = await db.query.roles.findFirst({
      where: and(eq(roles.slug, slug), isNull(roles.organizationId)),
    });
    if (role && role.eventScoped) {
      await db.update(roles).set({ eventScoped: false }).where(eq(roles.id, role.id));
      console.log(`  SET eventScoped=false for "${slug}"`);
    }
  }

  console.log("\n=== DONE ===");
  console.log("Next steps:");
  console.log("  1. npx tsx scripts/hard-reset-permissions.ts");
  console.log("  2. Verify with: npx tsx scripts/diagnose-tenant-permissions.ts");

  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
