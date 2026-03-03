"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { downloadDocumentPDF } from "@/lib/pdf-download";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
  RiMoreLine,
  RiEditLine,
  RiFileCopyLine,
  RiDeleteBinLine,
  RiCheckLine,
  RiSendPlaneLine,
  RiMoneyDollarCircleLine,
  RiExchangeLine,
  RiRefund2Line,
  RiLinkM,
  RiEyeLine,
  RiCheckDoubleLine,
  RiTruckLine,
  RiFileDownloadLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DocumentDrawer } from "@/components/finance/document-drawer";
import { DocumentPreview } from "@/components/finance/document-preview";
import { NumericPagination } from "@/components/ui/numeric-pagination";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface DocumentItem {
  id: number;
  description: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  taxRate: string;
  total: string;
}

interface Invoice {
  id: number;
  type: string;
  number: string;
  status: string;
  companyId: number | null;
  personId: number | null;
  contactId: number | null;
  vendorId: number | null;
  eventId: number | null;
  direction: string | null;
  issueDate: string;
  dueDate: string | null;
  validUntil: string | null;
  subtotal: string;
  taxAmount: string;
  total: string;
  paidAmount: string | null;
  currency: string;
  globalDiscount: string | null;
  globalDiscountType: string | null;
  notes: string | null;
  termsAndConditions: string | null;
  companyName: string | null;
  personFirstName: string | null;
  personLastName: string | null;
  contactName: string | null;
  vendorName: string | null;
  eventName: string | null;
  items: DocumentItem[];
}

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "Pendiente", color: "bg-blue-100 text-blue-700" },
  sent: { label: "Pendiente", color: "bg-blue-100 text-blue-700" },
  partial: { label: "Parcial", color: "bg-amber-100 text-amber-700" },
  paid: { label: "Pagada", color: "bg-emerald-100 text-emerald-700" },
  overdue: { label: "Vencida", color: "bg-orange-100 text-orange-700" },
};

type StatusTab = "all" | "sent" | "partial" | "paid";
const statusTabs: { key: StatusTab; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "sent", label: "Pendiente" },
  { key: "partial", label: "Parcial" },
  { key: "paid", label: "Pagada" },
];

type DirectionTab = "all" | "outgoing" | "incoming";

const directionTabs: { key: DirectionTab; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "outgoing", label: "Cobros" },
  { key: "incoming", label: "Pagos" },
];

export default function InvoicesPage() {
  return (
    <Suspense>
      <InvoicesContent />
    </Suspense>
  );
}

function InvoicesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [directionTab, setDirectionTab] = useState<DirectionTab>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | undefined>(undefined);
  const [drawerInitialData, setDrawerInitialData] = useState<any>(undefined);
  const [drawerType, setDrawerType] = useState<"invoice" | "delivery_note">("invoice");
  
  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [paymentReference, setPaymentReference] = useState("");
  
  // Preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    fetchInvoices();
  }, [page, statusFilter, directionTab]);

  useEffect(() => {
    if (searchParams.get("new") === "true") {
      openNewDrawer();
      router.replace("/dashboard/finance/invoices");
    }
  }, [searchParams]);

  async function fetchInvoices() {
    try {
      setFetchError(null);
      const params = new URLSearchParams({
        type: "invoice",
        page: page.toString(),
        limit: "20",
      });
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }
      if (directionTab !== "all") {
        params.set("direction", directionTab);
      }
      if (searchTerm) {
        params.set("search", searchTerm);
      }

      const res = await fetch(`/api/finance/documents?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setInvoices(data.data || []);
          setTotalPages(data.meta?.totalPages || 1);
        }
      } else {
        const data = await res.json().catch(() => null);
        const msg = data?.error?.message || `Error del servidor (${res.status})`;
        setFetchError(msg);
        toast.error(msg);
      }
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
      setFetchError("No se pudo conectar con el servidor");
      toast.error("Error al cargar facturas");
    } finally {
      setLoading(false);
    }
  }

  async function deleteInvoice(id: number) {
    if (!confirm("¿Estás seguro de eliminar esta factura?")) return;

    try {
      const res = await fetch(`/api/finance/documents/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Factura eliminada");
        fetchInvoices();
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error?.message || "Error al eliminar");
      }
    } catch (error) {
      toast.error("Error al eliminar");
    }
  }

  async function fetchDocAndOpenDrawer(id: number, targetType: "invoice" | "delivery_note") {
    try {
      const res = await fetch(`/api/finance/documents/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          const doc = data.data;
          const isDeliveryNote = targetType === "delivery_note";
          setDrawerInitialData({
            contactId: doc.contactId,
            vendorId: doc.vendorId,
            eventId: doc.eventId,
            notes: doc.notes,
            termsAndConditions: isDeliveryNote ? undefined : doc.termsAndConditions,
            globalDiscount: isDeliveryNote ? undefined : (parseFloat(doc.globalDiscount || "0") || undefined),
            globalDiscountType: isDeliveryNote ? undefined : doc.globalDiscountType,
            paymentMethod: isDeliveryNote ? undefined : doc.paymentMethod,
            bankAccountId: isDeliveryNote ? undefined : doc.bankAccountId,
            items: doc.items?.map((item: any) => ({
              description: item.description,
              quantity: parseFloat(item.quantity),
              unitPrice: isDeliveryNote ? 0 : parseFloat(item.unitPrice),
              discount: isDeliveryNote ? 0 : parseFloat(item.discount || "0"),
              taxRate: isDeliveryNote ? 0 : parseFloat(item.taxRate || "21"),
              total: isDeliveryNote ? 0 : parseFloat(item.total),
            })),
          });
          setDrawerType(targetType);
          setEditingId(undefined);
          setDrawerOpen(true);
        }
      }
    } catch (error) {
      toast.error("Error al cargar documento");
    }
  }

  async function createCreditNote(id: number) {
    if (!confirm("¿Crear una factura rectificativa? Esto generará una factura con importes negativos que anula la factura original.")) return;

    try {
      const res = await fetch(`/api/finance/documents/${id}/credit-note`, {
        method: "POST",
      });
      if (res.ok) {
        toast.success("Factura rectificativa creada");
        fetchInvoices();
      } else {
        const error = await res.json();
        toast.error(error.error?.message || "Error al crear factura rectificativa");
      }
    } catch (error) {
      toast.error("Error al crear factura rectificativa");
    }
  }

  async function updateStatus(id: number, status: string) {
    try {
      const res = await fetch(`/api/finance/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.success(`Estado actualizado a ${statusConfig[status]?.label || status}`);
        fetchInvoices();
      } else {
        const data = await res.json().catch(() => null);
        const errorMsg = data?.error?.message || "Error al actualizar estado";
        toast.error(errorMsg);
      }
    } catch (error) {
      toast.error("Error al actualizar estado");
    }
  }

  function openNewDrawer() {
    setEditingId(undefined);
    setDrawerInitialData(undefined);
    setDrawerOpen(true);
  }

  function openEditDrawer(id: number) {
    setEditingId(id);
    setDrawerInitialData(undefined);
    setDrawerOpen(true);
  }

  function openPaymentDialog(invoice: Invoice) {
    setPaymentInvoice(invoice);
    const remaining = parseFloat(invoice.total || "0") - parseFloat(invoice.paidAmount || "0");
    setPaymentAmount(remaining > 0 ? remaining.toFixed(2) : invoice.total);
    setPaymentMethod("bank_transfer");
    setPaymentReference(`Pago ${invoice.number}`);
    setPaymentDialogOpen(true);
  }

  async function openPreview(id: number) {
    try {
      const res = await fetch(`/api/finance/documents/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setPreviewInvoice(data.data);
          setPreviewOpen(true);
        }
      }
    } catch (error) {
      toast.error("Error al cargar documento");
    }
  }

  async function submitPayment() {
    if (!paymentInvoice || !paymentAmount) return;

    try {
      const res = await fetch("/api/finance/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          documentId: paymentInvoice.id,
          amount: parseFloat(paymentAmount),
          currency: paymentInvoice.currency || "EUR",
          direction: paymentInvoice.direction === "incoming" ? "outgoing" : "incoming",
          paymentMethod: paymentMethod,
          paymentDate: new Date().toISOString(),
          reference: paymentReference,
        }),
      });

      if (res.ok) {
        toast.success("Pago registrado correctamente");
        setPaymentDialogOpen(false);
        fetchInvoices();
      } else {
        toast.error("Error al registrar pago");
      }
    } catch (error) {
      toast.error("Error al registrar pago");
    }
  }

  const formatCurrency = (amount: string, currency = "EUR") => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency,
    }).format(parseFloat(amount || "0"));
  };

  async function generatePaymentLink(invoice: Invoice) {
    try {
      const res = await fetch("/api/finance/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: invoice.id }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        await navigator.clipboard.writeText(data.data.checkoutUrl);
        toast.success("Link de pago copiado al portapapeles");
        fetchInvoices();
      } else {
        toast.error(data.error?.message || "Error al generar link de pago");
      }
    } catch (error) {
      toast.error("Error al generar link de pago");
    }
  }

  const getClientName = (invoice: Invoice) => {
    if (invoice.contactName) return invoice.contactName;
    if (invoice.companyName) return invoice.companyName;
    if (invoice.personFirstName) {
      return `${invoice.personFirstName} ${invoice.personLastName || ""}`.trim();
    }
    if (invoice.vendorName) return invoice.vendorName;
    return "Sin cliente";
  };

  function isOverdue(invoice: Invoice): boolean {
    if (!invoice.dueDate) return false;
    if (invoice.status === "paid" || invoice.status === "cancelled") return false;
    return new Date(invoice.dueDate) < new Date();
  }

  function getDisplayStatus(invoice: Invoice): string {
    if (isOverdue(invoice)) return "overdue";
    return invoice.status;
  }

  function handleSearchSubmit() {
    setPage(1);
    fetchInvoices();
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-40" />
        </div>
        <Skeleton className="h-100" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Facturas</h1>
          <p className="text-muted-foreground">
            Gestiona tus facturas de venta
          </p>
        </div>
        <Button onClick={openNewDrawer}>
          <RiAddLine className="mr-2 h-4 w-4" />
          Nueva Factura
        </Button>
      </div>

      {/* Direction Tabs */}
      <div className="flex gap-1 border-b">
        {directionTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setDirectionTab(tab.key); setPage(1); }}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
              directionTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Status Tabs */}
      <div className="flex gap-1 border-b">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => { setStatusFilter(tab.key); setPage(1); }}
            className={cn(
              "px-4 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
              statusFilter === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <RiSearchLine className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Buscar por número o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearchSubmit()}
                className="pl-9"
              />
            </div>
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
                <TableHead>Cliente</TableHead>
                <TableHead>Número</TableHead>
                <TableHead className="text-right">Subtotal</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fetchError ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="text-red-600 font-medium">{fetchError}</div>
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => fetchInvoices()}>
                      Reintentar
                    </Button>
                  </TableCell>
                </TableRow>
              ) : invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No hay facturas
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((invoice: Invoice) => {
                  const displayStatus = getDisplayStatus(invoice);
                  return (
                    <TableRow 
                      key={invoice.id} 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => openEditDrawer(invoice.id)}
                    >
                      <TableCell>
                        {invoice.issueDate
                          ? format(new Date(invoice.issueDate), "dd MMM yyyy", { locale: es })
                          : "-"}
                      </TableCell>
                      <TableCell>{getClientName(invoice)}</TableCell>
                      <TableCell className="font-medium">
                        {invoice.number}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(invoice.subtotal, invoice.currency)}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(invoice.total, invoice.currency)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Badge className={statusConfig[displayStatus]?.color || "bg-gray-100"}>
                            {statusConfig[displayStatus]?.label || invoice.status}
                          </Badge>
                        </div>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <RiMoreLine className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {/* Payment actions — available when not fully paid */}
                            {(invoice.status === "sent" || invoice.status === "partial") && (
                              <>
                                <DropdownMenuItem onClick={() => openPaymentDialog(invoice)}>
                                  <RiMoneyDollarCircleLine className="mr-2 h-4 w-4" />
                                  Registrar Pago
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => generatePaymentLink(invoice)}>
                                  <RiLinkM className="mr-2 h-4 w-4" />
                                  Generar Link de Pago
                                </DropdownMenuItem>
                              </>
                            )}
                            {/* Credit note and delivery note */}
                            {(invoice.status === "sent" || invoice.status === "paid") && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => fetchDocAndOpenDrawer(invoice.id, "delivery_note")}>
                                  <RiTruckLine className="mr-2 h-4 w-4" />
                                  Convertir a Albarán
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => createCreditNote(invoice.id)}>
                                  <RiRefund2Line className="mr-2 h-4 w-4" />
                                  Crear Factura Rectificativa
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            {/* Common actions */}
                            {invoice.status !== "paid" && invoice.status !== "partial" && (
                              <DropdownMenuItem onClick={() => openEditDrawer(invoice.id)}>
                                <RiEditLine className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => openPreview(invoice.id)}>
                              <RiEyeLine className="mr-2 h-4 w-4" />
                              Vista previa
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => fetchDocAndOpenDrawer(invoice.id, "invoice")}>
                              <RiFileCopyLine className="mr-2 h-4 w-4" />
                              Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => downloadDocumentPDF(invoice.id, `invoice-${invoice.number}.pdf`)}>
                              <RiFileDownloadLine className="mr-2 h-4 w-4" />
                              Descargar PDF
                            </DropdownMenuItem>
                            {/* Delete only for sent (no payments) */}
                            {invoice.status === "sent" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => deleteInvoice(invoice.id)}
                                >
                                  <RiDeleteBinLine className="mr-2 h-4 w-4" />
                                  Eliminar
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex justify-center">
        <NumericPagination
          currentPage={page}
          totalPages={totalPages}
          onPageChange={setPage}
        />
      </div>

      {/* Document Drawer */}
      <DocumentDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) { setDrawerInitialData(undefined); setDrawerType("invoice"); }
        }}
        type={drawerType}
        documentId={editingId}
        initialData={drawerInitialData}
        onSuccess={fetchInvoices}
        onDuplicate={() => {
          setDrawerOpen(false);
          if (editingId) fetchDocAndOpenDrawer(editingId, "invoice");
        }}
        onConvert={(targetType) => {
          setDrawerOpen(false);
          if (editingId) fetchDocAndOpenDrawer(editingId, targetType as "invoice" | "delivery_note");
        }}
      />

      {/* Payment Drawer */}
      <Sheet open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Registrar Pago</SheetTitle>
            <SheetDescription>
              {paymentInvoice && `Registrar pago para factura ${paymentInvoice.number}`}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 px-4 py-4">
            <div className="space-y-2">
              <Label>Monto</Label>
              <Input
                type="number"
                step="0.01"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Método de Pago</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
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
            <div className="space-y-2">
              <Label>Referencia</Label>
              <Input
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
                placeholder="Número de transferencia, etc."
              />
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submitPayment}>Registrar Pago</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Document Preview */}
      <DocumentPreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        document={previewInvoice}
        onEdit={() => {
          setPreviewOpen(false);
          if (previewInvoice) openEditDrawer(previewInvoice.id);
        }}
      />
    </div>
  );
}
