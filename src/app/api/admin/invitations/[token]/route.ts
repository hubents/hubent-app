import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { adminInvitations, users } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;

    const invitation = await db.query.adminInvitations.findFirst({
      where: and(
        eq(adminInvitations.token, token),
        eq(adminInvitations.status, "pending"),
        gt(adminInvitations.expiresAt, new Date())
      ),
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitación no encontrada, expirada o ya utilizada" },
        { status: 404 }
      );
    }

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
      level: invitation.level,
      invitedByName,
      expiresAt: invitation.expiresAt.toISOString(),
      status: invitation.status,
    });
  } catch (error) {
    console.error("Get admin invitation error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
