import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { organizations, providerFavorites, vendors, orgReviews } from "@/db/schema";
import { eq, and, ilike, asc, sql, inArray, or, ne, avg, count, gte } from "drizzle-orm";
import { createContact } from "@/lib/contacts";
import { apiHandler, ok, created, badRequest } from "@/lib/api-handler";
import { sendProviderClaimNotificationEmail, sendProviderManualVerificationEmail } from "@/lib/email";
import { users, partnerClaimTokens } from "@/db/schema";
import { isGenericEmail, getEmailDomain } from "@/lib/email-utils";
import { trackPlatformLead } from "@/lib/platform-leads";

/**
 * GET /api/providers
 * Search organizations for Partners (providers + planners).
 * Query params: ?search=X&category=Y&city=Z&verified=true&favorites=true&myProviders=true&type=provider|planner&page=1&limit=50
 */
export async function GET(request: NextRequest) {
  return apiHandler(async () => {
    const session = await requireAuth();

    const { searchParams } = request.nextUrl;
    const search = searchParams.get("search") || "";
    const category = searchParams.get("category") || "";
    const city = searchParams.get("city") || "";
    const countryFilter = searchParams.get("country") || "";
    const verified = searchParams.get("verified") === "true";
    const favoritesOnly = searchParams.get("favorites") === "true";
    const myProvidersOnly = searchParams.get("myProviders") === "true";
    const typeFilter = searchParams.get("type") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
    const offset = (page - 1) * limit;

    const conditions: ReturnType<typeof eq>[] = [];

    // Never show the host's own organization
    conditions.push(ne(organizations.id, session.organizationId));

    if (typeFilter === "provider") {
      conditions.push(eq(organizations.orgType, "provider"));
    } else if (typeFilter === "planner") {
      conditions.push(eq(organizations.orgType, "tenant"));
    } else {
      conditions.push(
        or(
          eq(organizations.orgType, "provider"),
          eq(organizations.orgType, "tenant")
        )!
      );
    }

    if (verified) {
      conditions.push(eq(organizations.verificationStatus, "verified"));
    }

    if (search) {
      conditions.push(
        sql`(${ilike(organizations.name, `%${search}%`)} OR ${ilike(organizations.instagramHandle, `%${search}%`)} OR ${ilike(organizations.description, `%${search}%`)})`
      );
    }

    if (category) {
      const validCategories = ["booking", "logistica", "audiovisual", "otro"] as const;
      type ProviderCategory = typeof validCategories[number];
      if (validCategories.includes(category as ProviderCategory)) {
        conditions.push(eq(organizations.providerCategory, category as ProviderCategory));
      }
    }

    if (city) {
      conditions.push(ilike(organizations.city, `%${city}%`));
    }

    if (countryFilter) {
      conditions.push(eq(organizations.country, countryFilter));
    }

    // Get user's favorites for isFavorite flag
    const userFavorites = await db
      .select({ providerOrgId: providerFavorites.providerOrgId })
      .from(providerFavorites)
      .where(
        and(
          eq(providerFavorites.organizationId, session.organizationId),
          eq(providerFavorites.userId, session.user.userId)
        )
      );
    const favoriteIds = new Set(userFavorites.map((f) => f.providerOrgId));

    // If favorites filter active, restrict to favorite IDs
    if (favoritesOnly && favoriteIds.size > 0) {
      conditions.push(inArray(organizations.id, [...favoriteIds]));
    } else if (favoritesOnly) {
      return ok({ data: [], meta: { page, limit, total: 0 } });
    }

    // If myProviders filter, restrict to orgs linked via vendors table
    if (myProvidersOnly) {
      const linkedVendors = await db
        .select({ providerOrgId: vendors.providerOrgId })
        .from(vendors)
        .where(eq(vendors.organizationId, session.organizationId));
      const linkedIds = linkedVendors
        .map((v) => v.providerOrgId)
        .filter((id): id is number => id !== null);
      if (linkedIds.length > 0) {
        conditions.push(inArray(organizations.id, linkedIds));
      } else {
        return ok({ data: [], meta: { page, limit, total: 0 } });
      }
    }

    const rows = await db
      .select({
        id: organizations.id,
        name: organizations.name,
        slug: organizations.slug,
        logo: organizations.logo,
        orgType: organizations.orgType,
        description: organizations.description,
        tagline: organizations.tagline,
        providerCategory: organizations.providerCategory,
        city: organizations.city,
        region: organizations.region,
        coverImage: organizations.coverImage,
        verificationStatus: organizations.verificationStatus,
        instagramHandle: organizations.instagramHandle,
        phone: organizations.phone,
        website: organizations.website,
        profileCompleteness: organizations.profileCompleteness,
        services: organizations.services,
        serviceRadius: organizations.serviceRadius,
        serviceAreas: organizations.serviceAreas,
        priceRange: organizations.priceRange,
        country: organizations.country,
      })
      .from(organizations)
      .where(and(...conditions))
      .orderBy(sql`${organizations.verifiedAt} DESC NULLS LAST`, asc(organizations.name))
      .limit(limit)
      .offset(offset);

    const [countResult] = await db
      .select({ count: sql<number>`count(*)` })
      .from(organizations)
      .where(and(...conditions));

    // Aggregate reviews stats for the current page of providers
    const providerIds = rows.map((r) => r.id);
    const ratingsMap = new Map<number, { averageRating: number | null; totalReviews: number }>();

    if (providerIds.length > 0) {
      const ratingsRows = await db
        .select({
          organizationId: orgReviews.organizationId,
          averageRating: avg(orgReviews.rating),
          totalReviews: count(orgReviews.id),
        })
        .from(orgReviews)
        .where(
          and(
            inArray(orgReviews.organizationId, providerIds),
            eq(orgReviews.isPublic, true)
          )
        )
        .groupBy(orgReviews.organizationId);

      for (const r of ratingsRows) {
        ratingsMap.set(r.organizationId, {
          averageRating: r.averageRating ? Number(r.averageRating) : null,
          totalReviews: Number(r.totalReviews),
        });
      }
    }

    const data = rows.map((p) => {
      const stats = ratingsMap.get(p.id);
      return {
        ...p,
        isFavorite: favoriteIds.has(p.id),
        isMyProvider: false,
        isUnclaimed: false,
        isFeatured: false,
        averageRating: stats?.averageRating ?? null,
        totalReviews: stats?.totalReviews ?? 0,
        categories: null,
      };
    });

    return ok({
      data,
      meta: {
        page,
        limit,
        total: Number(countResult?.count ?? 0),
      },
    });
  }, "GET /api/providers");
}

