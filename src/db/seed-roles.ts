import { db } from "./index";
import { roles, permissions, rolePermissions, users, platformAdmins } from "./schema";
import { eq } from "drizzle-orm";

// ============================================
// DEFAULT PERMISSIONS
// ============================================

const defaultPermissions = [
  // Events
  { name: "View Events", slug: "events:read", resource: "events", action: "read", description: "View events" },
  { name: "Create Events", slug: "events:create", resource: "events", action: "create", description: "Create new events" },
  { name: "Edit Events", slug: "events:update", resource: "events", action: "update", description: "Edit events" },
  { name: "Delete Events", slug: "events:delete", resource: "events", action: "delete", description: "Delete events" },
  
  // Tasks
  { name: "View Tasks", slug: "tasks:read", resource: "tasks", action: "read", description: "View tasks" },
  { name: "Create Tasks", slug: "tasks:create", resource: "tasks", action: "create", description: "Create new tasks" },
  { name: "Edit Tasks", slug: "tasks:update", resource: "tasks", action: "update", description: "Edit tasks" },
  { name: "Delete Tasks", slug: "tasks:delete", resource: "tasks", action: "delete", description: "Delete tasks" },
  { name: "Comment on Tasks", slug: "tasks:comment", resource: "tasks", action: "comment", description: "Add comments to tasks" },
  
  // Vendors
  { name: "View Vendors", slug: "vendors:read", resource: "vendors", action: "read", description: "View vendors" },
  { name: "Create Vendors", slug: "vendors:create", resource: "vendors", action: "create", description: "Create new vendors" },
  { name: "Edit Vendors", slug: "vendors:update", resource: "vendors", action: "update", description: "Edit vendors" },
  { name: "Delete Vendors", slug: "vendors:delete", resource: "vendors", action: "delete", description: "Delete vendors" },
  
  // Clients
  { name: "View Clients", slug: "clients:read", resource: "clients", action: "read", description: "View clients" },
  { name: "Create Clients", slug: "clients:create", resource: "clients", action: "create", description: "Create new clients" },
  { name: "Edit Clients", slug: "clients:update", resource: "clients", action: "update", description: "Edit clients" },
  { name: "Delete Clients", slug: "clients:delete", resource: "clients", action: "delete", description: "Delete clients" },
  
  // CRM (Leads, Companies, People)
  { name: "View CRM", slug: "crm:read", resource: "crm", action: "read", description: "View CRM data" },
  { name: "Manage CRM", slug: "crm:manage", resource: "crm", action: "manage", description: "Full CRM access" },
  
  // Finance
  { name: "View Finance", slug: "finance:read", resource: "finance", action: "read", description: "View financial data" },
  { name: "Create Documents", slug: "finance:create", resource: "finance", action: "create", description: "Create invoices/quotes" },
  { name: "Manage Finance", slug: "finance:manage", resource: "finance", action: "manage", description: "Full finance access" },
  
  // Guests & RSVP
  { name: "View Guests", slug: "guests:read", resource: "guests", action: "read", description: "View guest list" },
  { name: "Manage Guests", slug: "guests:manage", resource: "guests", action: "manage", description: "Manage guest list" },
  
  // Team
  { name: "View Team", slug: "team:read", resource: "team", action: "read", description: "View team members" },
  { name: "Invite Members", slug: "team:invite", resource: "team", action: "invite", description: "Invite new members" },
  { name: "Manage Team", slug: "team:manage", resource: "team", action: "manage", description: "Full team management" },
  
  // Settings
  { name: "View Settings", slug: "settings:read", resource: "settings", action: "read", description: "View settings" },
  { name: "Manage Settings", slug: "settings:manage", resource: "settings", action: "manage", description: "Manage settings" },
];

// ============================================
// DEFAULT ROLES WITH PERMISSIONS
// ============================================

const defaultRoles = [
  {
    name: "Owner",
    slug: "owner",
    description: "Full control of the organization",
    isSystem: true,
    permissions: ["*"], // All permissions
  },
  {
    name: "Admin",
    slug: "admin",
    description: "Administrative access",
    isSystem: true,
    permissions: [
      "events:*", "tasks:*", "vendors:*", "clients:*",
      "crm:*", "finance:*", "guests:*", "team:*", "settings:*"
    ],
  },
  {
    name: "Planner",
    slug: "planner",
    description: "Event planner with full project access",
    isSystem: true,
    permissions: [
      "events:read", "events:create", "events:update",
      "tasks:read", "tasks:create", "tasks:update", "tasks:comment",
      "vendors:read", "vendors:create", "vendors:update",
      "clients:read", "clients:create", "clients:update",
      "crm:read", "crm:manage",
      "finance:read", "finance:create",
      "guests:read", "guests:manage",
      "team:read", "team:invite",
    ],
  },
  {
    name: "Assistant",
    slug: "assistant",
    description: "Planner assistant with limited access",
    isSystem: true,
    permissions: [
      "events:read", "events:update",
      "tasks:read", "tasks:create", "tasks:update", "tasks:comment",
      "vendors:read",
      "clients:read",
      "guests:read", "guests:manage",
      "finance:read",
    ],
  },
  {
    name: "Accountant",
    slug: "accountant",
    description: "Finance-only access",
    isSystem: true,
    permissions: [
      "events:read",
      "finance:read", "finance:create", "finance:manage",
      "clients:read",
      "vendors:read",
    ],
  },
  {
    name: "Viewer",
    slug: "viewer",
    description: "Read-only access",
    isSystem: true,
    permissions: [
      "events:read",
      "tasks:read",
      "vendors:read",
      "clients:read",
      "guests:read",
      "finance:read",
    ],
  },
  {
    name: "Vendor",
    slug: "vendor",
    description: "External vendor with portal access",
    isSystem: true,
    permissions: [
      "tasks:read", "tasks:comment",
      "events:read",
    ],
  },
  {
    name: "Client",
    slug: "client",
    description: "Client (novios) with portal access",
    isSystem: true,
    permissions: [
      "events:read", "events:update",
      "tasks:read", "tasks:comment",
      "vendors:read",
      "guests:read", "guests:manage",
      "finance:read",
    ],
  },
  {
    name: "Member",
    slug: "member",
    description: "Basic organization member with read access",
    isSystem: true,
    permissions: [
      "events:read",
      "tasks:read", "tasks:comment",
      "vendors:read",
      "clients:read",
    ],
  },
];

