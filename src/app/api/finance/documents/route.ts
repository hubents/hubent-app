import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { getDocuments, createDocument } from "@/lib/finance";

// GET /api/finance/documents - List documents
export async function GET(request: NextRequest) {
  try {
    const session = await requirePermission("finance:read");
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "50", 10);
    const type = searchParams.get("type") || undefined;
    const status = searchParams.get("status") || undefined;
    const direction = searchParams.get("direction") || undefined;
    const search = searchParams.get("search") || undefined;
    const eventId = searchParams.get("eventId") ? parseInt(searchParams.get("eventId")!, 10) : undefined;

    const result = await getDocuments(session, { page, limit, type, status, direction, search, eventId });

    return NextResponse.json({
      success: true,
      data: result.data,
      meta: result.meta,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch documents";
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}

// POST /api/finance/documents - Create document
export async function POST(request: NextRequest) {
  try {
    const session = await requirePermission("finance:create");
    const body = await request.json();

    const { type, items } = body;

    if (!type || !items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Type and items are required" } },
        { status: 400 }
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

    return NextResponse.json({
      success: true,
      data: document,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create document";
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message } },
      { status: 400 }
    );
  }
}
