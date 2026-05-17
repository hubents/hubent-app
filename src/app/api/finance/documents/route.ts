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
import { providerEventAccess, eventCollaborations } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { apiHandler, ok, badRequest, created, paginated } from "@/lib/api-handler";

// GET /api/finance/documents - List documents
export const GET = withMonitoring(
  async (request: NextRequest) =>
    apiHandler(async () => {
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

      return paginated(result.data, result.meta);
    }, "GET /api/finance/documents"),
  { name: "GET /api/finance/documents" },
);

// POST /api/finance/documents - Create document
export const POST = withMonitoring(
  async (request: NextRequest) =>
    apiHandler(async () => {
      const session = await requirePermission("finance:create");
      const body = await request.json();

      const { type, items } = body;

      if (!type || !items || items.length === 0) {
        return badRequest("Type and items are required");
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
        globalSurcharge: body.globalSurcharge,
        globalSurchargeType: body.globalSurchargeType,
        paymentMethod: body.paymentMethod,
        bankAccountId: body.bankAccountId,
        direction: body.direction,
        currency: body.currency,
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

      return created(document);
    }, "POST /api/finance/documents"),
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
  // Scenario A: This org is a GUEST collaborator on the event -> mirror to host org
  const collabAsGuest = await db.query.eventCollaborations.findFirst({
    where: and(
      eq(eventCollaborations.eventId, eventId),
      eq(eventCollaborations.guestOrgId, orgId),
      eq(eventCollaborations.status, "active"),
    ),
    columns: { hostOrgId: true },
  });

  if (collabAsGuest) {
    const localVendorId = await getVendorForProviderOrg(collabAsGuest.hostOrgId, orgId);
    await createMirrorDocument(documentId, collabAsGuest.hostOrgId, eventId, localVendorId);
    return;
  }

  // Legacy fallback: provider org via providerEventAccess
  const legacyAsGuest = await db.query.providerEventAccess.findFirst({
    where: and(
      eq(providerEventAccess.providerOrgId, orgId),
      eq(providerEventAccess.eventId, eventId),
      eq(providerEventAccess.status, "active"),
    ),
    columns: { plannerOrgId: true },
  });

  if (legacyAsGuest) {
    const localVendorId = await getVendorForProviderOrg(legacyAsGuest.plannerOrgId, orgId);
    await createMirrorDocument(documentId, legacyAsGuest.plannerOrgId, eventId, localVendorId);
    return;
  }

  // Scenario B: This org is the HOST -> mirror to guest orgs with active collaboration
  if (vendorId) {
    const providerOrgId = await getProviderOrgForVendor(vendorId);
    if (providerOrgId) {
      const collabActive = await db.query.eventCollaborations.findFirst({
        where: and(
          eq(eventCollaborations.eventId, eventId),
          eq(eventCollaborations.guestOrgId, providerOrgId),
          eq(eventCollaborations.status, "active"),
        ),
      });

      if (!collabActive) {
        const legacyActive = await db.query.providerEventAccess.findFirst({
          where: and(
            eq(providerEventAccess.providerOrgId, providerOrgId),
            eq(providerEventAccess.eventId, eventId),
            eq(providerEventAccess.status, "active"),
          ),
        });
        if (!legacyActive) return;
      }

      await createMirrorDocument(documentId, providerOrgId, eventId, null);
    }
  }
}
