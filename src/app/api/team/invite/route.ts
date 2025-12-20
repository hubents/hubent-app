import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { invitations, roles, organizationMembers } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { cookies } from "next/headers";

export async function POST(request: NextRequest) {
  try {
    const session = await auth();
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { email, role } = body;

    if (!email || !role) {
      return NextResponse.json(
        { error: "Email y rol son requeridos" },
        { status: 400 }
      );
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
        eq(invitations.email, email.toLowerCase()),
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
      email: email.toLowerCase(),
      roleId: targetRole.id,
      token,
      status: "pending",
      invitedBy: session.user.id,
      expiresAt,
    });

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${token}`;
    console.log("Invitation URL:", inviteUrl);

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
