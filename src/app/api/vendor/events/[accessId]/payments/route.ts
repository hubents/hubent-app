import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/session";
import { db } from "@/db";
import { providerEventAccess, paymentRecords, financialDocuments, contacts, organizations } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { isMarketplaceType } from "@/lib/tenant-type";

type RouteParams = { params: Promise<{ accessId: string }> };

/**
 * GET /api/vendor/events/[accessId]/payments
 * List payment records for a provider's event access
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
    if (!org || !isMarketplaceType(org.orgType || "")) {
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

    // Get payments from provider's org for this event
    const payments = await db
      .select({
        id: paymentRecords.id,
        documentId: paymentRecords.documentId,
        amount: paymentRecords.amount,
        currency: paymentRecords.currency,
        direction: paymentRecords.direction,
        paymentDate: paymentRecords.paymentDate,
        paymentMethod: paymentRecords.paymentMethod,
        reference: paymentRecords.reference,
        notes: paymentRecords.notes,
        status: paymentRecords.status,
        attachmentUrl: paymentRecords.attachmentUrl,
        attachmentName: paymentRecords.attachmentName,
        sourcePaymentId: paymentRecords.sourcePaymentId,
        createdAt: paymentRecords.createdAt,
        documentNumber: financialDocuments.number,
        documentType: financialDocuments.type,
      })
      .from(paymentRecords)
      .leftJoin(financialDocuments, eq(paymentRecords.documentId, financialDocuments.id))
      .where(
        and(
          eq(paymentRecords.organizationId, session.organizationId),
          eq(paymentRecords.eventId, access.eventId)
        )
      )
      .orderBy(desc(paymentRecords.paymentDate));

    return NextResponse.json({ success: true, data: payments });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch payments";
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}
