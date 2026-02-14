import { NextRequest, NextResponse } from "next/server";
import { requirePermission } from "@/lib/session";
import { createCreditNote } from "@/lib/finance";

// POST /api/finance/documents/[documentId]/credit-note - Create credit note from invoice
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ documentId: string }> }
) {
  try {
    const session = await requirePermission("finance:create");
    const { documentId } = await params;
    const invoiceId = parseInt(documentId, 10);

    if (isNaN(invoiceId)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid invoice ID" } },
        { status: 400 }
      );
    }

    const creditNote = await createCreditNote(session, invoiceId);

    return NextResponse.json({
      success: true,
      data: creditNote,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create credit note";
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message } },
      { status: 400 }
    );
  }
}
