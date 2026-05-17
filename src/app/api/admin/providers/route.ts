import { NextRequest } from "next/server";
import { requirePlatformAdmin } from "@/lib/session";
import { apiHandler, ok } from "@/lib/api-handler";
import { db } from "@/db";
import { organizations, organizationMembers, users, subscriptions, subscriptionPlans } from "@/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/providers
 * List all provider organizations for super admin
 */
export async function GET(request: NextRequest) {
  return apiHandler(async () => {
    await requirePlatformAdmin();

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const offset = (page - 1) * limit;

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
        serviceAreas: organizations.serviceAreas,
        address: organizations.address,
        createdAt: organizations.createdAt,
      })
      .from(organizations)
      .where(eq(organizations.orgType, "provider"))
      .orderBy(desc(organizations.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ count }] = await db
      .select({ count: sql<number>`count(*)` })
      .from(organizations)
      .where(eq(organizations.orgType, "provider"));

    const providerIds = providerOrgs.map((p) => p.id);

    const membersMap = new Map<number, { count: number; ownerName: string | null; ownerEmail: string | null }>();

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

    // Fetch subscription + plan info for each provider
    const subsData = await db
      .select({
        orgId: subscriptions.organizationId,
        status: subscriptions.status,
        trialEndsAt: subscriptions.trialEndsAt,
        planName: subscriptionPlans.name,
        planSlug: subscriptionPlans.slug,
      })
      .from(subscriptions)
      .innerJoin(subscriptionPlans, eq(subscriptionPlans.id, subscriptions.planId));

    const subsMap = new Map<number, { planName: string; planSlug: string; status: string | null; trialEndsAt: Date | null }>();
    for (const s of subsData) {
      if (providerIds.includes(s.orgId)) {
        subsMap.set(s.orgId, { planName: s.planName, planSlug: s.planSlug, status: s.status, trialEndsAt: s.trialEndsAt });
      }
    }

    const data = providerOrgs.map((p) => {
      const memberInfo = membersMap.get(p.id);
      const subInfo = subsMap.get(p.id);
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
        serviceAreas: p.serviceAreas,
        address: p.address,
        createdAt: p.createdAt,
        memberCount: memberInfo?.count || 0,
        owner: memberInfo?.ownerEmail
          ? { name: memberInfo.ownerName, email: memberInfo.ownerEmail }
          : null,
        planName: subInfo?.planName || null,
        planSlug: subInfo?.planSlug || null,
        subscriptionStatus: subInfo?.status || null,
        trialEndsAt: subInfo?.trialEndsAt?.toISOString() || null,
      };
    });

    return ok(data);
  }, "GET /api/admin/providers");
}
