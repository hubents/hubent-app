import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, verificationTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { generateResetToken } from "@/lib/password";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json(
        { error: "Email es requerido" },
        { status: 400 }
      );
    }

    const user = await db.query.users.findFirst({
      where: eq(users.email, email.toLowerCase()),
    });

    if (!user) {
      return NextResponse.json({ success: true });
    }

    const token = generateResetToken();
    const expires = new Date();
    expires.setHours(expires.getHours() + 1);

    await db.insert(verificationTokens).values({
      identifier: `reset:${email.toLowerCase()}`,
      token,
      expires,
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/auth/reset-password/${token}`;

    // Send password reset email (non-blocking)
    sendPasswordResetEmail(email.toLowerCase(), resetUrl)
      .catch((err) => console.error("Failed to send password reset email:", err));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Forgot password error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
