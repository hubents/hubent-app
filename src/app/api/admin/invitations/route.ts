import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { adminInvitations, platformAdmins, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { sendAdminInviteEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
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
        { error: "Solo super admins pueden invitar nuevos administradores" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { email, level } = body;

    if (!email || !level) {
      return NextResponse.json(
        { error: "Email y nivel son requeridos" },
        { status: 400 }
      );
    }

    if (!["super_admin", "support"].includes(level)) {
      return NextResponse.json(
        { error: "Nivel inválido" },
        { status: 400 }
      );
    }

    const existingInvitation = await db.query.adminInvitations.findFirst({
      where: eq(adminInvitations.email, email.toLowerCase()),
    });

    if (existingInvitation && existingInvitation.status === "pending") {
      return NextResponse.json(
        { error: "Ya existe una invitación pendiente para este email" },
        { status: 400 }
      );
    }

    const token = crypto.randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await db.insert(adminInvitations).values({
      email: email.toLowerCase(),
      level: level as "super_admin" | "support",
      token,
      status: "pending",
      invitedBy: session.user.id,
      expiresAt,
    });

    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL}/admin/invite/${token}`;

    // Get inviter name for email
    const inviter = await db.query.users.findFirst({
      where: eq(users.id, session.user.id),
    });

    // Send admin invitation email (non-blocking)
    sendAdminInviteEmail(
      email.toLowerCase(),
      level,
      inviter?.name || null,
      inviteUrl
    ).catch((err) => console.error("Failed to send admin invitation email:", err));

    return NextResponse.json({
      success: true,
      message: "Invitación de administrador enviada",
      inviteUrl,
    });
  } catch (error) {
    console.error("Create admin invitation error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function GET() {
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

    const invitations = await db
      .select()
      .from(adminInvitations)
      .orderBy(adminInvitations.createdAt);

    return NextResponse.json({
      invitations: invitations.map((inv) => ({
        ...inv,
        createdAt: inv.createdAt?.toISOString(),
        expiresAt: inv.expiresAt.toISOString(),
        acceptedAt: inv.acceptedAt?.toISOString(),
      })),
    });
  } catch (error) {
    console.error("Get admin invitations error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
