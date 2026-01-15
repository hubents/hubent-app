import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, platformAdmins, verificationTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";
import { sendWelcomeEmail } from "@/lib/email";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id } = await params;

    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    if (user.emailVerified) {
      return NextResponse.json(
        { error: "El usuario ya está verificado" },
        { status: 400 }
      );
    }

    // Create verification token
    const token = crypto.randomUUID();
    const expires = new Date();
    expires.setHours(expires.getHours() + 24);

    await db.insert(verificationTokens).values({
      identifier: user.email,
      token,
      expires,
    });

    const verifyUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/verify?token=${token}`;

    // Send welcome email with verification link
    await sendWelcomeEmail(user.email, user.name || "Usuario", verifyUrl);

    return NextResponse.json({ 
      success: true, 
      message: "Email de verificación enviado" 
    });
  } catch (error) {
    console.error("Resend verification error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
