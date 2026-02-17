import { NextRequest, NextResponse } from "next/server";
import { requirePermission, requireFeature } from "@/lib/session";
import { db } from "@/db";
import { roles, rolePermissions, permissions, organizationMembers } from "@/db/schema";
import { eq, and, count } from "drizzle-orm";

type RouteParams = { params: Promise<{ id: string }> };

/**
 * GET /api/roles/[id]
 * Get role details with permissions
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission("team:read");
    const { id } = await params;
    const roleId = parseInt(id, 10);

    if (isNaN(roleId)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid role ID" } },
        { status: 400 }
      );
    }

    const role = await db.query.roles.findFirst({
      where: eq(roles.id, roleId),
    });

    if (!role) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Role not found" } },
        { status: 404 }
      );
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

    return NextResponse.json({
      success: true,
      data: {
        ...role,
        permissions: rolePerms,
        memberCount: memberCount?.count ?? 0,
      },
    });
  } catch (error) {
    console.error("GET /api/roles/[id] error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch role";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status }
    );
  }
}

/**
 * PATCH /api/roles/[id]
 * Update a custom role (name, description, permissions)
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission("team:manage");
    await requireFeature("custom_roles");

    const { id } = await params;
    const roleId = parseInt(id, 10);

    if (isNaN(roleId)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid role ID" } },
        { status: 400 }
      );
    }

    const role = await db.query.roles.findFirst({
      where: eq(roles.id, roleId),
    });

    if (!role) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Role not found" } },
        { status: 404 }
      );
    }

    // Cannot edit system roles
    if (role.isSystem) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Cannot edit system roles" } },
        { status: 403 }
      );
    }

    // Cannot edit roles from other organizations
    if (role.organizationId !== session.organizationId) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Cannot edit roles from other organizations" } },
        { status: 403 }
      );
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

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    console.error("PATCH /api/roles/[id] error:", error);
    const message = error instanceof Error ? error.message : "Failed to update role";
    const status = message.includes("Unauthorized") ? 401
      : message.includes("Forbidden") ? 403
      : message.includes("UpgradeRequired") ? 402
      : 500;
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message } },
      { status }
    );
  }
}

/**
 * DELETE /api/roles/[id]
 * Delete a custom role (only if no members are using it)
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requirePermission("team:manage");

    const { id } = await params;
    const roleId = parseInt(id, 10);

    if (isNaN(roleId)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid role ID" } },
        { status: 400 }
      );
    }

    const role = await db.query.roles.findFirst({
      where: eq(roles.id, roleId),
    });

    if (!role) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Role not found" } },
        { status: 404 }
      );
    }

    if (role.isSystem) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Cannot delete system roles" } },
        { status: 403 }
      );
    }

    if (role.organizationId !== session.organizationId) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Cannot delete roles from other organizations" } },
        { status: 403 }
      );
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
      return NextResponse.json(
        { success: false, error: { code: "IN_USE", message: `Cannot delete role: ${memberCount?.count} members are using it. Reassign them first.` } },
        { status: 409 }
      );
    }

    // Delete permissions first, then role
    await db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
    await db.delete(roles).where(eq(roles.id, roleId));

    return NextResponse.json({
      success: true,
      data: { message: "Role deleted" },
    });
  } catch (error) {
    console.error("DELETE /api/roles/[id] error:", error);
    const message = error instanceof Error ? error.message : "Failed to delete role";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message } },
      { status }
    );
  }
}
