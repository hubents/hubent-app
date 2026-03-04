"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useFileUpload } from "@/hooks/use-file-upload";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  RiMoneyDollarCircleLine,
  RiArrowLeftLine,
  RiArrowUpLine,
  RiArrowDownLine,
  RiFileDownloadLine,
  RiAddLine,
  RiMoreLine,
  RiEditLine,
  RiDeleteBinLine,
  RiAttachmentLine,
  RiCloseLine,
  RiLoader4Line,
} from "@remixicon/react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { ContactSelector, type ContactSelectorValue } from "@/components/finance/contact-selector";

interface Payment {
  id: number;
  amount: string;
  currency: string;
  direction: string | null;
  paymentMethod: string | null;
  reference: string | null;
  notes: string | null;
  status: string | null;
  paymentDate: string | null;
  documentNumber: string | null;
  documentType: string | null;
  contactName: string | null;
  attachmentUrl: string | null;
  attachmentName: string | null;
}

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

const methodLabels: Record<string, string> = {
  cash: "Efectivo",
  bank_transfer: "Transferencia",
  card: "Tarjeta",
  stripe: "Stripe",
  other: "Otro",
};

type DirectionTab = "all" | "incoming" | "outgoing";
const directionTabs: { key: DirectionTab; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "incoming", label: "Cobros" },
  { key: "outgoing", label: "Pagos" },
];

