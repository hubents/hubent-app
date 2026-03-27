import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { providerEventAccess, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { isMarketplaceType } from "@/lib/tenant-type";

/**
 * GET /api/vendor/planner-orgs
 * Returns planner organizations the provider works with.
 * Used to populate the contact selector in the DocumentDrawer for providers.
 * Format is compatible with the vendor list in ContactSelector.
 */
export async function GET() {
  try {
    const session = await requireAuth();

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, session.organizationId),
      columns: { orgType: true },
    });
    if (!org || !isMarketplaceType(org.orgType || "")) {
      return NextResponse.json({ success: true, data: [] });
    }

    // Get unique planner orgs via providerEventAccess
    const accessList = await db
      .select({
        plannerOrgId: providerEventAccess.plannerOrgId,
        plannerOrgName: organizations.name,
        plannerOrgEmail: organizations.fiscalEmail,
        plannerOrgPhone: organizations.phone,
      })
      .from(providerEventAccess)
      .innerJoin(organizations, eq(organizations.id, providerEventAccess.plannerOrgId))
      .where(eq(providerEventAccess.providerOrgId, session.organizationId))
      .groupBy(
        providerEventAccess.plannerOrgId,
        organizations.name,
        organizations.fiscalEmail,
        organizations.phone
      );

    // Format as vendor-compatible entries for ContactSelector
    const data = accessList.map((a) => ({
      id: a.plannerOrgId,
      name: a.plannerOrgName,
      email: a.plannerOrgEmail || null,
      phone: a.plannerOrgPhone || null,
      category: "Organizador",
    }));

    return NextResponse.json({ success: true, data });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch planner orgs";
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}
