import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, subscriptionPlans, users, organizationMembers, subscriptions, roles } from "@/db/schema";
import { eq, desc, sql, and, ilike, or } from "drizzle-orm";
import { hashPassword } from "@/lib/password";
import { sendTenantWelcomeEmail } from "@/lib/email";
import { requirePlatformAdmin } from "@/lib/session";
import { getConfigByDbOrgType } from "@/lib/tenant-type";

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export async function GET(request: NextRequest) {
  try {
    await requirePlatformAdmin();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = (page - 1) * limit;
    const search = searchParams.get("search") || "";
    const orgTypeFilter = searchParams.get("orgType") || "";
    const verificationStatusFilter = searchParams.get("verificationStatus") || "";
    const statusFilter = searchParams.get("status") || "";

    // Build dynamic where conditions — all org types are included now
    const conditions = [];

    if (orgTypeFilter) {
      conditions.push(eq(organizations.orgType, orgTypeFilter as "tenant" | "provider" | "client"));
    }

    if (verificationStatusFilter) {
      conditions.push(
        eq(organizations.verificationStatus, verificationStatusFilter as "unverified" | "verified" | "rejected" | "suspended")
      );
    }

    if (statusFilter) {
      conditions.push(
        eq(organizations.status, statusFilter as "active" | "suspended" | "deleted")
      );
    }

    if (search) {
      conditions.push(
        or(
          ilike(organizations.name, `%${search}%`),
          ilike(organizations.slug, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const tenantsRaw = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        logo: organizations.logo,
        orgType: organizations.orgType,
        status: organizations.status,
        planId: organizations.planId,
        phone: organizations.phone,
        website: organizations.website,
        ownerId: organizations.ownerId,
        createdAt: organizations.createdAt,
        verificationStatus: organizations.verificationStatus,
        verifiedAt: organizations.verifiedAt,
        providerCategory: organizations.providerCategory,
        instagramHandle: organizations.instagramHandle,
        profileCompleteness: organizations.profileCompleteness,
        city: organizations.city,
        region: organizations.region,
        // Subscription info
        subscriptionPlanId: subscriptions.planId,
        subscriptionStatus: subscriptions.status,
        subscriptionPlanName: subscriptionPlans.name,
      })
      .from(organizations)
      .where(whereClause)
      .leftJoin(subscriptions, eq(subscriptions.organizationId, organizations.id))
      .leftJoin(subscriptionPlans, eq(subscriptionPlans.id, subscriptions.planId))
      .orderBy(desc(organizations.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(organizations)
      .where(whereClause);

    // Compute counts per org type for stat cards
    const typeCounts = await db
      .select({ orgType: organizations.orgType, count: sql<number>`count(*)` })
      .from(organizations)
      .groupBy(organizations.orgType);

    const pendingVerificationCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(organizations)
      .where(eq(organizations.verificationStatus, "unverified"));

    // Deduplicate: an org with multiple subscription rows would appear more than once
    const seen = new Map<number, (typeof tenantsRaw)[0]>();
    for (const t of tenantsRaw) {
      if (!seen.has(t.id)) seen.set(t.id, t);
    }

    const tenants = Array.from(seen.values()).map(t => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      logo: t.logo,
      orgType: t.orgType,
      status: t.status,
      planId: t.subscriptionPlanId || t.planId,
      planName: t.subscriptionPlanName,
      subscriptionStatus: t.subscriptionStatus,
      phone: t.phone,
      website: t.website,
      ownerId: t.ownerId,
      createdAt: t.createdAt,
      verificationStatus: t.verificationStatus,
      verifiedAt: t.verifiedAt,
      providerCategory: t.providerCategory,
      instagramHandle: t.instagramHandle,
      profileCompleteness: t.profileCompleteness,
      city: t.city,
      region: t.region,
    }));

    const plans = await db.select().from(subscriptionPlans);

    const typeCountsMap = typeCounts.reduce((acc, row) => {
      if (row.orgType) acc[row.orgType] = Number(row.count);
      return acc;
    }, {} as Record<string, number>);
    const globalTotal = Object.values(typeCountsMap).reduce((sum, n) => sum + n, 0);

    return NextResponse.json({
      tenants,
      plans,
      meta: {
        page,
        limit,
        total: Number(count),
        totalPages: Math.ceil(Number(count) / limit),
        globalTotal,
        typeCounts: typeCountsMap,
        pendingVerification: Number(pendingVerificationCount[0]?.count ?? 0),
      },
    });
  } catch (error) {
    console.error("Error fetching tenants:", error);
    return NextResponse.json(
      { error: "Error al obtener tenants" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify platform admin access (only super_admin can create tenants)
    const session = await requirePlatformAdmin();
    if (session.user.platformLevel !== "super_admin") {
      return NextResponse.json(
        { error: "Solo super admins pueden crear tenants" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { name, slug, planId, phone, website, ownerEmail, ownerName, sendWelcomeEmail, orgType } = body;

    if (!name || !slug) {
      return NextResponse.json(
        { error: "Nombre y slug son requeridos" },
        { status: 400 }
      );
    }

    // Check if slug already exists
    const existingOrg = await db.query.organizations.findFirst({
      where: eq(organizations.slug, slug.toLowerCase()),
    });

    if (existingOrg) {
      return NextResponse.json(
        { error: "El slug ya está en uso" },
        { status: 400 }
      );
    }

    let ownerId: string | null = null;
    let tempPassword: string | null = null;

    // If owner email provided, create or find user
    if (ownerEmail) {
      let existingUser = await db.query.users.findFirst({
        where: eq(users.email, ownerEmail.toLowerCase()),
      });

      if (existingUser) {
        ownerId = existingUser.id;
      } else {
        // Create new user with temp password
        tempPassword = generateTempPassword();
        const hashedPassword = await hashPassword(tempPassword);

        const [newUser] = await db
          .insert(users)
          .values({
            email: ownerEmail.toLowerCase(),
            name: ownerName || ownerEmail.split("@")[0],
            passwordHash: hashedPassword,
            mustChangePassword: true,
            emailVerified: null, // Se verifica cuando el usuario hace login por primera vez
          })
          .returning();

        ownerId = newUser.id;
      }
    }

    // Validate orgType — default to "tenant" (planner) if not provided
    const validOrgTypes = ["tenant", "provider", "client"] as const;
    const resolvedOrgType = validOrgTypes.includes(orgType) ? orgType : "tenant";

    // Create organization
    const [newTenant] = await db
      .insert(organizations)
      .values({
        name,
        slug: slug.toLowerCase(),
        planId: planId || null,
        phone: phone || null,
        website: website || null,
        status: "active",
        orgType: resolvedOrgType,
        ownerId,
      })
      .returning();

    // Add owner as organization member with the correct role for this org type
    if (ownerId) {
      const typeConfig = getConfigByDbOrgType(resolvedOrgType);
      const ownerRoleSlug = typeConfig?.ownerRoleSlug || "admin";

      let ownerRole = await db.query.roles.findFirst({
        where: eq(roles.slug, ownerRoleSlug),
      });

      if (!ownerRole) {
        const [newRole] = await db
          .insert(roles)
          .values({
            name: ownerRoleSlug === "provider_owner" ? "Propietario Proveedor" : "Administrador",
            slug: ownerRoleSlug,
            description: `Rol propietario para ${typeConfig?.label || "organización"}`,
            isSystem: true,
          })
          .returning();
        ownerRole = newRole;
      }

      await db.insert(organizationMembers).values({
        organizationId: newTenant.id,
        userId: ownerId,
        roleId: ownerRole.id,
        joinedAt: new Date(),
      });
    }

    // Create trial subscription if plan selected
    if (planId) {
      const trialEndsAt = new Date();
      trialEndsAt.setDate(trialEndsAt.getDate() + 7);

      await db.insert(subscriptions).values({
        organizationId: newTenant.id,
        planId,
        status: "trialing",
        trialEndsAt,
        currentPeriodStart: new Date(),
        currentPeriodEnd: trialEndsAt,
      });
    }

    // Send welcome email if requested and we have a new user
    if (sendWelcomeEmail && ownerEmail && tempPassword) {
      try {
        await sendTenantWelcomeEmail(
          ownerEmail,
          ownerName || ownerEmail.split("@")[0],
          name,
          tempPassword
        );
      } catch (emailError) {
        console.error("Error sending welcome email:", emailError);
        // Don't fail the request if email fails
      }
    }

    return NextResponse.json({ 
      tenant: newTenant,
      ownerCreated: !!tempPassword,
      welcomeEmailSent: sendWelcomeEmail && !!tempPassword,
    }, { status: 201 });
  } catch (error) {
    console.error("Error creating tenant:", error);
    return NextResponse.json(
      { error: "Error al crear tenant" },
      { status: 500 }
    );
  }
}
