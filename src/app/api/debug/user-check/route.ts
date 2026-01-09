import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, organizations, organizationMembers, roles } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * GET /api/debug/user-check?email=xxx
 * Check user state in database
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const email = searchParams.get("email") || "gimenez.ger@gmail.com";

  const result: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
    searchedEmail: email,
  };

  try {
    // 1. Find user
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      result.user = { found: false };
      result.error = "User not found in database";
      return NextResponse.json(result);
    }

    result.user = {
      found: true,
      id: user.id,
      email: user.email,
      name: user.name,
      onboardingCompleted: user.onboardingCompleted,
    };

    // 2. Find memberships
    const memberships = await db
      .select({
        membershipId: organizationMembers.id,
        orgId: organizationMembers.organizationId,
        roleId: organizationMembers.roleId,
        joinedAt: organizationMembers.joinedAt,
      })
      .from(organizationMembers)
      .where(eq(organizationMembers.userId, user.id));

    result.memberships = {
      count: memberships.length,
      list: memberships,
    };

    if (memberships.length === 0) {
      // Check if user owns any org
      const ownedOrgs = await db.query.organizations.findMany({
        where: eq(organizations.ownerId, user.id),
      });

      result.ownedOrganizations = ownedOrgs.map(o => ({
        id: o.id,
        name: o.name,
        slug: o.slug,
      }));

      if (ownedOrgs.length > 0) {
        result.issue = "User owns organizations but has NO membership records";
        result.fix = "Need to create organizationMembers record for this user";
      }
    } else {
      // Get details for each membership
      const membershipDetails = [];
      for (const m of memberships) {
        const org = await db.query.organizations.findFirst({
          where: eq(organizations.id, m.orgId),
        });
        const role = await db.query.roles.findFirst({
          where: eq(roles.id, m.roleId),
        });
        membershipDetails.push({
          organization: org ? { id: org.id, name: org.name, slug: org.slug } : null,
          role: role ? { id: role.id, name: role.name, slug: role.slug } : null,
          roleId: m.roleId,
        });
      }
      result.membershipDetails = membershipDetails;
    }

    // 3. Check system roles
    const systemRoles = await db.query.roles.findMany({
      where: eq(roles.isSystem, true),
    });

    result.systemRoles = systemRoles.map(r => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
    }));

    const requiredSlugs = ["owner", "admin", "planner", "assistant", "accountant", "viewer"];
    const existingSlugs = systemRoles.map(r => r.slug);
    const missingSlugs = requiredSlugs.filter(s => !existingSlugs.includes(s));

    if (missingSlugs.length > 0) {
      result.missingRoles = missingSlugs;
    }

    // 4. All organizations
    const allOrgs = await db.query.organizations.findMany();
    result.allOrganizations = allOrgs.map(o => ({
      id: o.id,
      name: o.name,
      slug: o.slug,
      ownerId: o.ownerId,
      status: o.status,
    }));

    return NextResponse.json(result);
  } catch (error) {
    console.error("User check error:", error);
    return NextResponse.json({
      ...result,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 });
  }
}

/**
 * POST /api/debug/user-check
 * Fix user membership issues
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body.email || "gimenez.ger@gmail.com";

    const repairs: string[] = [];

    // 1. Find user
    const user = await db.query.users.findFirst({
      where: eq(users.email, email),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // 2. Check if user has memberships
    const existingMembership = await db.query.organizationMembers.findFirst({
      where: eq(organizationMembers.userId, user.id),
    });

    if (!existingMembership) {
      // Find organizations owned by user
      const ownedOrg = await db.query.organizations.findFirst({
        where: eq(organizations.ownerId, user.id),
      });

      if (ownedOrg) {
        // Find owner role
        let ownerRole = await db.query.roles.findFirst({
          where: eq(roles.slug, "owner"),
        });

        if (!ownerRole) {
          // Create owner role
          const [created] = await db.insert(roles).values({
            name: "Owner",
            slug: "owner",
            description: "Full access to organization",
            isSystem: true,
          }).returning();
          ownerRole = created;
          repairs.push(`Created owner role (ID: ${ownerRole.id})`);
        }

        // Create membership
        await db.insert(organizationMembers).values({
          organizationId: ownedOrg.id,
          userId: user.id,
          roleId: ownerRole.id,
          joinedAt: new Date(),
        });
        repairs.push(`Created membership for user in org "${ownedOrg.name}" with owner role`);
      }
    }

    return NextResponse.json({
      success: true,
      repairs,
      message: repairs.length > 0 
        ? `Fixed ${repairs.length} issues` 
        : "No issues to fix",
    });
  } catch (error) {
    console.error("Fix error:", error);
    return NextResponse.json({
      error: error instanceof Error ? error.message : "Unknown error",
    }, { status: 500 });
  }
}
