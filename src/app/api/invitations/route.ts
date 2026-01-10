import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { createOrganizationInvitation, revokeInvitation } from "@/lib/invitations";
import { db } from "@/db";
import { invitations } from "@/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

// GET /api/invitations - List pending invitations
export async function GET() {
  try {
    const session = await requireRole("planner");

    const pendingInvitations = await db.query.invitations.findMany({
      where: (i, { eq, and }) => 
        and(
          eq(i.organizationId, session.organizationId),
          eq(i.status, "pending")
        ),
      with: {
        // role: true, // Uncomment when relations are set up
      },
      orderBy: (i, { desc }) => [desc(i.createdAt)],
    });

    return NextResponse.json({
      success: true,
      data: pendingInvitations,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch invitations";
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}

// POST /api/invitations - Create new invitation
export async function POST(request: NextRequest) {
  try {
    const session = await requireRole("planner");
    const body = await request.json();

    const { email, role } = body;

    if (!email || !role) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Email and role are required" } },
        { status: 400 }
      );
    }

    const result = await createOrganizationInvitation(session, email, role);

    // TODO: Send invitation email via Resend
    // await sendInvitationEmail(email, result.inviteUrl, session.user.name);

    return NextResponse.json({
      success: true,
      data: {
        invitation: result.invitation,
        inviteUrl: result.inviteUrl,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create invitation";
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message } },
      { status: 400 }
    );
  }
}

// DELETE /api/invitations - Revoke invitation
export async function DELETE(request: NextRequest) {
  try {
    const session = await requireRole("planner");
    const { searchParams } = new URL(request.url);
    const invitationId = searchParams.get("id");

    if (!invitationId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invitation ID is required" } },
        { status: 400 }
      );
    }

    await revokeInvitation(session, parseInt(invitationId, 10));

    return NextResponse.json({
      success: true,
      data: { message: "Invitation revoked" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to revoke invitation";
    return NextResponse.json(
      { success: false, error: { code: "REVOKE_ERROR", message } },
      { status: 400 }
    );
  }
}

// PUT /api/invitations - Resend invitation (regenerate token and extend expiry)
export async function PUT(request: NextRequest) {
  try {
    const session = await requireRole("planner");
    const { searchParams } = new URL(request.url);
    const invitationId = searchParams.get("id");

    if (!invitationId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invitation ID is required" } },
        { status: 400 }
      );
    }

    const id = parseInt(invitationId, 10);

    // Find the invitation
    const invitation = await db.query.invitations.findFirst({
      where: (i, { eq, and }) =>
        and(
          eq(i.id, id),
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
      .where(eq(invitations.id, id))
      .returning();

    return NextResponse.json({
      success: true,
      data: {
        message: "Invitation resent",
        invitation: updated,
      },
    });
  } catch (error) {
    console.error("PUT /api/invitations error:", error);
    const message = error instanceof Error ? error.message : "Failed to resend invitation";
    return NextResponse.json(
      { success: false, error: { code: "RESEND_ERROR", message } },
      { status: 400 }
    );
  }
}
