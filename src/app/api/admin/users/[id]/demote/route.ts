import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, platformAdmins } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requirePlatformAdmin } from "@/lib/session";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requirePlatformAdmin();

    if (session.user.platformLevel !== "super_admin") {
      return NextResponse.json(
        { error: "Solo super admins pueden revocar permisos de admin" },
        { status: 403 }
      );
    }

    const { id } = await params;

    if (id === session.user.userId) {
      return NextResponse.json(
        { error: "No puedes revocarte tus propios permisos de admin" },
        { status: 400 }
      );
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    const existingAdmin = await db.query.platformAdmins.findFirst({
      where: eq(platformAdmins.userId, id),
    });

    if (!existingAdmin) {
      return NextResponse.json(
        { error: "El usuario no es administrador" },
        { status: 400 }
      );
    }

    await db.delete(platformAdmins).where(eq(platformAdmins.userId, id));

    return NextResponse.json({ 
      success: true, 
      message: "Permisos de admin revocados" 
    });
  } catch (error) {
    console.error("Demote user error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
