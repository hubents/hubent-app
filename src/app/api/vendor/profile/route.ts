import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { z } from "zod";

/**
 * GET /api/vendor/profile
 * Returns current provider org profile
 */
export async function GET() {
  try {
    const session = await requireAuth();

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, session.organizationId),
    });

    if (!org || org.orgType !== "provider") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Not a provider organization" } },
        { status: 403 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        logo: org.logo,
        phone: org.phone,
        website: org.website,
        address: org.address,
        instagramHandle: org.instagramHandle,
        providerCategory: org.providerCategory,
        serviceRadius: org.serviceRadius,
        serviceAreas: org.serviceAreas,
        verificationStatus: org.verificationStatus,
        settings: org.settings,
        description: org.description,
        tagline: org.tagline,
        coverImage: org.coverImage,
        publicEmail: org.publicEmail,
        tiktokHandle: org.tiktokHandle,
        facebookUrl: org.facebookUrl,
        linkedinUrl: org.linkedinUrl,
        priceRange: org.priceRange,
        services: org.services,
        categories: org.categories,
        foundedYear: org.foundedYear,
        city: org.city,
        region: org.region,
        country: org.country,
        languagesSpoken: org.languagesSpoken,
        minBudget: org.minBudget,
        maxBudget: org.maxBudget,
        responseTime: org.responseTime,
        profileCompleteness: org.profileCompleteness,
        totalReviews: org.totalReviews,
        averageRating: org.averageRating,
        isFeatured: org.isFeatured,
      },
    });
  } catch (error) {
    console.error("GET /api/vendor/profile error:", error);
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
  phone: z.string().regex(/^[+\d\s\-()]{6,20}$/).optional().or(z.literal("")),
  website: z.string().url().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  instagramHandle: z.string().optional().or(z.literal("")),
  providerCategory: z.string().optional(),
  serviceRadius: z.number().min(0).optional(),
  settings: z.object({
    timezone: z.string().optional(),
    currency: z.string().optional(),
    language: z.string().optional(),
    dateFormat: z.string().optional(),
  }).optional(),
  description: z.string().max(2000).optional().or(z.literal("")),
  tagline: z.string().max(120).optional().or(z.literal("")),
  coverImage: z.string().url().optional().or(z.literal("")),
  publicEmail: z.string().email().optional().or(z.literal("")),
  tiktokHandle: z.string().optional().or(z.literal("")),
  facebookUrl: z.string().url().optional().or(z.literal("")),
  linkedinUrl: z.string().url().optional().or(z.literal("")),
  priceRange: z.string().optional().or(z.literal("")),
  services: z.array(z.string()).optional(),
  categories: z.array(z.string()).optional(),
  foundedYear: z.number().min(1900).max(2100).optional().nullable(),
  city: z.string().optional().or(z.literal("")),
  region: z.string().optional().or(z.literal("")),
  country: z.string().optional().or(z.literal("")),
  languagesSpoken: z.array(z.string()).optional(),
  minBudget: z.number().min(0).optional().nullable(),
  maxBudget: z.number().min(0).optional().nullable(),
  responseTime: z.string().optional().or(z.literal("")),
});

/**
 * PATCH /api/vendor/profile
 * Update provider org profile
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await requireAuth();

    const org = await db.query.organizations.findFirst({
      where: eq(organizations.id, session.organizationId),
      columns: { orgType: true },
    });

    if (!org || org.orgType !== "provider") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Not a provider organization" } },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = updateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: parsed.error.issues[0].message } },
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
    if (data.providerCategory !== undefined) updates.providerCategory = data.providerCategory;
    if (data.serviceRadius !== undefined) updates.serviceRadius = data.serviceRadius;
    if (data.settings !== undefined) {
      const currentOrg = await db.query.organizations.findFirst({
        where: eq(organizations.id, session.organizationId),
        columns: { settings: true },
      });
      updates.settings = { ...(currentOrg?.settings || {}), ...data.settings };
    }
    if (data.description !== undefined) updates.description = data.description || null;
    if (data.tagline !== undefined) updates.tagline = data.tagline || null;
    if (data.coverImage !== undefined) updates.coverImage = data.coverImage || null;
    if (data.publicEmail !== undefined) updates.publicEmail = data.publicEmail || null;
    if (data.tiktokHandle !== undefined) {
      updates.tiktokHandle = data.tiktokHandle
        ? data.tiktokHandle.replace(/^@+/, "").replace(/^https?:\/\/(www\.)?tiktok\.com\/@?/, "").replace(/\/.*$/, "")
        : null;
    }
    if (data.facebookUrl !== undefined) updates.facebookUrl = data.facebookUrl || null;
    if (data.linkedinUrl !== undefined) updates.linkedinUrl = data.linkedinUrl || null;
    if (data.priceRange !== undefined) updates.priceRange = data.priceRange || null;
    if (data.services !== undefined) updates.services = data.services;
    if (data.categories !== undefined) updates.categories = data.categories;
    if (data.foundedYear !== undefined) updates.foundedYear = data.foundedYear;
    if (data.city !== undefined) updates.city = data.city || null;
    if (data.region !== undefined) updates.region = data.region || null;
    if (data.country !== undefined) updates.country = data.country || null;
    if (data.languagesSpoken !== undefined) updates.languagesSpoken = data.languagesSpoken;
    if (data.minBudget !== undefined) updates.minBudget = data.minBudget !== null ? String(data.minBudget) : null;
    if (data.maxBudget !== undefined) updates.maxBudget = data.maxBudget !== null ? String(data.maxBudget) : null;
    if (data.responseTime !== undefined) updates.responseTime = data.responseTime || null;

    // Recalculate profile completeness
    const currentOrg2 = await db.query.organizations.findFirst({
      where: eq(organizations.id, session.organizationId),
    });
    if (currentOrg2) {
      const merged = { ...currentOrg2, ...updates };
      const fields = [
        merged.name, merged.logo, merged.description, merged.providerCategory,
        merged.phone, merged.instagramHandle, merged.city,
        merged.services && (merged.services as string[]).length > 0 ? "yes" : null,
        merged.coverImage, merged.website,
      ];
      const filled = fields.filter(Boolean).length;
      updates.profileCompleteness = Math.round((filled / fields.length) * 100);
    }

    await db
      .update(organizations)
      .set(updates)
      .where(eq(organizations.id, session.organizationId));

    return NextResponse.json({ success: true, data: { updated: true } });
  } catch (error) {
    console.error("PATCH /api/vendor/profile error:", error);
    const message = error instanceof Error ? error.message : "Failed to update profile";
    const status = message.includes("Unauthorized") ? 401 : 500;
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message } },
      { status }
    );
  }
}
