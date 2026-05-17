import { NextRequest } from "next/server";
import { db } from "@/db";
import { organizationMembers, organizations, users, roles } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requirePlatformAdmin } from "@/lib/session";
import { apiHandler, ok, badRequest, notFound, forbidden } from "@/lib/api-handler";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    await requirePlatformAdmin();

    const { id } = await params;
    const orgId = parseInt(id);

    if (isNaN(orgId)) {
      return badRequest("ID inválido");
    }

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, orgId),
    });

    if (!org) {
      return notFound("Organización no encontrada");
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
      .where(eq(roles.isSystem, true));

    return ok({
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
  }, "GET /api/admin/tenants/[id]/members");
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const session = await requirePlatformAdmin();

    if (session.user.platformLevel !== "super_admin") {
      return forbidden("Solo super admins pueden remover miembros");
    }

    const { id } = await params;
    const orgId = parseInt(id);

    if (isNaN(orgId)) {
      return badRequest("ID inválido");
    }

    const body = await request.json();
    const { membershipId } = body;

    if (!membershipId) {
      return badRequest("membershipId requerido");
    }

    const membership = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.id, membershipId),
        eq(organizationMembers.organizationId, orgId)
      ),
    });

    if (!membership) {
      return notFound("Membresía no encontrada");
    }

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, orgId),
    });

    if (org?.ownerId === membership.userId) {
      return badRequest("No se puede remover al propietario de la organización");
    }

    await db.delete(organizationMembers).where(eq(organizationMembers.id, membershipId));

    return ok({ message: "Miembro removido" });
  }, "DELETE /api/admin/tenants/[id]/members");
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const session = await requirePlatformAdmin();

    if (session.user.platformLevel !== "super_admin") {
      return forbidden("Solo super admins pueden cambiar roles");
    }

    const { id } = await params;
    const orgId = parseInt(id);

    if (isNaN(orgId)) {
      return badRequest("ID inválido");
    }

    const body = await request.json();
    const { membershipId, roleId } = body;

    if (!membershipId || !roleId) {
      return badRequest("membershipId y roleId son requeridos");
    }

    const membership = await db.query.organizationMembers.findFirst({
      where: and(
        eq(organizationMembers.id, membershipId),
        eq(organizationMembers.organizationId, orgId)
      ),
    });

    if (!membership) {
      return notFound("Membresía no encontrada");
    }

    const role = await db.query.roles.findFirst({
      where: eq(roles.id, roleId),
    });

    if (!role) {
      return notFound("Rol no encontrado");
    }

    await db
      .update(organizationMembers)
      .set({ roleId })
      .where(eq(organizationMembers.id, membershipId));

    return ok({ message: `Rol actualizado a ${role.name}` });
  }, "PATCH /api/admin/tenants/[id]/members");
}
