import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/api-wrapper";
import { db } from "@/db";
import { contacts } from "@/db/schema";
import { eq, and, desc, gt, count, ilike, isNull } from "drizzle-orm";
import { parsePaginationParams, buildPaginatedResponse, parseFilterParams } from "@/lib/api/api-utils";
import { validationError } from "@/lib/api/api-errors";
import { dispatchWebhookEvent } from "@/lib/api/api-webhooks";
import { z } from "zod";

const createContactSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(["person", "company"]).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  trade_name: z.string().optional(),
  tax_id: z.string().optional(),
  website: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postal_code: z.string().optional(),
  country: z.string().optional(),
  source: z.enum(["manual", "import", "website", "referral", "social_media", "event", "other"]).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().optional(),
  is_vendor: z.boolean().optional(),
  vendor_category: z.string().optional(),
  category: z.string().optional(),
});

export const GET = withApiAuth(
  async (request: NextRequest, { session }) => {
    const { searchParams } = new URL(request.url);
    const { limit, startingAfter } = parsePaginationParams(searchParams);
    const filters = parseFilterParams(searchParams, ["type", "source", "search", "is_vendor", "is_lead"]);

    let whereClause = and(eq(contacts.organizationId, session.organizationId), isNull(contacts.deletedAt))!;

    if (filters.type) {
      whereClause = and(whereClause, eq(contacts.type, filters.type as "person" | "company"))!;
    }
    if (filters.search) {
      whereClause = and(whereClause, ilike(contacts.name, `%${filters.search}%`))!;
    }
    if (filters.is_vendor === "true") {
      whereClause = and(whereClause, eq(contacts.isVendor, true))!;
    }
    if (filters.is_lead === "true") {
      whereClause = and(whereClause, eq(contacts.isLead, true))!;
    }
    if (startingAfter) {
      whereClause = and(whereClause, gt(contacts.id, startingAfter))!;
    }

    const [totalResult] = await db.select({ count: count() }).from(contacts)
      .where(and(eq(contacts.organizationId, session.organizationId), isNull(contacts.deletedAt)));

    const results = await db.select({
      id: contacts.id,
      name: contacts.name,
      type: contacts.type,
      email: contacts.email,
      phone: contacts.phone,
      firstName: contacts.firstName,
      lastName: contacts.lastName,
      tradeName: contacts.tradeName,
      taxId: contacts.taxId,
      website: contacts.website,
      address: contacts.address,
      city: contacts.city,
      country: contacts.country,
      source: contacts.source,
      tags: contacts.tags,
      isVendor: contacts.isVendor,
      isLead: contacts.isLead,
      leadScore: contacts.leadScore,
      category: contacts.category,
      vendorCategory: contacts.vendorCategory,
      createdAt: contacts.createdAt,
      updatedAt: contacts.updatedAt,
    }).from(contacts).where(whereClause).orderBy(desc(contacts.createdAt)).limit(limit);

    return {
      data: buildPaginatedResponse(
        results.map((c) => ({ object: "contact" as const, ...c })),
        totalResult?.count ?? 0,
        "/api/v1/contacts",
        limit
      ),
    };
  },
  { scope: "contacts:read" }
);

export const POST = withApiAuth(
  async (request: NextRequest, { session }) => {
    const body = await request.json();
    const parsed = createContactSchema.safeParse(body);
    if (!parsed.success) throw validationError(parsed.error.issues[0].message, parsed.error.issues[0].path.join("."));

    const d = parsed.data;
    const [contact] = await db.insert(contacts).values({
      organizationId: session.organizationId,
      name: d.name,
      type: d.type || "person",
      email: d.email,
      phone: d.phone,
      firstName: d.first_name,
      lastName: d.last_name,
      tradeName: d.trade_name,
      taxId: d.tax_id,
      website: d.website,
      address: d.address,
      city: d.city,
      state: d.state,
      postalCode: d.postal_code,
      country: d.country || "ES",
      source: d.source || "manual",
      tags: d.tags,
      notes: d.notes,
      isVendor: d.is_vendor || false,
      vendorCategory: d.vendor_category,
      category: d.category,
    }).returning();

    void dispatchWebhookEvent(session.organizationId, "contact.created", { ...contact }).catch(() => {});

    return { status: 201, data: { object: "contact", ...contact } };
  },
  { scope: "contacts:write", idempotent: true }
);
