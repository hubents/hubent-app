import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, platformAdmins } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

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

    if (!isAdmin || isAdmin.level !== "super_admin") {
      return NextResponse.json(
        { error: "Solo super admins pueden suspender usuarios" },
        { status: 403 }
      );
    }

    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const { reason } = body;

    // Prevent self-suspension
    if (id === session.user.id) {
      return NextResponse.json(
        { error: "No puedes suspenderte a ti mismo" },
        { status: 400 }
      );
    }

    const user = await db.query.users.findFirst({
      where: eq(users.id, id),
    });

    if (!user) {
      return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
    }

    await db
      .update(users)
      .set({
        status: "suspended" as any,
        suspendedAt: new Date() as any,
        suspendedBy: session.user.id as any,
        suspendedReason: reason || null as any,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));

    return NextResponse.json({ success: true, message: "Usuario suspendido" });
  } catch (error) {
    console.error("Suspend user error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
