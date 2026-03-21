import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { getDocuments, createDocument } from "@/lib/finance";
import { withMonitoring } from "@/lib/monitoring";
import { createMirrorDocument } from "@/lib/cross-org-finance";
import {
  getVendorForProviderOrg,
  getProviderOrgForVendor,
} from "@/lib/cross-org";
import { db } from "@/db";
import { organizations, providerEventAccess } from "@/db/schema";
import { eq, and } from "drizzle-orm";

// GET /api/finance/documents - List documents
export const GET = withMonitoring(
  async (request: NextRequest) => {
    const session = await requirePermission("finance:read");
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const type = searchParams.get("type") || undefined;
    const status = searchParams.get("status") || undefined;
    const direction = searchParams.get("direction") || undefined;
    const search = searchParams.get("search") || undefined;
    const eventId = searchParams.get("eventId")
      ? parseInt(searchParams.get("eventId")!, 10)
      : undefined;
    const contactId = searchParams.get("contactId")
      ? parseInt(searchParams.get("contactId")!, 10)
      : undefined;
    const vendorId = searchParams.get("vendorId")
      ? parseInt(searchParams.get("vendorId")!, 10)
      : undefined;
    const scope =
      (searchParams.get("scope") as "standalone" | "event" | "all") ||
      undefined;

    const result = await getDocuments(session, {
      page,
      limit,
      type,
      status,
      direction,
      search,
      eventId,
      contactId,
      vendorId,
      scope,
    });

    return NextResponse.json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  },
  { name: "GET /api/finance/documents" },
);

// POST /api/finance/documents - Create document
export const POST = withMonitoring(
  async (request: NextRequest) => {
    const session = await requirePermission("finance:create");
    const body = await request.json();

    const { type, items } = body;

    if (!type || !items || items.length === 0) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Type and items are required",
          },
        },
        { status: 400 },
      );
    }

    const document = await createDocument(session, {
      type,
      companyId: body.companyId,
      personId: body.personId,
      contactId: body.contactId,
      vendorId: body.vendorId,
      eventId: body.eventId,
      dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
      validUntil: body.validUntil ? new Date(body.validUntil) : undefined,
      notes: body.notes,
      termsAndConditions: body.termsAndConditions,
      globalDiscount: body.globalDiscount,
      globalDiscountType: body.globalDiscountType,
      paymentMethod: body.paymentMethod,
      bankAccountId: body.bankAccountId,
      direction: body.direction,
      status: body.status,
      items,
    });

    // Auto-mirror: detect cross-org scenarios (non-blocking)
    if (document && body.eventId) {
      autoCreateMirror(
        session.organizationId,
        document.id,
        body.eventId,
        body.vendorId,
      ).catch((e) => console.error("Auto-mirror creation failed:", e));
    }

    return NextResponse.json({
      success: true,
      data: document,
    });
  },
  { name: "POST /api/finance/documents" },
);

/**
 * Auto-create mirror document when cross-org relationship is detected.
 * Scenario A: Provider creates doc with eventId → mirror in planner's org
 * Scenario B: Planner creates doc with vendorId linked to provider org → mirror in provider's org
 */
async function autoCreateMirror(
  orgId: number,
  documentId: number,
  eventId: number,
  vendorId?: number,
) {
  const org = await db.query.organizations.findFirst({
    where: eq(organizations.id, orgId),
    columns: { orgType: true },
  });
  if (!org) return;

  if (org.orgType === "provider") {
    // Scenario A: Provider → find planner org via providerEventAccess
    const access = await db.query.providerEventAccess.findFirst({
      where: and(
        eq(providerEventAccess.providerOrgId, orgId),
        eq(providerEventAccess.eventId, eventId),
        eq(providerEventAccess.status, "active"),
      ),
      columns: { plannerOrgId: true },
    });
    if (!access) return;

    const localVendorId = await getVendorForProviderOrg(
      access.plannerOrgId,
      orgId,
    );
    await createMirrorDocument(
      documentId,
      access.plannerOrgId,
      eventId,
      localVendorId,
    );
  } else if (org.orgType === "tenant" && vendorId) {
    // Scenario B: Planner → check if vendor is linked to a provider org
    const providerOrgId = await getProviderOrgForVendor(vendorId);
    if (!providerOrgId) return;

    // Verify the provider has access to this event
    const access = await db.query.providerEventAccess.findFirst({
      where: and(
        eq(providerEventAccess.providerOrgId, providerOrgId),
        eq(providerEventAccess.eventId, eventId),
        eq(providerEventAccess.status, "active"),
      ),
    });
    if (!access) return;

    await createMirrorDocument(documentId, providerOrgId, eventId, null);
  }
}
