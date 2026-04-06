import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as schema from "../src/db/schema";
import { eq } from "drizzle-orm";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql, { schema });

const PLANS = [
  // Wedding Planners
  {
    name: "Starter",
    slug: "starter",
    description: "Para wedding planners que comienzan. Gestiona hasta 3 eventos con herramientas esenciales.",
    orgType: "tenant" as const,
    priceMonthly: "14.50",
    priceYearly: "145.00",
    currency: "EUR",
    features: [
      "CRM de contactos",
      "Documentos financieros",
      "Finanzas y pagos",
      "Gestión de tareas",
      "Chat interno",
      "Directorio de proveedores",
      "Cobros con Stripe",
    ],
    limits: { maxUsers: 1, maxEvents: 3, maxStorage: 500 },
    isActive: true,
    highlighted: false,
    sortOrder: 1,
    trialDays: 14,
  },
  {
    name: "Standard",
    slug: "standard",
    description: "Para planners en crecimiento. Incluye RSVP, listas de invitados y automatizaciones.",
    orgType: "tenant" as const,
    priceMonthly: "29.50",
    priceYearly: "295.00",
    currency: "EUR",
    features: [
      "Todo en Starter",
      "Web RSVP personalizada",
      "Procesos automáticos",
      "Listas de invitados",
      "Agenda de eventos",
      "Roles de equipo",
    ],
    limits: { maxUsers: 2, maxEvents: 10, maxStorage: 2000 },
    isActive: true,
    highlighted: true,
    sortOrder: 2,
    trialDays: 14,
  },
  {
    name: "Agency",
    slug: "agency",
    description: "Para agencias y equipos grandes. Todas las funcionalidades sin límites.",
    orgType: "tenant" as const,
    priceMonthly: "49.50",
    priceYearly: "495.00",
    currency: "EUR",
    features: [
      "Todo en Standard",
      "Roles de usuario avanzados",
      "Soporte prioritario",
    ],
    limits: { maxUsers: 5, maxEvents: 20, maxStorage: 5000 },
    isActive: true,
    highlighted: false,
    sortOrder: 3,
    trialDays: 14,
  },
  // Providers/Suppliers
  {
    name: "Free",
    slug: "provider-free",
    description: "Perfil gratuito para proveedores. Visibilidad básica en Partners.",
    orgType: "provider" as const,
    priceMonthly: "0",
    priceYearly: "0",
    currency: "EUR",
    features: [
      "Perfil de proveedor",
      "Instagram integrado",
      "CRM de contactos",
      "Documentos financieros",
      "Finanzas y pagos",
      "Gestión de tareas",
      "Chat interno",
      "Procesos automáticos",
      "Agenda",
    ],
    limits: { maxUsers: 1, maxEvents: 1, maxStorage: 200 },
    isActive: true,
    highlighted: false,
    sortOrder: 10,
    trialDays: 0,
  },
  {
    name: "Pro",
    slug: "provider-pro",
    description: "Proveedor destacado con bloqueo inteligente de fechas y visibilidad premium.",
    orgType: "provider" as const,
    priceMonthly: "14.50",
    priceYearly: "145.00",
    currency: "EUR",
    features: [
      "Todo en Free",
      "Bloqueo inteligente de fechas",
      "Proveedor recomendado",
      "Roles de usuario",
    ],
    limits: { maxUsers: 3, maxEvents: -1, maxStorage: 2000 },
    isActive: true,
    highlighted: true,
    sortOrder: 11,
    trialDays: 14,
  },
];