// ============================================
// SEED FUNCTION
// ============================================

export async function seedRolesAndPermissions(organizationId?: number) {
  console.log("🌱 Seeding roles and permissions...");

  // Insert permissions
  const insertedPermissions: Record<string, number> = {};
  
  for (const perm of defaultPermissions) {
    const existing = await db.query.permissions.findFirst({
      where: (p, { eq }) => eq(p.slug, perm.slug),
    });

    if (existing) {
      insertedPermissions[perm.slug] = existing.id;
    } else {
      const [inserted] = await db.insert(permissions).values(perm).returning();
      insertedPermissions[perm.slug] = inserted.id;
    }
  }

  console.log(`✅ ${Object.keys(insertedPermissions).length} permissions ready`);

  // Insert roles (system roles have no organizationId)
  for (const role of defaultRoles) {
    const existing = await db.query.roles.findFirst({
      where: (r, { eq, and, isNull }) => 
        and(
          eq(r.slug, role.slug),
          role.isSystem ? isNull(r.organizationId) : undefined
        ),
    });

    let roleId: number;

    if (existing) {
      roleId = existing.id;
    } else {
      const [inserted] = await db.insert(roles).values({
        name: role.name,
        slug: role.slug,
        description: role.description,
        isSystem: role.isSystem,
        organizationId: role.isSystem ? null : organizationId,
      }).returning();
      roleId = inserted.id;
    }

    // Assign permissions to role
    for (const permSlug of role.permissions) {
      if (permSlug === "*") {
        // All permissions
        for (const permId of Object.values(insertedPermissions)) {
          try {
            await db.insert(rolePermissions).values({
              roleId,
              permissionId: permId,
            }).onConflictDoNothing();
          } catch {
            // Ignore duplicates
          }
        }
      } else if (permSlug.endsWith(":*")) {
        // Wildcard for resource (e.g., "events:*")
        const resource = permSlug.replace(":*", "");
        for (const [slug, permId] of Object.entries(insertedPermissions)) {
          if (slug.startsWith(`${resource}:`)) {
            try {
              await db.insert(rolePermissions).values({
                roleId,
                permissionId: permId,
              }).onConflictDoNothing();
            } catch {
              // Ignore duplicates
            }
          }
        }
      } else {
        // Specific permission
        const permId = insertedPermissions[permSlug];
        if (permId) {
          try {
            await db.insert(rolePermissions).values({
              roleId,
              permissionId: permId,
            }).onConflictDoNothing();
          } catch {
            // Ignore duplicates
          }
        }
      }
    }
  }

  console.log(`✅ ${defaultRoles.length} roles ready`);
  console.log("🌱 Seed complete!");
}

// ============================================
// SEED SUPER ADMIN
// ============================================

export async function seedSuperAdmin(
  email: string = "german@napsix.ai",
  password: string = "Hubents2026.!"
) {
  console.log(`🔐 Setting up super admin for: ${email}`);

  // Hash the password
  const bcrypt = await import("bcryptjs");
  const passwordHash = await bcrypt.hash(password, 12);

  let user = await db.query.users.findFirst({
    where: eq(users.email, email),
  });

  if (!user) {
    console.log(`Creating user ${email} with password...`);
    const [newUser] = await db
      .insert(users)
      .values({
        email,
        name: "German Gimenez",
        passwordHash,
        emailVerified: new Date(),
        onboardingCompleted: true,
      })
      .returning();
    user = newUser;
  } else if (!user.passwordHash) {
    // Update existing user with password if they don't have one
    console.log(`Updating ${email} with password...`);
    await db
      .update(users)
      .set({ passwordHash })
      .where(eq(users.id, user.id));
  }

  const existingAdmin = await db.query.platformAdmins.findFirst({
    where: eq(platformAdmins.userId, user.id),
  });

  if (existingAdmin) {
    console.log(`User ${email} is already a platform admin (${existingAdmin.level})`);
    if (existingAdmin.level !== "super_admin") {
      await db
        .update(platformAdmins)
        .set({ level: "super_admin" })
        .where(eq(platformAdmins.userId, user.id));
      console.log(`Upgraded to super_admin`);
    }
  } else {
    await db.insert(platformAdmins).values({
      userId: user.id,
      level: "super_admin",
    });
    console.log(`Added ${email} as super_admin`);
  }

  console.log("🔐 Super admin setup complete!");
}

// Run if called directly
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  if (command === "admin") {
    const email = args[1] || "german@napsix.ai";
    seedSuperAdmin(email)
      .then(() => process.exit(0))
      .catch((err) => {
        console.error("Seed failed:", err);
        process.exit(1);
      });
  } else {
    seedRolesAndPermissions()
      .then(() => seedSuperAdmin())
      .then(() => process.exit(0))
      .catch((err) => {
        console.error("Seed failed:", err);
        process.exit(1);
      });
  }
}
