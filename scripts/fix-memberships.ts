import "dotenv/config";
import { db } from "../src/db";
import { users, organizations, organizationMembers, roles } from "../src/db/schema";
import { eq, and } from "drizzle-orm";

async function fixMemberships() {
  try {
    console.log("🔧 Fixing organization memberships...\n");

    // Get all users
    const allUsers = await db.select().from(users);
    
    // Get all organizations
    const allOrgs = await db.select().from(organizations);
    
    if (allOrgs.length === 0) {
      console.log("❌ No organizations found. Cannot fix memberships.");
      process.exit(1);
    }

    // Get owner role
    const ownerRole = await db.query.roles.findFirst({
      where: eq(roles.slug, "owner"),
    });

    if (!ownerRole) {
      console.log("❌ Owner role not found. Run seed-roles first.");
      process.exit(1);
    }

    const defaultOrg = allOrgs[0];
    console.log(`Using default organization: ${defaultOrg.name} (ID: ${defaultOrg.id})`);

    for (const user of allUsers) {
      // Check if user has any membership
      const existingMembership = await db.query.organizationMembers.findFirst({
        where: eq(organizationMembers.userId, user.id),
      });

      if (!existingMembership) {
        console.log(`\n⚠️  User ${user.email} has no membership. Creating one...`);
        
        // Check if user is the owner of any org
        const ownedOrg = allOrgs.find(o => o.ownerId === user.id);
        const targetOrg = ownedOrg || defaultOrg;
        
        await db.insert(organizationMembers).values({
          organizationId: targetOrg.id,
          userId: user.id,
          roleId: ownerRole.id,
          joinedAt: new Date(),
        });
        
        console.log(`✅ Created membership for ${user.email} in ${targetOrg.name} as owner`);
      } else {
        console.log(`✓ User ${user.email} already has membership`);
      }
    }

    console.log("\n✅ Done fixing memberships!");
    process.exit(0);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.log("❌ Error:", errorMessage);
    process.exit(1);
  }
}

fixMemberships();
