"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { downloadDocumentPDF } from "@/lib/pdf-download";
import { LiveDocumentPreview, type OrganizationPreviewData, type PreviewData } from "./live-document-preview";
import {
  RiEditLine,
  RiPrinterLine,
  RiMailLine,
  RiDownloadLine,
  RiLoader4Line,
  RiEyeLine,
  RiMoneyDollarCircleLine,
  RiLinkM,
  RiFileCopyLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { PaymentDrawer } from "./payment-drawer";

interface DocumentItem {
  id: number;
  description: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  taxRate: string;
  total: string;
}

interface Document {
  id: number;
  type: string;
  number: string;
  status: string;
  issueDate: string | null;
  dueDate: string | null;
  validUntil: string | null;
  subtotal: string;
  taxAmount: string;
  total: string;
  paidAmount?: string | null;
  currency: string;
  notes: string | null;
  termsAndConditions: string | null;
  stripePaymentUrl?: string | null;
  globalDiscount?: string | null;
  globalDiscountType?: string | null;
  paymentMethod?: string | null;
  direction?: string | null;
  items: DocumentItem[];
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactAddress?: string | null;
  contactTaxId?: string | null;
  vendorName?: string | null;
  vendorEmail?: string | null;
  vendorPhone?: string | null;
  vendorAddress?: string | null;
  companyName?: string | null;
  personFirstName?: string | null;
  personLastName?: string | null;
  eventName?: string | null;
}

interface DocumentPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: Document | null;
  onEdit?: () => void;
  onStatusChange?: (status: string) => void;
  onRefresh?: () => void;
}

const typeLabels: Record<string, string> = {
  quote: "Presupuesto",
  proforma: "Proforma",
  invoice: "Factura",
  delivery_note: "Albarán",
  credit_note: "Factura Rectificativa",
};

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "Pendiente", color: "bg-blue-100 text-blue-800" },
  approved: { label: "Pendiente", color: "bg-blue-100 text-blue-800" },
  sent: { label: "Pendiente", color: "bg-blue-100 text-blue-800" },
  accepted: { label: "Aceptado", color: "bg-green-100 text-green-800" },
  rejected: { label: "Rechazado", color: "bg-red-100 text-red-800" },
  payment_promise: { label: "Promesa de pago", color: "bg-amber-100 text-amber-800" },
  paid: { label: "Pagado", color: "bg-emerald-100 text-emerald-800" },
  partial: { label: "Parcial", color: "bg-amber-100 text-amber-800" },
  overdue: { label: "Vencido", color: "bg-orange-100 text-orange-800" },
  cancelled: { label: "Cancelado", color: "bg-gray-100 text-gray-500" },
  delivered: { label: "Entregado", color: "bg-purple-100 text-purple-800" },
};

