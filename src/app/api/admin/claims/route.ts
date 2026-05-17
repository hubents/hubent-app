import { NextRequest } from "next/server";
import { db } from "@/db";
import { partnerClaimTokens, organizations, users } from "@/db/schema";
import { eq, desc, ilike, or, and, sql } from "drizzle-orm";
import { requirePlatformAdmin } from "@/lib/session";
import { apiHandler, ok } from "@/lib/api-handler";

/**
 * GET /api/admin/claims
 * Lists all partner claim tokens platform-wide, with creator org and status.
 */
export async function GET(request: NextRequest) {
  return apiHandler(async () => {
    await requirePlatformAdmin();

    const { searchParams } = request.nextUrl;
    const status = searchParams.get("status") || "";
    const search = searchParams.get("search") || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = 50;
    const offset = (page - 1) * limit;

    const conditions = [];
    if (status) conditions.push(eq(partnerClaimTokens.status, status));
    if (search) {
      conditions.push(
        or(
          ilike(partnerClaimTokens.providerName, `%${search}%`),
          ilike(partnerClaimTokens.email, `%${search}%`)
        )!
      );
    }

    const where = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        id: partnerClaimTokens.id,
        providerName: partnerClaimTokens.providerName,
        email: partnerClaimTokens.email,
        emailDomain: partnerClaimTokens.emailDomain,
        status: partnerClaimTokens.status,
        createdAt: partnerClaimTokens.createdAt,
        expiresAt: partnerClaimTokens.expiresAt,
        claimedAt: partnerClaimTokens.claimedAt,
        plannerOrgId: partnerClaimTokens.plannerOrgId,
        plannerOrgName: sql<string>`(SELECT name FROM organizations WHERE id = ${partnerClaimTokens.plannerOrgId})`,
        plannerOrgType: sql<string>`(SELECT org_type FROM organizations WHERE id = ${partnerClaimTokens.plannerOrgId})`,
        token: partnerClaimTokens.token,
        phone: sql<string | null>`(SELECT phone FROM contacts WHERE id = ${partnerClaimTokens.contactId})`,
      })
      .from(partnerClaimTokens)
      .where(where)
      .orderBy(desc(partnerClaimTokens.createdAt))
      .limit(limit)
      .offset(offset);

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)` })
      .from(partnerClaimTokens)
      .where(where);

    return ok({ data: rows, meta: { page, limit, total: Number(total) } });
  }, "GET /api/admin/claims");
}
