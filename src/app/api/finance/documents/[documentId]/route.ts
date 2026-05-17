import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/session";
import { getDocument, updateDocument, updateDocumentStatus, convertDocument, deleteDocument } from "@/lib/finance";
import { apiHandler, ok, notFound, badRequest } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ documentId: string }> };

// GET /api/finance/documents/[documentId] - Get single document
export async function GET(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("finance:read");
    const { documentId } = await params;

    const document = await getDocument(session, parseInt(documentId, 10));

    if (!document) return notFound("Document not found");

    return ok(document);
  }, "GET /api/finance/documents/[documentId]");
}

// PATCH /api/finance/documents/[documentId] - Update document status or convert
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("finance:create");
    const { documentId } = await params;
    const body = await request.json();

    // Convert document to another type
    if (body.convertTo) {
      const converted = await convertDocument(
        session,
        parseInt(documentId, 10),
        body.convertTo
      );
      return ok(converted);
    }

    // Update status
    if (body.status) {
      const updated = await updateDocumentStatus(
        session,
        parseInt(documentId, 10),
        body.status
      );

      if (!updated) return notFound("Document not found");

      return ok(updated);
    }

    // Update document fields
    const updated = await updateDocument(session, parseInt(documentId, 10), body);

    if (!updated) return notFound("Document not found");

    return ok(updated);
  }, "PATCH /api/finance/documents/[documentId]");
}

// DELETE /api/finance/documents/[documentId] - Delete document
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("finance:create");
    const { documentId } = await params;

    const deleted = await deleteDocument(session, parseInt(documentId, 10));

    if (!deleted) return notFound("Document not found");

    return ok({ message: "Document deleted" });
  }, "DELETE /api/finance/documents/[documentId]");
}