export default function VendorPaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [directionFilter, setDirectionFilter] = useState<DirectionTab>("all");
  const [currency, setCurrency] = useState("EUR");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [documents, setDocuments] = useState<FinancialDocument[]>([]);

  const defaultForm = {
    amount: "",
    direction: "incoming" as "incoming" | "outgoing",
    paymentDate: new Date().toISOString().split("T")[0],
    paymentMethod: "bank_transfer",
    reference: "",
    notes: "",
    documentId: "",
    contactId: null as number | null,
    vendorId: null as number | null,
    attachmentUrl: "",
    attachmentName: "",
  };
  const [form, setForm] = useState(defaultForm);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { upload: uploadFile, uploading: fileUploading } = useFileUpload({ folder: "payments" });

  const formatCurrency = useCallback((amount: string | number, cur = "EUR") =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency: cur }).format(
      typeof amount === "string" ? parseFloat(amount || "0") : amount
    ), []);

  const fetchPayments = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: "100" });
      if (directionFilter !== "all") params.set("direction", directionFilter);
      const res = await fetch(`/api/finance/payments?${params}`);
      const data = await res.json();
      if (data.success) setPayments(data.data || []);
    } catch {
      toast.error("Error al cargar pagos");
    } finally {
      setLoading(false);
    }
  }, [directionFilter]);

  const fetchDocuments = useCallback(async () => {
    try {
      const [invRes, quoteRes] = await Promise.all([
        fetch("/api/finance/documents?type=invoice&limit=100"),
        fetch("/api/finance/documents?type=quote&limit=100"),
      ]);
      const docs: FinancialDocument[] = [];
      if (invRes.ok) {
        const data = await invRes.json();
        if (data.success && data.data) {
          docs.push(...data.data.filter((d: FinancialDocument) => d.status === "sent" || d.status === "partial"));
        }
      }
      if (quoteRes.ok) {
        const data = await quoteRes.json();
        if (data.success && data.data) {
          docs.push(...data.data.filter((d: FinancialDocument) => d.status === "payment_promise"));
        }
      }
      setDocuments(docs);
    } catch {
      console.error("Failed to fetch documents");
    }
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const settingsRes = await fetch("/api/finance/settings");
        const settingsData = await settingsRes.json();
        if (settingsData.success && settingsData.data?.defaultCurrency) {
          setCurrency(settingsData.data.defaultCurrency);
        }
      } catch { /* use default */ }
      await Promise.all([fetchPayments(), fetchDocuments()]);
    }
    init();
  }, [fetchPayments, fetchDocuments]);

  function openNew() {
    setEditingId(null);
    setForm(defaultForm);
    setSheetOpen(true);
  }

  function openEdit(p: Payment) {
    setEditingId(p.id);
    setForm({
      amount: p.amount,
      direction: (p.direction as "incoming" | "outgoing") || "incoming",
      paymentDate: p.paymentDate ? String(p.paymentDate).split("T")[0] : new Date().toISOString().split("T")[0],
      paymentMethod: p.paymentMethod || "bank_transfer",
      reference: p.reference || "",
      notes: p.notes || "",
      documentId: "",
      contactId: null,
      vendorId: null,
      attachmentUrl: p.attachmentUrl || "",
      attachmentName: p.attachmentName || "",
    });
    setSheetOpen(true);
  }

  async function handleSave() {
    if (!form.amount) { toast.error("El monto es requerido"); return; }
    try {
      const body = {
        amount: parseFloat(form.amount),
        direction: form.direction,
        paymentDate: new Date(form.paymentDate),
        paymentMethod: form.paymentMethod,
        reference: form.reference || null,
        notes: form.notes || null,
        status: "complete",
        documentId: form.documentId ? parseInt(form.documentId) : null,
        contactId: form.contactId,
        vendorId: form.vendorId,
        attachmentUrl: form.attachmentUrl || null,
        attachmentName: form.attachmentName || null,
      };

      const url = editingId ? `/api/finance/payments/${editingId}` : "/api/finance/payments";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        toast.success(editingId ? "Pago actualizado" : "Pago registrado");
        setSheetOpen(false);
        setEditingId(null);
        setForm(defaultForm);
        fetchPayments();
        fetchDocuments();
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error?.message || "Error al guardar pago");
      }
    } catch { toast.error("Error al guardar pago"); }
  }

  async function handleDelete(id: number) {
    if (!confirm("¿Estás seguro de eliminar este pago?")) return;
    try {
      const res = await fetch(`/api/finance/payments/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Pago eliminado");
        fetchPayments();
        fetchDocuments();
      } else {
        toast.error("Error al eliminar pago");
      }
    } catch { toast.error("Error al eliminar pago"); }
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

  function getDocumentLabel(doc: FinancialDocument) {
    const typeLabels: Record<string, string> = {
      invoice: "Factura",
      quote: "Presupuesto (Promesa de pago)",
    };
    const clientName = doc.companyName ||
      (doc.personFirstName ? `${doc.personFirstName} ${doc.personLastName || ""}` : "");
    return `${typeLabels[doc.type] || doc.type} ${doc.number}${clientName ? ` - ${clientName}` : ""}`;
  }

  const totalIncoming = payments
    .filter((p) => p.direction === "incoming" && p.status === "complete")
    .reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0);
  const totalOutgoing = payments
    .filter((p) => p.direction === "outgoing" && p.status === "complete")
    .reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-16" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/vendor/finance">
            <Button variant="ghost" size="icon">
              <RiArrowLeftLine className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">Pagos</h1>
            <p className="text-muted-foreground text-sm">{payments.length} pagos registrados</p>
          </div>
        </div>
        <Button onClick={openNew}>
          <RiAddLine className="h-4 w-4 mr-2" />
          Registrar Pago
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <RiArrowUpLine className="h-4 w-4 text-emerald-500" />
              <p className="text-sm text-muted-foreground">Total Cobrado</p>
            </div>
            <p className="text-2xl font-bold text-emerald-600">{formatCurrency(totalIncoming, currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <RiArrowDownLine className="h-4 w-4 text-red-500" />
              <p className="text-sm text-muted-foreground">Total Pagado</p>
            </div>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalOutgoing, currency)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 mb-1">
              <RiMoneyDollarCircleLine className="h-4 w-4 text-blue-500" />
              <p className="text-sm text-muted-foreground">Balance</p>
            </div>
            <p className={cn("text-2xl font-bold", totalIncoming - totalOutgoing >= 0 ? "text-emerald-600" : "text-red-600")}>
              {formatCurrency(totalIncoming - totalOutgoing, currency)}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-1 border-b">
        {directionTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setDirectionFilter(tab.key)}
            className={cn(
              "px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
              directionFilter === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {payments.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <RiMoneyDollarCircleLine className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No hay pagos registrados</p>
            <Button variant="outline" className="mt-4" onClick={openNew}>
              <RiAddLine className="h-4 w-4 mr-2" />
              Registrar primer pago
            </Button>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fecha</TableHead>
                  <TableHead>Documento</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Método</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Comprobante</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">
                      {p.paymentDate
                        ? format(new Date(p.paymentDate), "dd MMM yyyy", { locale: es })
                        : "-"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {p.documentNumber || p.reference || `#${p.id}`}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          p.direction === "incoming"
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-red-100 text-red-700"
                        }
                      >
                        {p.direction === "incoming" ? "Cobro" : "Pago"}
                      </Badge>
                    </TableCell>
                    <TableCell className="capitalize">
                      {methodLabels[p.paymentMethod || ""] || p.paymentMethod || "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      <span className={p.direction === "incoming" ? "text-emerald-600" : "text-red-600"}>
                        {p.direction === "incoming" ? "+" : "-"}
                        {formatCurrency(p.amount, p.currency)}
                      </span>
                    </TableCell>
                    <TableCell>
                      {p.attachmentUrl ? (
                        <a href={p.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-sm flex items-center gap-1">
                          <RiFileDownloadLine className="h-3.5 w-3.5" />
                          {p.attachmentName || "Ver"}
                        </a>
                      ) : (
                        <span className="text-muted-foreground text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <RiMoreLine className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(p)}>
                            <RiEditLine className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          {p.attachmentUrl && (
                            <DropdownMenuItem asChild>
                              <a href={p.attachmentUrl} target="_blank" rel="noopener noreferrer">
                                <RiFileDownloadLine className="mr-2 h-4 w-4" />
                                Ver comprobante
                              </a>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600" onClick={() => handleDelete(p.id)}>
                            <RiDeleteBinLine className="mr-2 h-4 w-4" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingId ? "Editar Pago" : "Registrar Pago"}</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4 px-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Monto *</Label>
                <Input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={form.amount}
                  onChange={(e) => setForm((prev) => ({ ...prev, amount: e.target.value }))}
                />
              </div>
              <div>
                <Label>Dirección</Label>
                <Select value={form.direction} onValueChange={(v) => setForm((prev) => ({ ...prev, direction: v as "incoming" | "outgoing" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="incoming">Cobro (entrada)</SelectItem>
                    <SelectItem value="outgoing">Pago (salida)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fecha</Label>
                <Input
                  type="date"
                  value={form.paymentDate}
                  onChange={(e) => setForm((prev) => ({ ...prev, paymentDate: e.target.value }))}
                />
              </div>
              <div>
                <Label>Método de pago</Label>
                <Select value={form.paymentMethod} onValueChange={(v) => setForm((prev) => ({ ...prev, paymentMethod: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bank_transfer">Transferencia</SelectItem>
                    <SelectItem value="cash">Efectivo</SelectItem>
                    <SelectItem value="card">Tarjeta</SelectItem>
                    <SelectItem value="stripe">Stripe</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Contacto / Proveedor</Label>
              <ContactSelector
                value={form.contactId ? { type: "contact", id: form.contactId } : form.vendorId ? { type: "vendor", id: form.vendorId } : null}
                onChange={(val: ContactSelectorValue | null) => {
                  if (val) {
                    setForm((prev) => ({
                      ...prev,
                      contactId: val.type === "contact" ? val.id : null,
                      vendorId: val.type === "vendor" ? val.id : null,
                    }));
                  } else {
                    setForm((prev) => ({ ...prev, contactId: null, vendorId: null }));
                  }
                }}
              />
            </div>

            {!editingId && (
              <div>
                <Label>Conciliar con documento</Label>
                <Select value={form.documentId || "none"} onValueChange={(v) => {
                  const docId = v === "none" ? "" : v;
                  setForm((prev) => ({ ...prev, documentId: docId }));
                  if (docId) {
                    const doc = documents.find((d) => d.id.toString() === docId);
                    if (doc) setForm((prev) => ({ ...prev, documentId: docId, amount: doc.total }));
                  }
                }}>
                  <SelectTrigger><SelectValue placeholder="Seleccionar documento a conciliar..." /></SelectTrigger>
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
                  <p className="text-xs text-muted-foreground mt-1">
                    No hay documentos pendientes de conciliación
                  </p>
                )}
              </div>
            )}

            <div>
              <Label>Referencia</Label>
              <Input
                placeholder="Nº transferencia, cheque, etc."
                value={form.reference}
                onChange={(e) => setForm((prev) => ({ ...prev, reference: e.target.value }))}
              />
            </div>

            <div>
              <Label>Notas</Label>
              <Input
                placeholder="Notas adicionales"
                value={form.notes}
                onChange={(e) => setForm((prev) => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            <div>
              <Label>Comprobante</Label>
              <input type="file" ref={fileInputRef} className="hidden" accept="image/*,.pdf" onChange={handleFileUpload} />
              {form.attachmentUrl ? (
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <RiAttachmentLine className="h-3 w-3" />
                    {form.attachmentName || "Archivo adjunto"}
                  </Badge>
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setForm((prev) => ({ ...prev, attachmentUrl: "", attachmentName: "" }))}>
                    <RiCloseLine className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <Button variant="outline" size="sm" className="mt-1" onClick={() => fileInputRef.current?.click()} disabled={fileUploading}>
                  {fileUploading ? <RiLoader4Line className="h-4 w-4 mr-2 animate-spin" /> : <RiAttachmentLine className="h-4 w-4 mr-2" />}
                  {fileUploading ? "Subiendo..." : "Adjuntar comprobante"}
                </Button>
              )}
            </div>
          </div>
          <SheetFooter className="px-4">
            <Button variant="outline" onClick={() => setSheetOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>{editingId ? "Guardar cambios" : "Registrar pago"}</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
