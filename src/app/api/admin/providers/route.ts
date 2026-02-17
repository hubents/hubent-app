import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/session";
import { db } from "@/db";
import { organizations, organizationMembers, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/providers
 * List all provider organizations for super admin
 */
export async function GET() {
  try {
    await requirePlatformAdmin();

    const providerOrgs = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        logo: organizations.logo,
        phone: organizations.phone,
        website: organizations.website,
        instagramHandle: organizations.instagramHandle,
        providerCategory: organizations.providerCategory,
        verificationStatus: organizations.verificationStatus,
        verifiedAt: organizations.verifiedAt,
        rejectionReason: organizations.rejectionReason,
        serviceRadius: organizations.serviceRadius,
        createdAt: organizations.createdAt,
      })
      .from(organizations)
      .where(eq(organizations.orgType, "provider"))
      .orderBy(desc(organizations.createdAt));

    const providerIds = providerOrgs.map((p) => p.id);

    let membersMap = new Map<number, { count: number; ownerName: string | null; ownerEmail: string | null }>();

    if (providerIds.length > 0) {
      const members = await db
        .select({
          orgId: organizationMembers.organizationId,
          userName: users.name,
          userEmail: users.email,
          joinedAt: organizationMembers.joinedAt,
        })
        .from(organizationMembers)
        .innerJoin(users, eq(users.id, organizationMembers.userId));

      for (const m of members) {
        if (!providerIds.includes(m.orgId)) continue;
        const existing = membersMap.get(m.orgId);
        if (!existing) {
          membersMap.set(m.orgId, { count: 1, ownerName: m.userName, ownerEmail: m.userEmail });
        } else {
          existing.count++;
        }
      }
    }

    const data = providerOrgs.map((p) => {
      const memberInfo = membersMap.get(p.id);
      return {
        id: p.id,
        name: p.name,
        slug: p.slug,
        logo: p.logo,
        phone: p.phone,
        website: p.website,
        instagramHandle: p.instagramHandle,
        providerCategory: p.providerCategory,
        verificationStatus: p.verificationStatus,
        verifiedAt: p.verifiedAt,
        rejectionReason: p.rejectionReason,
        serviceRadius: p.serviceRadius,
        createdAt: p.createdAt,
        memberCount: memberInfo?.count || 0,
        owner: memberInfo?.ownerEmail
          ? { name: memberInfo.ownerName, email: memberInfo.ownerEmail }
          : null,
      };
    });

    return NextResponse.json({
      success: true,
      data,
    });
  } catch (error) {
    console.error("GET /api/admin/providers error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch providers";
    const status = message.includes("Unauthorized") || message.includes("Forbidden") ? 403 : 500;
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status }
    );
  }
}
