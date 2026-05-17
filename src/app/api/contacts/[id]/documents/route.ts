import { NextRequest } from "next/server";
import { requirePermission } from "@/lib/session";
import { getContactDocuments, addContactDocument, deleteContactDocument } from "@/lib/contacts";
import { apiHandler, ok, badRequest } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ id: string }> };

// GET /api/contacts/[id]/documents - List contact documents
export async function GET(_request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    await requirePermission("crm:read");
    const { id } = await params;

    const documents = await getContactDocuments(parseInt(id, 10));

    return ok(documents);
  }, "GET /api/contacts/[id]/documents");
}

// POST /api/contacts/[id]/documents - Add document to contact
export async function POST(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("crm:manage");
    const { id } = await params;
    const body = await request.json();

    const { name, url } = body;

    if (!name || !url) {
      return badRequest("Name and URL are required");
    }

    const document = await addContactDocument(parseInt(id, 10), {
      name,
      url,
      type: body.type,
      size: body.size,
      mimeType: body.mimeType,
      uploadedBy: session.user.userId,
    });

    return ok(document);
  }, "POST /api/contacts/[id]/documents");
}

// DELETE /api/contacts/[id]/documents - Delete document
export async function DELETE(request: NextRequest, _params: RouteParams) {
  return apiHandler(async () => {
    await requirePermission("crm:manage");
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("documentId");

    if (!documentId) {
      return badRequest("Document ID is required");
    }

    await deleteContactDocument(parseInt(documentId, 10));

    return ok({ message: "Document deleted" });
  }, "DELETE /api/contacts/[id]/documents");
}
