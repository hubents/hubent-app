import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizations, subscriptionPlans, users, organizationMembers, subscriptions, roles } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { hashPassword } from "@/lib/password";
import { sendTenantWelcomeEmail } from "@/lib/email";

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let password = "";
  for (let i = 0; i < 12; i++) {
    password += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return password;
}

export async function GET() {
  try {
    // Get all organizations with their subscription info
    const tenantsRaw = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        status: organizations.status,
        planId: organizations.planId,
        phone: organizations.phone,
        website: organizations.website,
        ownerId: organizations.ownerId,
        createdAt: organizations.createdAt,
        // Subscription info
        subscriptionPlanId: subscriptions.planId,
        subscriptionStatus: subscriptions.status,
        subscriptionPlanName: subscriptionPlans.name,
      })
      .from(organizations)
      .leftJoin(subscriptions, eq(subscriptions.organizationId, organizations.id))
      .leftJoin(subscriptionPlans, eq(subscriptionPlans.id, subscriptions.planId))
      .orderBy(desc(organizations.createdAt));

    // Transform to include plan info from subscription
    const tenants = tenantsRaw.map(t => ({
      id: t.id,
      name: t.name,
      slug: t.slug,
      status: t.status,
      planId: t.subscriptionPlanId || t.planId,
      planName: t.subscriptionPlanName,
      subscriptionStatus: t.subscriptionStatus,
      phone: t.phone,
      website: t.website,
      ownerId: t.ownerId,
      createdAt: t.createdAt,
    }));

    const plans = await db.select().from(subscriptionPlans);

    return NextResponse.json({ tenants, plans });
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
    const body = await request.json();
    const { name, slug, planId, phone, website, ownerEmail, ownerName, sendWelcomeEmail } = body;

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
            emailVerified: new Date(),
          })
          .returning();

        ownerId = newUser.id;
      }
    }

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
        ownerId,
      })
      .returning();

    // Add owner as organization member with admin role
    if (ownerId) {
      // Find or create admin role for this org
      let adminRole = await db.query.roles.findFirst({
        where: eq(roles.slug, "admin"),
      });

      if (!adminRole) {
        const [newRole] = await db
          .insert(roles)
          .values({
            name: "Administrador",
            slug: "admin",
            description: "Administrador de la organización",
            isSystem: true,
          })
          .returning();
        adminRole = newRole;
      }

      await db.insert(organizationMembers).values({
        organizationId: newTenant.id,
        userId: ownerId,
        roleId: adminRole.id,
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
