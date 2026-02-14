import { NextResponse } from "next/server";
import { requirePlatformAdmin } from "@/lib/session";
import { db } from "@/db";
import { organizations, organizationMembers, users } from "@/db/schema";
import { eq, count, desc, sql } from "drizzle-orm";

/**
 * GET /api/admin/providers
 * List all provider organizations for super admin
 */
export async function GET() {
  try {
    await requirePlatformAdmin();

    // Single query with member count subquery
    const providers = await db
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
        memberCount: sql<number>`(SELECT count(*) FROM organization_members WHERE organization_id = ${organizations.id})`.as("member_count"),
        ownerName: sql<string | null>`(SELECT u.name FROM organization_members om JOIN users u ON u.id = om.user_id WHERE om.organization_id = ${organizations.id} ORDER BY om.joined_at ASC LIMIT 1)`.as("owner_name"),
        ownerEmail: sql<string | null>`(SELECT u.email FROM organization_members om JOIN users u ON u.id = om.user_id WHERE om.organization_id = ${organizations.id} ORDER BY om.joined_at ASC LIMIT 1)`.as("owner_email"),
      })
      .from(organizations)
      .where(eq(organizations.orgType, "provider"))
      .orderBy(desc(organizations.createdAt));

    const data = providers.map((p) => ({
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
      memberCount: Number(p.memberCount) || 0,
      owner: p.ownerEmail ? { name: p.ownerName, email: p.ownerEmail } : null,
    }));

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
