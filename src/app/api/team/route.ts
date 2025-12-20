import { NextResponse } from "next/server";
import { db } from "@/db";
import { organizationMembers, users, roles, invitations, organizations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { cookies } from "next/headers";

export async function GET() {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const cookieStore = await cookies();
    const orgIdCookie = cookieStore.get("hubents-org-id")?.value;
    
    let organizationId: number | undefined;
    
    if (orgIdCookie) {
      organizationId = parseInt(orgIdCookie, 10);
    } else {
      const membership = await db.query.organizationMembers.findFirst({
        where: eq(organizationMembers.userId, session.user.id),
      });
      organizationId = membership?.organizationId;
    }

    if (!organizationId) {
      return NextResponse.json({ members: [], pendingInvitations: [] });
    }

    const memberships = await db
      .select({
        id: organizationMembers.id,
        userId: organizationMembers.userId,
        roleId: organizationMembers.roleId,
        joinedAt: organizationMembers.joinedAt,
        userName: users.name,
        userEmail: users.email,
        userImage: users.image,
        roleName: roles.name,
        roleSlug: roles.slug,
      })
      .from(organizationMembers)
      .innerJoin(users, eq(organizationMembers.userId, users.id))
      .innerJoin(roles, eq(organizationMembers.roleId, roles.id))
      .where(eq(organizationMembers.organizationId, organizationId));

    const members = memberships.map((m) => ({
      id: m.userId,
      name: m.userName,
      email: m.userEmail,
      image: m.userImage,
      role: m.roleSlug,
      roleName: m.roleName,
      joinedAt: m.joinedAt?.toISOString() || new Date().toISOString(),
    }));

    const pendingInvites = await db
      .select({
        id: invitations.id,
        email: invitations.email,
        roleId: invitations.roleId,
        createdAt: invitations.createdAt,
        expiresAt: invitations.expiresAt,
        roleName: roles.name,
      })
      .from(invitations)
      .innerJoin(roles, eq(invitations.roleId, roles.id))
      .where(
        and(
          eq(invitations.organizationId, organizationId),
          eq(invitations.status, "pending")
        )
      );

    const pendingInvitations = pendingInvites.map((inv) => ({
      id: inv.id,
      email: inv.email,
      roleName: inv.roleName,
      createdAt: inv.createdAt?.toISOString() || new Date().toISOString(),
      expiresAt: inv.expiresAt.toISOString(),
    }));

    return NextResponse.json({ members, pendingInvitations });
  } catch (error) {
    console.error("Get team error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
