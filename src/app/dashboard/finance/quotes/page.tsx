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
  RiExchangeLine,
  RiSendPlaneLine,
  RiCheckLine,
  RiCloseLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DocumentDrawer } from "@/components/finance/document-drawer";

interface Quote {
  id: number;
  type: string;
  number: string;
  status: string;
  companyId: number | null;
  personId: number | null;
  contactId: number | null;
  eventId: number | null;
  issueDate: string;
  validUntil: string | null;
  total: string;
  currency: string;
  companyName: string | null;
  personFirstName: string | null;
  personLastName: string | null;
  eventName: string | null;
}

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "Borrador", color: "bg-gray-100 text-gray-700" },
  sent: { label: "Enviado", color: "bg-blue-100 text-blue-700" },
  accepted: { label: "Aceptado", color: "bg-green-100 text-green-700" },
  rejected: { label: "Rechazado", color: "bg-red-100 text-red-700" },
  cancelled: { label: "Cancelado", color: "bg-gray-100 text-gray-500" },
};

export default function QuotesPage() {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | undefined>(undefined);

  useEffect(() => {
    fetchQuotes();
  }, [page, statusFilter]);

  async function fetchQuotes() {
    try {
      const params = new URLSearchParams({
        type: "quote",
        page: page.toString(),
        limit: "20",
      });
      if (statusFilter !== "all") {
        params.set("status", statusFilter);
      }

      const res = await fetch(`/api/finance/documents?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setQuotes(data.data || []);
          setTotalPages(data.meta?.totalPages || 1);
        }
      }
    } catch (error) {
      console.error("Failed to fetch quotes:", error);
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
        toast.error("Error al eliminar");
      }
    } catch (error) {
      toast.error("Error al eliminar");
    }
  }

  async function convertToInvoice(id: number) {
    try {
      const res = await fetch(`/api/finance/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ convertTo: "invoice" }),
      });
      if (res.ok) {
        toast.success("Convertido a factura");
        fetchQuotes();
      } else {
        toast.error("Error al convertir");
      }
    } catch (error) {
      toast.error("Error al convertir");
    }
  }

  async function duplicateQuote(id: number) {
    try {
      const res = await fetch(`/api/finance/documents/${id}/duplicate`, {
        method: "POST",
      });
      if (res.ok) {
        toast.success("Presupuesto duplicado");
        fetchQuotes();
      } else {
        toast.error("Error al duplicar");
      }
    } catch (error) {
      toast.error("Error al duplicar");
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
      } else {
        toast.error("Error al actualizar estado");
      }
    } catch (error) {
      toast.error("Error al actualizar estado");
    }
  }

  function openNewDrawer() {
    setEditingId(undefined);
    setDrawerOpen(true);
  }

  function openEditDrawer(id: number) {
    setEditingId(id);
    setDrawerOpen(true);
  }

  const formatCurrency = (amount: string, currency = "EUR") => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency,
    }).format(parseFloat(amount || "0"));
  };

  const getClientName = (quote: Quote) => {
    if (quote.companyName) return quote.companyName;
    if (quote.personFirstName) {
      return `${quote.personFirstName} ${quote.personLastName || ""}`.trim();
    }
    return "Sin cliente";
  };

  const isExpired = (validUntil: string | null) => {
    if (!validUntil) return false;
    return new Date(validUntil) < new Date();
  };

  const filteredQuotes = quotes.filter((q) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      q.number.toLowerCase().includes(search) ||
      getClientName(q).toLowerCase().includes(search)
    );
  });

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
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-44">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="sent">Enviado</SelectItem>
                <SelectItem value="accepted">Aceptado</SelectItem>
                <SelectItem value="rejected">Rechazado</SelectItem>
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
                <TableHead>Número</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Válido hasta</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuotes.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    No hay presupuestos
                  </TableCell>
                </TableRow>
              ) : (
                filteredQuotes.map((quote) => (
                  <TableRow key={quote.id}>
                    <TableCell className="font-medium">
                      <button
                        onClick={() => openEditDrawer(quote.id)}
                        className="hover:underline text-left"
                      >
                        {quote.number}
                      </button>
                    </TableCell>
                    <TableCell>{getClientName(quote)}</TableCell>
                    <TableCell>
                      {quote.issueDate
                        ? format(new Date(quote.issueDate), "dd MMM yyyy", { locale: es })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {quote.validUntil ? (
                        <span className={isExpired(quote.validUntil) ? "text-red-500" : ""}>
                          {format(new Date(quote.validUntil), "dd MMM yyyy", { locale: es })}
                          {isExpired(quote.validUntil) && " (Vencido)"}
                        </span>
                      ) : (
                        "-"
                      )}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(quote.total, quote.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge className={statusConfig[quote.status]?.color || "bg-gray-100"}>
                        {statusConfig[quote.status]?.label || quote.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <RiMoreLine className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEditDrawer(quote.id)}>
                            <RiEditLine className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => duplicateQuote(quote.id)}>
                            <RiFileCopyLine className="mr-2 h-4 w-4" />
                            Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {quote.status === "draft" && (
                            <DropdownMenuItem onClick={() => updateStatus(quote.id, "sent")}>
                              <RiSendPlaneLine className="mr-2 h-4 w-4" />
                              Marcar como Enviado
                            </DropdownMenuItem>
                          )}
                          {quote.status === "sent" && (
                            <>
                              <DropdownMenuItem onClick={() => updateStatus(quote.id, "accepted")}>
                                <RiCheckLine className="mr-2 h-4 w-4" />
                                Marcar como Aceptado
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateStatus(quote.id, "rejected")}>
                                <RiCloseLine className="mr-2 h-4 w-4" />
                                Marcar como Rechazado
                              </DropdownMenuItem>
                            </>
                          )}
                          {quote.status === "accepted" && (
                            <DropdownMenuItem onClick={() => convertToInvoice(quote.id)}>
                              <RiExchangeLine className="mr-2 h-4 w-4" />
                              Convertir a Factura
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => deleteQuote(quote.id)}
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
      {totalPages > 1 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Anterior
          </Button>
          <span className="flex items-center px-4 text-sm">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Siguiente
          </Button>
        </div>
      )}

      {/* Document Drawer */}
      <DocumentDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        type="quote"
        documentId={editingId}
        onSuccess={fetchQuotes}
      />
    </div>
  );
}
