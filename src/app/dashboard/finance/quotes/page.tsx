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
  RiExchangeLine,
  RiSendPlaneLine,
  RiCheckLine,
  RiCloseLine,
  RiEyeLine,
  RiCheckDoubleLine,
  RiTruckLine,
  RiFileDownloadLine,
  RiHandCoinLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DocumentDrawer } from "@/components/finance/document-drawer";
import { DocumentPreview } from "@/components/finance/document-preview";
import { NumericPagination } from "@/components/ui/numeric-pagination";
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

interface Quote {
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
  accepted: { label: "Aceptado", color: "bg-green-100 text-green-700" },
  rejected: { label: "Rechazado", color: "bg-red-100 text-red-700" },
  payment_promise: { label: "Promesa de pago", color: "bg-amber-100 text-amber-700" },
  partial: { label: "Parcial", color: "bg-purple-100 text-purple-700" },
  paid: { label: "Pagado", color: "bg-emerald-100 text-emerald-700" },
  overdue: { label: "Vencido", color: "bg-orange-100 text-orange-700" },
};

type StatusTab = "all" | "sent" | "accepted" | "rejected" | "payment_promise" | "partial";
const statusTabs: { key: StatusTab; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "sent", label: "Pendiente" },
  { key: "accepted", label: "Aceptado" },
  { key: "rejected", label: "Rechazado" },
  { key: "payment_promise", label: "Promesa de pago" },
  { key: "partial", label: "Parcial" },
];

type DirectionTab = "all" | "outgoing" | "incoming";
const directionTabs: { key: DirectionTab; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "outgoing", label: "Cobros" },
  { key: "incoming", label: "Pagos" },
];

export default function QuotesPage() {
  return (
    <Suspense>
      <QuotesContent />
    </Suspense>
  );
}

function QuotesContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [quotes, setQuotes] = useState<Quote[]>([]);
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
  const [drawerType, setDrawerType] = useState<"quote" | "invoice" | "delivery_note">("quote");
  
  // Preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewQuote, setPreviewQuote] = useState<Quote | null>(null);

  useEffect(() => {
    fetchQuotes();
  }, [page, statusFilter, directionTab]);

  useEffect(() => {
    if (searchParams.get("new") === "true") {
      openNewDrawer();
      router.replace("/dashboard/finance/quotes");
    }
  }, [searchParams]);

  async function fetchQuotes() {
    try {
      setFetchError(null);
      const params = new URLSearchParams({
        type: "quote",
        page: page.toString(),
        limit: "20",
      });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (directionTab !== "all") params.set("direction", directionTab);
      if (searchTerm) params.set("search", searchTerm);

      const res = await fetch(`/api/finance/documents?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setQuotes(data.data || []);
          setTotalPages(data.meta?.totalPages || 1);
        }
      } else {
        const data = await res.json().catch(() => null);
        const msg = data?.error?.message || `Error del servidor (${res.status})`;
        setFetchError(msg);
        toast.error(msg);
      }
    } catch (error) {
      console.error("Failed to fetch quotes:", error);
      setFetchError("No se pudo conectar con el servidor");
      toast.error("Error al cargar presupuestos");
    } finally {
      setLoading(false);
    }
  }

  async function deleteQuote(id: number) {
    if (!confirm("¿Estás seguro de eliminar este presupuesto?")) return;

    try {
      const res = await fetch(`/api/finance/documents/${id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Presupuesto eliminado");
        fetchQuotes();
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error?.message || "Error al eliminar");
      }
    } catch (error) {
      toast.error("Error al eliminar");
    }
  }

  async function fetchDocAndOpenDrawer(id: number, targetType: "quote" | "invoice" | "delivery_note") {
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

  async function updateStatus(id: number, status: string) {
    try {
      const res = await fetch(`/api/finance/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.success(`Estado actualizado a ${statusConfig[status]?.label || status}`);
        fetchQuotes();
        
        // If accepted, ask if user wants to generate invoice
        if (status === "accepted") {
          const generateInvoice = confirm("¿Deseas generar una factura a partir de este presupuesto?");
          if (generateInvoice) {
            await fetchDocAndOpenDrawer(id, "invoice");
          }
        }
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
    setDrawerType("quote");
    setDrawerOpen(true);
  }

  function openEditDrawer(id: number) {
    setEditingId(id);
    setDrawerInitialData(undefined);
    setDrawerType("quote");
    setDrawerOpen(true);
  }

  async function openPreview(id: number) {
    try {
      const res = await fetch(`/api/finance/documents/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setPreviewQuote(data.data);
          setPreviewOpen(true);
        }
      }
    } catch (error) {
      toast.error("Error al cargar documento");
    }
  }

  const formatCurrency = (amount: string, currency = "EUR") => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency,
    }).format(parseFloat(amount || "0"));
  };

  const getClientName = (quote: Quote) => {
    if (quote.contactName) return quote.contactName;
    if (quote.companyName) return quote.companyName;
    if (quote.personFirstName) {
      return `${quote.personFirstName} ${quote.personLastName || ""}`.trim();
    }
    if (quote.vendorName) return quote.vendorName;
    return "Sin cliente";
  };

  function getDisplayStatus(quote: Quote): string {
    if (quote.validUntil && quote.status !== "accepted" && quote.status !== "rejected" && quote.status !== "cancelled") {
      if (new Date(quote.validUntil) < new Date()) return "overdue";
    }
    return quote.status;
  }

  function handleSearchSubmit() {
    setPage(1);
    fetchQuotes();
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-48" />
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
          <h1 className="text-2xl font-bold">Presupuestos</h1>
          <p className="text-muted-foreground">
            Gestiona tus presupuestos y cotizaciones
          </p>
        </div>
        <Button onClick={openNewDrawer}>
          <RiAddLine className="mr-2 h-4 w-4" />
          Nuevo Presupuesto
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
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {fetchError ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="text-red-600 font-medium">{fetchError}</div>
                    <Button variant="outline" size="sm" className="mt-2" onClick={() => fetchQuotes()}>
                      Reintentar
                    </Button>
                  </TableCell>
                </TableRow>
              ) : quotes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No hay presupuestos
                  </TableCell>
                </TableRow>
              ) : (
                quotes.map((quote: Quote) => {
                  const displayStatus = getDisplayStatus(quote);
                  return (
                    <TableRow 
                      key={quote.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => openEditDrawer(quote.id)}
                    >
                      <TableCell>
                        {quote.issueDate
                          ? format(new Date(quote.issueDate), "dd MMM yyyy", { locale: es })
                          : "-"}
                      </TableCell>
                      <TableCell>{getClientName(quote)}</TableCell>
                      <TableCell className="font-medium">
                        {quote.number}
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(quote.total, quote.currency)}
                      </TableCell>
                      <TableCell>
                        <Badge className={statusConfig[displayStatus]?.color || "bg-gray-100"}>
                          {statusConfig[displayStatus]?.label || quote.status}
                        </Badge>
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <RiMoreLine className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {/* Status actions per state */}
                            {quote.status === "sent" && (
                              <>
                                <DropdownMenuItem onClick={() => updateStatus(quote.id, "accepted")}>
                                  <RiCheckLine className="mr-2 h-4 w-4" />
                                  Aceptar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateStatus(quote.id, "rejected")}>
                                  <RiCloseLine className="mr-2 h-4 w-4" />
                                  Rechazar
                                </DropdownMenuItem>
                              </>
                            )}
                            {quote.status === "accepted" && (
                              <>
                                <DropdownMenuItem onClick={() => updateStatus(quote.id, "payment_promise")}>
                                  <RiHandCoinLine className="mr-2 h-4 w-4" />
                                  Promesa de pago
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateStatus(quote.id, "sent")}>
                                  <RiSendPlaneLine className="mr-2 h-4 w-4" />
                                  Volver a Pendiente
                                </DropdownMenuItem>
                              </>
                            )}
                            {quote.status === "rejected" && (
                              <>
                                <DropdownMenuItem onClick={() => updateStatus(quote.id, "sent")}>
                                  <RiSendPlaneLine className="mr-2 h-4 w-4" />
                                  Volver a Pendiente
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateStatus(quote.id, "accepted")}>
                                  <RiCheckLine className="mr-2 h-4 w-4" />
                                  Aceptar
                                </DropdownMenuItem>
                              </>
                            )}
                            {quote.status === "payment_promise" && (
                              <>
                                <DropdownMenuItem onClick={() => updateStatus(quote.id, "accepted")}>
                                  <RiCheckLine className="mr-2 h-4 w-4" />
                                  Volver a Aceptado
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateStatus(quote.id, "sent")}>
                                  <RiSendPlaneLine className="mr-2 h-4 w-4" />
                                  Volver a Pendiente
                                </DropdownMenuItem>
                              </>
                            )}
                            {/* Convert actions */}
                            {(quote.status === "accepted" || quote.status === "payment_promise") && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => fetchDocAndOpenDrawer(quote.id, "invoice")}>
                                  <RiExchangeLine className="mr-2 h-4 w-4" />
                                  Convertir a Factura
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => fetchDocAndOpenDrawer(quote.id, "delivery_note")}>
                                  <RiTruckLine className="mr-2 h-4 w-4" />
                                  Convertir a Albarán
                                </DropdownMenuItem>
                              </>
                            )}
                            <DropdownMenuSeparator />
                            {/* Common actions */}
                            <DropdownMenuItem onClick={() => openEditDrawer(quote.id)}>
                              <RiEditLine className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openPreview(quote.id)}>
                              <RiEyeLine className="mr-2 h-4 w-4" />
                              Vista previa
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => fetchDocAndOpenDrawer(quote.id, "quote")}>
                              <RiFileCopyLine className="mr-2 h-4 w-4" />
                              Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => downloadDocumentPDF(quote.id, `quote-${quote.number}.pdf`)}>
                              <RiFileDownloadLine className="mr-2 h-4 w-4" />
                              Descargar PDF
                            </DropdownMenuItem>
                            {/* Delete only for sent/rejected */}
                            {(quote.status === "sent" || quote.status === "rejected") && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() => deleteQuote(quote.id)}
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
          if (!open) { setDrawerInitialData(undefined); setDrawerType("quote"); }
        }}
        type={drawerType}
        documentId={editingId}
        initialData={drawerInitialData}
        onSuccess={fetchQuotes}
        onDuplicate={() => {
          setDrawerOpen(false);
          if (editingId) fetchDocAndOpenDrawer(editingId, "quote");
        }}
        onConvert={(targetType) => {
          setDrawerOpen(false);
          if (editingId) fetchDocAndOpenDrawer(editingId, targetType as "quote" | "invoice" | "delivery_note");
        }}
      />

      {/* Document Preview */}
      <DocumentPreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        document={previewQuote}
        onEdit={() => {
          setPreviewOpen(false);
          if (previewQuote) openEditDrawer(previewQuote.id);
        }}
        onRefresh={fetchQuotes}
      />
    </div>
  );
}
