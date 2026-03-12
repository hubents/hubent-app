import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { providerEventAccess, financialDocuments, organizations } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { createDocument } from "@/lib/finance";
import { createMirrorDocument } from "@/lib/cross-org-finance";
import { getVendorForProviderOrg } from "@/lib/cross-org";

type RouteParams = { params: Promise<{ accessId: string }> };

/**
 * GET /api/vendor/events/[accessId]/documents
 * List financial documents for a provider's event access
 * Returns docs from planner's org where vendor_id matches OR
 * docs from provider's own org linked to this event
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { accessId } = await params;
    const aid = parseInt(accessId, 10);

    // Verify caller is a provider org
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

    // Verify access belongs to this provider org and is active
    const access = await db.query.providerEventAccess.findFirst({
      where: and(
        eq(providerEventAccess.id, aid),
        eq(providerEventAccess.providerOrgId, session.organizationId),
        eq(providerEventAccess.status, "active")
      ),
    });

    if (!access) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Access not found" } },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");

    // Get documents from provider's own org for this event
    let whereClause = and(
      eq(financialDocuments.organizationId, session.organizationId),
      eq(financialDocuments.eventId, access.eventId)
    )!;

    if (type) {
      whereClause = and(whereClause, eq(financialDocuments.type, type as any))!;
    }

    const docs = await db
      .select({
        id: financialDocuments.id,
        type: financialDocuments.type,
        number: financialDocuments.number,
        status: financialDocuments.status,
        direction: financialDocuments.direction,
        issueDate: financialDocuments.issueDate,
        dueDate: financialDocuments.dueDate,
        subtotal: financialDocuments.subtotal,
        taxAmount: financialDocuments.taxAmount,
        total: financialDocuments.total,
        paidAmount: financialDocuments.paidAmount,
        currency: financialDocuments.currency,
        sourceDocumentId: financialDocuments.sourceDocumentId,
        sourceOrgId: financialDocuments.sourceOrgId,
        createdAt: financialDocuments.createdAt,
      })
      .from(financialDocuments)
      .where(whereClause)
      .orderBy(desc(financialDocuments.createdAt));

    return NextResponse.json({ success: true, data: docs });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch documents";
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}

/**
 * POST /api/vendor/events/[accessId]/documents
 * Create a financial document from the vendor's side.
 * Automatically creates a mirror document in the planner's org.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAuth();
    const { accessId } = await params;
    const aid = parseInt(accessId, 10);

    // Verify caller is a provider org
    const orgCheck = await db.query.organizations.findFirst({
      where: eq(organizations.id, session.organizationId),
      columns: { orgType: true },
    });
    if (!orgCheck || orgCheck.orgType !== "provider") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Not a provider organization" } },
        { status: 403 }
      );
    }

    const access = await db.query.providerEventAccess.findFirst({
      where: and(
        eq(providerEventAccess.id, aid),
        eq(providerEventAccess.providerOrgId, session.organizationId)
      ),
    });

    if (!access || access.status !== "active") {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Access not found or not active" } },
        { status: 403 }
      );
    }

    const body = await request.json();

    // Create document in vendor's org (direction = outgoing for the vendor)
    const doc = await createDocument(session, {
      type: body.type || "quote",
      status: body.status || "draft",
      eventId: access.eventId,
      notes: body.notes,
      termsAndConditions: body.termsAndConditions,
      globalDiscount: body.globalDiscount,
      globalDiscountType: body.globalDiscountType,
      paymentMethod: body.paymentMethod,
      direction: "outgoing",
      items: body.items || [],
    });

    if (!doc) {
      return NextResponse.json(
        { success: false, error: { code: "CREATE_ERROR", message: "Failed to create document" } },
        { status: 500 }
      );
    }

    // Create mirror in planner's org with the vendor linked
    const vendorId = await getVendorForProviderOrg(access.plannerOrgId, session.organizationId);

    createMirrorDocument(doc.id, access.plannerOrgId, access.eventId, vendorId).catch((e) =>
      console.error("Mirror creation failed:", e)
    );

    return NextResponse.json({ success: true, data: doc });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create document";
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message } },
      { status: 400 }
    );
  }
}
