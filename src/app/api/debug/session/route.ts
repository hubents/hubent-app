import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, organizations, organizationMembers, roles, subscriptions, subscriptionPlans } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/debug/session
 * Diagnostic endpoint to check authentication and tenant state
 * This helps identify exactly where the auth flow is failing
 */
export async function GET() {
  const diagnostics: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    checks: {},
    errors: [],
    recommendations: [],
  };

  try {
    // Step 1: Check NextAuth session
    const session = await auth();
    diagnostics.checks = {
      ...diagnostics.checks as object,
      nextAuthSession: {
        exists: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id || null,
        email: session?.user?.email || null,
        name: session?.user?.name || null,
      },
    };

    if (!session?.user?.id) {
      (diagnostics.errors as string[]).push("No NextAuth session found");
      (diagnostics.recommendations as string[]).push("User needs to log in again");
      return NextResponse.json(diagnostics);
    }

    const userId = session.user.id;

    // Step 2: Check if user exists in database
    const dbUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    diagnostics.checks = {
      ...diagnostics.checks as object,
      databaseUser: {
        exists: !!dbUser,
        id: dbUser?.id || null,
        email: dbUser?.email || null,
        hasPasswordHash: !!dbUser?.passwordHash,
        onboardingCompleted: dbUser?.onboardingCompleted || false,
      },
    };

    if (!dbUser) {
      (diagnostics.errors as string[]).push("User exists in NextAuth but not in database");
      (diagnostics.recommendations as string[]).push("Database sync issue - user record missing");
      return NextResponse.json(diagnostics);
    }

    // Step 3: Check organization membership
    const membership = await db
      .select({
        id: organizationMembers.id,
        organizationId: organizationMembers.organizationId,
        roleId: organizationMembers.roleId,
        joinedAt: organizationMembers.joinedAt,
      })
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, userId));

    diagnostics.checks = {
      ...diagnostics.checks as object,
      organizationMembership: {
        hasMembership: membership.length > 0,
        count: membership.length,
        memberships: membership,
      },
    };

    if (membership.length === 0) {
      (diagnostics.errors as string[]).push("User has no organization membership");
      (diagnostics.recommendations as string[]).push("Need to create organization and membership for user");
      return NextResponse.json(diagnostics);
    }

    // Step 4: Check if the role exists
    const membershipWithRole = membership[0];
    const role = await db.query.roles.findFirst({
      where: eq(roles.id, membershipWithRole.roleId),
    });

    diagnostics.checks = {
      ...diagnostics.checks as object,
      role: {
        exists: !!role,
        id: role?.id || null,
        name: role?.name || null,
        slug: role?.slug || null,
        isSystem: role?.isSystem || false,
      },
    };

    if (!role) {
      (diagnostics.errors as string[]).push(`Role with ID ${membershipWithRole.roleId} does not exist`);
      (diagnostics.recommendations as string[]).push("Need to create system roles (owner, admin, planner, etc.)");
      return NextResponse.json(diagnostics);
    }

    // Step 5: Check if organization exists
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, membershipWithRole.organizationId),
    });

    diagnostics.checks = {
      ...diagnostics.checks as object,
      organization: {
        exists: !!org,
        id: org?.id || null,
        name: org?.name || null,
        slug: org?.slug || null,
        status: org?.status || null,
        ownerId: org?.ownerId || null,
      },
    };

    if (!org) {
      (diagnostics.errors as string[]).push("Organization does not exist");
      (diagnostics.recommendations as string[]).push("Organization record is missing from database");
      return NextResponse.json(diagnostics);
    }

    // Step 6: Check subscription
    const subscription = await db.query.subscriptions.findFirst({
      where: eq(subscriptions.organizationId, org.id),
    });

    let plan = null;
    if (subscription) {
      plan = await db.query.subscriptionPlans.findFirst({
        where: eq(subscriptionPlans.id, subscription.planId),
      });
    }

    diagnostics.checks = {
      ...diagnostics.checks as object,
      subscription: {
        exists: !!subscription,
        status: subscription?.status || null,
        planId: subscription?.planId || null,
        planName: plan?.name || null,
        trialEndsAt: subscription?.trialEndsAt || null,
      },
    };

    // Step 7: Check all system roles exist
    const systemRoles = await db
      .select({ slug: roles.slug, name: roles.name })
      .from(roles)
      .where(eq(roles.isSystem, true));

    const requiredRoles = ["owner", "admin", "planner", "assistant", "accountant", "viewer"];
    const existingRoleSlugs = systemRoles.map(r => r.slug);
    const missingRoles = requiredRoles.filter(r => !existingRoleSlugs.includes(r));

    diagnostics.checks = {
      ...diagnostics.checks as object,
      systemRoles: {
        existing: systemRoles,
        missing: missingRoles,
        allPresent: missingRoles.length === 0,
      },
    };

    if (missingRoles.length > 0) {
      (diagnostics.errors as string[]).push(`Missing system roles: ${missingRoles.join(", ")}`);
      (diagnostics.recommendations as string[]).push("Run role initialization to create missing roles");
    }

    // Final status
    const hasErrors = (diagnostics.errors as string[]).length > 0;
    diagnostics.status = hasErrors ? "ISSUES_FOUND" : "ALL_OK";
    diagnostics.canCreateEvents = !hasErrors && role.slug !== "viewer";
    diagnostics.canCreateVendors = !hasErrors && ["owner", "admin", "planner"].includes(role.slug);
    diagnostics.canManageTeam = !hasErrors && ["owner", "admin"].includes(role.slug);

    return NextResponse.json(diagnostics);
  } catch (error) {
    console.error("Debug session error:", error);
    diagnostics.status = "ERROR";
    (diagnostics.errors as string[]).push(error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json(diagnostics, { status: 500 });
  }
}