const FEATURE_FLAGS = [
  { key: "rsvp",             name: "Web evento con RSVP",           description: "Página pública del evento con confirmación de asistencia",      planSlugs: ["standard", "agency"] },
  { key: "auto_processes",   name: "Creación procesos automático",  description: "Crear tareas automáticamente desde plantillas",                  planSlugs: ["standard", "agency"] },
  { key: "guest_lists",      name: "Listas de invitados",           description: "Gestión completa de listas de invitados y mesas",                planSlugs: ["standard", "agency"] },
  { key: "auto_agenda",      name: "Orden del día automático",      description: "Generar automáticamente el cronograma del evento",               planSlugs: ["agency", "provider-free", "provider-pro"] },
  { key: "custom_roles",     name: "Roles de usuarios",             description: "Crear y gestionar roles personalizados con permisos granulares", planSlugs: ["agency", "provider-pro"] },
  { key: "smart_date_block", name: "Bloqueo inteligente de fechas", description: "Bloquear fechas automáticamente al aceptar eventos",             planSlugs: ["provider-pro"] },
  { key: "recommended",      name: "Recomendado por planners",      description: "Aparecer como proveedor recomendado en búsquedas",               planSlugs: ["provider-pro"] },
  // Plan-driven capabilities (replaces static tenant-types.ts config)
  { key: "public_profile",   name: "Perfil público",                description: "Editar y publicar un perfil público en Partners",          planSlugs: ["starter", "standard", "agency", "provider-free", "provider-pro"] },
  { key: "portfolio",        name: "Portfolio",                     description: "Gestionar un portfolio de imágenes y vídeos",                    planSlugs: ["provider-free", "provider-pro"] },
];

async function seedPlans() {
  console.log("🌱 Seeding subscription plans...\n");

  const planIdMap: Record<string, number> = {};

  for (const plan of PLANS) {
    const existing = await db.query.subscriptionPlans.findFirst({
      where: eq(schema.subscriptionPlans.slug, plan.slug),
    });

    if (existing) {
      await db
        .update(schema.subscriptionPlans)
        .set({
          ...plan,
          updatedAt: new Date(),
        })
        .where(eq(schema.subscriptionPlans.slug, plan.slug));
      planIdMap[plan.slug] = existing.id;
      console.log(`  ✅ Updated: ${plan.name} (${plan.orgType}) - €${plan.priceMonthly}/mes`);
    } else {
      const [inserted] = await db
        .insert(schema.subscriptionPlans)
        .values(plan)
        .returning();
      planIdMap[plan.slug] = inserted.id;
      console.log(`  ✅ Created: ${plan.name} (${plan.orgType}) - €${plan.priceMonthly}/mes`);
    }
  }

  // Seed feature flags
  console.log("\n🌱 Seeding feature flags...\n");

  for (const ff of FEATURE_FLAGS) {
    const planIds = ff.planSlugs
      .map((slug) => planIdMap[slug])
      .filter((id): id is number => id !== undefined);

    const existing = await db.query.featureFlags.findFirst({
      where: eq(schema.featureFlags.key, ff.key),
    });

    if (existing) {
      await db
        .update(schema.featureFlags)
        .set({
          name: ff.name,
          description: ff.description,
          enabled: true,
          planIds,
          updatedAt: new Date(),
        })
        .where(eq(schema.featureFlags.id, existing.id));
      console.log(`  ✅ Updated feature: ${ff.key}`);
    } else {
      await db
        .insert(schema.featureFlags)
        .values({
          key: ff.key,
          name: ff.name,
          description: ff.description,
          enabled: true,
          planIds,
        });
      console.log(`  ✅ Created feature: ${ff.key}`);
    }
  }

  console.log("\n✨ Seed complete! Plans & features ready.\n");

  const allPlans = await db
    .select()
    .from(schema.subscriptionPlans)
    .orderBy(schema.subscriptionPlans.sortOrder);

  console.log("📋 All plans in DB:");
  console.log("─".repeat(70));
  for (const p of allPlans) {
    const status = p.isActive ? "🟢" : "🔴";
    const star = p.highlighted ? "⭐" : "  ";
    console.log(
      `  ${status} ${star} ${p.name.padEnd(12)} | ${p.orgType?.padEnd(8)} | €${p.priceMonthly}/mes | €${p.priceYearly}/año | ${p.limits?.maxUsers}u/${p.limits?.maxEvents}e`
    );
  }
}

seedPlans().catch(console.error);
