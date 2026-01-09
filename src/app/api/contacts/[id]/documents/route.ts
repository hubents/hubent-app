import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { getContactDocuments, addContactDocument, deleteContactDocument } from "@/lib/contacts";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/contacts/[id]/documents - List contact documents
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireRole("viewer");
    const { id } = await params;

    const documents = await getContactDocuments(parseInt(id, 10));

    return NextResponse.json({
      success: true,
      data: documents,
    });
  } catch (error) {
    console.error("GET /api/contacts/[id]/documents error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch documents";
    return NextResponse.json(
      { success: false, error: { code: "FETCH_ERROR", message } },
      { status: 500 }
    );
  }
}

// POST /api/contacts/[id]/documents - Add document to contact
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole("planner");
    const { id } = await params;
    const body = await request.json();

    const { name, url } = body;

    if (!name || !url) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Name and URL are required" } },
        { status: 400 }
      );
    }

    const document = await addContactDocument(parseInt(id, 10), {
      name,
      url,
      type: body.type,
      size: body.size,
      mimeType: body.mimeType,
      uploadedBy: session.user.userId,
    });

    return NextResponse.json({
      success: true,
      data: document,
    });
  } catch (error) {
    console.error("POST /api/contacts/[id]/documents error:", error);
    const message = error instanceof Error ? error.message : "Failed to add document";
    return NextResponse.json(
      { success: false, error: { code: "CREATE_ERROR", message } },
      { status: 400 }
    );
  }
}

// DELETE /api/contacts/[id]/documents - Delete document
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await requireRole("planner");
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("documentId");

    if (!documentId) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Document ID is required" } },
        { status: 400 }
      );
    }

    await deleteContactDocument(parseInt(documentId, 10));

    return NextResponse.json({
      success: true,
      data: { message: "Document deleted" },
    });
  } catch (error) {
    console.error("DELETE /api/contacts/[id]/documents error:", error);
    const message = error instanceof Error ? error.message : "Failed to delete document";
    return NextResponse.json(
      { success: false, error: { code: "DELETE_ERROR", message } },
      { status: 400 }
    );
  }
}
