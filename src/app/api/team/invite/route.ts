import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invitations, roles, organizationMembers, organizations, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { cookies } from "next/headers";
import { sendOrganizationInviteEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { email, role } = body;

    // Validación más robusta
    if (!email || typeof email !== 'string' || !email.trim()) {
      return NextResponse.json(
        { error: "Email es requerido" },
        { status: 400 }
      );
    }

    if (!role || typeof role !== 'string') {
      return NextResponse.json(
        { error: "Rol es requerido" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.trim().toLowerCase();

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
      return NextResponse.json(
        { error: "No se encontró la organización" },
        { status: 400 }
      );
    }

    let targetRole = await db.query.roles.findFirst({
      where: eq(roles.slug, role),
    });

    if (!targetRole) {
      const [createdRole] = await db
        .insert(roles)
        .values({
          name: role.charAt(0).toUpperCase() + role.slice(1),
          slug: role,
          description: `Rol ${role}`,
          isSystem: true,
        })
        .returning();
      targetRole = createdRole;
    }

    const existingInvitation = await db.query.invitations.findFirst({
      where: and(
        eq(invitations.organizationId, organizationId),
        eq(invitations.email, normalizedEmail),
        eq(invitations.status, "pending")
      ),
    });

    if (existingInvitation) {
      return NextResponse.json(
        { error: "Ya existe una invitación pendiente para este email" },
        { status: 400 }
      );
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db.insert(invitations).values({
      organizationId,
      email: normalizedEmail,
      roleId: targetRole.id,
      token,
      status: "pending",
      invitedBy: session.user.id,
      expiresAt,
    });

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`;

    // Get organization name and inviter name for email
    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, organizationId),
    });

    const inviter = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
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
      message: "Invitación enviada",
      inviteUrl,
    });
  } catch (error) {
    console.error("Invite team member error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
