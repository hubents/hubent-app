import { db } from "@/db";
import { partnerClaimTokens } from "@/db/schema";
import { eq, and, ne } from "drizzle-orm";
import { requireAuth } from "@/lib/session";
import { apiHandler, ok } from "@/lib/api-handler";

/**
 * GET /api/claim/mine
 * Returns all pending/needs_manual_verification claims created by the current org.
 * Used by the Partners page to show "Resend invitation" buttons.
 */
export async function GET() {
  return apiHandler(async () => {
    const session = await requireAuth();

    const claims = await db
      .select({
        id: partnerClaimTokens.id,
        contactId: partnerClaimTokens.contactId,
        providerName: partnerClaimTokens.providerName,
        email: partnerClaimTokens.email,
        status: partnerClaimTokens.status,
        expiresAt: partnerClaimTokens.expiresAt,
        createdAt: partnerClaimTokens.createdAt,
        token: partnerClaimTokens.token,
      })
      .from(partnerClaimTokens)
      .where(
        and(
          eq(partnerClaimTokens.plannerOrgId, session.organizationId),
          ne(partnerClaimTokens.status, "claimed")
        )
      )
      .limit(50);

    return ok(claims);
  }, "GET /api/claim/mine");
}
