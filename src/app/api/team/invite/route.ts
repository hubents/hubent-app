import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invitations, roles, organizations, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requirePermission, requireLimit } from "@/lib/session";
import { canInviteRole } from "@/lib/tenant";
import { sendOrganizationInviteEmail } from "@/lib/email";
import type { TenantRole } from "@/types";

export async function POST(request: NextRequest) {
  try {
    // Enforce RBAC: must have team:invite permission
    const session = await requirePermission("team:invite");

    // Enforce plan limit: check user count
    await requireLimit("users");

    const body = await request.json();
    const { email, role } = body;

    if (!email || typeof email !== "string" || !email.trim()) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Email es requerido" } },
        { status: 400 }
      );
    }

    if (!role || typeof role !== "string") {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Rol es requerido" } },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Validate the role exists (NEVER create on-the-fly)
    const targetRole = await db.query.roles.findFirst({
      where: eq(roles.slug, role),
    });

    if (!targetRole) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_ROLE", message: `El rol '${role}' no existe` } },
        { status: 400 }
      );
    }

    // Check if current user can invite this role level
    const roleCheck = canInviteRole(session, targetRole.slug as TenantRole);
    if (!roleCheck.allowed) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: roleCheck.reason ?? "No puedes invitar con este rol" } },
        { status: 403 }
      );
    }

    // Check for existing pending invitation
    const existingInvitation = await db.query.invitations.findFirst({
      where: and(
        eq(invitations.organizationId, session.organizationId),
        eq(invitations.email, normalizedEmail),
        eq(invitations.status, "pending")
      ),
    });

    if (existingInvitation) {
      return NextResponse.json(
        { success: false, error: { code: "DUPLICATE", message: "Ya existe una invitación pendiente para este email" } },
        { status: 409 }
      );
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db.insert(invitations).values({
      organizationId: session.organizationId,
      email: normalizedEmail,
      roleId: targetRole.id,
      token,
      status: "pending",
      invitedBy: session.user.userId,
      expiresAt,
    });

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`;

    // Get organization name and inviter name for email
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, session.organizationId),
    });

    const inviter = await db.query.users.findFirst({
      where: eq(users.id, session.user.userId),
    });

    // Send invitation email (non-blocking)
    sendOrganizationInviteEmail(
      normalizedEmail,
      org?.name || "Organización",
      targetRole.name,
      inviter?.name || null,
      inviteUrl
    ).catch((err) => console.error("Failed to send invitation email:", err));

    return NextResponse.json({
      success: true,
      data: { message: "Invitación enviada", inviteUrl },
    });
  } catch (error) {
    console.error("Invite team member error:", error);
    const message = error instanceof Error ? error.message : "Error interno del servidor";
    const status = message.includes("Unauthorized") ? 401
      : message.includes("Forbidden") ? 403
      : message.includes("LimitReached") ? 429
      : message.includes("UpgradeRequired") ? 402
      : 500;
    return NextResponse.json(
      { success: false, error: { code: "INVITE_ERROR", message } },
      { status }
    );
  }
}
