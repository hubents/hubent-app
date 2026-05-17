import { NextRequest } from "next/server";
import { requirePermission, requireFeature } from "@/lib/session";
import { db } from "@/db";
import { roles, rolePermissions, permissions, organizationMembers } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";
import { apiHandler, ok, notFound, badRequest, forbidden, conflict } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/roles/[id]
 * Get role details with permissions
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("team:read");
    const { id } = await params;
    const roleId = parseInt(id, 10);

    if (isNaN(roleId)) {
      return badRequest("Invalid role ID");
    }

    const role = await db.query.roles.findFirst({
      where: eq(roles.id, roleId),
    });

    if (!role) {
      return notFound("Role not found");
    }

    // Get permissions for this role
    const rolePerms = await db
      .select({
        id: permissions.id,
        name: permissions.name,
        slug: permissions.slug,
        resource: permissions.resource,
        action: permissions.action,
        description: permissions.description,
      })
      .from(rolePermissions)
      .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
      .where(eq(rolePermissions.roleId, roleId));

    // Get member count using this role in this org
    const [memberCount] = await db
      .select({ count: count() })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, session.organizationId),
          eq(organizationMembers.roleId, roleId)
        )
      );

    return ok({
      ...role,
      permissions: rolePerms,
      memberCount: memberCount?.count ?? 0,
    });
  }, "GET /api/roles/[id]");
}

/**
 * PATCH /api/roles/[id]
 * Update a custom role (name, description, permissions)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("team:manage");
    await requireFeature("custom_roles");

    const { id } = await params;
    const roleId = parseInt(id, 10);

    if (isNaN(roleId)) {
      return badRequest("Invalid role ID");
    }

    const role = await db.query.roles.findFirst({
      where: eq(roles.id, roleId),
    });

    if (!role) {
      return notFound("Role not found");
    }

    // Cannot edit system roles
    if (role.isSystem) {
      return forbidden("Cannot edit system roles");
    }

    // Cannot edit roles from other organizations
    if (role.organizationId !== session.organizationId) {
      return forbidden("Cannot edit roles from other organizations");
    }

    const body = await request.json();
    const { name, description, permissionIds, eventScoped } = body;

    // Update role metadata
    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;
    if (eventScoped !== undefined) updateData.eventScoped = eventScoped;

    if (Object.keys(updateData).length > 0) {
      await db
        .update(roles)
        .set(updateData)
        .where(eq(roles.id, roleId));
    }

    // Update permissions if provided
    if (permissionIds !== undefined && Array.isArray(permissionIds)) {
      // Remove all existing permissions
      await db
        .delete(rolePermissions)
        .where(eq(rolePermissions.roleId, roleId));

      // Add new permissions
      if (permissionIds.length > 0) {
        await db.insert(rolePermissions).values(
          permissionIds.map((permId: number) => ({
            roleId,
            permissionId: permId,
          }))
        );
      }
    }

    // Re-fetch updated role
    const updated = await db.query.roles.findFirst({
      where: eq(roles.id, roleId),
    });

    return ok(updated);
  }, "PATCH /api/roles/[id]");
}

/**
 * DELETE /api/roles/[id]
 * Delete a custom role (only if no members are using it)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("team:manage");

    const { id } = await params;
    const roleId = parseInt(id, 10);

    if (isNaN(roleId)) {
      return badRequest("Invalid role ID");
    }

    const role = await db.query.roles.findFirst({
      where: eq(roles.id, roleId),
    });

    if (!role) {
      return notFound("Role not found");
    }

    if (role.isSystem) {
      return forbidden("Cannot delete system roles");
    }

    if (role.organizationId !== session.organizationId) {
      return forbidden("Cannot delete roles from other organizations");
    }

    // Check if any members use this role
    const [memberCount] = await db
      .select({ count: count() })
      .from(organizationMembers)
      .where(
        and(
          eq(organizationMembers.organizationId, session.organizationId),
          eq(organizationMembers.roleId, roleId)
        )
      );

    if ((memberCount?.count ?? 0) > 0) {
      return conflict(
        `Cannot delete role: ${memberCount?.count} members are using it. Reassign them first.`,
        "IN_USE"
      );
    }

    // Delete permissions first, then role
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
    await db.delete(roles).where(eq(roles.id, roleId));

    return ok({ message: "Role deleted" });
  }, "DELETE /api/roles/[id]");
}
