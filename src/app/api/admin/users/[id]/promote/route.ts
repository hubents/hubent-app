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
        { error: "Solo super admins pueden promover usuarios" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { level = "support" } = body;

    if (!["super_admin", "support"].includes(level)) {
      return NextResponse.json(
        { error: "Nivel inválido" },
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

    if (existingAdmin) {
      await db
        .update(platformAdmins)
        .set({ level: level as "super_admin" | "support", updatedAt: new Date() })
        .where(eq(platformAdmins.userId, id));
    } else {
      await db.insert(platformAdmins).values({
        userId: id,
        level: level as "super_admin" | "support",
      });
    }

    return NextResponse.json({ 
      success: true, 
      message: existingAdmin ? "Nivel de admin actualizado" : "Usuario promovido a admin" 
    });
  } catch (error) {
    console.error("Promote user error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
