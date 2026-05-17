import { NextRequest } from "next/server";
import { db } from "@/db";
import { partnerClaimTokens, organizations, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "@/lib/session";
import { apiHandler, ok, notFound, badRequest } from "@/lib/api-handler";
import { sendProviderClaimNotificationEmail, sendProviderManualVerificationEmail } from "@/lib/email";
import { isGenericEmail } from "@/lib/email-utils";

/**
 * POST /api/claim/resend
 * Body: { contactId: number }
 * Regenerates an expired/pending claim token for a vendor contact and
 * resends the notification email. Only the org that created the original
 * claim can resend it.
 */
export async function POST(request: NextRequest) {
  return apiHandler(async () => {
    const session = await requireAuth();
    const body = await request.json().catch(() => null);
    const contactId = body?.contactId ? Number(body.contactId) : null;

    if (!contactId) return badRequest("contactId requerido");

    // Find the existing claim for this contact created by the current org
    const existing = await db.query.partnerClaimTokens.findFirst({
      where: (c, { eq, and }) =>
        and(eq(c.contactId, contactId), eq(c.plannerOrgId, session.organizationId)),
    });

    if (!existing) return notFound("No se encontró un claim para este proveedor");
    if (existing.status === "claimed") return badRequest("Este perfil ya ha sido reclamado");

    // Generate new token + reset expiry
    const newToken = crypto.randomUUID().replace(/-/g, "");
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    await db
      .update(partnerClaimTokens)
      .set({ token: newToken, expiresAt, status: isGenericEmail(existing.email) ? "needs_manual_verification" : "pending" })
      .where(eq(partnerClaimTokens.id, existing.id));

    // Fetch sender info
    const [senderUser, senderOrg] = await Promise.all([
      db.select({ name: users.name }).from(users).where(eq(users.id, session.user.userId)).limit(1),
      db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, session.organizationId)).limit(1),
    ]);
    const senderName = senderUser[0]?.name || "Un organizador";
    const senderOrgName = senderOrg[0]?.name || "una empresa en Hubents";

    // Resend the appropriate email — fire-and-forget
    if (isGenericEmail(existing.email)) {
      sendProviderManualVerificationEmail(existing.email, existing.providerName, senderName, senderOrgName)
        .catch((e) => console.error("Resend manual verification email failed:", e));
    } else {
      sendProviderClaimNotificationEmail(existing.email, existing.providerName, senderName, senderOrgName, newToken)
        .catch((e) => console.error("Resend claim email failed:", e));
    }

    return ok({ resent: true, providerName: existing.providerName });
  }, "POST /api/claim/resend");
}
