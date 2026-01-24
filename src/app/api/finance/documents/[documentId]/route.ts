import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { getDocument, updateDocument, updateDocumentStatus, convertDocument, deleteDocument } from "@/lib/finance";

type RouteParams = { params: Promise<{ documentId: string }> };

// GET /api/finance/documents/[documentId] - Get single document
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole("viewer");
    const { documentId } = await params;

    const document = await getDocument(session, parseInt(documentId, 10));

    if (!document) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Document not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: document,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch document";
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}

// PATCH /api/finance/documents/[documentId] - Update document status or convert
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole("planner");
    const { documentId } = await params;
    const body = await request.json();

    // Convert document to another type
    if (body.convertTo) {
      const converted = await convertDocument(
        session, 
        parseInt(documentId, 10), 
        body.convertTo
      );
      return NextResponse.json({
        success: true,
        data: converted,
      });
    }

    // Update status
    if (body.status) {
      const updated = await updateDocumentStatus(
        session, 
        parseInt(documentId, 10), 
        body.status
      );

      if (!updated) {
        return NextResponse.json(
          { success: false, error: { code: "NOT_FOUND", message: "Document not found" } },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        data: updated,
      });
    }

    // Update document fields
    const updated = await updateDocument(session, parseInt(documentId, 10), body);
    
    if (!updated) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Document not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: updated,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update document";
    return NextResponse.json(
      { success: false, error: { code: "UPDATE_ERROR", message } },
      { status: 400 }
    );
  }
}

// DELETE /api/finance/documents/[documentId] - Delete document
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole("planner");
    const { documentId } = await params;

    const deleted = await deleteDocument(session, parseInt(documentId, 10));

    if (!deleted) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Document not found" } },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Document deleted",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to delete document";
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message } },
      { status: 500 }
    );
  }
}
