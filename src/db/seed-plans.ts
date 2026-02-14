import { db } from "./index";
import { subscriptionPlans, featureFlags } from "./schema";
import { eq } from "drizzle-orm";

// ============================================
// SUBSCRIPTION PLANS
// ============================================

const plans = [
  // Tenant plans (Wedding Planners)
  {
    name: "Comienzo",
    slug: "comienzo",
    description: "Gestiona hasta 3 eventos con herramientas esenciales.",
    orgType: "tenant" as const,
    priceMonthly: "14.50",
    priceYearly: "145.00",
    limits: { maxUsers: 1, maxEvents: 3, maxStorage: 500 },
    features: [
      "CRM", "Módulo de documentos", "Sección de finanzas",
      "Tareas colaborativas", "Comunicación centralizada",
      "Listado de proveedores", "Gestión de pagos y cobros",
    ],
    sortOrder: 1,
  },
  {
    name: "Estándar",
    slug: "estandar",
    description: "Automatiza tareas y colabora en varios eventos.",
    orgType: "tenant" as const,
    priceMonthly: "29.50",
    priceYearly: "295.00",
    limits: { maxUsers: 2, maxEvents: 10, maxStorage: 2000 },
    features: [
      "CRM", "Módulo de documentos", "Sección de finanzas",
      "Tareas colaborativas", "Comunicación centralizada",
      "Listado de proveedores", "Gestión de pagos y cobros",
      "Web del evento con RSVP", "Creación de procesos automático",
      "Listas de invitados",
    ],
    sortOrder: 2,
  },
  {
    name: "Agencia",
    slug: "agencia",
    description: "Control total de eventos, equipo y clientes.",
    orgType: "tenant" as const,
    priceMonthly: "49.50",
    priceYearly: "495.00",
    limits: { maxUsers: 5, maxEvents: 20, maxStorage: 5000 },
    features: [
      "CRM", "Módulo de documentos", "Sección de finanzas",
      "Tareas colaborativas", "Comunicación centralizada",
      "Listado de proveedores", "Gestión de pagos y cobros",
      "Web del evento con RSVP", "Creación de procesos automático",
      "Listas de invitados", "Orden del día automático",
      "Roles de usuarios",
    ],
    sortOrder: 3,
  },
  // Provider plans
  {
    name: "Gratis",
    slug: "provider_free",
    description: "Empieza a colaborar con planners sin coste ni compromiso.",
    orgType: "provider" as const,
    priceMonthly: "0",
    priceYearly: "0",
    limits: { maxUsers: 1, maxEvents: 1, maxStorage: 200 },
    features: [
      "Página de perfil profesional", "Integración con Instagram",
      "CRM", "Módulo de documentos", "Sección de finanzas",
      "Tareas colaborativas", "Comunicación centralizada",
      "Gestión de pagos y cobros", "Creación de procesos automático",
      "Orden del día automático",
    ],
    sortOrder: 10,
  },
  {
    name: "Pro",
    slug: "provider_pro",
    description: "Accede a funciones avanzadas y destaca en el ecosistema Hubents.",
    orgType: "provider" as const,
    priceMonthly: "14.50",
    priceYearly: "145.00",
    limits: { maxUsers: 3, maxEvents: -1, maxStorage: 2000 },
    features: [
      "Página de perfil profesional", "Integración con Instagram",
      "CRM", "Módulo de documentos", "Sección de finanzas",
      "Tareas colaborativas", "Comunicación centralizada",
      "Gestión de pagos y cobros", "Creación de procesos automático",
      "Orden del día automático",
      "Bloqueo inteligente de fechas", "Recomendado por planners",
      "Roles de usuarios",
    ],
    sortOrder: 11,
  },
];

// ============================================
// FEATURE FLAGS (gated by plan)
// ============================================

