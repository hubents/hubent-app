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
  RiMoneyDollarCircleLine,
  RiArrowLeftLine,
  RiArrowUpLine,
  RiArrowDownLine,
  RiFileDownloadLine,
  RiAddLine,
  RiMoreLine,
  RiEditLine,
  RiDeleteBinLine,
} from "@remixicon/react";
import Link from "next/link";
import { toast } from "sonner";
import { PaymentDrawer, type EditPaymentData, type ConciliableDocument } from "@/components/finance/payment-drawer";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

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
  const [editPaymentData, setEditPaymentData] = useState<EditPaymentData | null>(null);
  const [documents, setDocuments] = useState<FinancialDocument[]>([]);

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
    setEditPaymentData(null);
    setSheetOpen(true);
  }

  function openEdit(p: Payment) {
    setEditPaymentData({
      id: p.id,
      amount: p.amount,
      currency: p.currency || currency,
      direction: p.direction || "incoming",
      paymentMethod: p.paymentMethod,
      reference: p.reference,
      notes: p.notes,
      status: p.status || "complete",
      paymentDate: p.paymentDate || undefined,
      attachmentUrl: p.attachmentUrl,
      attachmentName: p.attachmentName,
    });
    setSheetOpen(true);
  }

  function handlePaymentSuccess() {
    setSheetOpen(false);
    setEditPaymentData(null);
    fetchPayments();
    fetchDocuments();
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
                  <TableHead>Estado</TableHead>
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
                    <TableCell>
                      <Badge className={p.status === "pending" ? "bg-yellow-100 text-yellow-700" : "bg-green-100 text-green-700"}>
                        {p.status === "pending" ? "Pendiente" : "Completado"}
                      </Badge>
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

      <PaymentDrawer
        open={sheetOpen}
        onOpenChange={(open) => { if (!open) { setSheetOpen(false); setEditPaymentData(null); } else setSheetOpen(true); }}
        onSuccess={handlePaymentSuccess}
        editPayment={editPaymentData}
        conciliableDocuments={documents as ConciliableDocument[]}
        showContactSelector={true}
      />
    </div>
  );
}
