import { auth } from "@/lib/auth";
import { db } from "@/db";
import { users, organizations, organizationMembers, roles, subscriptions, subscriptionPlans } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

/**
 * Helper function to ensure user has an organization
 * Auto-creates one if missing
 */
async function ensureUserHasOrganization(userId: string, userEmail: string, userName: string | null) {
  // Check if user already has a membership
  let membership = await db.query.organizationMembers.findFirst({
    where: eq(organizationMembers.userId, userId),
  });

  if (membership) {
    return membership;
  }

  // Check if user owns an organization but has no membership
  const ownedOrg = await db.query.organizations.findFirst({
    where: eq(organizations.ownerId, userId),
  });

  // Ensure owner role exists
  let ownerRole = await db.query.roles.findFirst({
    where: eq(roles.slug, "owner"),
  });

  if (!ownerRole) {
    const [created] = await db.insert(roles).values({
      name: "Owner",
      slug: "owner",
      description: "Full access to organization",
      isSystem: true,
    }).returning();
    ownerRole = created;
  }

  if (ownedOrg) {
    // Create membership for existing org
    const [newMembership] = await db.insert(organizationMembers).values({
      organizationId: ownedOrg.id,
      userId: userId,
      roleId: ownerRole.id,
      joinedAt: new Date(),
    }).returning();
    return newMembership;
  }

  // Create new organization for user
  // First ensure starter plan exists
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
  }

  // Create organization
  const displayName = userName || userEmail.split("@")[0];
  const slug = `${displayName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now().toString(36)}`;
  
  const [newOrg] = await db.insert(organizations).values({
    name: `${displayName}'s Workspace`,
    slug,
    ownerId: userId,
    status: "active",
    settings: { timezone: "America/Argentina/Buenos_Aires", currency: "USD", language: "es" },
  }).returning();

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

  // Create membership
  const [newMembership] = await db.insert(organizationMembers).values({
    organizationId: newOrg.id,
    userId: userId,
    roleId: ownerRole.id,
    joinedAt: new Date(),
  }).returning();

  return newMembership;
}

export async function GET() {
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const userEmail = session.user.email || "";
  const userName = session.user.name;

  try {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Ensure user has organization (auto-create if missing)
    const membership = await ensureUserHasOrganization(userId, userEmail, userName ?? null);

    // Get organization
    const organization = await db.query.organizations.findFirst({
      where: eq(organizations.id, membership.organizationId),
    });

    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
          phone: null, // Users table doesn't have phone, could add later
        },
        organization: organization ? {
          id: organization.id,
          name: organization.name,
          slug: organization.slug,
          phone: organization.phone,
          website: organization.website,
          address: organization.address,
        } : null,
      },
    });
  } catch (error) {
    console.error("Error fetching profile:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await auth();

  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id;
  const userEmail = session.user.email || "";
  const userName = session.user.name;

  try {
    const body = await request.json();
    const { name, phone, organization: orgData } = body;

    // Update user fields
    if (name !== undefined) {
      await db
        .update(users)
        .set({
          name,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));
    }

    // Ensure user has organization before updating
    const membership = await ensureUserHasOrganization(userId, userEmail, userName ?? null);

    // Update organization if provided
    if (orgData) {
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (orgData.name !== undefined) updateData.name = orgData.name;
      if (orgData.phone !== undefined) updateData.phone = orgData.phone;
      if (orgData.website !== undefined) updateData.website = orgData.website;
      if (orgData.address !== undefined) updateData.address = orgData.address;

      await db
        .update(organizations)
        .set(updateData)
        .where(eq(organizations.id, membership.organizationId));
    }

    return NextResponse.json({ 
      success: true,
      message: "Perfil actualizado correctamente",
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
