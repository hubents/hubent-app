import { requirePermission } from "@/lib/session";
import { createCreditNote } from "@/lib/finance";
import { apiHandler, created, badRequest } from "@/lib/api-handler";

// POST /api/finance/documents/[documentId]/credit-note - Create credit note from invoice
export async function POST(
  _: Request,
  { params }: { params: Promise<{ documentId: string }> }
) {
  return apiHandler(async () => {
    const session = await requirePermission("finance:create");
    const { documentId } = await params;
    const invoiceId = parseInt(documentId, 10);

    if (isNaN(invoiceId)) return badRequest("Invalid invoice ID");

    const creditNote = await createCreditNote(session, invoiceId);

    return created(creditNote);
  }, "POST /api/finance/documents/[documentId]/credit-note");
}
