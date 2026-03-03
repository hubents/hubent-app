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
  RiFileTextLine,
  RiArrowLeftLine,
  RiAddLine,
  RiMoreLine,
  RiEditLine,
  RiEyeLine,
  RiDeleteBinLine,
  RiFileDownloadLine,
  RiCheckLine,
  RiCloseLine,
  RiHandCoinLine,
  RiSendPlaneLine,
  RiExchangeLine,
} from "@remixicon/react";
import Link from "next/link";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { DocumentDrawer } from "@/components/finance/document-drawer";
import { DocumentPreview } from "@/components/finance/document-preview";

interface Quote {
  id: number;
  number: string;
  contactName: string | null;
  companyName: string | null;
  vendorName: string | null;
  personFirstName: string | null;
  personLastName: string | null;
  total: string;
  status: string;
  issueDate: string;
  currency: string;
  direction: string | null;
  sourceDocumentId: number | null;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "Borrador", color: "bg-gray-100 text-gray-700" },
  sent: { label: "Pendiente", color: "bg-blue-100 text-blue-700" },
  accepted: { label: "Aceptado", color: "bg-green-100 text-green-700" },
  rejected: { label: "Rechazado", color: "bg-red-100 text-red-700" },
  payment_promise: { label: "Promesa de pago", color: "bg-amber-100 text-amber-700" },
};

type StatusTab = "all" | "sent" | "accepted" | "rejected" | "payment_promise";
const statusTabs: { key: StatusTab; label: string }[] = [
  { key: "all", label: "Todos" },
  { key: "sent", label: "Pendiente" },
  { key: "accepted", label: "Aceptado" },
  { key: "rejected", label: "Rechazado" },
  { key: "payment_promise", label: "Promesa" },
];

export default function VendorQuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<StatusTab>("all");

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingDocId, setEditingDocId] = useState<number | undefined>(undefined);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<any>(null);

  const fetchQuotes = useCallback(async () => {
    try {
      const params = new URLSearchParams({ type: "quote", limit: "100" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      const res = await fetch(`/api/finance/documents?${params}`);
      const data = await res.json();
      if (data.success) {
        setQuotes(data.data || []);
      }
    } catch {
      toast.error("Error al cargar presupuestos");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    fetchQuotes();
  }, [fetchQuotes]);

  const getClientName = (q: Quote) => {
    if (q.contactName) return q.contactName;
    if (q.companyName) return q.companyName;
    if (q.personFirstName) return `${q.personFirstName} ${q.personLastName || ""}`.trim();
    if (q.vendorName) return q.vendorName;
    return "Sin cliente";
  };

  const formatCurrency = (amount: string, cur = "EUR") =>
    new Intl.NumberFormat("es-ES", { style: "currency", currency: cur }).format(parseFloat(amount || "0"));

  function openNewQuote() {
    setEditingDocId(undefined);
    setDrawerOpen(true);
  }

  function openEditQuote(id: number) {
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

  async function updateStatus(id: number, status: string) {
    try {
      const res = await fetch(`/api/finance/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.success("Estado actualizado");
        fetchQuotes();
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error?.message || "Error al actualizar estado");
      }
    } catch {
      toast.error("Error al actualizar estado");
    }
  }

  async function deleteQuote(id: number) {
    if (!confirm("¿Estás seguro de eliminar este presupuesto?")) return;
    try {
      const res = await fetch(`/api/finance/documents/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Presupuesto eliminado");
        fetchQuotes();
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error?.message || "Error al eliminar");
      }
    } catch {
      toast.error("Error al eliminar");
    }
  }

  async function downloadPDF(id: number, number: string) {
    try {
      const res = await fetch(`/api/finance/documents/${id}/pdf`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `quote-${number}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(`/api/finance/documents/${id}/pdf`, "_blank");
    }
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
            <h1 className="text-2xl font-bold">Presupuestos</h1>
            <p className="text-muted-foreground text-sm">{quotes.length} presupuestos</p>
          </div>
        </div>
        <Button onClick={openNewQuote}>
          <RiAddLine className="h-4 w-4 mr-2" />
          Nuevo Presupuesto
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

      {quotes.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <RiFileTextLine className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
            <p className="text-muted-foreground">No hay presupuestos</p>
            <Button variant="outline" className="mt-4" onClick={openNewQuote}>
              <RiAddLine className="h-4 w-4 mr-2" />
              Crear primer presupuesto
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
                  <TableHead>Estado</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quotes.map((q) => {
                  const st = statusConfig[q.status] || statusConfig.draft;
                  return (
                    <TableRow key={q.id}>
                      <TableCell className="text-sm">
                        {q.issueDate
                          ? format(new Date(q.issueDate), "dd MMM yyyy", { locale: es })
                          : "-"}
                      </TableCell>
                      <TableCell>{getClientName(q)}</TableCell>
                      <TableCell className="font-medium">{q.number}</TableCell>
                      <TableCell className="text-right font-medium">
                        {formatCurrency(q.total, q.currency)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Badge className={st.color}>{st.label}</Badge>
                          {q.sourceDocumentId && (
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
                            {q.status === "sent" && (
                              <>
                                <DropdownMenuItem onClick={() => updateStatus(q.id, "accepted")}>
                                  <RiCheckLine className="mr-2 h-4 w-4" />
                                  Aceptar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateStatus(q.id, "rejected")}>
                                  <RiCloseLine className="mr-2 h-4 w-4" />
                                  Rechazar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            {q.status === "accepted" && (
                              <>
                                <DropdownMenuItem onClick={() => updateStatus(q.id, "payment_promise")}>
                                  <RiHandCoinLine className="mr-2 h-4 w-4" />
                                  Promesa de pago
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateStatus(q.id, "sent")}>
                                  <RiSendPlaneLine className="mr-2 h-4 w-4" />
                                  Volver a Pendiente
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            {q.status === "rejected" && (
                              <>
                                <DropdownMenuItem onClick={() => updateStatus(q.id, "sent")}>
                                  <RiSendPlaneLine className="mr-2 h-4 w-4" />
                                  Volver a Pendiente
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateStatus(q.id, "accepted")}>
                                  <RiCheckLine className="mr-2 h-4 w-4" />
                                  Aceptar
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            {q.status === "payment_promise" && (
                              <>
                                <DropdownMenuItem onClick={() => updateStatus(q.id, "accepted")}>
                                  <RiCheckLine className="mr-2 h-4 w-4" />
                                  Aceptar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => updateStatus(q.id, "sent")}>
                                  <RiSendPlaneLine className="mr-2 h-4 w-4" />
                                  Volver a Pendiente
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <DropdownMenuItem onClick={() => openEditQuote(q.id)}>
                              <RiEditLine className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openPreview(q.id)}>
                              <RiEyeLine className="mr-2 h-4 w-4" />
                              Vista previa
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => downloadPDF(q.id, q.number)}>
                              <RiFileDownloadLine className="mr-2 h-4 w-4" />
                              Descargar PDF
                            </DropdownMenuItem>
                            {(q.status === "sent" || q.status === "rejected" || q.status === "draft") && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem className="text-red-600" onClick={() => deleteQuote(q.id)}>
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
        type="quote"
        documentId={editingDocId}
        onSuccess={() => {
          setDrawerOpen(false);
          fetchQuotes();
        }}
      />

      <DocumentPreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        document={previewDoc}
        onEdit={() => {
          setPreviewOpen(false);
          if (previewDoc) openEditQuote(previewDoc.id);
        }}
        onRefresh={fetchQuotes}
      />
    </div>
  );
}
