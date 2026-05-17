import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import {
  users,
  platformAdmins,
  adminInvitations,
  organizationMembers,
  organizations,
} from "@/db/schema";
import { eq, sql, desc, ilike, or, and, inArray, isNotNull, isNull } from "drizzle-orm";
import { requirePlatformAdmin } from "@/lib/session";
import { apiHandler } from "@/lib/api-handler";

export async function GET(request: NextRequest) {
  return apiHandler(async () => {
    await requirePlatformAdmin();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = (page - 1) * limit;
    const search = searchParams.get("search") || "";
    const statusFilter = searchParams.get("status") || "";
    const verifiedFilter = searchParams.get("verified") || "";
    const adminFilter = searchParams.get("admin") || "";
    const orgTypeFilter = searchParams.get("orgType") || "";

    const admins = await db.select().from(platformAdmins);
    const adminMap = new Map(admins.map((a) => [a.userId, a.level]));

    // Pre-filter user IDs by orgType if needed
    let orgTypeUserIds: string[] | null = null;
    if (orgTypeFilter) {
      if (orgTypeFilter === "none") {
        const allMemberUserIds = await db
          .selectDistinct({ userId: organizationMembers.userId })
          .from(organizationMembers);
        const memberSet = new Set(allMemberUserIds.map((m) => m.userId));
        const allUserIds = await db.select({ id: users.id }).from(users);
        orgTypeUserIds = allUserIds
          .filter((u) => !memberSet.has(u.id))
          .map((u) => u.id);
      } else {
        const membersByType = await db
          .selectDistinct({ userId: organizationMembers.userId })
          .from(organizationMembers)
          .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
          .where(eq(organizations.orgType, orgTypeFilter as "tenant" | "provider" | "client"));
        orgTypeUserIds = membersByType.map((m) => m.userId);
      }
      if (orgTypeUserIds.length === 0) {
        return NextResponse.json({
          users: [],
          pendingInvitations: [],
          meta: await buildMeta(page, limit, 0, adminMap),
        });
      }
    }

    // Pre-filter user IDs by admin status
    let adminUserIds: string[] | null = null;
    if (adminFilter === "admin") {
      adminUserIds = Array.from(adminMap.keys());
      if (adminUserIds.length === 0) {
        return NextResponse.json({
          users: [],
          pendingInvitations: [],
          meta: await buildMeta(page, limit, 0, adminMap),
        });
      }
    } else if (adminFilter === "user") {
      adminUserIds = null; // handled via NOT IN below
    }

    const conditions = [];

    if (search) {
      conditions.push(
        or(
          ilike(users.name, `%${search}%`),
          ilike(users.email, `%${search}%`)
        )
      );
    }

    if (statusFilter) {
      conditions.push(eq(users.status, statusFilter as "active" | "suspended"));
    }

    if (verifiedFilter === "verified") {
      conditions.push(isNotNull(users.emailVerified));
    } else if (verifiedFilter === "pending") {
      conditions.push(isNull(users.emailVerified));
    }

    if (adminFilter === "admin" && adminUserIds && adminUserIds.length > 0) {
      conditions.push(inArray(users.id, adminUserIds));
    } else if (adminFilter === "user") {
      const adminIds = Array.from(adminMap.keys());
      if (adminIds.length > 0) {
        conditions.push(sql`${users.id} NOT IN (${sql.join(adminIds.map(id => sql`${id}`), sql`, `)})`);
      }
    }

    if (orgTypeUserIds) {
      conditions.push(inArray(users.id, orgTypeUserIds));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const allUsers = await db
      .select()
      .from(users)
      .where(whereClause)
      .orderBy(desc(users.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(users)
      .where(whereClause);

    const userIds = allUsers.map((u) => u.id);

    const memberships =
      userIds.length > 0
        ? await db
            .select({
              userId: organizationMembers.userId,
              orgId: organizations.id,
              orgName: organizations.name,
              orgType: organizations.orgType,
            })
            .from(organizationMembers)
            .innerJoin(organizations, eq(organizations.id, organizationMembers.organizationId))
            .where(inArray(organizationMembers.userId, userIds))
        : [];

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
      status: user.status || "active",
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
      meta: await buildMeta(page, limit, Number(count), adminMap),
    });
  }, "GET /api/admin/users");
}

async function buildMeta(
  page: number,
  limit: number,
  filteredTotal: number,
  adminMap: Map<string, string | null>
) {
  const [{ total: globalTotal }] = await db
    .select({ total: sql<number>`count(*)` })
    .from(users);

  const [{ count: verifiedCount }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(isNotNull(users.emailVerified));

  const [{ count: suspendedCount }] = await db
    .select({ count: sql<number>`count(*)` })
    .from(users)
    .where(eq(users.status, "suspended"));

  const [{ count: usersWithOrgCount }] = await db
    .select({ count: sql<number>`count(distinct ${organizationMembers.userId})` })
    .from(organizationMembers);

  const noOrgCount = Number(globalTotal) - Number(usersWithOrgCount);

  return {
    page,
    limit,
    total: filteredTotal,
    totalPages: Math.ceil(filteredTotal / limit),
    globalTotal: Number(globalTotal),
    adminCount: adminMap.size,
    verifiedCount: Number(verifiedCount),
    pendingCount: Number(globalTotal) - Number(verifiedCount),
    suspendedCount: Number(suspendedCount),
    noOrgCount: Math.max(0, noOrgCount),
  };
}
