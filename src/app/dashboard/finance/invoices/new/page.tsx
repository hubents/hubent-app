import { DocumentForm } from "@/components/finance/document-form";

export default function NewInvoicePage() {
  return (
    <DocumentForm
      type="invoice"
      title="Nueva Factura"
      backUrl="/dashboard/finance/invoices"
    />
  );
}