const featureFlagDefs = [
  // Tenant-gated features
  { key: "rsvp",              name: "Web evento con RSVP",           description: "Página pública del evento con confirmación de asistencia",     planSlugs: ["estandar", "agencia"] },
  { key: "auto_processes",    name: "Creación procesos automático",  description: "Crear tareas automáticamente desde plantillas",                 planSlugs: ["estandar", "agencia"] },
  { key: "guest_lists",       name: "Listas de invitados",           description: "Gestión completa de listas de invitados y mesas",               planSlugs: ["estandar", "agencia"] },
  { key: "auto_agenda",       name: "Orden del día automático",      description: "Generar automáticamente el cronograma del evento",              planSlugs: ["agencia", "provider_free", "provider_pro"] },
  { key: "custom_roles",      name: "Roles de usuarios",             description: "Crear y gestionar roles personalizados con permisos granulares", planSlugs: ["agencia", "provider_pro"] },
  // Provider-gated features
  { key: "smart_date_block",  name: "Bloqueo inteligente de fechas", description: "Bloquear fechas automáticamente al aceptar eventos",            planSlugs: ["provider_pro"] },
  { key: "recommended",       name: "Recomendado por planners",      description: "Aparecer como proveedor recomendado en búsquedas",              planSlugs: ["provider_pro"] },
];

// ============================================
// SEED FUNCTION
// ============================================

export async function seedPlansAndFeatures() {
  console.log("🌱 Seeding subscription plans...");

  const planIdMap: Record<string, number> = {};

  for (const plan of plans) {
    const existing = await db.query.subscriptionPlans.findFirst({
      where: eq(subscriptionPlans.slug, plan.slug),
    });

    if (existing) {
      // Update existing plan
      await db
        .update(subscriptionPlans)
        .set({
          name: plan.name,
          description: plan.description,
          orgType: plan.orgType,
          priceMonthly: plan.priceMonthly,
          priceYearly: plan.priceYearly,
          features: plan.features,
          limits: plan.limits,
          sortOrder: plan.sortOrder,
          updatedAt: new Date(),
        })
        .where(eq(subscriptionPlans.id, existing.id));
      planIdMap[plan.slug] = existing.id;
      console.log(`  ✅ Updated plan: ${plan.name} (id: ${existing.id})`);
    } else {
      const [inserted] = await db
        .insert(subscriptionPlans)
        .values({
          name: plan.name,
          slug: plan.slug,
          description: plan.description,
          orgType: plan.orgType,
          priceMonthly: plan.priceMonthly,
          priceYearly: plan.priceYearly,
          features: plan.features,
          limits: plan.limits,
          isActive: true,
          sortOrder: plan.sortOrder,
        })
        .returning();
      planIdMap[plan.slug] = inserted.id;
      console.log(`  ✅ Created plan: ${plan.name} (id: ${inserted.id})`);
    }
  }

  console.log(`✅ ${Object.keys(planIdMap).length} plans ready`);

  // Seed feature flags
  console.log("🌱 Seeding feature flags...");

  for (const ff of featureFlagDefs) {
    const planIds = ff.planSlugs
      .map((slug) => planIdMap[slug])
      .filter((id) => id !== undefined);

    const existing = await db.query.featureFlags.findFirst({
      where: eq(featureFlags.key, ff.key),
    });

    if (existing) {
      await db
        .update(featureFlags)
        .set({
          name: ff.name,
          description: ff.description,
          enabled: true,
          planIds,
          updatedAt: new Date(),
        })
        .where(eq(featureFlags.id, existing.id));
      console.log(`  ✅ Updated feature: ${ff.key}`);
    } else {
      await db
        .insert(featureFlags)
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

  console.log(`✅ ${featureFlagDefs.length} feature flags ready`);
  console.log("🌱 Plans & features seed complete!");
}

// Run if called directly
if (require.main === module) {
  seedPlansAndFeatures()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("Seed failed:", err);
      process.exit(1);
    });
}
