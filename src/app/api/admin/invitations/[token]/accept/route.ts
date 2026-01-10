import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { adminInvitations, users, platformAdmins } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { hashPassword } from "@/lib/password";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params;
    const session = await auth();
    
    let body: { name?: string; password?: string } = {};
    try {
      body = await request.json();
    } catch {
      // No body provided, that's ok for existing users
    }

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

    let user = await db.query.users.findFirst({
      where: eq(users.email, invitation.email.toLowerCase()),
    });

    if (session?.user?.email && session.user.email !== invitation.email) {
      return NextResponse.json(
        { error: "Esta invitación es para otro email" },
        { status: 403 }
      );
    }

    // Note: Neon HTTP driver doesn't support transactions, so we do sequential operations
    if (!user) {
      if (!body.name || !body.password) {
        return NextResponse.json(
          { error: "Nombre y contraseña son requeridos para nuevos usuarios" },
          { status: 400 }
        );
      }

      const passwordHash = await hashPassword(body.password);

      const [newUser] = await db
        .insert(users)
        .values({
          name: body.name,
          email: invitation.email.toLowerCase(),
          passwordHash,
          emailVerified: new Date(),
          onboardingCompleted: true,
        })
        .returning();

      user = newUser;
    }

    const existingAdmin = await db.query.platformAdmins.findFirst({
      where: eq(platformAdmins.userId, user!.id),
    });

    if (!existingAdmin) {
      await db.insert(platformAdmins).values({
        userId: user!.id,
        level: invitation.level,
      });
    }

    await db
      .update(adminInvitations)
      .set({
        status: "accepted",
        acceptedAt: new Date(),
      })
      .where(eq(adminInvitations.id, invitation.id));

    return NextResponse.json({
      success: true,
      level: invitation.level,
    });
  } catch (error) {
    console.error("Accept admin invitation error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno del servidor" },
      { status: 500 }
    );
  }
}
