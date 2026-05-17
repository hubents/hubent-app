import { NextRequest } from "next/server";
import { requirePermission, requireFeature } from "@/lib/session";
import { db } from "@/db";
import { roles, rolePermissions, organizationMembers } from "@/db/schema";
import { eq, and, isNull, count } from "drizzle-orm";
import { getAvailableRoles } from "@/lib/tenant-type";
import { apiHandler, ok, created, badRequest, conflict } from "@/lib/api-handler";

/**
 * GET /api/roles
 * List system roles + custom roles for the current organization.
 * System roles are filtered by orgType so planner orgs only see planner roles
 * and provider orgs only see provider roles.
 */
export async function GET() {
  return apiHandler(async () => {
    const session = await requirePermission("team:read");

    const allowedSlugs = getAvailableRoles(session.orgType);

    // Get system roles (organizationId is null), filtered by orgType
    const allSystemRoles = await db
      .select({
        id: roles.id,
        name: roles.name,
        slug: roles.slug,
        description: roles.description,
        isSystem: roles.isSystem,
        eventScoped: roles.eventScoped,
        organizationId: roles.organizationId,
      })
      .from(roles)
      .where(isNull(roles.organizationId));

    const systemRoles = allowedSlugs.length > 0
      ? allSystemRoles.filter((r) => allowedSlugs.includes(r.slug))
      : [];

    // Get custom roles for this organization
    const customRoles = await db
      .select({
        id: roles.id,
        name: roles.name,
        slug: roles.slug,
        description: roles.description,
        isSystem: roles.isSystem,
        eventScoped: roles.eventScoped,
        organizationId: roles.organizationId,
      })
      .from(roles)
      .where(eq(roles.organizationId, session.organizationId));

    // Get permission counts for each role
    const allRoles = [...systemRoles, ...customRoles];
    const rolesWithCounts = await Promise.all(
      allRoles.map(async (role) => {
        const [permCount] = await db
          .select({ count: count() })
          .from(rolePermissions)
          .where(eq(rolePermissions.roleId, role.id));

        const [memberCount] = await db
          .select({ count: count() })
          .from(organizationMembers)
          .where(
            and(
              eq(organizationMembers.organizationId, session.organizationId),
              eq(organizationMembers.roleId, role.id)
            )
          );

        return {
          ...role,
          permissionCount: permCount?.count ?? 0,
          memberCount: memberCount?.count ?? 0,
        };
      })
    );

    return ok({
      systemRoles: rolesWithCounts.filter((r) => r.isSystem),
      customRoles: rolesWithCounts.filter((r) => !r.isSystem),
    });
  }, "GET /api/roles");
}

/**
 * POST /api/roles
 * Create a custom role for the current organization
 * Requires "custom_roles" feature (plan-gated)
 */
export async function POST(request: NextRequest) {
  return apiHandler(async () => {
    const session = await requirePermission("team:manage");
    await requireFeature("custom_roles");

    const body = await request.json();
    const { name, description, permissionIds } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return badRequest("Name is required");
    }

    // Generate slug from name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");

    // Check if slug already exists for this org
    const existing = await db.query.roles.findFirst({
      where: and(
        eq(roles.slug, slug),
        eq(roles.organizationId, session.organizationId)
      ),
    });

    if (existing) {
      return conflict("A role with this name already exists", "DUPLICATE");
    }

    const { eventScoped } = body;

    // Create the role
    const [newRole] = await db
      .insert(roles)
      .values({
        name: name.trim(),
        slug,
        description: description || null,
        isSystem: false,
        eventScoped: eventScoped ?? false,
        organizationId: session.organizationId,
      })
      .returning();

    // Assign permissions if provided
    if (permissionIds && Array.isArray(permissionIds) && permissionIds.length > 0) {
      await db.insert(rolePermissions).values(
        permissionIds.map((permId: number) => ({
          roleId: newRole.id,
          permissionId: permId,
        }))
      );
    }

    return created(newRole);
  }, "POST /api/roles");
}
