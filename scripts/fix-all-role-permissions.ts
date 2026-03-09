/**
 * Fix All Role Permissions — Idempotent script
 * Updates permissions for eventScoped roles (client, assistant, viewer) and accountant
 * to match the new seed-roles.ts configuration.
 *
 * Safe to run multiple times. Uses onConflictDoNothing for role_permissions inserts.
 *
 * Usage: npx tsx scripts/fix-all-role-permissions.ts
 */

import { db } from "../src/db";
import { roles, permissions, rolePermissions } from "../src/db/schema";
import { eq } from "drizzle-orm";

const ROLE_PERMISSION_UPDATES: Record<string, string[]> = {
  client: [
    "events:read", "events:update",
    "tasks:read", "tasks:comment",
    "vendors:read",
    "guests:read", "guests:manage",
    "finance:read",
  ],
  assistant: [
    "events:read", "events:update",
    "tasks:read", "tasks:create", "tasks:update", "tasks:comment",
    "vendors:read",
    "clients:read",
    "guests:read", "guests:manage",
    "finance:read",
  ],
  viewer: [
    "events:read",
    "tasks:read",
    "vendors:read",
    "clients:read",
    "guests:read",
    "finance:read",
  ],
  accountant: [
    "events:read",
    "finance:read", "finance:create", "finance:manage",
    "clients:read",
    "vendors:read",
  ],
};

async function main() {
  console.log("🔧 Fixing role permissions for: client, assistant, viewer, accountant\n");

  // Load all permissions
  const allPerms = await db.select({ id: permissions.id, slug: permissions.slug }).from(permissions);
  const permMap = new Map(allPerms.map(p => [p.slug, p.id]));
  console.log(`Found ${allPerms.length} permissions in DB`);

  for (const [roleSlug, permSlugs] of Object.entries(ROLE_PERMISSION_UPDATES)) {
    console.log(`\n--- Role: ${roleSlug} ---`);

    const role = await db.query.roles.findFirst({
      where: eq(roles.slug, roleSlug),
    });

    if (!role) {
      console.log(`  ⚠️  Role "${roleSlug}" not found in DB, skipping`);
      continue;
    }

    console.log(`  Role ID: ${role.id}`);

    let added = 0;
    let skipped = 0;

    for (const permSlug of permSlugs) {
      const permId = permMap.get(permSlug);
      if (!permId) {
        console.log(`  ⚠️  Permission "${permSlug}" not found in DB`);
        continue;
      }

      try {
        await db.insert(rolePermissions).values({
          roleId: role.id,
          permissionId: permId,
        }).onConflictDoNothing();
        added++;
      } catch {
        skipped++;
      }
    }

    console.log(`  ✅ ${added} permissions ensured, ${skipped} errors`);
  }

  console.log("\n🎉 Done! All role permissions updated.");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Script failed:", err);
  process.exit(1);
});
