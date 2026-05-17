import { requirePermission } from "@/lib/session";
import { duplicateDocument } from "@/lib/finance";
import { apiHandler, created } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ documentId: string }> };

// POST /api/finance/documents/[documentId]/duplicate - Duplicate document
export async function POST(_: Request, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("finance:create");
    const { documentId } = await params;

    const newDoc = await duplicateDocument(session, parseInt(documentId, 10));

    return created(newDoc);
  }, "POST /api/finance/documents/[documentId]/duplicate");
}
