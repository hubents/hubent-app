import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { 
  subscriptionPlans, 
  roles, 
  permissions, 
  rolePermissions,
  platformSettings 
} from "../src/db/schema";

const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

async function seed() {
  console.log("🌱 Seeding database...");

  // Seed Subscription Plans
  console.log("📦 Creating subscription plans...");
  const plans = await db.insert(subscriptionPlans).values([
    {
      name: "Free",
      slug: "free",
      description: "Para empezar a explorar la plataforma",
      priceMonthly: "0",
      priceYearly: "0",
      features: ["Dashboard básico", "Soporte por email"],
      limits: { users: 1, events: 3, vendors: 5, storage: 100 },
      isActive: true,
      sortOrder: 0,
    },
    {
      name: "Pro",
      slug: "pro",
      description: "Para profesionales y pequeños equipos",
      priceMonthly: "29",
      priceYearly: "290",
      features: ["Todo en Free", "CRM completo", "Calendario", "Tareas", "Reportes básicos"],
      limits: { users: 5, events: 20, vendors: 50, storage: 1000 },
      isActive: true,
      sortOrder: 1,
    },
    {
      name: "Business",
      slug: "business",
      description: "Para empresas en crecimiento",
      priceMonthly: "79",
      priceYearly: "790",
      features: ["Todo en Pro", "API Access", "Reportes avanzados", "Integraciones", "Soporte prioritario"],
      limits: { users: 15, events: -1, vendors: -1, storage: 10000 },
      isActive: true,
      sortOrder: 2,
    },
    {
      name: "Enterprise",
      slug: "enterprise",
      description: "Para grandes organizaciones",
      priceMonthly: "199",
      priceYearly: "1990",
      features: ["Todo en Business", "SLA garantizado", "Soporte dedicado", "Onboarding personalizado", "Custom features"],
      limits: { users: -1, events: -1, vendors: -1, storage: -1 },
      isActive: true,
      sortOrder: 3,
    },
  ]).returning();
  console.log(`✅ Created ${plans.length} plans`);

  // Seed System Roles
  console.log("👥 Creating system roles...");
  const systemRoles = await db.insert(roles).values([
    { name: "Owner", slug: "owner", description: "Propietario de la organización", isSystem: true },
    { name: "Admin", slug: "admin", description: "Administrador con acceso completo", isSystem: true },
    { name: "Planner", slug: "planner", description: "Planificador de eventos", isSystem: true },
    { name: "Assistant", slug: "assistant", description: "Asistente con acceso limitado", isSystem: true },
    { name: "Client", slug: "client", description: "Cliente con acceso a su evento", isSystem: true },
    { name: "Vendor", slug: "vendor", description: "Proveedor con acceso a eventos asignados", isSystem: true },
  ]).returning();
  console.log(`✅ Created ${systemRoles.length} roles`);

  // Seed Permissions
  console.log("🔐 Creating permissions...");
  const allPermissions = await db.insert(permissions).values([
    // Organization permissions
    { name: "Ver configuración", slug: "org:settings:read", resource: "org", action: "settings:read" },
    { name: "Editar configuración", slug: "org:settings:write", resource: "org", action: "settings:write" },
    { name: "Ver billing", slug: "org:billing:read", resource: "org", action: "billing:read" },
    { name: "Gestionar billing", slug: "org:billing:write", resource: "org", action: "billing:write" },
    { name: "Ver miembros", slug: "org:members:read", resource: "org", action: "members:read" },
    { name: "Gestionar miembros", slug: "org:members:write", resource: "org", action: "members:write" },
    
    // Events permissions
    { name: "Ver eventos", slug: "events:read", resource: "events", action: "read" },
    { name: "Crear eventos", slug: "events:create", resource: "events", action: "create" },
    { name: "Editar eventos", slug: "events:update", resource: "events", action: "update" },
    { name: "Eliminar eventos", slug: "events:delete", resource: "events", action: "delete" },
    
    // Clients permissions
    { name: "Ver clientes", slug: "clients:read", resource: "clients", action: "read" },
    { name: "Crear clientes", slug: "clients:create", resource: "clients", action: "create" },
    { name: "Editar clientes", slug: "clients:update", resource: "clients", action: "update" },
    { name: "Eliminar clientes", slug: "clients:delete", resource: "clients", action: "delete" },
    
    // Vendors permissions
    { name: "Ver proveedores", slug: "vendors:read", resource: "vendors", action: "read" },
    { name: "Crear proveedores", slug: "vendors:create", resource: "vendors", action: "create" },
    { name: "Editar proveedores", slug: "vendors:update", resource: "vendors", action: "update" },
    { name: "Eliminar proveedores", slug: "vendors:delete", resource: "vendors", action: "delete" },
    
    // Tasks permissions
    { name: "Ver tareas", slug: "tasks:read", resource: "tasks", action: "read" },
    { name: "Crear tareas", slug: "tasks:create", resource: "tasks", action: "create" },
    { name: "Editar tareas", slug: "tasks:update", resource: "tasks", action: "update" },
    { name: "Completar tareas", slug: "tasks:complete", resource: "tasks", action: "complete" },
    { name: "Eliminar tareas", slug: "tasks:delete", resource: "tasks", action: "delete" },
    
    // Payments permissions
    { name: "Ver pagos", slug: "payments:read", resource: "payments", action: "read" },
    { name: "Crear pagos", slug: "payments:create", resource: "payments", action: "create" },
    { name: "Editar pagos", slug: "payments:update", resource: "payments", action: "update" },
    { name: "Eliminar pagos", slug: "payments:delete", resource: "payments", action: "delete" },
  ]).returning();
  console.log(`✅ Created ${allPermissions.length} permissions`);

  // Assign permissions to roles
  console.log("🔗 Assigning permissions to roles...");
  
  const ownerRole = systemRoles.find(r => r.slug === "owner")!;
  const adminRole = systemRoles.find(r => r.slug === "admin")!;
  const plannerRole = systemRoles.find(r => r.slug === "planner")!;
  const assistantRole = systemRoles.find(r => r.slug === "assistant")!;

  // Owner gets all permissions
  for (const perm of allPermissions) {
    await db.insert(rolePermissions).values({ roleId: ownerRole.id, permissionId: perm.id });
  }

  // Admin gets all except billing:write
  const adminPerms = allPermissions.filter(p => p.slug !== "org:billing:write");
  for (const perm of adminPerms) {
    await db.insert(rolePermissions).values({ roleId: adminRole.id, permissionId: perm.id });
  }

  // Planner gets events, clients, vendors, tasks, payments read/create/update
  const plannerPerms = allPermissions.filter(p => 
    !p.slug.startsWith("org:") && 
    !p.slug.includes(":delete")
  );
  for (const perm of plannerPerms) {
    await db.insert(rolePermissions).values({ roleId: plannerRole.id, permissionId: perm.id });
  }

  // Assistant gets read permissions and tasks:complete
  const assistantPerms = allPermissions.filter(p => 
    p.action === "read" || p.slug === "tasks:complete"
  );
  for (const perm of assistantPerms) {
    await db.insert(rolePermissions).values({ roleId: assistantRole.id, permissionId: perm.id });
  }

  console.log("✅ Permissions assigned to roles");

  // Seed Platform Settings
  console.log("⚙️ Creating platform settings...");
  await db.insert(platformSettings).values([
    { key: "platform_name", value: "HubEnts", type: "string", description: "Nombre de la plataforma" },
    { key: "platform_url", value: "https://hubents.com", type: "string", description: "URL de la plataforma" },
    { key: "support_email", value: "soporte@hubents.com", type: "string", description: "Email de soporte" },
    { key: "allow_registration", value: "true", type: "boolean", description: "Permitir registro de nuevos usuarios" },
    { key: "require_email_verification", value: "true", type: "boolean", description: "Requerir verificación de email" },
  ]);
  console.log("✅ Platform settings created");

  console.log("\n🎉 Seed completed successfully!");
}

seed().catch(console.error);
