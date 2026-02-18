import "dotenv/config";
import { db } from "../src/db";
import { organizations, organizationMembers, roles, subscriptions, subscriptionPlans, platformAdmins } from "../src/db/schema";
import { eq, and, inArray } from "drizzle-orm";

async function simulate() {
  // Simulate what getUserOrganizations + buildUserContext + createTenantSession does
  const userId = "91ede1bc-a654-47f7-b7d7-7cd9f457b4cc"; // German gimenez.ger@gmail.com
  
  console.log("=== Simulating session creation for German ===\n");

  // Step 1: getUserOrganizations
  console.log("1. getUserOrganizations()...");
  try {
    const orgs = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        logo: organizations.logo,
        status: organizations.status,
        orgType: organizations.orgType,
        role: roles.slug,
        roleName: roles.name,
        eventScoped: roles.eventScoped,
      })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
      .innerJoin(roles, eq(organizationMembers.roleId, roles.id))
      .where(eq(organizationMembers.userId, userId));
    
    console.log(`   Found ${orgs.length} orgs:`, orgs.map(o => `${o.name} (${o.role}, eventScoped=${o.eventScoped})`));

    if (orgs.length === 0) {
      console.log("   ERROR: No organizations found!");
      return;
    }

    const currentOrg = orgs[0];
    console.log("   Current org:", JSON.stringify(currentOrg, null, 2));

    // Step 2: getRolePermissions
    console.log("\n2. getRolePermissions()...");
    const roleRecord = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.slug, currentOrg.role))
      .limit(1);
    console.log("   Role record:", roleRecord);

    // Step 3: createTenantSession
    console.log("\n3. createTenantSession()...");
    const orgId = currentOrg.id;

    // getOrgPlanInfo
    const [orgRecord] = await db
      .select({ planId: organizations.planId })
      .from(organizations)
      .where(eq(organizations.id, orgId))
      .limit(1);
    console.log("   Org planId:", orgRecord?.planId);

    if (orgRecord?.planId) {
      const plan = await db.query.subscriptionPlans.findFirst({
        where: eq(subscriptionPlans.id, orgRecord.planId),
      });
      console.log("   Plan:", plan?.name, plan?.slug);
    }

    // Get subscription status
    const sub = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.organizationId, orgId),
      columns: { status: true },
    });
    console.log("   Subscription status:", sub?.status ?? "null");

    // Step 4: Simulate checkout flow
    console.log("\n4. Simulating checkout flow...");
    const plan = await db.query.subscriptionPlans.findFirst({
      where: eq(subscriptionPlans.id, 5), // Starter
    });
    console.log("   Target plan:", plan?.name, "active:", plan?.isActive);
    console.log("   Stripe monthly:", plan?.stripePriceIdMonthly);
    console.log("   Stripe yearly:", plan?.stripePriceIdYearly);

    // Check orgType match
    const orgForType = await db.query.organizations.findFirst({
      where: eq(organizations.id, orgId),
      columns: { orgType: true, name: true },
    });
    console.log("   Org type:", orgForType?.orgType, "Plan orgType:", plan?.orgType);
    if (orgForType && plan?.orgType && orgForType.orgType !== plan.orgType) {
      console.log("   ERROR: orgType mismatch!");
    } else {
      console.log("   orgType match: OK");
    }

    // Check existing subscription for Stripe customer
    const [existingSub] = await db
      .select({ stripeCustomerId: subscriptions.stripeCustomerId })
      .from(subscriptions)
      .where(eq(subscriptions.organizationId, orgId))
      .limit(1);
    console.log("   Existing stripeCustomerId:", existingSub?.stripeCustomerId ?? "null (will create new)");

    console.log("\n=== Session simulation COMPLETE - no errors ===");
  } catch (error) {
    console.error("\n❌ ERROR during simulation:", error);
  }
}

simulate();