/**
 * POST /api/providers
 * Mirrors a Partner-created provider into the user's Contacts as a Vendor.
 * Visual-only: it does NOT create a real provider organization in the
 * marketplace. The new contact appears in Contactos → Proveedores so the
 * user can manage it like any other vendor contact.
 */
export async function POST(request: NextRequest) {
  return apiHandler(async () => {
    const session = await requireAuth();
    const body = await request.json().catch(() => null);

    if (!body || typeof body !== "object") {
      return badRequest("Body inválido");
    }

    const name = String(body.name || "").trim();
    const category = String(body.category || "").trim();
    if (!name || !category) {
      return badRequest("Nombre y categoría son obligatorios");
    }

    const email = body.email ? String(body.email).trim().toLowerCase() : undefined;
    const phone = body.phone ? String(body.phone).trim() : undefined;
    const city = body.city ? String(body.city).trim() : undefined;
    const description = body.description ? String(body.description).trim() : undefined;
    const instagram = body.instagram ? String(body.instagram).trim() : undefined;

    // ── Rate limiting: max 10 providers per org per hour ────────────────────
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const recentCount = await db
      .select({ n: count() })
      .from(partnerClaimTokens)
      .where(
        and(
          eq(partnerClaimTokens.plannerOrgId, session.organizationId),
          gte(partnerClaimTokens.createdAt, oneHourAgo)
        )
      );
    if ((recentCount[0]?.n ?? 0) >= 10) {
      return badRequest("Límite alcanzado: máximo 10 proveedores por hora. Inténtalo más tarde.", "RATE_LIMIT_EXCEEDED");
    }

    // Normalize Instagram handle (strip leading @, lowercase)
    const normalizedInstagram = instagram
      ? instagram.replace(/^@+/, "").toLowerCase()
      : undefined;

    // ── Contact info requirements ────────────────────────────────────────────
    // Rule 1: No email at all → require BOTH instagram AND phone so Hubents
    //         can reach the provider manually.
    if (!email && (!normalizedInstagram || !phone)) {
      return badRequest(
        "Sin correo electrónico, debes añadir tanto el Instagram como el teléfono del proveedor para poder contactar con él.",
        "MISSING_CONTACT_INFO"
      );
    }
    // Rule 2: Generic email (Gmail, Hotmail…) → require at least instagram OR phone.
    if (email && isGenericEmail(email) && !normalizedInstagram && !phone) {
      return badRequest(
        "El correo introducido es de uso personal (Gmail, Hotmail, etc.). Para poder verificar y contactar con este proveedor, añade también su Instagram o teléfono.",
        "GENERIC_EMAIL_NEEDS_CONTACT"
      );
    }

    // ── Deduplication: check if a provider org with the same Instagram or email
    //    already exists in the platform.
    if (normalizedInstagram) {
      const dup = await db
        .select({ id: organizations.id, name: organizations.name, slug: organizations.slug, city: organizations.city })
        .from(organizations)
        .where(
          and(
            eq(organizations.orgType, "provider"),
            sql`lower(regexp_replace(${organizations.instagramHandle}, '^@+', '')) = ${normalizedInstagram}`
          )
        )
        .limit(1);
      if (dup.length > 0) {
        return NextResponse.json(
          { success: false, error: { code: "DUPLICATE_PROVIDER", message: "Este proveedor ya existe en la plataforma", existingProvider: dup[0] } },
          { status: 409 }
        );
      }
    }

    if (email) {
      const dupByEmail = await db
        .select({ id: organizations.id, name: organizations.name, slug: organizations.slug, city: organizations.city })
        .from(organizations)
        .where(
          and(
            eq(organizations.orgType, "provider"),
            or(
              sql`lower(${organizations.publicEmail}) = ${email}`,
              sql`lower(${organizations.fiscalEmail}) = ${email}`
            )
          )
        )
        .limit(1);
      if (dupByEmail.length > 0) {
        return NextResponse.json(
          { success: false, error: { code: "DUPLICATE_PROVIDER", message: "Este proveedor ya existe en la plataforma", existingProvider: dupByEmail[0] } },
          { status: 409 }
        );
      }
    }

    // Compose notes with the Instagram handle if the user provided one — keeps
    // it visible without needing a dedicated column.
    const notes = [description, instagram ? `Instagram: @${normalizedInstagram}` : null]
      .filter(Boolean)
      .join("\n\n") || undefined;

    const contact = await createContact(session, {
      type: "company",
      name,
      email,
      phone,
      city,
      isVendor: true,
      vendorCategory: category,
      notes,
      source: "manual",
    });

    trackPlatformLead({
      kind: "new_provider",
      name,
      email,
      phone,
      companyName: name,
      createdByName: session.user.name || session.user.email,
      createdByOrgName: session.user.currentOrganization?.name,
    }).catch((err) => console.error("trackPlatformLead failed:", err));

    // Create (or reuse) a claim token and send the notification email.
    if (email) {
      const emailDomain = getEmailDomain(email);
      const genericEmail = isGenericEmail(email);

      // Reuse existing pending token for the same email to avoid duplicates.
      let claimToken: string;
      const existingClaim = await db
        .select({ token: partnerClaimTokens.token })
        .from(partnerClaimTokens)
        .where(and(eq(partnerClaimTokens.email, email), eq(partnerClaimTokens.status, "pending")))
        .limit(1);

      if (existingClaim[0]) {
        claimToken = existingClaim[0].token;
      } else {
        claimToken = crypto.randomUUID().replace(/-/g, "");
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + 30);

        await db.insert(partnerClaimTokens).values({
          contactId: contact.id,
          plannerOrgId: session.organizationId,
          providerName: name,
          email,
          // Only store the domain for matching purposes on non-generic emails.
          emailDomain: genericEmail ? "" : emailDomain,
          token: claimToken,
          status: genericEmail ? "needs_manual_verification" : "pending",
          expiresAt,
        });
      }

      const [plannerUser, plannerOrg] = await Promise.all([
        db.select({ name: users.name }).from(users).where(eq(users.id, session.user.userId)).limit(1),
        db.select({ name: organizations.name }).from(organizations).where(eq(organizations.id, session.organizationId)).limit(1),
      ]);
      const plannerName = plannerUser[0]?.name || "Un organizador";
      const plannerOrgName = plannerOrg[0]?.name || "una empresa en Hubents";

      if (genericEmail) {
        // Manual verification flow: different email, no claim URL (they must go
        // through manual phone/code verification with the Hubents team).
        sendProviderManualVerificationEmail(email, name, plannerName, plannerOrgName, phone, claimToken).catch(
          (err) => console.error("Provider manual verification email failed:", err)
        );
      } else {
        sendProviderClaimNotificationEmail(email, name, plannerName, plannerOrgName, claimToken).catch(
          (err) => console.error("Provider claim email failed:", err)
        );
      }
    }

    return created({
      id: contact.id,
      name: contact.name,
      invitationSent: !!email,
      savedToContacts: true,
    });
  }, "POST /api/providers");
}
