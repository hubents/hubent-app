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
    description: "Perfil gratuito para proveedores. Visibilidad básica en el marketplace.",
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

async function seedPlans() {
  console.log("🌱 Seeding subscription plans...\n");

  for (const plan of PLANS) {
    const existing = await db.query.subscriptionPlans.findFirst({
      where: eq(schema.subscriptionPlans.slug, plan.slug),
    });

    if (existing) {
      // Update existing plan
      await db
        .update(schema.subscriptionPlans)
        .set({
          ...plan,
          updatedAt: new Date(),
        })
        .where(eq(schema.subscriptionPlans.slug, plan.slug));
      console.log(`  ✅ Updated: ${plan.name} (${plan.orgType}) - €${plan.priceMonthly}/mes`);
    } else {
      // Insert new plan
      await db.insert(schema.subscriptionPlans).values(plan);
      console.log(`  ✅ Created: ${plan.name} (${plan.orgType}) - €${plan.priceMonthly}/mes`);
    }
  }

  console.log("\n✨ Seed complete! Plans ready.\n");

  // Show summary
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
