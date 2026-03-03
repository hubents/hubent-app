"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  RiFileList2Line,
  RiArrowLeftLine,
  RiAddLine,
  RiMoreLine,
  RiEditLine,
  RiEyeLine,
  RiDeleteBinLine,
  RiFileDownloadLine,
  RiExchangeLine,
} from "@remixicon/react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DocumentDrawer } from "@/components/finance/document-drawer";
import { DocumentPreview } from "@/components/finance/document-preview";
import { downloadDocumentPDF } from "@/lib/pdf-download";

interface Invoice {
  id: number;
  number: string;
  contactName: string | null;
  companyName: string | null;
  vendorName: string | null;
  personFirstName: string | null;
  personLastName: string | null;
  total: string;
  paidAmount: string | null;
  status: string;
  issueDate: string;
  dueDate: string | null;
  currency: string;
  direction: string | null;
  sourceDocumentId: number | null;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "Pendiente", color: "bg-blue-100 text-blue-700" },
  sent: { label: "Pendiente", color: "bg-blue-100 text-blue-700" },
  paid: { label: "Pagada", color: "bg-emerald-100 text-emerald-700" },
  overdue: { label: "Vencida", color: "bg-orange-100 text-orange-700" },
};

type StatusTab = "all" | "sent" | "paid";
const statusTabs: { key: StatusTab; label: string }[] = [
  { key: "all", label: "Todas" },
  { key: "sent", label: "Pendiente" },
  { key: "paid", label: "Pagada" },
];

export default function VendorInvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusTab>("all");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingDocId, setEditingDocId] = useState<number | undefined>(undefined);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<any>(null);

  const fetchInvoices = useCallback(async () => {
    try {
      const params = new URLSearchParams({ type: "invoice", limit: "100" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/finance/documents?${params}`);
      const data = await res.json();
      if (data.success) {
        setInvoices(data.data || []);
      }
    } catch {
      toast.error("Error al cargar facturas");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const getClientName = (inv: Invoice) => {
    if (inv.contactName) return inv.contactName;
    if (inv.companyName) return inv.companyName;
    if (inv.personFirstName) return `${inv.personFirstName} ${inv.personLastName || ""}`.trim();
    if (inv.vendorName) return inv.vendorName;
    return "Sin cliente";
  };

  const formatCurrency = (amount: string, cur = "EUR") =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency: cur }).format(parseFloat(amount || "0"));

  function openNewInvoice() {
    setEditingDocId(undefined);
    setDrawerOpen(true);
  }

  function openEditInvoice(id: number) {
    setEditingDocId(id);
    setDrawerOpen(true);
  }

  async function openPreview(id: number) {
    try {
      const res = await fetch(`/api/finance/documents/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setPreviewDoc(data.data);
          setPreviewOpen(true);
        }
      }
    } catch {
      toast.error("Error al cargar vista previa");
    }
  }

  async function deleteInvoice(id: number) {
    if (!confirm("¿Estás seguro de eliminar esta factura?")) return;
    try {
      const res = await fetch(`/api/finance/documents/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Factura eliminada");
        fetchInvoices();
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error?.message || "Error al eliminar");
      }
    } catch {
      toast.error("Error al eliminar");
    }
  }

  function downloadPDF(id: number, number: string) {
    downloadDocumentPDF(id, `invoice-${number}.pdf`);
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
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
            <h1 className="text-2xl font-bold">Facturas</h1>
            <p className="text-muted-foreground text-sm">{invoices.length} facturas</p>
          </div>
        </div>
        <Button onClick={openNewInvoice}>
          <RiAddLine className="h-4 w-4 mr-2" />
          Nueva Factura
        </Button>
      </div>

      <div className="flex gap-1 border-b">
        {statusTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setStatusFilter(tab.key)}
            className={cn(
              "px-3 py-2 text-sm font-medium border-b-2 transition-colors -mb-px",
              statusFilter === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {invoices.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <RiFileList2Line className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No hay facturas</p>
            <Button variant="outline" className="mt-4" onClick={openNewInvoice}>
              <RiAddLine className="h-4 w-4 mr-2" />
              Crear primera factura
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
                  <TableHead>Cliente</TableHead>
                  <TableHead>Número</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Pagado</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv) => {
                  const total = parseFloat(inv.total || "0");
                  const paid = parseFloat(inv.paidAmount || "0");
                  const isPartial = paid > 0 && paid < total;
                  const st = statusConfig[isPartial ? "partial" : inv.status] || statusConfig.draft;
                  return (
                    <TableRow key={inv.id}>
                      <TableCell className="text-sm">
                        {inv.issueDate
                          ? format(new Date(inv.issueDate), "dd MMM yyyy", { locale: es })
                          : "-"}
                      </TableCell>
                      <TableCell>{getClientName(inv)}</TableCell>
                      <TableCell className="font-medium">{inv.number}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(inv.total, inv.currency)}
                      </TableCell>
                      <TableCell className="text-right text-sm">
                        {paid > 0 ? formatCurrency(inv.paidAmount || "0", inv.currency) : "-"}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Badge className={st.color}>{st.label}</Badge>
                          {inv.sourceDocumentId && (
                            <Badge variant="secondary" className="text-xs">Espejo</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <RiMoreLine className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {inv.status !== "paid" && inv.status !== "partial" && (
                              <DropdownMenuItem onClick={() => openEditInvoice(inv.id)}>
                                <RiEditLine className="mr-2 h-4 w-4" />
                                Editar
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={() => openPreview(inv.id)}>
                              <RiEyeLine className="mr-2 h-4 w-4" />
                              Vista previa
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => downloadPDF(inv.id, inv.number)}>
                              <RiFileDownloadLine className="mr-2 h-4 w-4" />
                              Descargar PDF
                            </DropdownMenuItem>
                            {(inv.status === "sent" || inv.status === "draft") && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600" onClick={() => deleteInvoice(inv.id)}>
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
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <DocumentDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        type="invoice"
        documentId={editingDocId}
        onSuccess={() => {
          setDrawerOpen(false);
          fetchInvoices();
        }}
      />

      <DocumentPreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        document={previewDoc}
        onEdit={() => {
          setPreviewOpen(false);
          if (previewDoc) openEditInvoice(previewDoc.id);
        }}
        onRefresh={fetchInvoices}
      />
    </div>
  );
}
