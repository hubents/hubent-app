import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { INSTAGRAM_POST_URL_REGEX } from "@/lib/instagram-post-url";

/**
 * GET /api/organizations/profile
 * Returns current org profile (all public-profile-relevant fields)
 */
export async function GET() {
  try {
    const session = await requireAuth();

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, session.organizationId),
    });

    if (!org) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Organization not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        logo: org.logo,
        /** Same asset as fiscal "logo for documents"; exposed for UI preview (coalesce in client if needed) */
        invoiceLogo: org.invoiceLogo,
        phone: org.phone,
        website: org.website,
        address: org.address,
        orgType: org.orgType,
        instagramHandle: org.instagramHandle,
        providerCategory: org.providerCategory,
        serviceRadius: org.serviceRadius,
        serviceAreas: org.serviceAreas,
        verificationStatus: org.verificationStatus,
        settings: org.settings,
        description: org.description,
        tagline: org.tagline,
        coverImage: org.coverImage,
        city: org.city,
        region: org.region,
        country: org.country,
        publicEmail: org.publicEmail,
        priceRange: org.priceRange,
        profileCompleteness: org.profileCompleteness,
        services: org.services,
        instagramPosts: org.instagramPosts,
        brochureUrl: org.brochureUrl,
      },
    });
  } catch (error) {
    console.error("GET /api/organizations/profile error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch profile";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status }
    );
  }
}

const updateSchema = z.object({
  name: z.string().min(2).optional(),
  phone: z.string().optional().or(z.literal("")),
  website: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  instagramHandle: z.string().optional().or(z.literal("")),
  providerCategory: z.string().optional().or(z.literal("")),
  serviceRadius: z.number().min(0).optional(),
  description: z.string().max(2000).optional().or(z.literal("")),
  tagline: z.string().max(120).optional().or(z.literal("")),
  coverImage: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  region: z.string().optional().or(z.literal("")),
  country: z.string().optional().or(z.literal("")),
  publicEmail: z.string().email().optional().or(z.literal("")),
  priceRange: z.string().optional().or(z.literal("")),
  brochureUrl: z.string().optional().or(z.literal("")),
  instagramPosts: z.array(
    z.string().regex(INSTAGRAM_POST_URL_REGEX, "URL de Instagram inválida")
  ).max(6).optional(),
  settings: z.object({
    timezone: z.string().optional(),
    currency: z.string().optional(),
    language: z.string().optional(),
    dateFormat: z.string().optional(),
  }).optional(),
});

function calculateProfileCompleteness(org: Record<string, unknown>): number {
  let score = 0;
  const checks: [string, number][] = [
    ["name", 10],
    ["description", 15],
    ["tagline", 10],
    ["providerCategory", 10],
    ["logo", 10],
    ["coverImage", 5],
    ["city", 5],
    ["region", 5],
    ["phone", 5],
    ["publicEmail", 5],
    ["website", 5],
    ["instagramHandle", 5],
    ["priceRange", 5],
    ["brochureUrl", 5],
  ];
  for (const [key, points] of checks) {
    const val = org[key];
    if (val && typeof val === "string" && val.trim().length > 0) score += points;
  }
  return Math.min(score, 100);
}

/**
 * PATCH /api/organizations/profile
 * Update org profile
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth();

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, session.organizationId),
    });

    if (!org) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Organization not found" } },
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      const fieldErrors = parsed.error.issues.map((i) => ({
        field: i.path.join("."),
        message: i.message,
      }));
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: fieldErrors[0].message, details: fieldErrors } },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = { updatedAt: new Date() };
    const data = parsed.data;

    if (data.name !== undefined) updates.name = data.name;
    if (data.phone !== undefined) updates.phone = data.phone || null;
    if (data.website !== undefined) updates.website = data.website || null;
    if (data.address !== undefined) updates.address = data.address || null;
    if (data.instagramHandle !== undefined) {
      updates.instagramHandle = data.instagramHandle
        ? data.instagramHandle.replace(/^@+/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/.*$/, "")
        : null;
    }
    if (data.providerCategory !== undefined) updates.providerCategory = data.providerCategory || null;
    if (data.serviceRadius !== undefined) updates.serviceRadius = data.serviceRadius;
    if (data.description !== undefined) updates.description = data.description || null;
    if (data.tagline !== undefined) updates.tagline = data.tagline || null;
    if (data.coverImage !== undefined) updates.coverImage = data.coverImage || null;
    if (data.city !== undefined) updates.city = data.city || null;
    if (data.region !== undefined) updates.region = data.region || null;
    if (data.country !== undefined) updates.country = data.country || null;
    if (data.publicEmail !== undefined) updates.publicEmail = data.publicEmail || null;
    if (data.priceRange !== undefined) updates.priceRange = data.priceRange || null;
    if (data.brochureUrl !== undefined) updates.brochureUrl = data.brochureUrl || null;
    if (data.instagramPosts !== undefined) updates.instagramPosts = data.instagramPosts;
    if (data.settings !== undefined) {
      updates.settings = { ...(org.settings || {}), ...data.settings };
    }

    const merged = { ...org, ...updates };
    updates.profileCompleteness = calculateProfileCompleteness(merged as Record<string, unknown>);

    await db
      .update(organizations)
      .set(updates)
      .where(eq(organizations.id, session.organizationId));

    return NextResponse.json({ success: true, data: { updated: true, profileCompleteness: updates.profileCompleteness } });
  } catch (error) {
    console.error("PATCH /api/organizations/profile error:", error);
    const message = error instanceof Error ? error.message : "Failed to update profile";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message } },
      { status }
    );
  }
}
