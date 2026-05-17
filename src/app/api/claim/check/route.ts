import { NextRequest } from "next/server";
import { db } from "@/db";
import { partnerClaimTokens } from "@/db/schema";
import { and, eq, or, ne } from "drizzle-orm";
import { apiHandler, ok, badRequest } from "@/lib/api-handler";
import { isGenericEmail, getEmailDomain } from "@/lib/email-utils";

/**
 * GET /api/claim/check?email=X
 * Returns pending claims for an email (exact match, or same non-generic domain).
 * Generic email domains (gmail, hotmail…) are excluded from domain matching to
 * avoid false positives — two people at gmail.com are not the same company.
 */
export async function GET(request: NextRequest) {
  return apiHandler(async () => {
    const email = request.nextUrl.searchParams.get("email")?.toLowerCase();
    if (!email) return badRequest("email requerido");

    const domain = getEmailDomain(email);
    const canMatchByDomain = !isGenericEmail(email) && domain.length > 0;

    const conditions = canMatchByDomain
      ? and(
          eq(partnerClaimTokens.status, "pending"),
          or(
            eq(partnerClaimTokens.email, email),
            and(
              eq(partnerClaimTokens.emailDomain, domain),
              ne(partnerClaimTokens.emailDomain, "")
            )
          )
        )
      : and(
          eq(partnerClaimTokens.status, "pending"),
          eq(partnerClaimTokens.email, email)
        );

    const claims = await db
      .select({
        token: partnerClaimTokens.token,
        providerName: partnerClaimTokens.providerName,
        email: partnerClaimTokens.email,
      })
      .from(partnerClaimTokens)
      .where(conditions)
      .limit(3);

    return ok(claims);
  }, "GET /api/claim/check");
}
