import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { organizationMembers, organizations, users, roles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requirePlatformAdmin } from "@/lib/session";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requirePlatformAdmin();

    const { id } = await params;
    const orgId = parseInt(id);

    if (isNaN(orgId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, orgId),
    });

    if (!org) {
      return NextResponse.json({ error: "Organización no encontrada" }, { status: 404 });
    }

    const members = await db
      .select({
        membershipId: organizationMembers.id,
        userId: users.id,
        userName: users.name,
        userEmail: users.email,
        userImage: users.image,
        userStatus: users.status,
        roleId: roles.id,
        roleName: roles.name,
        roleSlug: roles.slug,
        joinedAt: organizationMembers.joinedAt,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .innerJoin(roles, eq(organizationMembers.roleId, roles.id))
      .where(eq(organizationMembers.organizationId, orgId));

    const availableRoles = await db
      .select({ id: roles.id, name: roles.name, slug: roles.slug })
      .from(roles)
      .where(
        eq(roles.isSystem, true)
      );

    return NextResponse.json({
      members: members.map((m) => ({
        membershipId: m.membershipId,
        userId: m.userId,
        name: m.userName,
        email: m.userEmail,
        image: m.userImage,
        userStatus: m.userStatus || "active",
        roleId: m.roleId,
        roleName: m.roleName,
        roleSlug: m.roleSlug,
        joinedAt: m.joinedAt?.toISOString() || null,
      })),
      availableRoles,
    });
  } catch (error) {
    console.error("Error fetching members:", error);
    return NextResponse.json(
      { error: "Error al obtener miembros" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePlatformAdmin();

    if (session.user.platformLevel !== "super_admin") {
      return NextResponse.json(
        { error: "Solo super admins pueden remover miembros" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const orgId = parseInt(id);

    if (isNaN(orgId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await request.json();
    const { membershipId } = body;

    if (!membershipId) {
      return NextResponse.json({ error: "membershipId requerido" }, { status: 400 });
    }

    const membership = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.id, membershipId),
        eq(organizationMembers.organizationId, orgId)
      ),
    });

    if (!membership) {
      return NextResponse.json({ error: "Membresía no encontrada" }, { status: 404 });
    }

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, orgId),
    });

    if (org?.ownerId === membership.userId) {
      return NextResponse.json(
        { error: "No se puede remover al propietario de la organización" },
        { status: 400 }
      );
    }

    await db.delete(organizationMembers).where(eq(organizationMembers.id, membershipId));

    return NextResponse.json({ success: true, message: "Miembro removido" });
  } catch (error) {
    console.error("Error removing member:", error);
    return NextResponse.json(
      { error: "Error al remover miembro" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePlatformAdmin();

    if (session.user.platformLevel !== "super_admin") {
      return NextResponse.json(
        { error: "Solo super admins pueden cambiar roles" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const orgId = parseInt(id);

    if (isNaN(orgId)) {
      return NextResponse.json({ error: "ID inválido" }, { status: 400 });
    }

    const body = await request.json();
    const { membershipId, roleId } = body;

    if (!membershipId || !roleId) {
      return NextResponse.json(
        { error: "membershipId y roleId son requeridos" },
        { status: 400 }
      );
    }

    const membership = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.id, membershipId),
        eq(organizationMembers.organizationId, orgId)
      ),
    });

    if (!membership) {
      return NextResponse.json({ error: "Membresía no encontrada" }, { status: 404 });
    }

    const role = await db.query.roles.findFirst({
      where: eq(roles.id, roleId),
    });

    if (!role) {
      return NextResponse.json({ error: "Rol no encontrado" }, { status: 404 });
    }

    await db
      .update(organizationMembers)
      .set({ roleId })
      .where(eq(organizationMembers.id, membershipId));

    return NextResponse.json({
      success: true,
      message: `Rol actualizado a ${role.name}`,
    });
  } catch (error) {
    console.error("Error changing role:", error);
    return NextResponse.json(
      { error: "Error al cambiar rol" },
      { status: 500 }
    );
  }
}
