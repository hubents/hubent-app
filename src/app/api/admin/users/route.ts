import { NextResponse } from "next/server";
import { db } from "@/db";
import { users, platformAdmins, adminInvitations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { auth } from "@/lib/auth";

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

    const allUsers = await db
      .select()
      .from(users)
      .orderBy(users.createdAt);

    const admins = await db.select().from(platformAdmins);
    const adminMap = new Map(admins.map((a) => [a.userId, a.level]));

    const usersWithAdminInfo = allUsers.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      image: user.image,
      emailVerified: user.emailVerified?.toISOString() || null,
      createdAt: user.createdAt?.toISOString() || null,
      status: (user as any).status || "active",
      isAdmin: adminMap.has(user.id),
      adminLevel: adminMap.get(user.id) || null,
    }));

    const pendingInvites = await db
      .select()
      .from(adminInvitations)
      .where(eq(adminInvitations.status, "pending"));

    const pendingInvitations = pendingInvites.map((inv) => ({
      id: inv.id,
      email: inv.email,
      level: inv.level,
      createdAt: inv.createdAt?.toISOString() || null,
      expiresAt: inv.expiresAt.toISOString(),
    }));

    return NextResponse.json({
      users: usersWithAdminInfo,
      pendingInvitations,
    });
  } catch (error) {
    console.error("Get admin users error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
