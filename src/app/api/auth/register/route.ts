import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, organizations, subscriptions, subscriptionPlans, organizationMembers, roles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, validatePassword } from "@/lib/password";
import { sendWelcomeEmail } from "@/lib/email";
import { withMonitoring } from "@/lib/monitoring";

export const POST = withMonitoring(async (request: NextRequest) => {
  const body = await request.json();
    const { name, email, password, companyName } = body;

    if (!name || !email || !password || !companyName) {
      return NextResponse.json(
        { error: "Todos los campos son requeridos" },
        { status: 400 }
      );
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const existingUser = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (existingUser) {
      return NextResponse.json(
        { error: "Este email ya está registrado" },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    // Find starter plan (must be seeded via scripts/seed-plans.ts before first registration)
    const starterPlan = await db.query.subscriptionPlans.findFirst({
      where: eq(subscriptionPlans.slug, "starter"),
    });

    if (!starterPlan) {
      console.error("POST /api/auth/register: starter plan not found in DB. Run scripts/seed-plans.ts");
      return NextResponse.json(
        { error: "El sistema no está configurado correctamente. Contacte al administrador." },
        { status: 500 }
      );
    }

    const trialDays = (starterPlan as Record<string, unknown>).trialDays as number || 14;
    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

    // Note: Neon HTTP driver doesn't support transactions, so we do sequential operations
    // Create user first
    const [newUser] = await db
      .insert(users)
      .values({
        name,
        email: email.toLowerCase(),
        passwordHash,
        emailVerified: new Date(),
        onboardingCompleted: false,
      })
      .returning();

    // Generate unique slug for organization
    const slug = companyName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .substring(0, 50);

    const uniqueSlug = `${slug}-${Date.now().toString(36)}`;

    // Create organization
    const [newOrg] = await db
      .insert(organizations)
      .values({
        name: companyName,
        slug: uniqueSlug,
        ownerId: newUser.id,
        status: "active",
        settings: {
          timezone: "America/Argentina/Buenos_Aires",
          currency: "USD",
          language: "es",
        },
      })
      .returning();

    // Create subscription
    await db.insert(subscriptions).values({
      organizationId: newOrg.id,
      planId: starterPlan.id,
      status: "trialing",
      trialEndsAt,
      currentPeriodStart: new Date(),
      currentPeriodEnd: trialEndsAt,
    });

    // Find or create owner role
    let ownerRole = await db.query.roles.findFirst({
      where: eq(roles.slug, "owner"),
    });

    if (!ownerRole) {
      const [createdRole] = await db
        .insert(roles)
        .values({
          name: "Owner",
          slug: "owner",
          description: "Propietario de la organización",
          isSystem: true,
        })
        .returning();
      ownerRole = createdRole;
    }

    // Create organization membership
    await db.insert(organizationMembers).values({
      organizationId: newOrg.id,
      userId: newUser.id,
      roleId: ownerRole.id,
      joinedAt: new Date(),
    });

    // Send welcome email (non-blocking)
    sendWelcomeEmail(
      newUser.email,
      newUser.name || name,
      newOrg.name,
      trialEndsAt
    ).catch((err) => console.error("Failed to send welcome email:", err));

  return NextResponse.json({
    success: true,
    message: "Cuenta creada exitosamente",
    user: {
      id: newUser.id,
      email: newUser.email,
      name: newUser.name,
    },
    organization: {
      id: newOrg.id,
      name: newOrg.name,
      slug: newOrg.slug,
    },
    trialEndsAt: trialEndsAt.toISOString(),
  });
}, { name: "POST /api/auth/register", critical: true });
