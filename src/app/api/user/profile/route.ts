import { auth } from "@/lib/auth";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { users, organizations, organizationMembers, roles, subscriptions, subscriptionPlans } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { apiHandler, ok, notFound } from "@/lib/api-handler";

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

  // Starter plan MUST exist (seeded via scripts/seed-plans.ts or system-init)
  const starterPlan = await db.query.subscriptionPlans.findFirst({
    where: eq(subscriptionPlans.slug, "starter"),
  });

  if (!starterPlan) {
    throw new Error("Starter plan not found in DB. Run scripts/seed-plans.ts before allowing registrations.");
  }

  const trialDays = (starterPlan as Record<string, unknown>).trialDays as number || 14;
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

  // Create organization
  const displayName = userName || userEmail.split("@")[0];
  const slug = `${displayName.toLowerCase().replace(/[^a-z0-9]/g, "-")}-${Date.now().toString(36)}`;

  const [newOrg] = await db.insert(organizations).values({
    name: `${displayName}'s Workspace`,
    slug,
    ownerId: userId,
    planId: starterPlan.id,
    status: "active",
    settings: { timezone: "America/Argentina/Buenos_Aires", currency: "USD", language: "es" },
  }).returning();

  // Create subscription
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
  return apiHandler(async () => {
    const authSession = await auth();

    if (!authSession?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const userId = authSession.user.id;
    const userEmail = authSession.user.email || "";
    const userName = authSession.user.name;

    await ensureUserHasOrganization(userId, userEmail, userName ?? null);

    const tenantSession = await requireAuth();

    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!user) {
      return notFound("User not found");
    }

    const organization = await db.query.organizations.findFirst({
      where: eq(organizations.id, tenantSession.organizationId),
    });

    return ok({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        phone: null, // Users table doesn't have phone, could add later
      },
      organization: organization
        ? {
            id: organization.id,
            name: organization.name,
            slug: organization.slug,
            logo: organization.logo,
            phone: organization.phone,
            website: organization.website,
            address: organization.address,
            // Fiscal data
            fiscalName: organization.fiscalName,
            taxId: organization.taxId,
            fiscalAddress: organization.fiscalAddress,
            fiscalCity: organization.fiscalCity,
            fiscalPostalCode: organization.fiscalPostalCode,
            fiscalCountry: organization.fiscalCountry,
            fiscalEmail: organization.fiscalEmail,
            fiscalPhone: organization.fiscalPhone,
            invoiceLogo: organization.invoiceLogo,
          }
        : null,
    });
  }, "GET /api/user/profile");
}

export async function PATCH(request: Request) {
  return apiHandler(async () => {
    const authSession = await auth();

    if (!authSession?.user?.id) {
      return NextResponse.json(
        { success: false, error: { code: "UNAUTHORIZED", message: "Unauthorized" } },
        { status: 401 }
      );
    }

    const userId = authSession.user.id;
    const userEmail = authSession.user.email || "";
    const userName = authSession.user.name;

    await ensureUserHasOrganization(userId, userEmail, userName ?? null);

    const tenantSession = await requireAuth();

    const body = await request.json();
    const { name, image, organization: orgData } = body;

    // Update user fields (always the authenticated NextAuth user)
    const userUpdate: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) userUpdate.name = name;
    if (image !== undefined) userUpdate.image = image === "" ? null : image;

    if (name !== undefined || image !== undefined) {
      await db.update(users).set(userUpdate).where(eq(users.id, userId));
    }

    // Update organization if provided — scoped to active tenant (cookie / impersonation)
    if (orgData) {
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (orgData.name !== undefined) updateData.name = orgData.name;
      if (orgData.phone !== undefined) updateData.phone = orgData.phone;
      if (orgData.website !== undefined) updateData.website = orgData.website;
      if (orgData.address !== undefined) updateData.address = orgData.address;
      // Fiscal data
      if (orgData.fiscalName !== undefined) updateData.fiscalName = orgData.fiscalName;
      if (orgData.taxId !== undefined) updateData.taxId = orgData.taxId;
      if (orgData.fiscalAddress !== undefined) updateData.fiscalAddress = orgData.fiscalAddress;
      if (orgData.fiscalCity !== undefined) updateData.fiscalCity = orgData.fiscalCity;
      if (orgData.fiscalPostalCode !== undefined) updateData.fiscalPostalCode = orgData.fiscalPostalCode;
      if (orgData.fiscalCountry !== undefined) updateData.fiscalCountry = orgData.fiscalCountry;
      if (orgData.fiscalEmail !== undefined) updateData.fiscalEmail = orgData.fiscalEmail;
      if (orgData.fiscalPhone !== undefined) updateData.fiscalPhone = orgData.fiscalPhone;

      // Single logo source of truth from UI: invoiceLogo keeps documents + public profile in sync
      if (orgData.invoiceLogo !== undefined) {
        const raw = orgData.invoiceLogo;
        const normalized =
          typeof raw === "string" && raw.trim() === "" ? null : typeof raw === "string" ? raw.trim() : raw;
        updateData.invoiceLogo = normalized;
        updateData.logo = normalized;
      }

      await db
        .update(organizations)
        .set(updateData)
        .where(eq(organizations.id, tenantSession.organizationId));
    }

    return ok({ message: "Perfil actualizado correctamente" });
  }, "PATCH /api/user/profile");
}
