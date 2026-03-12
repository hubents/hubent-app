import { NextResponse } from "next/server";
import { db } from "@/db";
import { organizationMembers, users, roles, invitations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requirePermission } from "@/lib/session";

export async function GET() {
  try {
    const session = await requirePermission("team:read");
    const organizationId = session.organizationId;

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

    return NextResponse.json({ 
      success: true, 
      data: {
        members,
        invitations: pendingInvitations
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    const status = message.includes("Unauthorized") ? 401
      : message.includes("Forbidden") || message.includes("Missing permission") ? 403
      : 500;
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status }
    );
  }
}
