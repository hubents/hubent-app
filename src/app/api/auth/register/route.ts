import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, organizations, subscriptions, subscriptionPlans, organizationMembers, roles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, validatePassword } from "@/lib/password";
import { signIn } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
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

    const trialEndsAt = new Date();
    trialEndsAt.setDate(trialEndsAt.getDate() + 7);

    const result = await db.transaction(async (tx) => {
      const [newUser] = await tx
        .insert(users)
        .values({
          name,
          email: email.toLowerCase(),
          passwordHash,
          emailVerified: new Date(),
          onboardingCompleted: false,
        })
        .returning();

      let starterPlan = await tx.query.subscriptionPlans.findFirst({
        where: eq(subscriptionPlans.slug, "starter"),
      });

      if (!starterPlan) {
        const [createdPlan] = await tx
          .insert(subscriptionPlans)
          .values({
            name: "Starter",
            slug: "starter",
            description: "Plan de prueba gratuito",
            priceMonthly: "0",
            priceYearly: "0",
            features: ["1 evento activo", "2 usuarios", "50 invitados RSVP", "500MB almacenamiento"],
            limits: { users: 2, events: 1, vendors: 5, storage: 500 },
            isActive: true,
            sortOrder: 0,
          })
          .returning();
        starterPlan = createdPlan;
      }

      const slug = companyName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .substring(0, 50);

      const uniqueSlug = `${slug}-${Date.now().toString(36)}`;

      const [newOrg] = await tx
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

      await tx.insert(subscriptions).values({
        organizationId: newOrg.id,
        planId: starterPlan.id,
        status: "trialing",
        trialEndsAt,
        currentPeriodStart: new Date(),
        currentPeriodEnd: trialEndsAt,
      });

      let ownerRole = await tx.query.roles.findFirst({
        where: eq(roles.slug, "owner"),
      });

      if (!ownerRole) {
        const [createdRole] = await tx
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

      await tx.insert(organizationMembers).values({
        organizationId: newOrg.id,
        userId: newUser.id,
        roleId: ownerRole.id,
        joinedAt: new Date(),
      });

      return { user: newUser, organization: newOrg };
    });

    return NextResponse.json({
      success: true,
      message: "Cuenta creada exitosamente",
      user: {
        id: result.user.id,
        email: result.user.email,
        name: result.user.name,
      },
      organization: {
        id: result.organization.id,
        name: result.organization.name,
        slug: result.organization.slug,
      },
      trialEndsAt: trialEndsAt.toISOString(),
    });
  } catch (error) {
    console.error("Registration error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
