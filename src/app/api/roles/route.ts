import { NextRequest, NextResponse } from "next/server";
import { requirePermission, requireFeature } from "@/lib/session";
import { db } from "@/db";
import { roles, rolePermissions, permissions, organizationMembers } from "@/db/schema";
import { eq, and, isNull, count } from "drizzle-orm";
import { getAvailableRoles } from "@/lib/tenant-type";

/**
 * GET /api/roles
 * List system roles + custom roles for the current organization.
 * System roles are filtered by orgType so planner orgs only see planner roles
 * and provider orgs only see provider roles.
 */
export async function GET() {
  try {
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

    return NextResponse.json({
      success: true,
      data: {
        systemRoles: rolesWithCounts.filter((r) => r.isSystem),
        customRoles: rolesWithCounts.filter((r) => !r.isSystem),
      },
    });
  } catch (error) {
    console.error("GET /api/roles error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch roles";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status }
    );
  }
}

/**
 * POST /api/roles
 * Create a custom role for the current organization
 * Requires "custom_roles" feature (plan-gated)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission("team:manage");
    await requireFeature("custom_roles");

    const body = await request.json();
    const { name, description, permissionIds } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Name is required" } },
        { status: 400 }
      );
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
      return NextResponse.json(
        { success: false, error: { code: "DUPLICATE", message: "A role with this name already exists" } },
        { status: 409 }
      );
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

    return NextResponse.json({
      success: true,
      data: newRole,
    }, { status: 201 });
  } catch (error) {
    console.error("POST /api/roles error:", error);
    const message = error instanceof Error ? error.message : "Failed to create role";
    const status = message.includes("Unauthorized") ? 401
      : message.includes("Forbidden") ? 403
      : message.includes("UpgradeRequired") ? 402
      : 500;
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message } },
      { status }
    );
  }
}
