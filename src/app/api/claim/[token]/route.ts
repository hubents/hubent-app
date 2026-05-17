import { NextRequest } from "next/server";
import { db } from "@/db";
import { partnerClaimTokens, organizations, vendors, contacts, notifications, users } from "@/db/schema";
import { eq, and, ilike } from "drizzle-orm";
import { requireAuth } from "@/lib/session";
import { apiHandler, ok, notFound, badRequest, conflict, forbidden } from "@/lib/api-handler";
import { sendProviderProfileClaimedEmail } from "@/lib/email";
import { isGenericEmail, getEmailDomain } from "@/lib/email-utils";

/**
 * GET /api/claim/[token]
 * Returns public info about the claim so the landing page can show it.
 * Does NOT require auth.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  const claim = await db.query.partnerClaimTokens.findFirst({
    where: (c, { eq }) => eq(c.token, token),
  });

  if (!claim) return notFound("Token no válido");

  if (claim.status === "claimed") {
    return ok({ status: "claimed", providerName: claim.providerName });
  }

  if (new Date() > claim.expiresAt) {
    return ok({ status: "expired", providerName: claim.providerName });
  }

  // Fetch planner org name to display in landing page
  const [plannerOrg] = await db
    .select({ name: organizations.name, city: organizations.city })
    .from(organizations)
    .where(eq(organizations.id, claim.plannerOrgId))
    .limit(1);

  return ok({
    status: "pending",
    providerName: claim.providerName,
    email: claim.email,
    plannerOrgName: plannerOrg?.name ?? null,
    plannerOrgCity: plannerOrg?.city ?? null,
  });
}

/**
 * POST /api/claim/[token]
 * Completes the claim: links the authenticated user's org to the vendor contact.
 * Requires auth (the user must have just registered or logged in).
 */
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  return apiHandler(async () => {
    const { token } = await params;
    const session = await requireAuth();

    const claim = await db.query.partnerClaimTokens.findFirst({
      where: (c, { eq }) => eq(c.token, token),
    });

    if (!claim) return notFound("Token no válido");
    if (claim.status === "claimed") return conflict("Este perfil ya ha sido reclamado");
    if (new Date() > claim.expiresAt) return badRequest("El enlace de reclamación ha expirado");

    // ── Fix 2: Only providers can claim a profile ────────────────────────────
    if (session.orgType !== "provider") {
      return forbidden("Solo una cuenta de proveedor puede reclamar este perfil. Cambia a tu cuenta de proveedor o crea una nueva.");
    }

    // ── Fix 1: Verify email ownership ────────────────────────────────────────
    // Accept if: exact email match, OR same non-generic domain (colleague from same company).
    const sessionEmail = session.user.email.toLowerCase();
    const claimEmail = claim.email.toLowerCase();
    const sessionDomain = getEmailDomain(sessionEmail);
    const claimDomain = getEmailDomain(claimEmail);
    const domainMatch = !isGenericEmail(claimEmail) && sessionDomain === claimDomain;

    if (sessionEmail !== claimEmail && !domainMatch) {
      return forbidden(
        "Este enlace de reclamación fue enviado a un correo diferente. Inicia sesión con la cuenta de correo a la que llegó la invitación, o con cualquier cuenta del mismo dominio."
      );
    }

    // ── Fix 3: Propagate to ALL vendor records with the same email ───────────
    await db
      .update(vendors)
      .set({ providerOrgId: session.organizationId })
      .where(ilike(vendors.email, claimEmail));

    // Auto-verify the claiming org — they proved ownership via email/domain
    await db
      .update(organizations)
      .set({ verificationStatus: "verified" })
      .where(eq(organizations.id, session.organizationId));

    // Also touch the original contact so it appears updated
    await db
      .update(contacts)
      .set({ updatedAt: new Date() })
      .where(eq(contacts.id, claim.contactId));

    // Mark THIS token (and all other pending tokens for the same email) as claimed
    await db
      .update(partnerClaimTokens)
      .set({
        status: "claimed",
        claimedByUserId: session.user.userId,
        claimedOrgId: session.organizationId,
        claimedAt: new Date(),
      })
      .where(ilike(partnerClaimTokens.email, claimEmail));

    // Notify the creator (whoever opened the profile — planner or provider)
    const [creatorOrg] = await db
      .select({ name: organizations.name, ownerId: organizations.ownerId, slug: organizations.slug })
      .from(organizations)
      .where(eq(organizations.id, claim.plannerOrgId))
      .limit(1);

    const [claimedOrg] = await db
      .select({ slug: organizations.slug })
      .from(organizations)
      .where(eq(organizations.id, session.organizationId))
      .limit(1);

    if (creatorOrg?.ownerId) {
      const [creatorUser] = await db
        .select({ email: users.email, name: users.name })
        .from(users)
        .where(eq(users.id, creatorOrg.ownerId))
        .limit(1);

      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://app.hubents.com";
      const profileLink = claimedOrg?.slug
        ? `${appUrl}/partners/${claimedOrg.slug}`
        : `${appUrl}/dashboard/partners`;

      // In-app notification
      db.insert(notifications).values({
        userId: creatorOrg.ownerId,
        organizationId: claim.plannerOrgId,
        type: "provider_claimed",
        title: "Proveedor verificado en Hubents",
        body: `${claim.providerName} ha reclamado y verificado su perfil en la plataforma.`,
        link: profileLink,
        data: { providerName: claim.providerName, claimedOrgId: String(session.organizationId) },
      }).execute().catch((e) => console.error("Claim notification insert failed:", e));

      // Email notification — fire-and-forget
      if (creatorUser?.email) {
        sendProviderProfileClaimedEmail(
          creatorUser.email,
          creatorUser.name || creatorOrg.name,
          claim.providerName,
          claimedOrg?.slug
        ).catch((e) => console.error("Provider claimed email failed:", e));
      }
    }

    return ok({ claimed: true, providerName: claim.providerName });
  }, "POST /api/claim/[token]");
}
