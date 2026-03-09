/**
 * Fix Client Role Permissions
 * Removes tasks:create and tasks:update from the client role.
 * The client role should not have org-level task editing permissions;
 * task access is controlled via event_participants.permissions.tasks.
 *
 * Safe to run multiple times (idempotent).
 *
 * Usage: npx tsx scripts/fix-client-role-permissions.ts
 */

import { db } from "../src/db";
import { roles, permissions, rolePermissions } from "../src/db/schema";
import { eq, and } from "drizzle-orm";

const PERMISSIONS_TO_REMOVE = ["tasks:create", "tasks:update"];

async function main() {
  console.log("🔧 Removing tasks:create and tasks:update from client role\n");

  const role = await db.query.roles.findFirst({
    where: eq(roles.slug, "client"),
  });

  if (!role) {
    console.log("⚠️  Client role not found in DB");
    process.exit(1);
  }

  console.log(`Client role ID: ${role.id}`);

  const allPerms = await db.select({ id: permissions.id, slug: permissions.slug }).from(permissions);
  const permMap = new Map(allPerms.map(p => [p.slug, p.id]));

  let removed = 0;

  for (const permSlug of PERMISSIONS_TO_REMOVE) {
    const permId = permMap.get(permSlug);
    if (!permId) {
      console.log(`  ⚠️  Permission "${permSlug}" not found in DB, skipping`);
      continue;
    }

    const result = await db.delete(rolePermissions)
      .where(
        and(
          eq(rolePermissions.roleId, role.id),
          eq(rolePermissions.permissionId, permId)
        )
      );

    console.log(`  ✅ Removed "${permSlug}" from client role`);
    removed++;
  }

  console.log(`\n🎉 Done! Removed ${removed} permissions from client role.`);
  console.log("Client role now has: events:read, events:update, tasks:read, tasks:comment, vendors:read, guests:read, guests:manage, finance:read");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ Script failed:", err);
  process.exit(1);
});
