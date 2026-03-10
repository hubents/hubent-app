"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  RiAddLine,
  RiSearchLine,
  RiArrowUpLine,
  RiArrowDownLine,
  RiMoneyDollarCircleLine,
  RiAlertLine,
  RiCalendarLine,
  RiMoreLine,
  RiEditLine,
  RiDeleteBinLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { PaymentDrawer, type EditPaymentData, type ConciliableDocument } from "@/components/finance/payment-drawer";
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
import { type ContactSelectorValue } from "@/components/finance/contact-selector";
import { DocumentPreview } from "@/components/finance/document-preview";
import { FinanceToolbar } from "@/components/finance/finance-toolbar";

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
  status?: string | null;
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
  const [editPaymentData, setEditPaymentData] = useState<EditPaymentData | null>(null);

  useEffect(() => {
    fetchPayments();
    fetchDocuments();
    fetchSchedules();
  }, [directionFilter, page]);

  useEffect(() => {
    fetchDocuments();
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
            d.status === "payment_promise" || d.status === "partial"
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
    const completed = paymentList.filter((p) => p.status !== "pending");
    const incoming = completed
      .filter((p) => p.direction === "incoming")
      .reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0);
    const outgoing = completed
      .filter((p) => p.direction === "outgoing")
      .reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0);

    const pendingIn = paymentList
      .filter((p) => p.status === "pending" && p.direction === "incoming")
      .reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0);
    const pendingOut = paymentList
      .filter((p) => p.status === "pending" && p.direction === "outgoing")
      .reduce((sum, p) => sum + parseFloat(p.amount || "0"), 0);

    // Calculate overdue from schedules
    const now = new Date();
    const overdueSchedules = schedules.filter(s => !s.isPaid && new Date(s.dueDate) < now);
    const overdueAmount = overdueSchedules.reduce((sum, s) => sum + parseFloat(s.amount || "0"), 0);

    setStats({
      totalIncoming: incoming,
      totalOutgoing: outgoing,
      pendingIncoming: pendingIn,
      pendingOutgoing: pendingOut,
      overdueAmount,
      overdueCount: overdueSchedules.length,
    });
  }

  function resetAndClose() {
    setDialogOpen(false);
    setEditPaymentData(null);
    setContactValue(null);
  }

  function handlePaymentSuccess() {
    resetAndClose();
    fetchPayments();
    fetchDocuments();
  }

  function openEditPayment(payment: Payment) {
    setEditPaymentData({
      id: payment.id,
      amount: payment.amount,
      currency: payment.currency || "EUR",
      direction: payment.direction,
      paymentMethod: payment.paymentMethod,
      reference: payment.reference,
      notes: payment.notes,
      paymentDate: payment.paymentDate,
      attachmentUrl: payment.attachmentUrl,
      attachmentName: payment.attachmentName,
      contactId: payment.contactId,
      vendorId: payment.vendorId,
      documentId: payment.documentId,
    });
    setDialogOpen(true);
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

  const formatCurrency = (amount: number | string, cur = "EUR") => {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: cur }).format(typeof amount === "string" ? parseFloat(amount || "0") : amount);
  };

  const filteredPayments = payments.filter((p) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (p.reference && p.reference.toLowerCase().includes(term)) ||
      (p.contactName && p.contactName.toLowerCase().includes(term)) ||
      (p.documentNumber && p.documentNumber.toLowerCase().includes(term)) ||
      (p.notes && p.notes.toLowerCase().includes(term))
    );
  });

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
        <Skeleton className="h-64" />
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
        <Button onClick={() => { setEditPaymentData(null); setDialogOpen(true); }}>
          <RiAddLine className="mr-2 h-4 w-4" />
          Registrar Pago
        </Button>
        <PaymentDrawer
          open={dialogOpen}
          onOpenChange={(open) => { if (!open) resetAndClose(); else setDialogOpen(true); }}
          onSuccess={handlePaymentSuccess}
          editPayment={editPaymentData}
          conciliableDocuments={documents as ConciliableDocument[]}
          showContactSelector={true}
        />
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

      <FinanceToolbar
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        searchPlaceholder="Buscar por referencia, contacto o documento..."
        directions={directionTabs}
        activeDirection={directionFilter}
        onDirectionChange={(key) => { setDirectionFilter(key as DirectionTab); setPage(1); }}
      />

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
                <TableHead>Estado</TableHead>
                <TableHead className="text-right">Monto</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
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
                    <TableCell>
                      <Badge className={payment.status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}>
                        {payment.status === "pending" ? "Pendiente" : "Completado"}
                      </Badge>
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