export function DocumentPreview({
  open,
  onOpenChange,
  document,
  onEdit,
  onStatusChange,
  onRefresh,
}: DocumentPreviewProps) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [sendDialogOpen, setSendDialogOpen] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendEmail, setSendEmail] = useState("");
  const [sendMessage, setSendMessage] = useState("");
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [orgData, setOrgData] = useState<OrganizationPreviewData | undefined>();

  useEffect(() => {
    if (open) {
      fetch("/api/user/profile")
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          const org = data?.data?.organization;
          if (org) {
            setOrgData({
              name: org.fiscalName || org.name,
              taxId: org.taxId || undefined,
              fiscalAddress: org.fiscalAddress || undefined,
              fiscalCity: org.fiscalCity || undefined,
              fiscalPostalCode: org.fiscalPostalCode || undefined,
              fiscalCountry: org.fiscalCountry || undefined,
              fiscalEmail: org.fiscalEmail || undefined,
              fiscalPhone: org.fiscalPhone || undefined,
              invoiceLogo: org.invoiceLogo || org.logo || undefined,
            });
          }
        })
        .catch(() => {});
    }
  }, [open]);

  const previewData = useMemo((): PreviewData | null => {
    if (!document) return null;
    const getClientName = () => {
      if (document.contactName) return document.contactName;
      if (document.vendorName) return document.vendorName;
      if (document.companyName) return document.companyName;
      if (document.personFirstName) {
        return `${document.personFirstName} ${document.personLastName || ""}`.trim();
      }
      return "Sin cliente";
    };
    return {
      type: document.type as PreviewData["type"],
      contactName: getClientName() || undefined,
      vendorName: document.vendorName || undefined,
      contactEmail: document.contactEmail || document.vendorEmail || undefined,
      contactPhone: document.contactPhone || document.vendorPhone || undefined,
      contactAddress: document.contactAddress || document.vendorAddress || undefined,
      contactTaxId: document.contactTaxId || undefined,
      eventName: document.eventName || undefined,
      documentNumber: document.number,
      documentId: document.id,
      status: document.status,
      items: document.items.map((item) => ({
        description: item.description,
        quantity: parseFloat(item.quantity || "0"),
        unitPrice: parseFloat(item.unitPrice || "0"),
        discount: parseFloat(item.discount || "0"),
        taxRate: parseFloat(item.taxRate || "21"),
        total: parseFloat(item.total || "0"),
      })),
      notes: document.notes || undefined,
      termsAndConditions: document.termsAndConditions || undefined,
      issueDate: document.issueDate || undefined,
      dueDate: document.dueDate || undefined,
      validUntil: document.validUntil || undefined,
      currency: document.currency || "EUR",
      organization: orgData,
      globalDiscount: parseFloat(document.globalDiscount || "0"),
      globalDiscountType: (document.globalDiscountType as "percentage" | "fixed") || "percentage",
      globalDiscountEnabled: parseFloat(document.globalDiscount || "0") > 0,
      paymentMethod: document.paymentMethod || undefined,
    };
  }, [document, orgData]);

  if (!document) return null;

  // Calculate payment status
  const totalAmount = parseFloat(document.total || "0");
  const paidAmount = parseFloat(document.paidAmount || "0");
  const pendingAmount = totalAmount - paidAmount;
  const isPartiallyPaid = paidAmount > 0 && paidAmount < totalAmount;
  const paymentPercentage = totalAmount > 0 ? Math.min((paidAmount / totalAmount) * 100, 100) : 0;

  const formatCurrency = (amount: string, currency = "EUR") => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency,
    }).format(parseFloat(amount || "0"));
  };

  const getClientName = () => {
    if (document.contactName) return document.contactName;
    if (document.vendorName) return document.vendorName;
    if (document.companyName) return document.companyName;
    if (document.personFirstName) {
      return `${document.personFirstName} ${document.personLastName || ""}`.trim();
    }
    return "Sin cliente";
  };

  const handleViewHTML = () => {
    window.open(`/api/finance/documents/${document.id}/pdf?format=html`, "_blank");
  };

  const handleDownloadPDF = async () => {
    setPdfLoading(true);
    try {
      await downloadDocumentPDF(document.id, `${document.type}-${document.number}.pdf`);
    } finally {
      setPdfLoading(false);
    }
  };

  const handleSendDocument = async () => {
    setSendLoading(true);
    try {
      const res = await fetch(`/api/finance/documents/${document.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: sendEmail || undefined,
          message: sendMessage || undefined,
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success(`Documento enviado a ${data.data.sentTo}`);
        setSendDialogOpen(false);
        setSendEmail("");
        setSendMessage("");
        onRefresh?.();
      } else {
        toast.error(data.error?.message || "Error al enviar documento");
      }
    } catch (error) {
      toast.error("Error al enviar documento");
    } finally {
      setSendLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/finance/documents/${document.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (res.ok) {
        toast.success(`Estado actualizado a ${statusConfig[newStatus]?.label || newStatus}`);
        onStatusChange?.(newStatus);
        onRefresh?.();
      } else {
        toast.error("Error al actualizar estado");
      }
    } catch (error) {
      toast.error("Error al actualizar estado");
    }
  };

  const getAvailableStatuses = () => {
    const type = document.type;
    const current = document.status;

    if (type === "quote") {
      if (current === "draft") return ["sent"];
      if (current === "sent") return ["accepted", "rejected"];
      if (current === "accepted") return ["payment_promise", "sent"];
      if (current === "payment_promise") return ["accepted", "sent"];
      if (current === "partial") return ["paid", "payment_promise"];
      if (current === "paid") return ["payment_promise"];
      if (current === "rejected") return ["sent", "accepted"];
      return [];
    }

    if (type === "invoice" || type === "proforma" || type === "credit_note") {
      if (current === "draft") return ["sent"];
      if (current === "sent") return ["paid"];
      if (current === "partial") return ["paid"];
      return [];
    }

    if (type === "delivery_note") {
      if (current === "draft") return ["sent"];
      if (current === "sent") return ["delivered"];
      return [];
    }

    return [];
  };

  const availableStatuses = getAvailableStatuses();

  const handlePaymentSuccess = () => {
    setPaymentDialogOpen(false);
    onRefresh?.();
  };

  const handleGenerateStripeLink = async () => {
    setStripeLoading(true);
    try {
      const res = await fetch("/api/finance/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: document.id }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        // Copy link to clipboard
        await navigator.clipboard.writeText(data.data.checkoutUrl);
        toast.success("Link de pago copiado al portapapeles");
        onRefresh?.();
      } else {
        toast.error(data.error?.message || "Error al generar link de pago");
      }
    } catch (error) {
      toast.error("Error al generar link de pago");
    } finally {
      setStripeLoading(false);
    }
  };

  const handleCopyPaymentLink = async () => {
    if (document.stripePaymentUrl) {
      await navigator.clipboard.writeText(document.stripePaymentUrl);
      toast.success("Link de pago copiado al portapapeles");
    }
  };

  return (
    <>
    {/* Payment Drawer */}
    <PaymentDrawer
      open={paymentDialogOpen}
      onOpenChange={setPaymentDialogOpen}
      onSuccess={handlePaymentSuccess}
      documentId={document.id}
      document={{
        number: document.number,
        total: document.total,
        paidAmount: document.paidAmount || "0",
        currency: document.currency,
        direction: document.direction,
      }}
      showDirectionSelector={false}
    />

    {/* Send Drawer */}
    <Sheet open={sendDialogOpen} onOpenChange={setSendDialogOpen}>
      <SheetContent className="sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Enviar {typeLabels[document.type] || document.type}</SheetTitle>
          <SheetDescription>
            Enviar {document.number} por email con PDF adjunto
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4 py-4">
          {/* Document Summary */}
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Documento:</span>
              <span className="font-medium">{document.number}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Cliente:</span>
              <span className="font-medium">{getClientName()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total:</span>
              <span className="font-bold">{formatCurrency(document.total, document.currency)}</span>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Email del destinatario</Label>
            <Input
              type="email"
              value={sendEmail}
              onChange={(e) => setSendEmail(e.target.value)}
              placeholder="Dejar vacío para usar el email del contacto"
            />
            <p className="text-xs text-muted-foreground">
              Si no se especifica, se usará el email del contacto/cliente asociado.
            </p>
          </div>
          <div className="space-y-2">
            <Label>Mensaje personalizado (opcional)</Label>
            <Textarea
              value={sendMessage}
              onChange={(e) => setSendMessage(e.target.value)}
              placeholder="Añade un mensaje personalizado al email..."
              rows={3}
            />
          </div>
        </div>
        <SheetFooter className="flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleViewHTML}
            className="sm:mr-auto"
          >
            <RiEyeLine className="mr-2 h-4 w-4" />
            Ver preview
          </Button>
          <Button variant="outline" onClick={() => setSendDialogOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSendDocument} disabled={sendLoading}>
            {sendLoading ? (
              <>
                <RiLoader4Line className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              <>
                <RiMailLine className="mr-2 h-4 w-4" />
                Enviar
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-4xl overflow-y-auto p-6">
        <SheetHeader className="space-y-1">
          <div className="flex items-center justify-between">
            <SheetTitle className="text-xl">
              {typeLabels[document.type] || document.type} {document.number}
              <span className="text-sm font-normal text-muted-foreground ml-2">#{document.id}</span>
            </SheetTitle>
            <div className="flex items-center gap-2">
              {isPartiallyPaid && (
                <Badge className={statusConfig.partial.color}>
                  {statusConfig.partial.label}
                </Badge>
              )}
              <Badge className={statusConfig[document.status]?.color || "bg-gray-100"}>
                {statusConfig[document.status]?.label || document.status}
              </Badge>
            </div>
          </div>
        </SheetHeader>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 mt-4">
          {onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <RiEditLine className="h-4 w-4 mr-1" />
              Editar
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <RiPrinterLine className="h-4 w-4 mr-1" />
            Imprimir
          </Button>
          <Button variant="outline" size="sm" onClick={handleDownloadPDF} disabled={pdfLoading}>
            {pdfLoading ? (
              <RiLoader4Line className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <RiDownloadLine className="h-4 w-4 mr-1" />
            )}
            PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => setSendDialogOpen(true)}>
            <RiMailLine className="h-4 w-4 mr-1" />
            Enviar
          </Button>
          {/* Stripe Payment Link */}
          {(document.type === "invoice" || document.type === "proforma") && 
           document.status !== "paid" && 
           document.status !== "cancelled" && 
           pendingAmount > 0 && (
            document.stripePaymentUrl ? (
              <Button variant="outline" size="sm" onClick={handleCopyPaymentLink}>
                <RiFileCopyLine className="h-4 w-4 mr-1" />
                Copiar link
              </Button>
            ) : (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={handleGenerateStripeLink}
                disabled={stripeLoading}
              >
                {stripeLoading ? (
                  <RiLoader4Line className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <RiLinkM className="h-4 w-4 mr-1" />
                )}
                Link de pago
              </Button>
            )
          )}
        </div>

        {/* Status Change */}
        {availableStatuses.length > 0 && (
          <div className="flex items-center gap-2 mt-4 p-3 bg-muted/50 rounded-lg">
            <span className="text-sm text-muted-foreground">Cambiar estado:</span>
            {availableStatuses.map((status) => (
              <Button
                key={status}
                variant="outline"
                size="sm"
                onClick={() => handleStatusChange(status)}
              >
                {statusConfig[status]?.label || status}
              </Button>
            ))}
          </div>
        )}

        {/* Payment Section — ABOVE document preview for visibility */}
        {(document.type === "invoice" || document.type === "proforma" || 
          (document.type === "quote" && ["payment_promise", "partial", "paid"].includes(document.status))) && (
          <div className="mt-4 p-4 border rounded-lg space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total documento</span>
              <span className="font-medium">{formatCurrency(document.total, document.currency)}</span>
            </div>
            {paidAmount > 0 && (
              <div className="flex justify-between text-sm text-emerald-600">
                <span>Pagado</span>
                <span>-{formatCurrency(paidAmount.toString(), document.currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold">
              <span>Pendiente</span>
              <span className={pendingAmount > 0 ? "text-amber-600" : "text-emerald-600"}>
                {formatCurrency(pendingAmount.toString(), document.currency)}
              </span>
            </div>
            {paidAmount > 0 && (
              <div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${paymentPercentage}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1 text-right">
                  {paymentPercentage.toFixed(0)}% pagado
                </p>
              </div>
            )}
            {document.status !== "paid" && document.status !== "cancelled" && pendingAmount > 0 && (
              <Button 
                className="w-full"
                onClick={() => setPaymentDialogOpen(true)}
              >
                <RiMoneyDollarCircleLine className="h-4 w-4 mr-1" />
                Registrar pago
              </Button>
            )}
          </div>
        )}

        {/* Document Preview - same layout as PDF and edit mode */}
        {previewData && (
          <div className="mt-4 -mx-6">
            <LiveDocumentPreview data={previewData} />
          </div>
        )}
      </SheetContent>
    </Sheet>
    </>
  );
}
