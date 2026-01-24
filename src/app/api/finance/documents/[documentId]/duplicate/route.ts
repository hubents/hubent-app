import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { duplicateDocument } from "@/lib/finance";

type RouteParams = { params: Promise<{ documentId: string }> };

// POST /api/finance/documents/[documentId]/duplicate - Duplicate document
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole("planner");
    const { documentId } = await params;

    const newDoc = await duplicateDocument(session, parseInt(documentId, 10));

    return NextResponse.json({
      success: true,
      data: newDoc,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to duplicate document";
    return NextResponse.json(
      { success: false, error: { code: "DUPLICATE_ERROR", message } },
      { status: 500 }
    );
  }
}
