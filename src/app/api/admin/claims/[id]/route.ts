import { NextRequest } from "next/server";
import { db } from "@/db";
import { partnerClaimTokens } from "@/db/schema";
import { eq } from "drizzle-orm";
import { requirePlatformAdmin } from "@/lib/session";
import { apiHandler, ok, notFound, badRequest } from "@/lib/api-handler";

/**
 * PATCH /api/admin/claims/[id]
 * Body: { action: "resolve" | "expire" }
 * Allows the Hubents team to manually resolve a needs_manual_verification claim
 * after completing a phone/SMS verification, or expire a stale one.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return apiHandler(async () => {
    await requirePlatformAdmin();
    const { id } = await params;
    const claimId = parseInt(id);
    if (isNaN(claimId)) return badRequest("ID inválido");

    const body = await request.json().catch(() => ({}));
    const action = body?.action;
    if (action !== "resolve" && action !== "expire") {
      return badRequest("action debe ser 'resolve' o 'expire'");
    }

    const claim = await db.query.partnerClaimTokens.findFirst({
      where: (c, { eq }) => eq(c.id, claimId),
    });
    if (!claim) return notFound("Claim no encontrado");

    if (action === "resolve") {
      if (claim.status === "claimed") return badRequest("Este claim ya está reclamado");
      await db
        .update(partnerClaimTokens)
        .set({ status: "claimed", claimedAt: new Date() })
        .where(eq(partnerClaimTokens.id, claimId));
      return ok({ resolved: true });
    }

    // expire
    await db
      .update(partnerClaimTokens)
      .set({ status: "expired" })
      .where(eq(partnerClaimTokens.id, claimId));
    return ok({ expired: true });
  }, "PATCH /api/admin/claims/[id]");
}
