import { db } from "@/db";
import { roles, subscriptionPlans, permissions, rolePermissions } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

/**
 * System initialization functions
 * These ensure required data exists in the database
 */

// System roles that must exist
const SYSTEM_ROLES = [
  { name: "Owner", slug: "owner", description: "Propietario - acceso completo a la organización" },
  { name: "Admin", slug: "admin", description: "Administrador - gestión completa excepto facturación" },
  { name: "Planner", slug: "planner", description: "Planificador - gestión de eventos y tareas" },
  { name: "Assistant", slug: "assistant", description: "Asistente - apoyo en tareas asignadas", eventScoped: true },
  { name: "Accountant", slug: "accountant", description: "Contador - acceso a finanzas y reportes" },
  { name: "Viewer", slug: "viewer", description: "Visualizador - solo lectura", eventScoped: true },
  { name: "Client", slug: "client", description: "Cliente - acceso limitado a eventos asignados", eventScoped: true },
  // Provider roles
  { name: "Provider Owner", slug: "provider_owner", description: "Dueño de la organización proveedora" },
  { name: "Provider Admin", slug: "provider_admin", description: "Administrador del proveedor" },
  { name: "Provider Technician", slug: "provider_tech", description: "Técnico del proveedor - acceso a tareas y eventos asignados" },
];

// Canonical plans — must match scripts/seed-plans.ts.
// system-init only ensures a minimal starter plan exists so registration works.
// Full plan catalog (standard, agency, provider-*) is managed by seed-plans.ts.
const DEFAULT_PLANS = [
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
    sortOrder: 1,
    trialDays: 14,
  },
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
    sortOrder: 10,
    trialDays: 0,
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
  // Forms
  { name: "Ver formularios", slug: "forms:read", resource: "forms", action: "read" },
  { name: "Crear formularios", slug: "forms:create", resource: "forms", action: "create" },
  { name: "Editar formularios", slug: "forms:update", resource: "forms", action: "update" },
  { name: "Eliminar formularios", slug: "forms:delete", resource: "forms", action: "delete" },
  // Integrations
  { name: "Ver integraciones", slug: "integrations:read", resource: "integrations", action: "read" },
  { name: "Gestionar integraciones", slug: "integrations:manage", resource: "integrations", action: "manage" },
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

// Canonical role → permission slug mapping
// owner, admin, provider_owner have bypass — no rolePermissions needed
const ROLE_PERMISSION_MAP: Record<string, string[]> = {
  planner: [
    "events:read", "events:create", "events:update",
    "tasks:read", "tasks:create", "tasks:update", "tasks:delete",
    "vendors:read", "vendors:create", "vendors:update",
    "team:read",
    "finance:read",
    "crm:read", "crm:manage",
    "settings:read",
    "forms:read", "forms:create", "forms:update", "forms:delete",
    "integrations:read",
  ],
  assistant: [
    "events:read",
    "tasks:read", "tasks:create", "tasks:update",
    "vendors:read",
    "forms:read",
  ],
  accountant: [
    "events:read",
    "vendors:read",
    "finance:read", "finance:create", "finance:manage",
    "crm:read",
    "settings:read",
    "integrations:read",
  ],
  viewer: [
    "events:read",
    "tasks:read",
    "vendors:read",
    "finance:read",
    "forms:read",
  ],
  client: [
    "events:read",
    "tasks:read",
  ],
  provider_admin: [
    "events:read",
    "tasks:read", "tasks:create", "tasks:update", "tasks:delete",
    "vendors:read", "vendors:create", "vendors:update",
    "team:read", "team:invite", "team:manage",
    "finance:read", "finance:create", "finance:manage",
    "crm:read", "crm:manage",
    "settings:read", "settings:update",
    "forms:read", "forms:create", "forms:update", "forms:delete",
    "integrations:read", "integrations:manage",
  ],
  provider_tech: [
    "events:read",
    "tasks:read", "tasks:create", "tasks:update",
    "vendors:read",
    "finance:read",
    "forms:read",
    "team:read",
  ],
};

/**
 * Initialize role permissions for system roles.
 * Only inserts missing permissions — does NOT delete existing ones.
 * For a full reset, use scripts/hard-reset-permissions.ts
 */
export async function initializeRolePermissions(): Promise<{ updated: string[]; skipped: string[] }> {
  const updated: string[] = [];
  const skipped: string[] = [];

  const allPerms = await db.select({ id: permissions.id, slug: permissions.slug }).from(permissions);
  const permIdBySlug: Record<string, number> = {};
  for (const p of allPerms) {
    permIdBySlug[p.slug] = p.id;
  }

  for (const [roleSlug, permSlugs] of Object.entries(ROLE_PERMISSION_MAP)) {
    const role = await db.query.roles.findFirst({
      where: and(eq(roles.slug, roleSlug), isNull(roles.organizationId)),
    });

    if (!role) {
      skipped.push(roleSlug);
      continue;
    }

    // Get existing permission IDs for this role
    const existing = await db
      .select({ permissionId: rolePermissions.permissionId })
      .from(rolePermissions)
      .where(eq(rolePermissions.roleId, role.id));
    const existingSet = new Set(existing.map((e) => e.permissionId));

    // Insert only missing
    const toInsert = permSlugs
      .map((slug) => permIdBySlug[slug])
      .filter((id): id is number => id !== undefined && !existingSet.has(id));

    if (toInsert.length > 0) {
      await db.insert(rolePermissions).values(
        toInsert.map((permissionId) => ({ roleId: role.id, permissionId }))
      );
      updated.push(roleSlug);
    } else {
      skipped.push(roleSlug);
    }
  }

  return { updated, skipped };
}

/**
 * Initialize all system data
 */
export async function initializeSystem(): Promise<{
  roles: { created: string[]; existing: string[] };
  plans: { created: string[]; existing: string[] };
  permissions: { created: string[]; existing: string[] };
  rolePermissions: { updated: string[]; skipped: string[] };
}> {
  const [rolesResult, plansResult, permissionsResult] = await Promise.all([
    initializeSystemRoles(),
    initializeSubscriptionPlans(),
    initializePermissions(),
  ]);

  // Must run after roles and permissions are created
  const rolePermissionsResult = await initializeRolePermissions();

  return {
    roles: rolesResult,
    plans: plansResult,
    permissions: permissionsResult,
    rolePermissions: rolePermissionsResult,
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
