import { DocumentForm } from "@/components/finance/document-form";

export default function NewDeliveryNotePage() {
  return (
    <DocumentForm
      type="delivery_note"
      title="Nuevo Albarán"
      backUrl="/dashboard/finance/delivery-notes"
    />
  );
}
