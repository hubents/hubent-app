import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
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
        { error: "Solo super admins pueden reactivar usuarios" },
        { status: 403 }
      );
    }

    const { id } = await params;

    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    await db
      .update(users)
      .set({
        status: "active",
        suspendedAt: null,
        suspendedBy: null,
        suspendedReason: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));

    return NextResponse.json({ success: true, message: "Usuario reactivado" });
  } catch (error) {
    console.error("Reactivate user error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
