"use client";

import { useState, useEffect, useRef } from "react";
import { useFileUpload } from "@/hooks/use-file-upload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  RiAddLine,
  RiSearchLine,
  RiArrowUpLine,
  RiArrowDownLine,
  RiMoneyDollarCircleLine,
  RiCheckLine,
  RiFileTextLine,
  RiAlertLine,
  RiCalendarLine,
  RiMoreLine,
  RiEditLine,
  RiDeleteBinLine,
  RiFileDownloadLine,
  RiCloseLine,
  RiAttachmentLine,
  RiLoader4Line,
} from "@remixicon/react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NumericPagination } from "@/components/ui/numeric-pagination";
import { cn } from "@/lib/utils";
import { ContactSelector, type ContactSelectorValue } from "@/components/finance/contact-selector";
import { DocumentPreview } from "@/components/finance/document-preview";

interface Payment {
  id: number;
  documentId: number | null;
  vendorId: number | null;
  contactId: number | null;
  eventId: number | null;
  amount: string;
  currency: string;
  direction: string;
  paymentDate: string;
  paymentMethod: string | null;
  reference: string | null;
  notes: string | null;
  documentNumber?: string | null;
  documentType?: string | null;
  contactName?: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
}

type DirectionTab = "all" | "incoming" | "outgoing";
const directionTabs: { key: DirectionTab; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "incoming", label: "Cobros" },
  { key: "outgoing", label: "Pagos" },
];

interface FinancialDocument {
  id: number;
  type: string;
  number: string;
  total: string;
  status: string;
  companyName: string | null;
  personFirstName: string | null;
  personLastName: string | null;
}

interface PaymentSchedule {
  id: number;
  name: string;
  amount: string;
  dueDate: string;
  isPaid: boolean;
  paidAt: string | null;
  eventId: number | null;
  vendorId: number | null;
  notes: string | null;
}

