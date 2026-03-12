/**
 * Cleanup Residual RBAC Issues
 * Resolves all remaining CRITICAL/WARNING items from the audit.
 * Run: npx tsx scripts/cleanup-residuals.ts
 */
import "dotenv/config";
import { db } from "../src/db";
import {
  organizations,
  organizationMembers,
  users,
  permissions,
  rolePermissions,
  contacts,
  accounts,
  sessions,
} from "../src/db/schema";
import { eq, and, inArray, notInArray } from "drizzle-orm";

const CANONICAL_SLUGS = [
  "events:read", "events:create", "events:update", "events:delete",
  "tasks:read", "tasks:create", "tasks:update", "tasks:delete",
  "vendors:read", "vendors:create", "vendors:update", "vendors:delete",
  "team:read", "team:invite", "team:manage",
  "finance:read", "finance:create", "finance:manage",
  "crm:read", "crm:manage",
  "settings:read", "settings:update",
  "forms:read", "forms:create", "forms:update", "forms:delete",
];

// Test/disposable email users to fully delete (membership + user)
const TEST_USER_IDS = [
  "4b89c007-ee2e-4ff5-99f5-ea0a7c44cb93", // 7dlsssacix@bwmyga.com
  "682e6413-249d-4489-84d7-b9e9318c491b", // 4w4r98khya@bltiwd.com
  "fad106ba-d87e-4847-b509-244be06f99a9", // wcrsfga6jr@xkxkud.com
  "aa48e7aa-ae6c-49d9-a7e2-fcd0dea72a17", // 3xr5ad046h@bltiwd.com
];

// Orphan users (no membership at all)
const ORPHAN_USER_IDS = [
  "a0cd6a69-8348-482e-b414-784d2f13c0be", // bogoji5603@creteanu.com
  "8dbfe265-9494-4d87-af43-dd7d935d1464", // yepot72153@bultoc.com
  "5fca7961-d52e-4a6f-917b-fb7bc13634c5", // idr.c.an95@gmail.com
];

// Real clients in org=4 with no events — remove membership only
const REAL_CLIENT_IDS_ORG4 = [
  "9f5c8007-9d32-494c-8d23-8faf91b8f0c0", // claudiavarelaruiz7@gmail.com
  "6fcdc377-e44c-4a9e-b488-c9c699673fe0", // fernando@sebcreativos.es
  "5bd24727-2407-41a7-829a-74e02cd54123", // claudiavarelavinted@gmail.com
  "c720205d-202c-4090-a591-ed57aeab1d56", // info@myeventiwedding.com
  "5772ac21-fe9d-4708-b4d7-238ae89fb1c0", // gemaclavedeluna@gmail.com
  "eedc26f3-29e7-445a-aa7d-2830491812ce", // ruizvarelaclaudia@gmail.com (also provider_owner of Decormania)
  "8169ca91-a307-4b56-a656-7db5e72ca76b", // fervergara4@hotmail.com
];

async function cleanup() {
  console.log("🧹 RBAC Residual Cleanup\n");

  // ── Paso 1: Delete org "Indhira" (id:12) ──
  console.log("── Paso 1: Borrar org Indhira (id:12) ──");
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, 12),
    columns: { id: true, name: true },
  });
  if (org) {
    await db.delete(organizationMembers).where(eq(organizationMembers.organizationId, 12));
    await db.delete(organizations).where(eq(organizations.id, 12));
    console.log(`  ✅ Org "${org.name}" (id:12) eliminada`);
  } else {
    console.log("  ⏭️  Org 12 ya no existe");
  }

  // ── Paso 2: Delete orphan users ──
  console.log("\n── Paso 2: Borrar 3 users huérfanos ──");
  for (const uid of ORPHAN_USER_IDS) {
    const u = await db.query.users.findFirst({
      where: eq(users.id, uid),
      columns: { id: true, email: true },
    });
    if (u) {
      await db.delete(users).where(eq(users.id, uid));
      console.log(`  ✅ User "${u.email}" eliminado`);
    } else {
      console.log(`  ⏭️  User ${uid} ya no existe`);
    }
  }

  // ── Paso 3: Delete test accounts (membership + user) ──
  console.log("\n── Paso 3: Borrar 4 test accounts (emails desechables) ──");
  for (const uid of TEST_USER_IDS) {
    const u = await db.query.users.findFirst({
      where: eq(users.id, uid),
      columns: { id: true, email: true },
    });
    if (u) {
      await db.delete(organizationMembers).where(eq(organizationMembers.userId, uid));
      await db.delete(contacts).where(eq(contacts.userId, uid));
      await db.delete(sessions).where(eq(sessions.userId, uid));
      await db.delete(accounts).where(eq(accounts.userId, uid));
      await db.delete(users).where(eq(users.id, uid));
      console.log(`  ✅ Test user "${u.email}" + membership + contacts eliminados`);
    } else {
      console.log(`  ⏭️  Test user ${uid} ya no existe`);
    }
  }

  // ── Paso 4: Remove client memberships from org=4 ──
  console.log("\n── Paso 4: Borrar 7 memberships de clientes reales en org=4 ──");
  for (const uid of REAL_CLIENT_IDS_ORG4) {
    const mem = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.userId, uid),
        eq(organizationMembers.organizationId, 4)
      ),
    });
    if (mem) {
      const u = await db.query.users.findFirst({
        where: eq(users.id, uid),
        columns: { email: true },
      });
      await db.delete(organizationMembers).where(
        and(
          eq(organizationMembers.userId, uid),
          eq(organizationMembers.organizationId, 4)
        )
      );
      console.log(`  ✅ Membership de "${u?.email}" en org=4 eliminada`);
    } else {
      console.log(`  ⏭️  Membership de ${uid} en org=4 ya no existe`);
    }
  }

  // ── Paso 5: Delete legacy permissions ──
  console.log("\n── Paso 5: Borrar permisos legacy no canónicos ──");
  const allPerms = await db.select().from(permissions);
  const legacy = allPerms.filter((p) => !CANONICAL_SLUGS.includes(p.slug));

  if (legacy.length === 0) {
    console.log("  ⏭️  No hay permisos legacy");
  } else {
    const legacyIds = legacy.map((p) => p.id);
    // First remove any rolePermissions referencing them (should be 0 after hard reset)
    const rpDeleted = await db
      .delete(rolePermissions)
      .where(inArray(rolePermissions.permissionId, legacyIds));
    // Then delete the permissions themselves
    const pDeleted = await db
      .delete(permissions)
      .where(inArray(permissions.id, legacyIds));
    console.log(`  ✅ ${legacy.length} permisos legacy eliminados:`);
    for (const p of legacy) {
      console.log(`     - ${p.slug} (id:${p.id})`);
    }
  }

  console.log("\n🎉 Cleanup completo. Ejecutar audit para verificar:");
  console.log("   npx tsx scripts/full-rbac-audit.ts");
}

cleanup()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  });
