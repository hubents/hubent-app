import { db } from "@/db";
import { roles, subscriptionPlans, permissions } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * System initialization functions
 * These ensure required data exists in the database
 */

// System roles that must exist
const SYSTEM_ROLES = [
  { name: "Owner", slug: "owner", description: "Propietario - acceso completo a la organización" },
  { name: "Admin", slug: "admin", description: "Administrador - gestión completa excepto facturación" },
  { name: "Planner", slug: "planner", description: "Planificador - gestión de eventos y tareas" },
  { name: "Assistant", slug: "assistant", description: "Asistente - apoyo en tareas asignadas" },
  { name: "Accountant", slug: "accountant", description: "Contador - acceso a finanzas y reportes" },
  { name: "Viewer", slug: "viewer", description: "Visualizador - solo lectura" },
  // Provider roles
  { name: "Provider Owner", slug: "provider_owner", description: "Dueño de la organización proveedora" },
  { name: "Provider Admin", slug: "provider_admin", description: "Administrador del proveedor" },
  { name: "Provider Technician", slug: "provider_tech", description: "Técnico del proveedor - acceso a tareas y eventos asignados" },
];

// Default subscription plans
const DEFAULT_PLANS = [
  {
    name: "Starter",
    slug: "starter",
    description: "Plan gratuito para comenzar",
    priceMonthly: "0",
    priceYearly: "0",
    features: ["1 evento activo", "2 usuarios", "50 invitados RSVP", "500MB almacenamiento"],
    limits: { maxUsers: 2, maxEvents: 1, maxStorage: 500 },
    sortOrder: 0,
  },
  {
    name: "Pro",
    slug: "pro",
    description: "Para planificadores profesionales",
    priceMonthly: "29",
    priceYearly: "290",
    features: ["10 eventos activos", "10 usuarios", "500 invitados RSVP", "5GB almacenamiento", "Soporte prioritario"],
    limits: { maxUsers: 10, maxEvents: 10, maxStorage: 5000 },
    sortOrder: 1,
  },
  {
    name: "Business",
    slug: "business",
    description: "Para empresas de eventos",
    priceMonthly: "79",
    priceYearly: "790",
    features: ["Eventos ilimitados", "Usuarios ilimitados", "Invitados ilimitados", "50GB almacenamiento", "API access", "Soporte 24/7"],
    limits: { maxUsers: -1, maxEvents: -1, maxStorage: 50000 },
    sortOrder: 2,
  },
];

// Base permissions
const BASE_PERMISSIONS = [
  // Events
  { name: "Ver eventos", slug: "events:read", resource: "events", action: "read" },
  { name: "Crear eventos", slug: "events:create", resource: "events", action: "create" },
  { name: "Editar eventos", slug: "events:update", resource: "events", action: "update" },
  { name: "Eliminar eventos", slug: "events:delete", resource: "events", action: "delete" },
  // Tasks
  { name: "Ver tareas", slug: "tasks:read", resource: "tasks", action: "read" },
  { name: "Crear tareas", slug: "tasks:create", resource: "tasks", action: "create" },
  { name: "Editar tareas", slug: "tasks:update", resource: "tasks", action: "update" },
  { name: "Eliminar tareas", slug: "tasks:delete", resource: "tasks", action: "delete" },
  // Vendors
  { name: "Ver proveedores", slug: "vendors:read", resource: "vendors", action: "read" },
  { name: "Crear proveedores", slug: "vendors:create", resource: "vendors", action: "create" },
  { name: "Editar proveedores", slug: "vendors:update", resource: "vendors", action: "update" },
  { name: "Eliminar proveedores", slug: "vendors:delete", resource: "vendors", action: "delete" },
  // Team
  { name: "Ver equipo", slug: "team:read", resource: "team", action: "read" },
  { name: "Invitar miembros", slug: "team:invite", resource: "team", action: "invite" },
  { name: "Gestionar roles", slug: "team:manage", resource: "team", action: "manage" },
  // Finance
  { name: "Ver finanzas", slug: "finance:read", resource: "finance", action: "read" },
  { name: "Crear documentos financieros", slug: "finance:create", resource: "finance", action: "create" },
  { name: "Gestionar pagos", slug: "finance:manage", resource: "finance", action: "manage" },
  // CRM
  { name: "Ver CRM", slug: "crm:read", resource: "crm", action: "read" },
  { name: "Gestionar CRM", slug: "crm:manage", resource: "crm", action: "manage" },
  // Settings
  { name: "Ver configuración", slug: "settings:read", resource: "settings", action: "read" },
  { name: "Editar configuración", slug: "settings:update", resource: "settings", action: "update" },
];

/**
 * Initialize system roles
 */
export async function initializeSystemRoles(): Promise<{ created: string[]; existing: string[] }> {
  const created: string[] = [];
  const existing: string[] = [];

  for (const roleData of SYSTEM_ROLES) {
    const existingRole = await db.query.roles.findFirst({
      where: eq(roles.slug, roleData.slug),
    });

    if (!existingRole) {
      await db.insert(roles).values({
        ...roleData,
        isSystem: true,
      });
      created.push(roleData.slug);
    } else {
      existing.push(roleData.slug);
    }
  }

  return { created, existing };
}

/**
 * Initialize subscription plans
 */
export async function initializeSubscriptionPlans(): Promise<{ created: string[]; existing: string[] }> {
  const created: string[] = [];
  const existing: string[] = [];

  for (const planData of DEFAULT_PLANS) {
    const existingPlan = await db.query.subscriptionPlans.findFirst({
      where: eq(subscriptionPlans.slug, planData.slug),
    });

    if (!existingPlan) {
      await db.insert(subscriptionPlans).values({
        ...planData,
        isActive: true,
      });
      created.push(planData.slug);
    } else {
      existing.push(planData.slug);
    }
  }

  return { created, existing };
}

/**
 * Initialize base permissions
 */
export async function initializePermissions(): Promise<{ created: string[]; existing: string[] }> {
  const created: string[] = [];
  const existing: string[] = [];

  for (const permData of BASE_PERMISSIONS) {
    const existingPerm = await db.query.permissions.findFirst({
      where: eq(permissions.slug, permData.slug),
    });

    if (!existingPerm) {
      await db.insert(permissions).values(permData);
      created.push(permData.slug);
    } else {
      existing.push(permData.slug);
    }
  }

  return { created, existing };
}

/**
 * Initialize all system data
 */
export async function initializeSystem(): Promise<{
  roles: { created: string[]; existing: string[] };
  plans: { created: string[]; existing: string[] };
  permissions: { created: string[]; existing: string[] };
}> {
  const [rolesResult, plansResult, permissionsResult] = await Promise.all([
    initializeSystemRoles(),
    initializeSubscriptionPlans(),
    initializePermissions(),
  ]);

  return {
    roles: rolesResult,
    plans: plansResult,
    permissions: permissionsResult,
  };
}

/**
 * Check if system is initialized
 */
export async function isSystemInitialized(): Promise<boolean> {
  const ownerRole = await db.query.roles.findFirst({
    where: eq(roles.slug, "owner"),
  });

  const starterPlan = await db.query.subscriptionPlans.findFirst({
    where: eq(subscriptionPlans.slug, "starter"),
  });

  return !!ownerRole && !!starterPlan;
}
