"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useFileUpload } from "@/hooks/use-file-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RiMoneyDollarCircleLine,
  RiLoader4Line,
  RiAttachmentLine,
  RiFileDownloadLine,
  RiCloseLine,
  RiFileTextLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { ContactSelector, type ContactSelectorValue } from "@/components/finance/contact-selector";

export interface ConciliableDocument {
  id: number;
  type: string;
  number: string;
  total: string;
  status: string;
  companyName?: string | null;
  personFirstName?: string | null;
  personLastName?: string | null;
}

export interface DocumentSummary {
  number: string;
  total: string;
  paidAmount: string;
  currency: string;
  direction?: string | null;
}

export interface EditPaymentData {
  id: number;
  amount: string;
  currency?: string;
  direction?: string;
  paymentDate?: string;
  paymentMethod?: string | null;
  reference?: string | null;
  notes?: string | null;
  status?: string;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
  contactId?: number | null;
  vendorId?: number | null;
  documentId?: number | null;
}

export interface PaymentDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  documentId?: number;
  document?: DocumentSummary;
  eventId?: number;
  taskId?: number;
  vendorId?: number;
  contactId?: number;
  editPayment?: EditPaymentData | null;
  defaultDirection?: "incoming" | "outgoing";
  defaultStatus?: "pending" | "complete";
  conciliableDocuments?: ConciliableDocument[];
  showContactSelector?: boolean;
  showDirectionSelector?: boolean;
  apiBasePath?: string;
}

interface PaymentForm {
  amount: string;
  currency: string;
  direction: string;
  paymentMethod: string;
  reference: string;
  notes: string;
  paymentDate: string;
  status: string;
  documentId: string;
  attachmentUrl: string;
  attachmentName: string;
}

const defaultForm: PaymentForm = {
  amount: "",
  currency: "EUR",
  direction: "incoming",
  paymentMethod: "bank_transfer",
  reference: "",
  notes: "",
  paymentDate: new Date().toISOString().split("T")[0],
  status: "complete",
  documentId: "",
  attachmentUrl: "",
  attachmentName: "",
};

function getDocumentLabel(doc: ConciliableDocument) {
  const typeLabels: Record<string, string> = {
    invoice: "Factura",
    quote: "Presupuesto",
    proforma: "Proforma",
    delivery_note: "Albar\u00e1n",
  };
  const statusLabels: Record<string, string> = {
    payment_promise: " (Promesa de pago)",
    partial: " (Parcial)",
  };
  const clientName = doc.companyName ||
    (doc.personFirstName ? `${doc.personFirstName} ${doc.personLastName || ""}` : "");
  return `${typeLabels[doc.type] || doc.type} ${doc.number}${statusLabels[doc.status] || ""}${clientName ? ` - ${clientName}` : ""}`;
}

const formatCurrency = (amount: string | number, currency = "EUR") => {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency,
  }).format(typeof amount === "string" ? parseFloat(amount || "0") : amount);
};

