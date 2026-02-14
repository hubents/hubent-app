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
  }).optional(),
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
    if (data.settings !== undefined) updates.settings = data.settings;

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
