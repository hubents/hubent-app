import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, platformAdmins, organizationMembers, organizations, roles } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const isAdmin = await db.query.platformAdmins.findFirst({
      where: eq(platformAdmins.userId, session.user.id),
    });

    if (!isAdmin) {
      return NextResponse.json({ error: "Acceso denegado" }, { status: 403 });
    }

    const { id } = await params;

    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Get admin info
    const adminInfo = await db.query.platformAdmins.findFirst({
      where: eq(platformAdmins.userId, id),
    });

    // Get organizations
    const memberships = await db
      .select({
        orgId: organizations.id,
        orgName: organizations.name,
        orgSlug: organizations.slug,
        orgLogo: organizations.logo,
        roleId: roles.id,
        roleName: roles.name,
        joinedAt: organizationMembers.joinedAt,
      })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizationMembers.organizationId, organizations.id))
      .innerJoin(roles, eq(organizationMembers.roleId, roles.id))
      .where(eq(organizationMembers.userId, id));

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        image: user.image,
        emailVerified: user.emailVerified?.toISOString() || null,
        status: (user as any).status || "active",
        suspendedAt: (user as any).suspendedAt?.toISOString() || null,
        suspendedBy: (user as any).suspendedBy || null,
        suspendedReason: (user as any).suspendedReason || null,
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
          role: m.roleName,
          joinedAt: m.joinedAt?.toISOString() || null,
        })),
      },
    });
  } catch (error) {
    console.error("Get user detail error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const isAdmin = await db.query.platformAdmins.findFirst({
      where: eq(platformAdmins.userId, session.user.id),
    });

    if (!isAdmin || isAdmin.level !== "super_admin") {
      return NextResponse.json(
        { error: "Solo super admins pueden editar usuarios" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json();
    const { name, email } = body;

    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    // Check if email is already taken by another user
    if (email && email !== user.email) {
      const existingUser = await db.query.users.findFirst({
        where: eq(users.email, email.toLowerCase()),
      });
      if (existingUser) {
        return NextResponse.json(
          { error: "El email ya está en uso" },
          { status: 400 }
        );
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

    return NextResponse.json({ success: true, message: "Usuario actualizado" });
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const isAdmin = await db.query.platformAdmins.findFirst({
      where: eq(platformAdmins.userId, session.user.id),
    });

    if (!isAdmin || isAdmin.level !== "super_admin") {
      return NextResponse.json(
        { error: "Solo super admins pueden eliminar usuarios" },
        { status: 403 }
      );
    }

    const { id } = await params;

    // Prevent self-deletion
    if (id === session.user.id) {
      return NextResponse.json(
        { error: "No puedes eliminarte a ti mismo" },
        { status: 400 }
      );
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    await db.delete(users).where(eq(users.id, id));

    return NextResponse.json({ success: true, message: "Usuario eliminado" });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