export function PaymentDrawer({
  open,
  onOpenChange,
  onSuccess,
  documentId,
  document: documentSummary,
  eventId,
  taskId,
  vendorId: defaultVendorId,
  contactId: defaultContactId,
  editPayment,
  defaultDirection = "incoming",
  defaultStatus = "complete",
  conciliableDocuments = [],
  showContactSelector = false,
  showDirectionSelector = true,
  apiBasePath = "/api/finance/payments",
}: PaymentDrawerProps) {
  const [form, setForm] = useState<PaymentForm>({ ...defaultForm, direction: defaultDirection, status: defaultStatus });
  const [contactValue, setContactValue] = useState<ContactSelectorValue | null>(null);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { upload: uploadFile, uploading: fileUploading } = useFileUpload({ folder: "payments" });

  const isEdit = !!editPayment;

  useEffect(() => {
    if (!open) return;

    if (editPayment) {
      setForm({
        amount: editPayment.amount || "",
        currency: editPayment.currency || "EUR",
        direction: editPayment.direction || defaultDirection,
        paymentMethod: editPayment.paymentMethod || "bank_transfer",
        reference: editPayment.reference || "",
        notes: editPayment.notes || "",
        paymentDate: editPayment.paymentDate
          ? String(editPayment.paymentDate).split("T")[0]
          : new Date().toISOString().split("T")[0],
        status: editPayment.status || defaultStatus,
        documentId: editPayment.documentId?.toString() || "",
        attachmentUrl: editPayment.attachmentUrl || "",
        attachmentName: editPayment.attachmentName || "",
      });
      if (editPayment.contactId) {
        setContactValue({ type: "contact", id: editPayment.contactId });
      } else if (editPayment.vendorId) {
        setContactValue({ type: "vendor", id: editPayment.vendorId });
      } else {
        setContactValue(null);
      }
    } else {
      setForm({
        ...defaultForm,
        direction: defaultDirection,
        status: defaultStatus,
        documentId: documentId?.toString() || "",
      });
      if (defaultContactId) {
        setContactValue({ type: "contact", id: defaultContactId });
      } else if (defaultVendorId) {
        setContactValue({ type: "vendor", id: defaultVendorId });
      } else {
        setContactValue(null);
      }
      if (documentSummary) {
        const docTotal = parseFloat(documentSummary.total || "0");
        const docPaid = parseFloat(documentSummary.paidAmount || "0");
        const pending = docTotal - docPaid;
        setForm((prev) => ({
          ...prev,
          amount: pending > 0 ? pending.toFixed(2) : docTotal.toFixed(2),
          currency: documentSummary.currency || "EUR",
          direction: documentSummary.direction === "incoming" ? "outgoing" : "incoming",
        }));
      }
    }
  }, [open, editPayment, documentId, documentSummary, defaultDirection, defaultStatus, defaultContactId, defaultVendorId]);

  function resetAndClose() {
    setForm({ ...defaultForm, direction: defaultDirection, status: defaultStatus });
    setContactValue(null);
    onOpenChange(false);
  }

  function handleDocumentSelect(docId: string) {
    setForm((prev) => ({ ...prev, documentId: docId }));
    if (docId) {
      const doc = conciliableDocuments.find((d) => d.id.toString() === docId);
      if (doc) {
        setForm((prev) => ({ ...prev, documentId: docId, amount: doc.total }));
      }
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await uploadFile(file);
    if (result) {
      setForm((prev) => ({ ...prev, attachmentUrl: result.url, attachmentName: result.name }));
      toast.success("Comprobante adjuntado");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  const handleSave = useCallback(async () => {
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast.error("El monto debe ser mayor a 0");
      return;
    }

    setLoading(true);
    try {
      const body: Record<string, unknown> = {
        amount: parseFloat(form.amount),
        currency: form.currency,
        direction: form.direction,
        paymentDate: new Date(form.paymentDate),
        paymentMethod: form.paymentMethod,
        reference: form.reference || null,
        notes: form.notes || null,
        status: form.status,
        attachmentUrl: form.attachmentUrl || null,
        attachmentName: form.attachmentName || null,
      };

      if (documentId) {
        body.documentId = documentId;
      } else if (form.documentId) {
        body.documentId = parseInt(form.documentId);
      }

      if (eventId) body.eventId = eventId;
      if (taskId) body.taskId = taskId;

      if (contactValue) {
        if (contactValue.type === "contact") {
          body.contactId = contactValue.id;
        } else if (contactValue.type === "vendor") {
          body.vendorId = contactValue.id;
        }
      } else if (defaultVendorId && !showContactSelector) {
        body.vendorId = defaultVendorId;
      } else if (defaultContactId && !showContactSelector) {
        body.contactId = defaultContactId;
      }

      const url = isEdit ? `${apiBasePath}/${editPayment!.id}` : apiBasePath;
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json().catch(() => null);

      if (res.ok && (data?.success !== false)) {
        toast.success(isEdit ? "Pago actualizado" : "Pago registrado");
        resetAndClose();
        onSuccess?.();
      } else {
        toast.error(data?.error?.message || data?.error || `Error al ${isEdit ? "actualizar" : "registrar"} pago`);
      }
    } catch {
      toast.error(`Error al ${isEdit ? "actualizar" : "registrar"} pago`);
    } finally {
      setLoading(false);
    }
  }, [form, documentId, eventId, taskId, contactValue, defaultVendorId, defaultContactId, showContactSelector, isEdit, editPayment, apiBasePath, onSuccess]);

  const docTotal = documentSummary ? parseFloat(documentSummary.total || "0") : 0;
  const docPaid = documentSummary ? parseFloat(documentSummary.paidAmount || "0") : 0;
  const docPending = docTotal - docPaid;
  const docCurrency = documentSummary?.currency || "EUR";

  return (
    <Sheet open={open} onOpenChange={(o) => { if (!o) resetAndClose(); }}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Editar Pago" : "Registrar Pago"}</SheetTitle>
          <SheetDescription>
            {isEdit ? "Modifica los datos del pago" : documentSummary ? `Registrar pago para ${documentSummary.number}` : "Registra un nuevo cobro o pago"}
          </SheetDescription>
        </SheetHeader>
        <div className="space-y-4 px-4 py-4">
          {documentSummary && (
            <>
              <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total documento:</span>
                  <span className="font-medium">{formatCurrency(docTotal, docCurrency)}</span>
                </div>
                {docPaid > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Ya pagado:</span>
                    <span className="font-medium text-emerald-600">{formatCurrency(docPaid, docCurrency)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold">
                  <span>Pendiente:</span>
                  <span className="text-amber-600">{formatCurrency(docPending, docCurrency)}</span>
                </div>
              </div>
              <Separator />
            </>
          )}

          {showContactSelector && (
            <div className="space-y-2">
              <Label>Contacto</Label>
              <ContactSelector
                value={contactValue}
                onChange={setContactValue}
                placeholder="Seleccionar contacto"
              />
            </div>
          )}

          {!documentId && conciliableDocuments.length > 0 && !isEdit && (
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <RiFileTextLine className="h-4 w-4" />
                Conciliar con documento (opcional)
              </Label>
              <Select
                value={form.documentId || "none"}
                onValueChange={(v) => handleDocumentSelect(v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar documento a conciliar..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sin documento</SelectItem>
                  {conciliableDocuments.map((doc) => (
                    <SelectItem key={doc.id} value={doc.id.toString()}>
                      {getDocumentLabel(doc)} - {formatCurrency(doc.total)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {conciliableDocuments.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No hay documentos pendientes de conciliaci\u00f3n
                </p>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label>Concepto / Descripci\u00f3n</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Ej: Se\u00f1a del sal\u00f3n, pago mensual..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Monto *</Label>
              <Input
                type="number"
                step="0.01"
                value={form.amount}
                onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
              />
              {documentSummary && (
                <p className="text-xs text-muted-foreground">
                  Puedes registrar pagos parciales o el total pendiente.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Moneda</Label>
              <Select
                value={form.currency}
                onValueChange={(v) => setForm((prev) => ({ ...prev, currency: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="EUR">EUR</SelectItem>
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {showDirectionSelector && (
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={form.direction}
                  onValueChange={(v) => setForm((prev) => ({ ...prev, direction: v }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="incoming">Cobro (Ingreso)</SelectItem>
                    <SelectItem value="outgoing">Pago (Gasto)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Fecha</Label>
              <Input
                type="date"
                value={form.paymentDate}
                onChange={(e) => setForm((prev) => ({ ...prev, paymentDate: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>M\u00e9todo de pago</Label>
              <Select
                value={form.paymentMethod}
                onValueChange={(v) => setForm((prev) => ({ ...prev, paymentMethod: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bank_transfer">Transferencia</SelectItem>
                  <SelectItem value="cash">Efectivo</SelectItem>
                  <SelectItem value="card">Tarjeta</SelectItem>
                  <SelectItem value="stripe">Stripe</SelectItem>
                  <SelectItem value="check">Cheque</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((prev) => ({ ...prev, status: v }))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendiente</SelectItem>
                  <SelectItem value="complete">Completado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Referencia</Label>
            <Input
              value={form.reference}
              onChange={(e) => setForm((prev) => ({ ...prev, reference: e.target.value }))}
              placeholder="N\u00ba de transferencia, recibo, etc."
            />
          </div>

          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <RiAttachmentLine className="h-4 w-4" />
              Comprobante (opcional)
            </Label>
            {form.attachmentUrl ? (
              <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted/50">
                <RiFileDownloadLine className="h-4 w-4 text-muted-foreground shrink-0" />
                <a
                  href={form.attachmentUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline truncate flex-1"
                >
                  {form.attachmentName || "Comprobante"}
                </a>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={() => setForm((prev) => ({ ...prev, attachmentUrl: "", attachmentName: "" }))}
                >
                  <RiCloseLine className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={fileUploading}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {fileUploading ? (
                    <RiLoader4Line className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <RiAttachmentLine className="mr-2 h-4 w-4" />
                  )}
                  {fileUploading ? "Subiendo..." : "Adjuntar comprobante"}
                </Button>
                <p className="text-xs text-muted-foreground mt-1">
                  PDF o imagen, m\u00e1x. 10MB
                </p>
              </div>
            )}
          </div>
        </div>
        <SheetFooter>
          <Button variant="outline" onClick={resetAndClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? (
              <>
                <RiLoader4Line className="mr-2 h-4 w-4 animate-spin" />
                {isEdit ? "Guardando..." : "Registrando..."}
              </>
            ) : (
              <>
                <RiMoneyDollarCircleLine className="mr-2 h-4 w-4" />
                {isEdit ? "Guardar cambios" : "Registrar pago"}
              </>
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
