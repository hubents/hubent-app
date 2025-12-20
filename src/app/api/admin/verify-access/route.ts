import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, platformAdmins } from "@/db/schema";
import { eq } from "drizzle-orm";

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
      return NextResponse.json(
        { error: "Usuario no encontrado" },
        { status: 404 }
      );
    }

    const adminRecord = await db.query.platformAdmins.findFirst({
      where: eq(platformAdmins.userId, user.id),
    });

    if (!adminRecord) {
      return NextResponse.json(
        { error: "No tienes permisos de administrador" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      level: adminRecord.level,
    });
  } catch (error) {
    console.error("Verify admin access error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
