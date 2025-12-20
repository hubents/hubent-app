import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invitations, organizations, roles, users } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const invitation = await db.query.invitations.findFirst({
      where: and(
        eq(invitations.token, token),
        eq(invitations.status, "pending"),
        gt(invitations.expiresAt, new Date())
      ),
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitación no encontrada, expirada o ya utilizada" },
        { status: 404 }
      );
    }

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, invitation.organizationId),
    });

    const role = await db.query.roles.findFirst({
      where: eq(roles.id, invitation.roleId),
    });

    let invitedByName: string | undefined;
    if (invitation.invitedBy) {
      const inviter = await db.query.users.findFirst({
        where: eq(users.id, invitation.invitedBy),
      });
      invitedByName = inviter?.name || inviter?.email || undefined;
    }

    return NextResponse.json({
      id: invitation.id,
      email: invitation.email,
      organizationName: org?.name || "Organización",
      organizationLogo: org?.logo,
      roleName: role?.name || "Miembro",
      invitedByName,
      expiresAt: invitation.expiresAt.toISOString(),
      status: invitation.status,
    });
  } catch (error) {
    console.error("Get invitation error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
