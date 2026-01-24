import { DocumentForm } from "@/components/finance/document-form";

export default function NewQuotePage() {
  return (
    <DocumentForm
      type="quote"
      title="Nuevo Presupuesto"
      backUrl="/dashboard/finance/quotes"
    />
  );
}
