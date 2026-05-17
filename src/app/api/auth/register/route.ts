import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, organizations, subscriptions, subscriptionPlans, organizationMembers, roles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, validatePassword } from "@/lib/password";
import { sendWelcomeEmail, sendProviderWelcomeEmail } from "@/lib/email";
import { withMonitoring } from "@/lib/monitoring";
import { trackPlatformLead } from "@/lib/platform-leads";
import { seedProviderDemoData } from "@/lib/demo-seed-provider";

const VALID_ORG_TYPES = ["tenant", "provider"] as const;
type OrgType = (typeof VALID_ORG_TYPES)[number];

const FREE_EMAIL_DOMAINS = new Set([
  "gmail.com","googlemail.com","yahoo.com","yahoo.es","yahoo.co.uk","yahoo.fr","yahoo.de",
  "hotmail.com","hotmail.es","hotmail.co.uk","hotmail.fr","hotmail.de","hotmail.it",
  "outlook.com","outlook.es","outlook.fr","outlook.de","outlook.it",
  "live.com","live.es","live.fr","live.co.uk",
  "icloud.com","me.com","mac.com",
  "protonmail.com","proton.me",
  "aol.com","msn.com","mail.com",
  "gmx.com","gmx.net","gmx.de","web.de",
  "yandex.com","yandex.ru","yandex.es",
  "zohomail.com","163.com","126.com","qq.com",
]);

function isBusinessEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  return domain.length > 0 && !FREE_EMAIL_DOMAINS.has(domain);
}

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
    // Auto-verificar si el email es de dominio de empresa (no proveedor gratuito)
    orgValues.verificationStatus = isBusinessEmail(email) ? "verified" : "unverified";
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

  // Seed demo data for new provider accounts (fire-and-forget)
  if (isProvider) {
    seedProviderDemoData(newOrg.id, newUser.id).catch((err) =>
      console.error("seedProviderDemoData failed:", err)
    );
  }

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

  trackPlatformLead({
    kind: "new_user",
    name: newUser.name || name,
    email: newUser.email,
    companyName: newOrg.name,
    orgType,
    createdByName: newUser.name || name,
  }).catch((err) => console.error("trackPlatformLead failed:", err));

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