/**
 * POST /api/debug/session
 * Auto-repair common issues
 */
export async function POST() {
  try {
    const session = await auth();
    
    if (!session?.user?.id || !session?.user?.email) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const userId = session.user.id;
    const userEmail = session.user.email;
    const userName = session.user.name || userEmail.split("@")[0];

    const repairs: string[] = [];

    // Repair 1: Ensure system roles exist
    const requiredRoles = [
      { name: "Owner", slug: "owner", description: "Full access to organization" },
      { name: "Admin", slug: "admin", description: "Administrative access" },
      { name: "Planner", slug: "planner", description: "Event planning access" },
      { name: "Assistant", slug: "assistant", description: "Assistant access" },
      { name: "Accountant", slug: "accountant", description: "Financial access" },
      { name: "Viewer", slug: "viewer", description: "Read-only access" },
    ];

    for (const roleData of requiredRoles) {
      const existing = await db.query.roles.findFirst({
        where: eq(roles.slug, roleData.slug),
      });

      if (!existing) {
        await db.insert(roles).values({
          ...roleData,
          isSystem: true,
        });
        repairs.push(`Created system role: ${roleData.name}`);
      }
    }

    // Repair 2: Ensure user has organization membership
    const membership = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.userId, userId),
    });

    if (!membership) {
      // Check if user owns an organization
      const ownedOrg = await db.query.organizations.findFirst({
        where: eq(organizations.ownerId, userId),
      });

      if (ownedOrg) {
        // Create membership for owned org
        const ownerRole = await db.query.roles.findFirst({
          where: eq(roles.slug, "owner"),
        });

        if (ownerRole) {
          await db.insert(organizationMembers).values({
            organizationId: ownedOrg.id,
            userId: userId,
            roleId: ownerRole.id,
            joinedAt: new Date(),
          });
          repairs.push(`Created membership for owned organization: ${ownedOrg.name}`);
        }
      } else {
        // Create new organization for user
        const ownerRole = await db.query.roles.findFirst({
          where: eq(roles.slug, "owner"),
        });

        if (ownerRole) {
          // Get or create starter plan
          let starterPlan = await db.query.subscriptionPlans.findFirst({
            where: eq(subscriptionPlans.slug, "starter"),
          });

          if (!starterPlan) {
            const [created] = await db.insert(subscriptionPlans).values({
              name: "Starter",
              slug: "starter",
              description: "Plan gratuito",
              priceMonthly: "0",
              priceYearly: "0",
              features: ["1 evento", "2 usuarios", "Funciones básicas"],
              limits: { users: 2, events: 1, vendors: 5, storage: 500 },
              isActive: true,
              sortOrder: 0,
            }).returning();
            starterPlan = created;
            repairs.push("Created starter plan");
          }

          // Create organization
          const slug = `${userName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now().toString(36)}`;
          const [newOrg] = await db.insert(organizations).values({
            name: `${userName}'s Workspace`,
            slug,
            ownerId: userId,
            status: "active",
            settings: { timezone: "America/Argentina/Buenos_Aires", currency: "USD", language: "es" },
          }).returning();

          repairs.push(`Created organization: ${newOrg.name}`);

          // Create subscription
          const trialEndsAt = new Date();
          trialEndsAt.setDate(trialEndsAt.getDate() + 7);

          await db.insert(subscriptions).values({
            organizationId: newOrg.id,
            planId: starterPlan.id,
            status: "trialing",
            trialEndsAt,
            currentPeriodStart: new Date(),
            currentPeriodEnd: trialEndsAt,
          });
          repairs.push("Created trial subscription");

          // Create membership
          await db.insert(organizationMembers).values({
            organizationId: newOrg.id,
            userId: userId,
            roleId: ownerRole.id,
            joinedAt: new Date(),
          });
          repairs.push("Created organization membership");
        }
      }
    }

    return NextResponse.json({
      success: true,
      repairs,
      message: repairs.length > 0 
        ? `Repaired ${repairs.length} issues. Please refresh the page.`
        : "No repairs needed - everything looks good!",
    });
  } catch (error) {
    console.error("Repair error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Repair failed" },
      { status: 500 }
    );
  }
}
