import "dotenv/config";
import { db } from "../src/db";
import { users, platformAdmins, organizations, organizationMembers, roles } from "../src/db/schema";
import { eq } from "drizzle-orm";

async function auditAll() {
  try {
    console.log("🔍 Full Database Audit\n");
    console.log("=".repeat(50));

    // 1. Check users
    const allUsers = await db.select().from(users);
    console.log(`\n📊 USERS: ${allUsers.length} total`);
    allUsers.forEach((u, i) => {
      console.log(`  ${i + 1}. ${u.email} (ID: ${u.id})`);
    });

    // 2. Check organizations
    const allOrgs = await db.select().from(organizations);
    console.log(`\n🏢 ORGANIZATIONS: ${allOrgs.length} total`);
    allOrgs.forEach((o, i) => {
      console.log(`  ${i + 1}. ${o.name} (ID: ${o.id}, Owner: ${o.ownerId})`);
    });

    // 3. Check roles
    const allRoles = await db.select().from(roles);
    console.log(`\n👤 ROLES: ${allRoles.length} total`);
    allRoles.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.name} (ID: ${r.id}, Slug: ${r.slug})`);
    });

    // 4. Check organization memberships
    const allMemberships = await db
      .select({
        id: organizationMembers.id,
        orgId: organizationMembers.organizationId,
        userId: organizationMembers.userId,
        roleId: organizationMembers.roleId,
        orgName: organizations.name,
        userName: users.name,
        userEmail: users.email,
        roleName: roles.name,
        roleSlug: roles.slug,
      })
      .from(organizationMembers)
      .leftJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
      .leftJoin(users, eq(organizationMembers.userId, users.id))
      .leftJoin(roles, eq(organizationMembers.roleId, roles.id));

    console.log(`\n🔗 ORGANIZATION MEMBERSHIPS: ${allMemberships.length} total`);
    if (allMemberships.length === 0) {
      console.log("  ⚠️  NO MEMBERSHIPS FOUND - THIS IS THE PROBLEM!");
      console.log("  Users need to be linked to organizations via organizationMembers table");
    } else {
      allMemberships.forEach((m, i) => {
        console.log(`  ${i + 1}. User: ${m.userEmail} -> Org: ${m.orgName} (Role: ${m.roleSlug})`);
      });
    }

    // 5. Check platform admins
    const admins = await db
      .select({
        level: platformAdmins.level,
        userEmail: users.email,
      })
      .from(platformAdmins)
      .leftJoin(users, eq(platformAdmins.userId, users.id));

    console.log(`\n👑 PLATFORM ADMINS: ${admins.length} total`);
    admins.forEach((a, i) => {
      console.log(`  ${i + 1}. ${a.userEmail} (Level: ${a.level})`);
    });

    console.log("\n" + "=".repeat(50));
    console.log("DIAGNOSIS:");
    
    if (allMemberships.length === 0 && allOrgs.length > 0 && allUsers.length > 0) {
      console.log("❌ PROBLEM: Users exist and organizations exist, but no memberships!");
      console.log("   FIX: Need to create organization_members records linking users to orgs");
    } else if (allOrgs.length === 0) {
      console.log("❌ PROBLEM: No organizations exist!");
      console.log("   FIX: Need to create organizations for users");
    } else if (allRoles.length === 0) {
      console.log("❌ PROBLEM: No roles exist!");
      console.log("   FIX: Need to seed system roles (owner, admin, planner, etc.)");
    } else {
      console.log("✅ Database structure looks OK");
    }

    process.exit(0);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log("❌ Database error:", errorMessage);
    process.exit(1);
  }
}

auditAll();
