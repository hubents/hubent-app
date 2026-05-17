import { NextRequest } from "next/server";
import { db } from "@/db";
import { users, platformAdmins, organizationMembers, organizations, roles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requirePlatformAdmin } from "@/lib/session";
import { apiHandler, ok, badRequest, notFound, forbidden } from "@/lib/api-handler";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    await requirePlatformAdmin();

    const { id } = await params;

    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!user) {
      return notFound("Usuario no encontrado");
    }

    const adminInfo = await db.query.platformAdmins.findFirst({
      where: eq(platformAdmins.userId, id),
    });

    const memberships = await db
      .select({
        orgId: organizations.id,
        orgName: organizations.name,
        orgSlug: organizations.slug,
        orgLogo: organizations.logo,
        orgType: organizations.orgType,
        orgStatus: organizations.status,
        roleId: roles.id,
        roleName: roles.name,
        joinedAt: organizationMembers.joinedAt,
      })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
      .innerJoin(roles, eq(organizationMembers.roleId, roles.id))
      .where(eq(organizationMembers.userId, id));

    return ok({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        emailVerified: user.emailVerified?.toISOString() || null,
        status: user.status || "active",
        suspendedAt: user.suspendedAt?.toISOString() || null,
        suspendedBy: user.suspendedBy || null,
        suspendedReason: user.suspendedReason || null,
        onboardingCompleted: user.onboardingCompleted,
        createdAt: user.createdAt?.toISOString() || null,
        updatedAt: user.updatedAt?.toISOString() || null,
        isAdmin: !!adminInfo,
        adminLevel: adminInfo?.level || null,
        organizations: memberships.map((m) => ({
          id: m.orgId,
          name: m.orgName,
          slug: m.orgSlug,
          logo: m.orgLogo,
          orgType: m.orgType || "tenant",
          orgStatus: m.orgStatus || "active",
          role: m.roleName,
          joinedAt: m.joinedAt?.toISOString() || null,
        })),
      },
    });
  }, "GET /api/admin/users/[id]");
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const session = await requirePlatformAdmin();

    if (session.user.platformLevel !== "super_admin") {
      return forbidden("Solo super admins pueden editar usuarios");
    }

    const { id } = await params;
    const body = await request.json();
    const { name, email } = body;

    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!user) {
      return notFound("Usuario no encontrado");
    }

    if (email && email !== user.email) {
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email.toLowerCase()),
      });
      if (existingUser) {
        return badRequest("El email ya está en uso");
      }
    }

    await db
      .update(users)
      .set({
        name: name !== undefined ? name : user.name,
        email: email ? email.toLowerCase() : user.email,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));

    return ok({ message: "Usuario actualizado" });
  }, "PATCH /api/admin/users/[id]");
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    const session = await requirePlatformAdmin();

    if (session.user.platformLevel !== "super_admin") {
      return forbidden("Solo super admins pueden eliminar usuarios");
    }

    const { id } = await params;

    if (id === session.user.userId) {
      return badRequest("No puedes eliminarte a ti mismo");
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!user) {
      return notFound("Usuario no encontrado");
    }

    await db.delete(users).where(eq(users.id, id));

    return ok({ message: "Usuario eliminado" });
  }, "DELETE /api/admin/users/[id]");
}
