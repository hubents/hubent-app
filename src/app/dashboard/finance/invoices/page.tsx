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
  RiCheckLine,
  RiSendPlaneLine,
  RiMoneyDollarCircleLine,
  RiExchangeLine,
  RiRefund2Line,
  RiLinkM,
} from "@remixicon/react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DocumentDrawer } from "@/components/finance/document-drawer";
import { DocumentPreview } from "@/components/finance/document-preview";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

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
  eventId: number | null;
  issueDate: string;
  dueDate: string | null;
  validUntil: string | null;
  subtotal: string;
  taxAmount: string;
  total: string;
  paidAmount: string | null;
  currency: string;
  notes: string | null;
  termsAndConditions: string | null;
  companyName: string | null;
  personFirstName: string | null;
  personLastName: string | null;
  contactName: string | null;
  eventName: string | null;
  items: DocumentItem[];
}

const statusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "Borrador", color: "bg-gray-100 text-gray-700" },
  sent: { label: "Enviada", color: "bg-blue-100 text-blue-700" },
  accepted: { label: "Aceptada", color: "bg-green-100 text-green-700" },
  rejected: { label: "Rechazada", color: "bg-red-100 text-red-700" },
  paid: { label: "Pagada", color: "bg-emerald-100 text-emerald-700" },
  partial: { label: "Parcial", color: "bg-amber-100 text-amber-700" },
  cancelled: { label: "Cancelada", color: "bg-gray-100 text-gray-500" },
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  
  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | undefined>(undefined);
  
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
  }, [page, statusFilter]);

  async function fetchInvoices() {
    try {
      const params = new URLSearchParams({
        type: "invoice",
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
          setInvoices(data.data || []);
          setTotalPages(data.meta?.totalPages || 1);
        }
      }
    } catch (error) {
      console.error("Failed to fetch invoices:", error);
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
        toast.error("Error al eliminar");
      }
    } catch (error) {
      toast.error("Error al eliminar");
    }
  }

  async function duplicateInvoice(id: number) {
    try {
      const res = await fetch(`/api/finance/documents/${id}/duplicate`, {
        method: "POST",
      });
      if (res.ok) {
        toast.success("Factura duplicada");
        fetchInvoices();
      } else {
        toast.error("Error al duplicar");
      }
    } catch (error) {
      toast.error("Error al duplicar");
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
        
        // If marking as paid, ask if user wants to register the payment
        if (status === "paid") {
          const invoice = invoices.find(inv => inv.id === id);
          if (invoice) {
            const registerPayment = confirm(
              `¿Deseas registrar el pago de ${formatCurrency(invoice.total, invoice.currency)}?`
            );
            if (registerPayment) {
              // Create payment record
              const paymentRes = await fetch("/api/finance/payments", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  documentId: id,
                  amount: parseFloat(invoice.total),
                  currency: invoice.currency || "EUR",
                  direction: "incoming",
                  method: "bank_transfer",
                  date: new Date().toISOString(),
                  reference: `Pago ${invoice.number}`,
                }),
              });
              if (paymentRes.ok) {
                toast.success("Pago registrado correctamente");
              }
            }
          }
        }
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

  function openPaymentDialog(invoice: Invoice) {
    setPaymentInvoice(invoice);
    setPaymentAmount(invoice.total);
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
          direction: "incoming",
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
    if (invoice.companyName) return invoice.companyName;
    if (invoice.personFirstName) {
      return `${invoice.personFirstName} ${invoice.personLastName || ""}`.trim();
    }
    return "Sin cliente";
  };

  const filteredInvoices = invoices.filter((inv) => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      inv.number.toLowerCase().includes(search) ||
      getClientName(inv).toLowerCase().includes(search)
    );
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-40" />
        </div>
        <Skeleton className="h-[400px]" />
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
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="draft">Borrador</SelectItem>
                <SelectItem value="sent">Enviada</SelectItem>
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
                <TableHead>Número</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Vencimiento</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Pagado</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                    No hay facturas
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((invoice) => (
                  <TableRow 
                    key={invoice.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openPreview(invoice.id)}
                  >
                    <TableCell className="font-medium">
                      {invoice.number}
                    </TableCell>
                    <TableCell>{getClientName(invoice)}</TableCell>
                    <TableCell>
                      {invoice.issueDate
                        ? format(new Date(invoice.issueDate), "dd MMM yyyy", { locale: es })
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {invoice.dueDate
                        ? format(new Date(invoice.dueDate), "dd MMM yyyy", { locale: es })
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatCurrency(invoice.total, invoice.currency)}
                    </TableCell>
                    <TableCell className="text-right">
                      {(() => {
                        const total = parseFloat(invoice.total || "0");
                        const paid = parseFloat(invoice.paidAmount || "0");
                        const percentage = total > 0 ? Math.round((paid / total) * 100) : 0;
                        if (paid === 0) return <span className="text-muted-foreground">-</span>;
                        return (
                          <div className="flex flex-col items-end gap-1">
                            <span className={percentage >= 100 ? "text-emerald-600 font-medium" : "text-amber-600"}>
                              {formatCurrency(paid.toString(), invoice.currency)}
                            </span>
                            <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                              <div 
                                className={`h-full rounded-full ${percentage >= 100 ? "bg-emerald-500" : "bg-amber-500"}`}
                                style={{ width: `${Math.min(percentage, 100)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {(() => {
                          const total = parseFloat(invoice.total || "0");
                          const paid = parseFloat(invoice.paidAmount || "0");
                          const isPartial = paid > 0 && paid < total;
                          return (
                            <>
                              {isPartial && (
                                <Badge className={statusConfig.partial.color}>
                                  {statusConfig.partial.label}
                                </Badge>
                              )}
                              <Badge className={statusConfig[invoice.status]?.color || "bg-gray-100"}>
                                {statusConfig[invoice.status]?.label || invoice.status}
                              </Badge>
                            </>
                          );
                        })()}
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
                          <DropdownMenuItem onClick={() => openEditDrawer(invoice.id)}>
                            <RiEditLine className="mr-2 h-4 w-4" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => duplicateInvoice(invoice.id)}>
                            <RiFileCopyLine className="mr-2 h-4 w-4" />
                            Duplicar
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {invoice.status === "draft" && (
                            <DropdownMenuItem onClick={() => updateStatus(invoice.id, "sent")}>
                              <RiSendPlaneLine className="mr-2 h-4 w-4" />
                              Marcar como Enviada
                            </DropdownMenuItem>
                          )}
                          {invoice.status === "sent" && (
                            <DropdownMenuItem onClick={() => updateStatus(invoice.id, "paid")}>
                              <RiMoneyDollarCircleLine className="mr-2 h-4 w-4" />
                              Marcar como Pagada
                            </DropdownMenuItem>
                          )}
                          {(invoice.status === "sent" || invoice.status === "draft") && (
                            <DropdownMenuItem onClick={() => openPaymentDialog(invoice)}>
                              <RiMoneyDollarCircleLine className="mr-2 h-4 w-4" />
                              Añadir Pago
                            </DropdownMenuItem>
                          )}
                          {invoice.status !== "paid" && invoice.status !== "cancelled" && (
                            <DropdownMenuItem onClick={() => generatePaymentLink(invoice)}>
                              <RiLinkM className="mr-2 h-4 w-4" />
                              Generar Link de Pago
                            </DropdownMenuItem>
                          )}
                          {(invoice.status === "draft" || invoice.status === "sent") && (
                            <DropdownMenuItem onClick={() => updateStatus(invoice.id, "cancelled")}>
                              <RiCheckLine className="mr-2 h-4 w-4" />
                              Cancelar
                            </DropdownMenuItem>
                          )}
                          {(invoice.status === "sent" || invoice.status === "paid") && (
                            <DropdownMenuItem onClick={() => createCreditNote(invoice.id)}>
                              <RiRefund2Line className="mr-2 h-4 w-4" />
                              Crear Factura Rectificativa
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-red-600"
                            onClick={() => deleteInvoice(invoice.id)}
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
        type="invoice"
        documentId={editingId}
        onSuccess={fetchInvoices}
      />

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Pago</DialogTitle>
            <DialogDescription>
              {paymentInvoice && `Registrar pago para factura ${paymentInvoice.number}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
          <DialogFooter>
            <Button variant="outline" onClick={() => setPaymentDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submitPayment}>Registrar Pago</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
