"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  RiSendPlaneLine,
  RiCheckLine,
  RiEyeLine,
  RiCheckDoubleLine,
  RiExchangeLine,
  RiMoneyDollarCircleLine,
  RiTruckLine,
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

interface Proforma {
  id: number;
  type: string;
  number: string;
  status: string;
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
  contactName: string | null;
  companyName: string | null;
  personFirstName: string | null;
  personLastName: string | null;
  eventName: string | null;
  items: DocumentItem[];
}

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "Borrador", color: "bg-gray-100 text-gray-700" },
  approved: { label: "Aprobada", color: "bg-indigo-100 text-indigo-700" },
  sent: { label: "Pendiente", color: "bg-blue-100 text-blue-700" },
  paid: { label: "Pagada", color: "bg-emerald-100 text-emerald-700" },
  cancelled: { label: "Cancelada", color: "bg-gray-100 text-gray-500" },
};

type DirectionTab = "all" | "outgoing" | "incoming";
const directionTabs: { key: DirectionTab; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "outgoing", label: "Cobros" },
  { key: "incoming", label: "Pagos" },
];

export default function ProformasPage() {
  const [proformas, setProformas] = useState<Proforma[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [directionTab, setDirectionTab] = useState<DirectionTab>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | undefined>(undefined);
  const [drawerInitialData, setDrawerInitialData] = useState<any>(undefined);
  const [drawerType, setDrawerType] = useState<"proforma" | "invoice" | "delivery_note">("proforma");

  // Preview state
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<Proforma | null>(null);

  useEffect(() => {
    fetchProformas();
  }, [page, statusFilter, directionTab]);

  async function fetchProformas() {
    try {
      const params = new URLSearchParams({
        type: "proforma",
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
          setProformas(data.data || []);
          setTotalPages(data.meta?.totalPages || 1);
        }
      }
    } catch (error) {
      console.error("Failed to fetch proformas:", error);
      toast.error("Error al cargar proformas");
    } finally {
      setLoading(false);
    }
  }

  async function deleteProforma(id: number) {
    if (!confirm("¿Estás seguro de eliminar esta proforma?")) return;
    try {
      const res = await fetch(`/api/finance/documents/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Proforma eliminada");
        fetchProformas();
      } else {
        toast.error("Error al eliminar");
      }
    } catch (error) {
      toast.error("Error al eliminar");
    }
  }

  async function fetchDocAndOpenDrawer(id: number, targetType: "proforma" | "invoice" | "delivery_note") {
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
        fetchProformas();
      } else {
        toast.error("Error al actualizar estado");
      }
    } catch (error) {
      toast.error("Error al actualizar estado");
    }
  }

  function openNewDrawer() {
    setEditingId(undefined);
    setDrawerInitialData(undefined);
    setDrawerType("proforma");
    setDrawerOpen(true);
  }

  function openEditDrawer(id: number) {
    setEditingId(id);
    setDrawerInitialData(undefined);
    setDrawerType("proforma");
    setDrawerOpen(true);
  }

  async function openPreview(id: number) {
    try {
      const res = await fetch(`/api/finance/documents/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setPreviewDoc(data.data);
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

  const getClientName = (doc: Proforma) => {
    if (doc.contactName) return doc.contactName;
    if (doc.companyName) return doc.companyName;
    if (doc.personFirstName) {
      return `${doc.personFirstName} ${doc.personLastName || ""}`.trim();
    }
    return "Sin cliente";
  };

  function handleSearchSubmit() {
    setPage(1);
    fetchProformas();
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
          <h1 className="text-2xl font-bold">Proformas</h1>
          <p className="text-muted-foreground">
            Facturas proforma para anticipos y presupuestos formales
          </p>
        </div>
        <Button onClick={openNewDrawer}>
          <RiAddLine className="mr-2 h-4 w-4" />
          Nueva Proforma
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
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="approved">Aprobada</SelectItem>
                <SelectItem value="sent">Pendiente</SelectItem>
                <SelectItem value="paid">Pagada</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
              </SelectContent>
            </Select>
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
              {proformas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    No hay proformas
                  </TableCell>
                </TableRow>
              ) : (
                proformas.map((doc: Proforma) => (
                  <TableRow
                    key={doc.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openEditDrawer(doc.id)}
                  >
                    <TableCell>
                      {doc.issueDate
                        ? format(new Date(doc.issueDate), "dd MMM yyyy", { locale: es })
                        : "-"}
                    </TableCell>
                    <TableCell>{getClientName(doc)}</TableCell>
                    <TableCell className="font-medium">{doc.number}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(doc.total, doc.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusConfig[doc.status]?.color || "bg-gray-100"}>
                        {statusConfig[doc.status]?.label || doc.status}
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
                          <DropdownMenuItem onClick={() => openEditDrawer(doc.id)}>
                            <RiEditLine className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openPreview(doc.id)}>
                            <RiEyeLine className="mr-2 h-4 w-4" />
                            Vista previa
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => fetchDocAndOpenDrawer(doc.id, "proforma")}>
                            <RiFileCopyLine className="mr-2 h-4 w-4" />
                            Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {doc.status === "draft" && (
                            <>
                              <DropdownMenuItem onClick={() => updateStatus(doc.id, "approved")}>
                                <RiCheckDoubleLine className="mr-2 h-4 w-4" />
                                Aprobar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateStatus(doc.id, "sent")}>
                                <RiSendPlaneLine className="mr-2 h-4 w-4" />
                                Marcar como Pendiente
                              </DropdownMenuItem>
                            </>
                          )}
                          {doc.status === "approved" && (
                            <DropdownMenuItem onClick={() => updateStatus(doc.id, "sent")}>
                              <RiSendPlaneLine className="mr-2 h-4 w-4" />
                              Marcar como Pendiente
                            </DropdownMenuItem>
                          )}
                          {doc.status === "sent" && (
                            <DropdownMenuItem onClick={() => updateStatus(doc.id, "paid")}>
                              <RiMoneyDollarCircleLine className="mr-2 h-4 w-4" />
                              Marcar como Pagada
                            </DropdownMenuItem>
                          )}
                          {(doc.status === "sent" || doc.status === "paid") && (
                            <DropdownMenuItem onClick={() => fetchDocAndOpenDrawer(doc.id, "invoice")}>
                              <RiExchangeLine className="mr-2 h-4 w-4" />
                              Convertir a Factura
                            </DropdownMenuItem>
                          )}
                          {(doc.status === "sent" || doc.status === "paid") && (
                            <DropdownMenuItem onClick={() => fetchDocAndOpenDrawer(doc.id, "delivery_note")}>
                              <RiTruckLine className="mr-2 h-4 w-4" />
                              Convertir a Albarán
                            </DropdownMenuItem>
                          )}
                          {doc.status !== "paid" && doc.status !== "cancelled" && (
                            <DropdownMenuItem onClick={() => updateStatus(doc.id, "cancelled")}>
                              <RiCheckLine className="mr-2 h-4 w-4" />
                              Cancelar
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => deleteProforma(doc.id)}
                          >
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
          if (!open) { setDrawerInitialData(undefined); setDrawerType("proforma"); }
        }}
        type={drawerType}
        documentId={editingId}
        initialData={drawerInitialData}
        onSuccess={fetchProformas}
        onDuplicate={() => {
          setDrawerOpen(false);
          if (editingId) fetchDocAndOpenDrawer(editingId, "proforma");
        }}
        onConvert={(targetType) => {
          setDrawerOpen(false);
          if (editingId) fetchDocAndOpenDrawer(editingId, targetType as "proforma" | "invoice" | "delivery_note");
        }}
      />

      {/* Document Preview */}
      <DocumentPreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        document={previewDoc}
        onEdit={() => {
          setPreviewOpen(false);
          if (previewDoc) openEditDrawer(previewDoc.id);
        }}
        onRefresh={fetchProformas}
      />
    </div>
  );
}
