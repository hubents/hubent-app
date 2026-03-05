import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { users, platformAdmins, adminInvitations, organizationMembers, organizations } from "@/db/schema";
import { eq, sql, desc } from "drizzle-orm";
import { auth } from "@/lib/auth";

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = (page - 1) * limit;

    const allUsers = await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users);

    const admins = await db.select().from(platformAdmins);
    const adminMap = new Map(admins.map((a) => [a.userId, a.level]));

    const memberships = await db
      .select({
        userId: organizationMembers.userId,
        orgId: organizations.id,
        orgName: organizations.name,
        orgType: organizations.orgType,
      })
      .from(organizationMembers)
      .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId));

    const orgMap = new Map<string, { id: number; name: string; orgType: string }[]>();
    for (const m of memberships) {
      const list = orgMap.get(m.userId) || [];
      list.push({ id: m.orgId, name: m.orgName, orgType: m.orgType || "tenant" });
      orgMap.set(m.userId, list);
    }

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
      organizations: orgMap.get(user.id) || [],
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
      meta: { page, limit, total: Number(count), totalPages: Math.ceil(Number(count) / limit) },
    });
  } catch (error) {
    console.error("Get admin users error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
