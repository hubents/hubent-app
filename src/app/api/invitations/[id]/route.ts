import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { revokeInvitation } from "@/lib/invitations";
import { db } from "@/db";
import { invitations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import crypto from "crypto";

type RouteParams = { params: Promise<{ id: string }> };

// DELETE /api/invitations/[id] - Cancel/revoke invitation by ID
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole("planner");
    const { id } = await params;
    const invitationId = parseInt(id, 10);

    if (isNaN(invitationId)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid invitation ID" } },
        { status: 400 }
      );
    }

    await revokeInvitation(session, invitationId);

    return NextResponse.json({
      success: true,
      data: { message: "Invitation cancelled" },
    });
  } catch (error) {
    console.error("DELETE /api/invitations/[id] error:", error);
    const message = error instanceof Error ? error.message : "Failed to cancel invitation";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 400;
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message } },
      { status }
    );
  }
}

// PUT /api/invitations/[id] - Resend invitation (regenerate token and update expiry)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole("planner");
    const { id } = await params;
    const invitationId = parseInt(id, 10);

    if (isNaN(invitationId)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid invitation ID" } },
        { status: 400 }
      );
    }

    // Find the invitation
    const invitation = await db.query.invitations.findFirst({
      where: (i, { eq, and }) =>
        and(
          eq(i.id, invitationId),
          eq(i.organizationId, session.organizationId)
        ),
    });

    if (!invitation) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Invitation not found" } },
        { status: 404 }
      );
    }

    if (invitation.status !== "pending") {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_STATUS", message: "Can only resend pending invitations" } },
        { status: 400 }
      );
    }

    // Generate new token and extend expiry
    const newToken = crypto.randomBytes(32).toString("hex");
    const newExpiresAt = new Date();
    newExpiresAt.setDate(newExpiresAt.getDate() + 7);

    const [updated] = await db
      .update(invitations)
      .set({
        token: newToken,
        expiresAt: newExpiresAt,
      })
      .where(eq(invitations.id, invitationId))
      .returning();

    // TODO: Send invitation email via Resend
    // const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${newToken}`;
    // await sendInvitationEmail(invitation.email, inviteUrl, session.user.name);

    return NextResponse.json({
      success: true,
      data: {
        message: "Invitation resent",
        invitation: updated,
      },
    });
  } catch (error) {
    console.error("PUT /api/invitations/[id] error:", error);
    const message = error instanceof Error ? error.message : "Failed to resend invitation";
    const status = message.includes("Unauthorized") ? 401 : message.includes("Forbidden") ? 403 : 400;
    return NextResponse.json(
      { success: false, error: { code: "RESEND_ERROR", message } },
      { status }
    );
  }
}
