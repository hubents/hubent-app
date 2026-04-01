import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, organizations, subscriptions, subscriptionPlans, organizationMembers, roles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, validatePassword } from "@/lib/password";
import { sendWelcomeEmail, sendProviderWelcomeEmail } from "@/lib/email";
import { withMonitoring } from "@/lib/monitoring";

const VALID_ORG_TYPES = ["tenant", "provider"] as const;
type OrgType = (typeof VALID_ORG_TYPES)[number];

export const POST = withMonitoring(async (request: NextRequest) => {
  const body = await request.json();
  const { name, email, password, companyName } = body;
  const orgType: OrgType = VALID_ORG_TYPES.includes(body.orgType) ? body.orgType : "tenant";

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

  const isProvider = orgType === "provider";
  const planSlug = isProvider ? "provider-free" : "starter";

  const plan = await db.query.subscriptionPlans.findFirst({
    where: eq(subscriptionPlans.slug, planSlug),
  });

  if (!plan) {
    console.error(`POST /api/auth/register: ${planSlug} plan not found in DB. Run scripts/seed-plans.ts`);
    return NextResponse.json(
      { error: "El sistema no está configurado correctamente. Contacte al administrador." },
      { status: 500 }
    );
  }

  const trialDays = isProvider ? 0 : ((plan as Record<string, unknown>).trialDays as number || 14);
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + trialDays);

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

  const slug = companyName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 50);

  const uniqueSlug = `${slug}-${Date.now().toString(36)}`;

  const orgValues: Record<string, unknown> = {
    name: companyName,
    slug: uniqueSlug,
    ownerId: newUser.id,
    planId: plan.id,
    status: "active",
    settings: {
      timezone: "America/Argentina/Buenos_Aires",
      currency: "USD",
      language: "es",
    },
  };

  if (isProvider) {
    orgValues.orgType = "provider";
    orgValues.verificationStatus = "unverified";
  }

  let newOrg;
  try {
    [newOrg] = await db
      .insert(organizations)
      .values(orgValues as typeof organizations.$inferInsert)
      .returning();
  } catch (orgError) {
    await db.delete(users).where(eq(users.id, newUser.id));
    throw orgError;
  }

  const subscriptionValues: Record<string, unknown> = {
    organizationId: newOrg.id,
    planId: plan.id,
    currentPeriodStart: new Date(),
  };

  if (isProvider) {
    subscriptionValues.status = "active";
  } else {
    subscriptionValues.status = "trialing";
    subscriptionValues.trialEndsAt = trialEndsAt;
    subscriptionValues.currentPeriodEnd = trialEndsAt;
  }

  await db.insert(subscriptions).values(subscriptionValues as typeof subscriptions.$inferInsert);

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

  await db.insert(organizationMembers).values({
    organizationId: newOrg.id,
    userId: newUser.id,
    roleId: ownerRole.id,
    joinedAt: new Date(),
  });

  if (isProvider) {
    sendProviderWelcomeEmail(
      newUser.email,
      newUser.name || name,
      newOrg.name
    ).catch((err) => console.error("Failed to send provider welcome email:", err));
  } else {
    sendWelcomeEmail(
      newUser.email,
      newUser.name || name,
      newOrg.name,
      trialEndsAt,
      trialDays
    ).catch((err) => console.error("Failed to send welcome email:", err));
  }

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
      orgType,
    },
  });
}, { name: "POST /api/auth/register", critical: true });
