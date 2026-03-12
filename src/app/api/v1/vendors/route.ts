import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/api-wrapper";
import { db } from "@/db";
import { vendors } from "@/db/schema";
import { eq, and, desc, gt, count, ilike } from "drizzle-orm";
import { parsePaginationParams, buildPaginatedResponse, parseFilterParams } from "@/lib/api/api-utils";
import { validationError } from "@/lib/api/api-errors";
import { dispatchWebhookEvent } from "@/lib/api/api-webhooks";
import { z } from "zod";

const createVendorSchema = z.object({
  name: z.string().min(1).max(200),
  category: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  notes: z.string().optional(),
  rating: z.number().int().min(1).max(5).optional(),
});

export const GET = withApiAuth(
  async (request: NextRequest, { session }) => {
    const { searchParams } = new URL(request.url);
    const { limit, startingAfter } = parsePaginationParams(searchParams);
    const filters = parseFilterParams(searchParams, ["category", "search"]);

    let whereClause = eq(vendors.organizationId, session.organizationId);

    if (filters.category) {
      whereClause = and(whereClause, eq(vendors.category, filters.category))!;
    }
    if (filters.search) {
      whereClause = and(whereClause, ilike(vendors.name, `%${filters.search}%`))!;
    }
    if (startingAfter) {
      whereClause = and(whereClause, gt(vendors.id, startingAfter))!;
    }

    const [totalResult] = await db.select({ count: count() }).from(vendors)
      .where(eq(vendors.organizationId, session.organizationId));

    const results = await db.select({
      id: vendors.id,
      name: vendors.name,
      category: vendors.category,
      email: vendors.email,
      phone: vendors.phone,
      website: vendors.website,
      address: vendors.address,
      notes: vendors.notes,
      rating: vendors.rating,
      createdAt: vendors.createdAt,
    }).from(vendors).where(whereClause).orderBy(desc(vendors.createdAt)).limit(limit);

    return {
      data: buildPaginatedResponse(
        results.map((v) => ({ object: "vendor" as const, ...v })),
        totalResult?.count ?? 0,
        "/api/v1/vendors",
        limit
      ),
    };
  },
  { scope: "vendors:read" }
);

export const POST = withApiAuth(
  async (request: NextRequest, { session }) => {
    const body = await request.json();
    const parsed = createVendorSchema.safeParse(body);
    if (!parsed.success) throw validationError(parsed.error.issues[0].message, parsed.error.issues[0].path.join("."));

    const d = parsed.data;
    const [vendor] = await db.insert(vendors).values({
      organizationId: session.organizationId,
      name: d.name,
      category: d.category,
      email: d.email,
      phone: d.phone,
      website: d.website,
      address: d.address,
      notes: d.notes,
      rating: d.rating,
    }).returning();

    void dispatchWebhookEvent(session.organizationId, "vendor.created", { ...vendor }).catch(() => {});

    return { status: 201, data: { object: "vendor", ...vendor } };
  },
  { scope: "vendors:write", idempotent: true }
);
