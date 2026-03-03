"use client";

import { useState } from "react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RiEditLine,
  RiPrinterLine,
  RiMailLine,
  RiDownloadLine,
  RiLoader4Line,
  RiEyeLine,
  RiFileTextLine,
  RiMoneyDollarCircleLine,
  RiLinkM,
  RiFileCopyLine,
} from "@remixicon/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";

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
  draft: { label: "Borrador", color: "bg-gray-100 text-gray-800" },
  approved: { label: "Aprobado", color: "bg-indigo-100 text-indigo-800" },
  sent: { label: "Pendiente", color: "bg-blue-100 text-blue-800" },
  accepted: { label: "Aceptado", color: "bg-green-100 text-green-800" },
  rejected: { label: "Rechazado", color: "bg-red-100 text-red-800" },
  paid: { label: "Pagado", color: "bg-emerald-100 text-emerald-800" },
  partial: { label: "Parcialmente pagado", color: "bg-amber-100 text-amber-800" },
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
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);

  if (!document) return null;

  // Calculate payment status
  const totalAmount = parseFloat(document.total || "0");
  const paidAmount = parseFloat(document.paidAmount || "0");
  const pendingAmount = totalAmount - paidAmount;
  const isPartiallyPaid = paidAmount > 0 && paidAmount < totalAmount;
  const isFullyPaid = paidAmount >= totalAmount && totalAmount > 0;
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

  const getClientDetails = () => {
    const email = document.contactEmail || document.vendorEmail || null;
    const phone = document.contactPhone || document.vendorPhone || null;
    const address = document.contactAddress || document.vendorAddress || null;
    const taxId = document.contactTaxId || null;
    return { email, phone, address, taxId };
  };

  const clientDetails = getClientDetails();

  const handleViewHTML = () => {
    window.open(`/api/finance/documents/${document.id}/pdf?format=html`, "_blank");
  };

  const handleDownloadPDF = async () => {
    setPdfLoading(true);
    try {
      const res = await fetch(`/api/finance/documents/${document.id}/pdf`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = window.document.createElement("a");
      a.href = url;
      a.download = `${document.type}-${document.number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(`/api/finance/documents/${document.id}/pdf`, "_blank");
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
      if (current === "draft") return ["approved", "sent"];
      if (current === "approved") return ["sent"];
      if (current === "sent") return ["accepted", "rejected"];
      return [];
    }

    if (type === "invoice" || type === "proforma" || type === "credit_note") {
      if (current === "draft") return ["approved", "sent"];
      if (current === "approved") return ["sent"];
      if (current === "sent") return ["paid", "cancelled"];
      return [];
    }

    if (type === "delivery_note") {
      if (current === "draft") return ["approved", "sent"];
      if (current === "approved") return ["sent"];
      if (current === "sent") return ["delivered"];
      return [];
    }

    return [];
  };

  const availableStatuses = getAvailableStatuses();

  const handleRegisterPayment = async () => {
    if (!paymentAmount || parseFloat(paymentAmount) <= 0) {
      toast.error("El monto debe ser mayor a 0");
      return;
    }

    setPaymentLoading(true);
    try {
      const res = await fetch("/api/finance/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: document.id,
          amount: parseFloat(paymentAmount),
          currency: document.currency,
          direction: document.direction === "incoming" ? "outgoing" : "incoming",
          paymentMethod: paymentMethod,
          reference: paymentReference || null,
          paymentDate: new Date().toISOString(),
        }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        toast.success("Pago registrado correctamente");
        setPaymentDialogOpen(false);
        setPaymentAmount("");
        setPaymentReference("");
        onRefresh?.();
      } else {
        toast.error(data.error?.message || "Error al registrar pago");
      }
    } catch (error) {
      toast.error("Error al registrar pago");
    } finally {
      setPaymentLoading(false);
    }
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
    <Sheet open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Registrar Pago</SheetTitle>
          <SheetDescription>
            Registrar pago para {document.number}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4 py-4">
          {/* Document Summary */}
          <div className="p-3 bg-muted/50 rounded-lg space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Total documento:</span>
              <span className="font-medium">{formatCurrency(document.total, document.currency)}</span>
            </div>
            {paidAmount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Ya pagado:</span>
                <span className="font-medium text-emerald-600">{formatCurrency(paidAmount.toString(), document.currency)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm font-bold">
              <span>Pendiente:</span>
              <span className="text-amber-600">{formatCurrency(pendingAmount.toString(), document.currency)}</span>
            </div>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Monto a pagar</Label>
            <Input
              type="number"
              step="0.01"
              value={paymentAmount}
              onChange={(e) => setPaymentAmount(e.target.value)}
              placeholder="0.00"
            />
            <p className="text-xs text-muted-foreground">
              Puedes registrar pagos parciales o el total pendiente.
            </p>
          </div>

          <div className="space-y-2">
            <Label>Método de pago</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">Transferencia bancaria</SelectItem>
                <SelectItem value="cash">Efectivo</SelectItem>
                <SelectItem value="card">Tarjeta</SelectItem>
                <SelectItem value="check">Cheque</SelectItem>
                <SelectItem value="other">Otro</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Referencia (opcional)</Label>
            <Input
              value={paymentReference}
              onChange={(e) => setPaymentReference(e.target.value)}
              placeholder="Nº de transferencia, recibo, etc."
            />
          </div>
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={handleRegisterPayment} disabled={paymentLoading}>
            {paymentLoading ? (
              <>
                <RiLoader4Line className="mr-2 h-4 w-4 animate-spin" />
                Registrando...
              </>
            ) : (
              <>
                <RiMoneyDollarCircleLine className="mr-2 h-4 w-4" />
                Registrar pago
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>

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
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={pdfLoading}>
                {pdfLoading ? (
                  <RiLoader4Line className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <RiFileTextLine className="h-4 w-4 mr-1" />
                )}
                PDF
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              <DropdownMenuItem onClick={handleViewHTML}>
                <RiEyeLine className="h-4 w-4 mr-2" />
                Ver documento
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDownloadPDF}>
                <RiDownloadLine className="h-4 w-4 mr-2" />
                Descargar PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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

        <Separator className="my-4" />

        {/* Document Info */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Cliente</p>
              <p className="font-medium">{getClientName()}</p>
              {(clientDetails.email || clientDetails.phone || clientDetails.address || clientDetails.taxId) && (
                <div className="text-xs text-muted-foreground mt-1 space-y-0.5">
                  {clientDetails.email && <p>{clientDetails.email}</p>}
                  {clientDetails.phone && <p>{clientDetails.phone}</p>}
                  {clientDetails.address && <p>{clientDetails.address}</p>}
                  {clientDetails.taxId && <p>CIF/NIF: {clientDetails.taxId}</p>}
                </div>
              )}
            </div>
            {document.eventName && (
              <div>
                <p className="text-muted-foreground">Evento</p>
                <p className="font-medium">{document.eventName}</p>
              </div>
            )}
            <div>
              <p className="text-muted-foreground">Fecha emisión</p>
              <p className="font-medium">
                {document.issueDate
                  ? format(new Date(document.issueDate), "dd MMM yyyy", { locale: es })
                  : "-"}
              </p>
            </div>
            {document.dueDate && (
              <div>
                <p className="text-muted-foreground">Fecha vencimiento</p>
                <p className="font-medium">
                  {format(new Date(document.dueDate), "dd MMM yyyy", { locale: es })}
                </p>
              </div>
            )}
            {document.validUntil && (
              <div>
                <p className="text-muted-foreground">Válido hasta</p>
                <p className="font-medium">
                  {format(new Date(document.validUntil), "dd MMM yyyy", { locale: es })}
                </p>
              </div>
            )}
          </div>

          <Separator />

          {/* Items Table */}
          <div>
            <h4 className="font-medium mb-2">Líneas</h4>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left p-2">Descripción</th>
                    <th className="text-right p-2 w-16">Cant.</th>
                    <th className="text-right p-2 w-20">Precio</th>
                    <th className="text-right p-2 w-16">Dto.</th>
                    <th className="text-right p-2 w-16">IVA</th>
                    <th className="text-right p-2 w-20">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {document.items.map((item, idx) => (
                    <tr key={item.id || idx} className="border-t">
                      <td className="p-2">{item.description}</td>
                      <td className="text-right p-2">{item.quantity}</td>
                      <td className="text-right p-2">
                        {formatCurrency(item.unitPrice, document.currency)}
                      </td>
                      <td className="text-right p-2">{item.discount || "0"}%</td>
                      <td className="text-right p-2">{item.taxRate || "21"}%</td>
                      <td className="text-right p-2">
                        {formatCurrency(item.total, document.currency)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-56 space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal</span>
                <span>{formatCurrency(document.subtotal, document.currency)}</span>
              </div>
              {parseFloat(document.globalDiscount || "0") > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>
                    Descuento global
                    {document.globalDiscountType === "percentage" && ` (${document.globalDiscount}%)`}
                  </span>
                  <span>-</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">IVA</span>
                <span>{formatCurrency(document.taxAmount, document.currency)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-base">
                <span>Total</span>
                <span>{formatCurrency(document.total, document.currency)}</span>
              </div>
              {(document.type === "invoice" || document.type === "proforma") && paidAmount > 0 && (
                <>
                  <div className="flex justify-between text-emerald-600">
                    <span>Pagado</span>
                    <span>-{formatCurrency(paidAmount.toString(), document.currency)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-base">
                    <span>Pendiente</span>
                    <span className={pendingAmount > 0 ? "text-amber-600" : "text-emerald-600"}>
                      {formatCurrency(pendingAmount.toString(), document.currency)}
                    </span>
                  </div>
                  {/* Progress bar */}
                  <div className="mt-2">
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
                </>
              )}
            </div>
          </div>

          {/* Register Payment Button */}
          {(document.type === "invoice" || document.type === "proforma") && 
           document.status !== "paid" && 
           document.status !== "cancelled" && 
           pendingAmount > 0 && (
            <div className="flex justify-end mt-4">
              <Button 
                variant="default" 
                size="sm"
                onClick={() => {
                  setPaymentAmount(pendingAmount.toFixed(2));
                  setPaymentDialogOpen(true);
                }}
              >
                <RiMoneyDollarCircleLine className="h-4 w-4 mr-1" />
                Registrar pago
              </Button>
            </div>
          )}

          {/* Payment Method */}
          {document.paymentMethod && (
            <>
              <Separator />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">Método de pago</p>
                  <p className="font-medium">
                    {{
                      bank_transfer: "Transferencia bancaria",
                      cash: "Efectivo",
                      card: "Tarjeta",
                      stripe: "Stripe",
                      check: "Cheque",
                      other: "Otro",
                    }[document.paymentMethod] || document.paymentMethod}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          {document.notes && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-1">Notas</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {document.notes}
                </p>
              </div>
            </>
          )}

          {/* Terms */}
          {document.termsAndConditions && (
            <>
              <Separator />
              <div>
                <h4 className="font-medium mb-1">Términos y Condiciones</h4>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {document.termsAndConditions}
                </p>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
    </>
  );
}