interface PaymentStats {
  totalIncoming: number;
  totalOutgoing: number;
  pendingIncoming: number;
  pendingOutgoing: number;
  overdueAmount: number;
  overdueCount: number;
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [documents, setDocuments] = useState<FinancialDocument[]>([]);
  const [schedules, setSchedules] = useState<PaymentSchedule[]>([]);
  const [stats, setStats] = useState<PaymentStats>({
    totalIncoming: 0,
    totalOutgoing: 0,
    pendingIncoming: 0,
    pendingOutgoing: 0,
    overdueAmount: 0,
    overdueCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [directionFilter, setDirectionFilter] = useState<DirectionTab>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [contactValue, setContactValue] = useState<ContactSelectorValue | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [editingPaymentId, setEditingPaymentId] = useState<number | null>(null);

  // New payment form
  const [newPayment, setNewPayment] = useState({
    amount: "",
    currency: "EUR",
    direction: "incoming",
    paymentMethod: "bank_transfer",
    reference: "",
    notes: "",
    paymentDate: new Date().toISOString().split("T")[0],
    documentId: "",
    attachmentUrl: "",
    attachmentName: "",
  });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { upload: uploadFile, uploading: fileUploading } = useFileUpload({ folder: "payments" });

  useEffect(() => {
    fetchPayments();
    fetchDocuments();
    fetchSchedules();
  }, [directionFilter, page]);

  useEffect(() => {
    fetchDocuments();
    setNewPayment((prev) => ({ ...prev, documentId: "" }));
  }, [contactValue]);

  async function openDocPreview(documentId: number) {
    try {
      const res = await fetch(`/api/finance/documents/${documentId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setPreviewDoc(data.data);
          setPreviewOpen(true);
        }
      }
    } catch {
      toast.error("Error al cargar documento");
    }
  }

  async function fetchPayments() {
    try {
      const params = new URLSearchParams({
        type: "records",
        page: page.toString(),
        limit: "20",
      });
      if (directionFilter !== "all") params.set("direction", directionFilter);

      const res = await fetch(`/api/finance/payments?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setPayments(data.data || []);
          setTotalPages(data.meta?.totalPages || 1);
          calculateStats(data.data || []);
        }
      }
    } catch (error) {
      console.error("Failed to fetch payments:", error);
      toast.error("Error al cargar pagos");
    } finally {
      setLoading(false);
    }
  }

  async function fetchSchedules() {
    try {
      const res = await fetch("/api/finance/payments?type=schedules");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setSchedules(data.data || []);
        }
      }
    } catch (error) {
      console.error("Failed to fetch schedules:", error);
    }
  }

  async function fetchDocuments() {
    try {
      const contactParam = contactValue?.type === "contact" && contactValue.id ? `&contactId=${contactValue.id}` : "";
      const vendorParam = contactValue?.type === "vendor" && contactValue.id ? `&vendorId=${contactValue.id}` : "";
      const entityFilter = contactParam || vendorParam;

      const [invoicesRes, quotesRes] = await Promise.all([
        fetch(`/api/finance/documents?type=invoice&limit=100${entityFilter}`),
        fetch(`/api/finance/documents?type=quote&limit=100${entityFilter}`),
      ]);
      
      const allDocs: FinancialDocument[] = [];
      
      if (invoicesRes.ok) {
        const data = await invoicesRes.json();
        if (data.success && data.data) {
          const pending = data.data.filter((d: FinancialDocument) => 
            d.status === "sent" || d.status === "partial"
          );
          allDocs.push(...pending);
        }
      }
      
      if (quotesRes.ok) {
        const data = await quotesRes.json();
        if (data.success && data.data) {
          const withPromise = data.data.filter((d: FinancialDocument) => 
            d.status === "payment_promise"
          );
          allDocs.push(...withPromise);
        }
      }
      
      setDocuments(allDocs);
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    }
  }

  function calculateStats(paymentList: Payment[]) {
    const incoming = paymentList
      .filter((p) => p.direction === "incoming")
      .reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0);
    const outgoing = paymentList
      .filter((p) => p.direction === "outgoing")
      .reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0);

    // Calculate overdue from schedules
    const now = new Date();
    const overdueSchedules = schedules.filter(s => !s.isPaid && new Date(s.dueDate) < now);
    const overdueAmount = overdueSchedules.reduce((sum, s) => sum + parseFloat(s.amount || "0"), 0);

    setStats({
      totalIncoming: incoming,
      totalOutgoing: outgoing,
      pendingIncoming: 0,
      pendingOutgoing: 0,
      overdueAmount,
      overdueCount: overdueSchedules.length,
    });
  }

  async function createPayment() {
    if (!newPayment.amount) {
      toast.error("El monto es requerido");
      return;
    }

    try {
      const res = await fetch("/api/finance/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(newPayment.amount),
          currency: newPayment.currency,
          direction: newPayment.direction,
          paymentMethod: newPayment.paymentMethod,
          reference: newPayment.reference || null,
          notes: newPayment.notes || null,
          paymentDate: new Date(newPayment.paymentDate),
          documentId: newPayment.documentId ? parseInt(newPayment.documentId) : null,
          contactId: contactValue?.type === "contact" ? contactValue.id : null,
          vendorId: contactValue?.type === "vendor" ? contactValue.id : null,
          attachmentUrl: newPayment.attachmentUrl || null,
          attachmentName: newPayment.attachmentName || null,
        }),
      });

      if (res.ok) {
        toast.success("Pago registrado");
        resetAndClose();
        fetchPayments();
        fetchDocuments();
      } else {
        toast.error("Error al registrar pago");
      }
    } catch (error) {
      toast.error("Error al registrar pago");
    }
  }

  function openEditPayment(payment: Payment) {
    setEditingPaymentId(payment.id);
    setNewPayment({
      amount: payment.amount,
      currency: payment.currency || "EUR",
      direction: payment.direction,
      paymentMethod: payment.paymentMethod || "bank_transfer",
      reference: payment.reference || "",
      notes: payment.notes || "",
      paymentDate: payment.paymentDate ? payment.paymentDate.split("T")[0] : new Date().toISOString().split("T")[0],
      documentId: payment.documentId?.toString() || "",
      attachmentUrl: payment.attachmentUrl || "",
      attachmentName: payment.attachmentName || "",
    });
    setContactValue(
      payment.contactId ? { type: "contact", id: payment.contactId } :
      payment.vendorId ? { type: "vendor", id: payment.vendorId } :
      null
    );
    setDialogOpen(true);
  }

  async function updatePayment() {
    if (!editingPaymentId || !newPayment.amount) {
      toast.error("El monto es requerido");
      return;
    }

    try {
      const res = await fetch(`/api/finance/payments/${editingPaymentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(newPayment.amount),
          paymentMethod: newPayment.paymentMethod,
          paymentDate: new Date(newPayment.paymentDate),
          reference: newPayment.reference || null,
          notes: newPayment.notes || null,
          attachmentUrl: newPayment.attachmentUrl || null,
          attachmentName: newPayment.attachmentName || null,
        }),
      });

      if (res.ok) {
        toast.success("Pago actualizado");
        resetAndClose();
        fetchPayments();
        fetchDocuments();
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error?.message || "Error al actualizar pago");
      }
    } catch (error) {
      toast.error("Error al actualizar pago");
    }
  }

  async function deletePayment(id: number) {
    if (!confirm("¿Estás seguro de eliminar este pago? Se recalculará el saldo del documento asociado.")) return;

    try {
      const res = await fetch(`/api/finance/payments/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        toast.success("Pago eliminado");
        fetchPayments();
        fetchDocuments();
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error?.message || "Error al eliminar pago");
      }
    } catch (error) {
      toast.error("Error al eliminar pago");
    }
  }

  function resetAndClose() {
    setDialogOpen(false);
    setEditingPaymentId(null);
    setNewPayment({
      amount: "",
      currency: "EUR",
      direction: "incoming",
      paymentMethod: "bank_transfer",
      reference: "",
      notes: "",
      paymentDate: new Date().toISOString().split("T")[0],
      documentId: "",
      attachmentUrl: "",
      attachmentName: "",
    });
    setContactValue(null);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const result = await uploadFile(file);
    if (result) {
      setNewPayment((prev) => ({
        ...prev,
        attachmentUrl: result.url,
        attachmentName: result.name,
      }));
      toast.success("Comprobante adjuntado");
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleDocumentSelect(docId: string) {
    setNewPayment({ ...newPayment, documentId: docId });
    // Auto-fill amount from document
    if (docId) {
      const doc = documents.find((d) => d.id.toString() === docId);
      if (doc) {
        setNewPayment((prev) => ({
          ...prev,
          documentId: docId,
          amount: doc.total,
        }));
      }
    }
  }

  function getDocumentLabel(doc: FinancialDocument) {
    const typeLabels: Record<string, string> = {
      invoice: "Factura",
      quote: "Presupuesto (Promesa de pago)",
      proforma: "Proforma",
      delivery_note: "Albarán",
    };
    const clientName = doc.companyName || 
      (doc.personFirstName ? `${doc.personFirstName} ${doc.personLastName || ""}` : "");
    return `${typeLabels[doc.type] || doc.type} ${doc.number}${clientName ? ` - ${clientName}` : ""}`;
  }

  const formatCurrency = (amount: string | number, currency = "EUR") => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency,
    }).format(typeof amount === "string" ? parseFloat(amount || "0") : amount);
  };

  const filteredPayments = payments.filter((p) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      p.reference?.toLowerCase().includes(search) ||
      p.notes?.toLowerCase().includes(search) ||
      p.documentNumber?.toLowerCase().includes(search) ||
      p.contactName?.toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pagos</h1>
          <p className="text-muted-foreground">
            Registro de cobros y pagos
          </p>
        </div>
        <Button onClick={() => { setEditingPaymentId(null); setDialogOpen(true); }}>
          <RiAddLine className="mr-2 h-4 w-4" />
          Registrar Pago
        </Button>
        <Sheet open={dialogOpen} onOpenChange={(open) => { if (!open) resetAndClose(); }}>
          <SheetContent className="sm:max-w-2xl overflow-y-auto">
            <SheetHeader>
              <SheetTitle>{editingPaymentId ? "Editar Pago" : "Registrar Pago"}</SheetTitle>
              <SheetDescription>
                {editingPaymentId ? "Modifica los datos del pago" : "Registra un nuevo cobro o pago"}
              </SheetDescription>
            </SheetHeader>
            <div className="space-y-4 px-4 py-4">
              {/* Contact selector */}
              <div className="space-y-2">
                <Label>Contacto</Label>
                <ContactSelector
                  value={contactValue}
                  onChange={setContactValue}
                  placeholder="Seleccionar contacto"
                />
              </div>

              {/* Document selector */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <RiFileTextLine className="h-4 w-4" />
                  Conciliar a (opcional)
                </Label>
                <Select
                  value={newPayment.documentId || "none"}
                  onValueChange={(v) => handleDocumentSelect(v === "none" ? "" : v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar documento a conciliar..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin documento</SelectItem>
                    {documents.map((doc) => (
                      <SelectItem key={doc.id} value={doc.id.toString()}>
                        {getDocumentLabel(doc)} - {formatCurrency(doc.total)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {documents.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No hay documentos pendientes de conciliación
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select
                    value={newPayment.direction}
                    onValueChange={(v) => setNewPayment({ ...newPayment, direction: v })}
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
                <div className="space-y-2">
                  <Label>Método</Label>
                  <Select
                    value={newPayment.paymentMethod}
                    onValueChange={(v) => setNewPayment({ ...newPayment, paymentMethod: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Efectivo</SelectItem>
                      <SelectItem value="bank_transfer">Transferencia</SelectItem>
                      <SelectItem value="card">Tarjeta</SelectItem>
                      <SelectItem value="stripe">Stripe</SelectItem>
                      <SelectItem value="other">Otro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Monto *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Moneda</Label>
                  <Select
                    value={newPayment.currency}
                    onValueChange={(v) => setNewPayment({ ...newPayment, currency: v })}
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

              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={newPayment.paymentDate}
                  onChange={(e) => setNewPayment({ ...newPayment, paymentDate: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Referencia</Label>
                <Input
                  value={newPayment.reference}
                  onChange={(e) => setNewPayment({ ...newPayment, reference: e.target.value })}
                  placeholder="Número de transferencia, etc."
                />
              </div>

              <div className="space-y-2">
                <Label>Descripción</Label>
                <Input
                  value={newPayment.notes}
                  onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                  placeholder="Descripción del pago"
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <RiAttachmentLine className="h-4 w-4" />
                  Comprobante (opcional)
                </Label>
                {newPayment.attachmentUrl ? (
                  <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted/50">
                    <RiFileDownloadLine className="h-4 w-4 text-muted-foreground shrink-0" />
                    <a
                      href={newPayment.attachmentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline truncate flex-1"
                    >
                      {newPayment.attachmentName || "Comprobante"}
                    </a>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 shrink-0"
                      onClick={() => setNewPayment((prev) => ({ ...prev, attachmentUrl: "", attachmentName: "" }))}
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
                      PDF o imagen, máx. 10MB
                    </p>
                  </div>
                )}
              </div>
            </div>
            <SheetFooter>
              <Button variant="outline" onClick={resetAndClose}>
                Cancelar
              </Button>
              <Button onClick={editingPaymentId ? updatePayment : createPayment}>
                {editingPaymentId ? "Guardar cambios" : "Registrar"}
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Cobrado</CardTitle>
            <RiArrowUpLine className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(stats.totalIncoming)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {payments.filter(p => p.direction === "incoming").length} cobros
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pagado</CardTitle>
            <RiArrowDownLine className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(stats.totalOutgoing)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {payments.filter(p => p.direction === "outgoing").length} pagos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Balance</CardTitle>
            <RiMoneyDollarCircleLine className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.totalIncoming - stats.totalOutgoing >= 0 ? "text-emerald-600" : "text-red-600"}`}>
              {formatCurrency(stats.totalIncoming - stats.totalOutgoing)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Ingresos - Gastos
            </p>
          </CardContent>
        </Card>

        <Card className={stats.overdueCount > 0 ? "border-red-200 bg-red-50/50 dark:border-red-900 dark:bg-red-950/20" : ""}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencido</CardTitle>
            <RiAlertLine className={`h-4 w-4 ${stats.overdueCount > 0 ? "text-red-500" : "text-gray-400"}`} />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.overdueCount > 0 ? "text-red-600" : "text-muted-foreground"}`}>
              {stats.overdueCount > 0 ? formatCurrency(stats.overdueAmount) : "-"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.overdueCount > 0 ? `${stats.overdueCount} cuotas vencidas` : "Sin vencimientos"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Scheduled Payments Summary */}
      {schedules.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <RiCalendarLine className="h-4 w-4" />
                Próximos Vencimientos
              </CardTitle>
              <Badge variant="outline">{schedules.filter(s => !s.isPaid).length} pendientes</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {schedules
                .filter(s => !s.isPaid)
                .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                .slice(0, 5)
                .map((schedule) => {
                  const isOverdue = new Date(schedule.dueDate) < new Date();
                  return (
                    <div 
                      key={schedule.id} 
                      className={`flex items-center justify-between p-2 rounded-lg ${isOverdue ? "bg-red-50 dark:bg-red-950/20" : "bg-muted/50"}`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`w-2 h-2 rounded-full ${isOverdue ? "bg-red-500" : "bg-amber-500"}`} />
                        <div>
                          <p className="text-sm font-medium">{schedule.name}</p>
                          <p className={`text-xs ${isOverdue ? "text-red-600" : "text-muted-foreground"}`}>
                            {isOverdue ? "Vencido: " : "Vence: "}
                            {format(new Date(schedule.dueDate), "dd MMM yyyy", { locale: es })}
                          </p>
                        </div>
                      </div>
                      <span className={`font-medium ${isOverdue ? "text-red-600" : ""}`}>
                        {formatCurrency(schedule.amount)}
                      </span>
                    </div>
                  );
                })}
              {schedules.filter(s => !s.isPaid).length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  No hay pagos programados pendientes
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Direction Tabs */}
      <div className="flex gap-1 border-b">
        {directionTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setDirectionFilter(tab.key); setPage(1); }}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
              directionFilter === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <RiSearchLine className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por referencia, contacto o documento..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Contacto</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Método</TableHead>
                <TableHead>Conciliado con</TableHead>
                <TableHead>Referencia</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No hay pagos registrados
                  </TableCell>
                </TableRow>
              ) : (
                filteredPayments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell>
                      {payment.paymentDate
                        ? format(new Date(payment.paymentDate), "dd MMM yyyy", { locale: es })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {payment.contactName || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          payment.direction === "incoming"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }
                      >
                        {payment.direction === "incoming" ? "Cobro" : "Pago"}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">
                      {payment.paymentMethod?.replace("_", " ") || "-"}
                    </TableCell>
                    <TableCell>
                      {payment.documentNumber && payment.documentId ? (
                        <button
                          onClick={() => openDocPreview(payment.documentId!)}
                          className="text-sm font-medium text-primary hover:underline cursor-pointer"
                        >
                          {payment.documentNumber}
                        </button>
                      ) : payment.documentNumber ? (
                        <span className="text-sm font-medium">{payment.documentNumber}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {payment.reference || payment.notes || "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <span
                        className={
                          payment.direction === "incoming"
                            ? "text-emerald-600"
                            : "text-red-600"
                        }
                      >
                        {payment.direction === "incoming" ? "+" : "-"}
                        {formatCurrency(payment.amount, payment.currency)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <RiMoreLine className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditPayment(payment)}>
                            <RiEditLine className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600" onClick={() => deletePayment(payment.id)}>
                            <RiDeleteBinLine className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Document Preview */}
      <DocumentPreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        document={previewDoc}
        onRefresh={fetchPayments}
      />

      {/* Pagination */}
      <div className="flex justify-center">
        <NumericPagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
}
