"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useEvent } from "@/contexts/event-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  RiAddLine,
  RiCheckLine,
  RiTimeLine,
  RiAlertLine,
  RiListCheck,
  RiCalendarLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiArrowUpLine,
  RiArrowDownLine,
  RiFileTextLine,
  RiFileList2Line,
  RiMoreLine,
  RiEditLine,
  RiEyeLine,
  RiDeleteBinLine,
  RiFileDownloadLine,
  RiExchangeLine,
  RiCloseLine,
  RiHandCoinLine,
} from "@remixicon/react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DocumentDrawer } from "@/components/finance/document-drawer";
import { DocumentPreview } from "@/components/finance/document-preview";

interface Payment {
  id: number;
  description: string;
  amount: string;
  status: string;
  dueDate: string | null;
  paidDate: string | null;
  paidTo: string | null;
  paidBy: string | null;
  vendorName: string | null;
  taskTitle: string | null;
}

interface FinanceSummary {
  budget: number;
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
}

interface FinDoc {
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
  paidAmount?: string | null;
  currency: string;
  globalDiscount: string | null;
  globalDiscountType: string | null;
  notes: string | null;
  termsAndConditions: string | null;
  contactName: string | null;
  vendorName: string | null;
  companyName: string | null;
  personFirstName: string | null;
  personLastName: string | null;
  eventName: string | null;
  sourceDocumentId?: number | null;
}

type TabKey = "quotes" | "invoices" | "payments";

const paymentStatusConfig: Record<string, { label: string; color: string; icon: typeof RiCheckLine }> = {
  paid: { label: "Pagado", color: "bg-green-100 text-green-700", icon: RiCheckLine },
  complete: { label: "Pagado", color: "bg-green-100 text-green-700", icon: RiCheckLine },
  pending: { label: "Pendiente", color: "bg-yellow-100 text-yellow-700", icon: RiTimeLine },
  overdue: { label: "Vencido", color: "bg-red-100 text-red-700", icon: RiAlertLine },
};

const quoteStatusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "Borrador", color: "bg-gray-100 text-gray-700" },
  sent: { label: "Pendiente", color: "bg-blue-100 text-blue-700" },
  accepted: { label: "Aceptado", color: "bg-green-100 text-green-700" },
  rejected: { label: "Rechazado", color: "bg-red-100 text-red-700" },
  payment_promise: { label: "Promesa de pago", color: "bg-amber-100 text-amber-700" },
  overdue: { label: "Vencido", color: "bg-orange-100 text-orange-700" },
};

const invoiceStatusConfig: Record<string, { label: string; color: string }> = {
  draft: { label: "Borrador", color: "bg-gray-100 text-gray-700" },
  sent: { label: "Pendiente", color: "bg-blue-100 text-blue-700" },
  partial: { label: "Parcial", color: "bg-amber-100 text-amber-700" },
  paid: { label: "Pagada", color: "bg-green-100 text-green-700" },
  overdue: { label: "Vencida", color: "bg-orange-100 text-orange-700" },
};

export default function EventFinancesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const eventId = parseInt(id, 10);
  const { activeEvent, setActiveEvent } = useEvent();

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabKey>("quotes");
  const [payments, setPayments] = useState<Payment[]>([]);
  const [quotes, setQuotes] = useState<FinDoc[]>([]);
  const [invoices, setInvoices] = useState<FinDoc[]>([]);
  const [summary, setSummary] = useState<FinanceSummary>({
    budget: 0,
    totalPaid: 0,
    totalPending: 0,
    totalOverdue: 0,
  });
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [currency, setCurrency] = useState("EUR");
  const [newPayment, setNewPayment] = useState({
    description: "",
    amount: "",
    dueDate: "",
    paidTo: "",
    status: "pending",
  });

  // Document drawer/preview state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingDocId, setEditingDocId] = useState<number | undefined>(undefined);
  const [drawerType, setDrawerType] = useState<"quote" | "invoice" | "delivery_note">("quote");
  const [drawerInitialData, setDrawerInitialData] = useState<any>(undefined);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<any>(null);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(amount);
  }, [currency]);

  const formatCurrencyStr = useCallback((amount: string, cur = "EUR") => {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency: cur }).format(parseFloat(amount || "0"));
  }, []);

  // --- Data fetching ---
  const fetchPayments = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/payments`);
      const data = await res.json();
      if (data.success) {
        setPayments(data.data || []);
        const paid = (data.data || [])
          .filter((p: Payment) => p.status === "paid" || p.status === "complete")
          .reduce((sum: number, p: Payment) => sum + parseFloat(p.amount), 0);
        const pending = (data.data || [])
          .filter((p: Payment) => p.status === "pending")
          .reduce((sum: number, p: Payment) => sum + parseFloat(p.amount), 0);
        const overdue = (data.data || [])
          .filter((p: Payment) => p.status === "overdue")
          .reduce((sum: number, p: Payment) => sum + parseFloat(p.amount), 0);
        setSummary((prev) => ({ ...prev, totalPaid: paid, totalPending: pending, totalOverdue: overdue }));
      }
    } catch (error) {
      console.error("Failed to fetch payments:", error);
    }
  }, [eventId]);

  const fetchDocuments = useCallback(async (type: "quote" | "invoice") => {
    try {
      const res = await fetch(`/api/finance/documents?type=${type}&eventId=${eventId}&limit=100`);
      const data = await res.json();
      if (data.success) {
        if (type === "quote") setQuotes(data.data || []);
        else setInvoices(data.data || []);
      }
    } catch (error) {
      console.error(`Failed to fetch ${type}s:`, error);
    }
  }, [eventId]);

  useEffect(() => {
    async function fetchData() {
      try {
        const settingsRes = await fetch("/api/finance/settings");
        const settingsData = await settingsRes.json();
        if (settingsData.success && settingsData.data?.defaultCurrency) {
          setCurrency(settingsData.data.defaultCurrency);
        }

        const eventRes = await fetch(`/api/events/${eventId}`);
        const eventData = await eventRes.json();
        if (eventData.success) {
          setActiveEvent(eventData.data);
          setSummary((prev) => ({ ...prev, budget: parseFloat(eventData.data.budget || "0") }));
        }

        await Promise.all([
          fetchPayments(),
          fetchDocuments("quote"),
          fetchDocuments("invoice"),
        ]);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [eventId, setActiveEvent, fetchPayments, fetchDocuments]);

  // --- Document actions ---
  function openNewDoc(type: "quote" | "invoice") {
    setEditingDocId(undefined);
    setDrawerInitialData({ eventId });
    setDrawerType(type);
    setDrawerOpen(true);
  }

  function openEditDoc(docId: number, type: "quote" | "invoice") {
    setEditingDocId(docId);
    setDrawerInitialData(undefined);
    setDrawerType(type);
    setDrawerOpen(true);
  }

  async function openPreview(docId: number) {
    try {
      const res = await fetch(`/api/finance/documents/${docId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          setPreviewDoc(data.data);
          setPreviewOpen(true);
        }
      }
    } catch {
      toast.error("Error al cargar documento");
    }
  }

  async function updateDocStatus(docId: number, status: string, type: "quote" | "invoice") {
    try {
      const res = await fetch(`/api/finance/documents/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        const statusLabel = type === "quote"
          ? quoteStatusConfig[status]?.label
          : invoiceStatusConfig[status]?.label;
        toast.success(`Estado actualizado a ${statusLabel || status}`);
        fetchDocuments(type);
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error?.message || "Error al actualizar estado");
      }
    } catch {
      toast.error("Error al actualizar estado");
    }
  }

  async function deleteDoc(docId: number, type: "quote" | "invoice") {
    if (!confirm(`¿Estás seguro de eliminar este ${type === "quote" ? "presupuesto" : "factura"}?`)) return;
    try {
      const res = await fetch(`/api/finance/documents/${docId}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Documento eliminado");
        fetchDocuments(type);
      } else {
        const data = await res.json().catch(() => null);
        toast.error(data?.error?.message || "Error al eliminar");
      }
    } catch {
      toast.error("Error al eliminar");
    }
  }

  async function fetchDocAndConvert(docId: number, targetType: "quote" | "invoice" | "delivery_note") {
    try {
      const res = await fetch(`/api/finance/documents/${docId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          const doc = data.data;
          setDrawerInitialData({
            contactId: doc.contactId,
            vendorId: doc.vendorId,
            eventId: doc.eventId || eventId,
            notes: doc.notes,
            termsAndConditions: doc.termsAndConditions,
            globalDiscount: parseFloat(doc.globalDiscount || "0") || undefined,
            globalDiscountType: doc.globalDiscountType,
            paymentMethod: doc.paymentMethod,
            bankAccountId: doc.bankAccountId,
            items: doc.items?.map((item: any) => ({
              description: item.description,
              quantity: parseFloat(item.quantity),
              unitPrice: parseFloat(item.unitPrice),
              discount: parseFloat(item.discount || "0"),
              taxRate: parseFloat(item.taxRate || "21"),
              total: parseFloat(item.total),
            })),
          });
          setDrawerType(targetType);
          setEditingDocId(undefined);
          setDrawerOpen(true);
        }
      }
    } catch {
      toast.error("Error al cargar documento");
    }
  }

  function getClientName(doc: FinDoc) {
    if (doc.contactName) return doc.contactName;
    if (doc.companyName) return doc.companyName;
    if (doc.personFirstName) return `${doc.personFirstName} ${doc.personLastName || ""}`.trim();
    if (doc.vendorName) return doc.vendorName;
    return "—";
  }

  // --- Payment actions ---
  const handleAddPayment = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPayment),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Pago añadido");
        setShowAddPayment(false);
        setNewPayment({ description: "", amount: "", dueDate: "", paidTo: "", status: "pending" });
        fetchPayments();
      } else {
        toast.error(data?.error?.message || "Error al añadir pago");
      }
    } catch {
      toast.error("Error al añadir pago");
    }
  };

  // --- Calendar helpers ---
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    return { daysInMonth: lastDay.getDate(), startingDay: firstDay.getDay() };
  };

  const getPaymentsForDay = (day: number) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    return payments.filter((p) => {
      if (!p.dueDate) return false;
      const d = new Date(p.dueDate);
      return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day;
    });
  };

  // --- Derived values ---
  const totalSpent = summary.totalPaid + summary.totalPending + summary.totalOverdue;
  const budgetUsedPercent = summary.budget > 0 ? Math.round((totalSpent / summary.budget) * 100) : 0;
  const remaining = summary.budget - totalSpent;
  const { daysInMonth, startingDay } = getDaysInMonth(currentMonth);
  const calendarDays = Array.from({ length: 42 }, (_, i) => {
    const day = i - startingDay + 1;
    return day > 0 && day <= daysInMonth ? day : null;
  });

  const tabs: { key: TabKey; label: string; icon: typeof RiFileTextLine; count: number }[] = [
    { key: "quotes", label: "Presupuestos", icon: RiFileTextLine, count: quotes.length },
    { key: "invoices", label: "Facturas", icon: RiFileList2Line, count: invoices.length },
    { key: "payments", label: "Pagos", icon: RiMoneyDollarCircleLine, count: payments.length },
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  // --- Render helpers ---
  function renderDocTable(docs: FinDoc[], type: "quote" | "invoice") {
    const statusCfg = type === "quote" ? quoteStatusConfig : invoiceStatusConfig;

    if (docs.length === 0) {
      const Icon = type === "quote" ? RiFileTextLine : RiFileList2Line;
      const label = type === "quote" ? "presupuestos" : "facturas";
      return (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Icon className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="font-medium">Sin {label} aún</p>
            <p className="text-sm mt-1">Crea uno para empezar a gestionar las finanzas del evento.</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fecha</TableHead>
                <TableHead>Cliente / Proveedor</TableHead>
                <TableHead>Número</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {docs.map((doc) => {
                const st = statusCfg[doc.status] || statusCfg.draft || { label: doc.status, color: "bg-gray-100 text-gray-700" };
                const isIncoming = doc.direction === "incoming";
                return (
                  <TableRow
                    key={doc.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => openEditDoc(doc.id, type)}
                  >
                    <TableCell className="text-sm">
                      {doc.issueDate
                        ? format(new Date(doc.issueDate), "dd MMM yyyy", { locale: es })
                        : "—"}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{getClientName(doc)}</span>
                        {isIncoming && (
                          <Badge variant="outline" className="text-xs">Recibido</Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium text-sm">{doc.number}</TableCell>
                    <TableCell className="text-right font-semibold text-sm">
                      {formatCurrencyStr(doc.total, doc.currency)}
                    </TableCell>
                    <TableCell>
                      <Badge className={st.color}>{st.label}</Badge>
                    </TableCell>
                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <RiMoreLine className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {type === "quote" && (
                            <>
                              {doc.status === "sent" && (
                                <>
                                  <DropdownMenuItem onClick={() => updateDocStatus(doc.id, "accepted", type)}>
                                    <RiCheckLine className="mr-2 h-4 w-4" /> Aceptar
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => updateDocStatus(doc.id, "rejected", type)}>
                                    <RiCloseLine className="mr-2 h-4 w-4" /> Rechazar
                                  </DropdownMenuItem>
                                </>
                              )}
                              {doc.status === "accepted" && (
                                <>
                                  <DropdownMenuItem onClick={() => updateDocStatus(doc.id, "payment_promise", type)}>
                                    <RiHandCoinLine className="mr-2 h-4 w-4" /> Promesa de pago
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => fetchDocAndConvert(doc.id, "invoice")}>
                                    <RiExchangeLine className="mr-2 h-4 w-4" /> Convertir a Factura
                                  </DropdownMenuItem>
                                </>
                              )}
                              {doc.status === "payment_promise" && (
                                <DropdownMenuItem onClick={() => fetchDocAndConvert(doc.id, "invoice")}>
                                  <RiExchangeLine className="mr-2 h-4 w-4" /> Convertir a Factura
                                </DropdownMenuItem>
                              )}
                            </>
                          )}
                          {type === "invoice" && (
                            <>
                              {doc.status === "sent" && (
                                <DropdownMenuItem onClick={() => updateDocStatus(doc.id, "paid", type)}>
                                  <RiCheckLine className="mr-2 h-4 w-4" /> Marcar como Pagada
                                </DropdownMenuItem>
                              )}
                              {doc.status === "partial" && (
                                <DropdownMenuItem onClick={() => updateDocStatus(doc.id, "paid", type)}>
                                  <RiCheckLine className="mr-2 h-4 w-4" /> Marcar como Pagada
                                </DropdownMenuItem>
                              )}
                            </>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => openEditDoc(doc.id, type)}>
                            <RiEditLine className="mr-2 h-4 w-4" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => openPreview(doc.id)}>
                            <RiEyeLine className="mr-2 h-4 w-4" /> Vista previa
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => window.open(`/api/finance/documents/${doc.id}/pdf`, "_blank")}>
                            <RiFileDownloadLine className="mr-2 h-4 w-4" /> Descargar PDF
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600" onClick={() => deleteDoc(doc.id, type)}>
                            <RiDeleteBinLine className="mr-2 h-4 w-4" /> Eliminar
                          </DropdownMenuItem>
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
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <h1 className="text-2xl font-bold">Finanzas</h1>
        <div className="flex items-center gap-2">
          {activeTab === "quotes" && (
            <Button onClick={() => openNewDoc("quote")}>
              <RiAddLine className="mr-2 h-4 w-4" /> Nuevo Presupuesto
            </Button>
          )}
          {activeTab === "invoices" && (
            <Button onClick={() => openNewDoc("invoice")}>
              <RiAddLine className="mr-2 h-4 w-4" /> Nueva Factura
            </Button>
          )}
          {activeTab === "payments" && (
            <Button onClick={() => setShowAddPayment(true)}>
              <RiAddLine className="mr-2 h-4 w-4" /> Añadir pago
            </Button>
          )}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Presupuesto</p>
                <p className="text-2xl font-bold">{formatCurrency(summary.budget)}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <RiMoneyDollarCircleLine className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600">Pagado</p>
                <p className="text-2xl font-bold text-green-700">{formatCurrency(summary.totalPaid)}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                <RiCheckLine className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-yellow-600">Pendiente</p>
                <p className="text-2xl font-bold text-yellow-700">{formatCurrency(summary.totalPending)}</p>
              </div>
              <div className="h-10 w-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <RiTimeLine className="h-5 w-5 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className={cn(remaining < 0 ? "border-red-200" : "border-gray-200")}>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Disponible</p>
                <p className={cn("text-2xl font-bold", remaining < 0 ? "text-red-600" : "text-gray-900")}>
                  {formatCurrency(remaining)}
                </p>
              </div>
              <div className={cn(
                "h-10 w-10 rounded-lg flex items-center justify-center",
                remaining < 0 ? "bg-red-100" : "bg-gray-100"
              )}>
                {remaining < 0 ? (
                  <RiArrowDownLine className="h-5 w-5 text-red-600" />
                ) : (
                  <RiArrowUpLine className="h-5 w-5 text-gray-600" />
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Budget Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Uso del Presupuesto</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between text-sm">
            <span>Gastado: {formatCurrency(totalSpent)} de {formatCurrency(summary.budget)}</span>
            <span className={cn(budgetUsedPercent > 100 ? "text-red-600" : "")}>
              {budgetUsedPercent}%
            </span>
          </div>
          <Progress
            value={Math.min(budgetUsedPercent, 100)}
            className={cn("h-3", budgetUsedPercent > 100 && "[&>div]:bg-red-500")}
          />
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-green-500" />
              <span>Pagado ({Math.round((summary.totalPaid / (totalSpent || 1)) * 100)}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full bg-yellow-500" />
              <span>Pendiente ({Math.round((summary.totalPending / (totalSpent || 1)) * 100)}%)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px",
              activeTab === tab.key
                ? "border-primary text-primary"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
            {tab.count > 0 && (
              <Badge variant="secondary" className="text-xs ml-1">{tab.count}</Badge>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === "quotes" && renderDocTable(quotes, "quote")}
      {activeTab === "invoices" && renderDocTable(invoices, "invoice")}

      {activeTab === "payments" && (
        <>
          {/* View Toggle */}
          <div className="flex justify-end">
            <div className="flex items-center border rounded-lg overflow-hidden">
              <button
                onClick={() => setViewMode("list")}
                className={cn("p-2 transition-colors", viewMode === "list" ? "bg-primary text-white" : "hover:bg-muted")}
              >
                <RiListCheck className="h-5 w-5" />
              </button>
              <button
                onClick={() => setViewMode("calendar")}
                className={cn("p-2 transition-colors", viewMode === "calendar" ? "bg-primary text-white" : "hover:bg-muted")}
              >
                <RiCalendarLine className="h-5 w-5" />
              </button>
            </div>
          </div>

          {viewMode === "list" ? (
            <Card>
              <CardContent className="p-0">
                {payments.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted/50">
                        <tr className="text-left text-sm">
                          <th className="p-4 font-medium">Concepto</th>
                          <th className="p-4 font-medium">Fecha</th>
                          <th className="p-4 font-medium">Estado</th>
                          <th className="p-4 font-medium">Pagado a</th>
                          <th className="p-4 font-medium text-right">Monto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {payments.map((payment) => {
                          const status = paymentStatusConfig[payment.status] || paymentStatusConfig.pending;
                          return (
                            <tr key={payment.id} className="hover:bg-muted/30">
                              <td className="p-4">
                                <p className="font-medium">{payment.description}</p>
                                {payment.taskTitle && (
                                  <p className="text-xs text-muted-foreground">{payment.taskTitle}</p>
                                )}
                              </td>
                              <td className="p-4 text-sm">
                                {payment.dueDate
                                  ? new Date(payment.dueDate).toLocaleDateString("es-ES")
                                  : payment.paidDate
                                    ? new Date(payment.paidDate).toLocaleDateString("es-ES")
                                    : "—"}
                              </td>
                              <td className="p-4">
                                <Badge className={status.color}>{status.label}</Badge>
                              </td>
                              <td className="p-4 text-sm">{payment.paidTo || payment.vendorName || "—"}</td>
                              <td className="p-4 text-right font-semibold">
                                {formatCurrency(parseFloat(payment.amount))}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <RiMoneyDollarCircleLine className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="font-medium">Sin pagos aún</p>
                    <p className="text-sm mt-1">Añade un pago para empezar.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}>
                      <RiArrowLeftSLine className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="icon" onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}>
                      <RiArrowRightSLine className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date())}>Hoy</Button>
                  </div>
                  <h3 className="text-lg font-medium">
                    {currentMonth.toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
                  </h3>
                </div>
                <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
                  {["dom", "lun", "mar", "mié", "jue", "vie", "sáb"].map((day) => (
                    <div key={day} className="bg-muted p-2 text-center text-sm font-medium text-muted-foreground">{day}</div>
                  ))}
                  {calendarDays.map((day, index) => {
                    const dayPayments = day ? getPaymentsForDay(day) : [];
                    const isToday = day === new Date().getDate() && currentMonth.getMonth() === new Date().getMonth() && currentMonth.getFullYear() === new Date().getFullYear();
                    return (
                      <div key={index} className={cn("bg-card min-h-20 p-1", !day && "bg-muted/30")}>
                        {day && (
                          <>
                            <span className={cn("inline-flex h-6 w-6 items-center justify-center rounded-full text-sm", isToday && "bg-primary text-white")}>{day}</span>
                            <div className="mt-1 space-y-1">
                              {dayPayments.slice(0, 2).map((p) => (
                                <div key={p.id} className={cn("text-xs p-1 rounded truncate", p.status === "paid" && "bg-green-100 text-green-700", p.status === "pending" && "bg-yellow-100 text-yellow-700", p.status === "overdue" && "bg-red-100 text-red-700")}>
                                  {formatCurrency(parseFloat(p.amount))}
                                </div>
                              ))}
                              {dayPayments.length > 2 && <div className="text-xs text-muted-foreground">+{dayPayments.length - 2} más</div>}
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* Add Payment Drawer */}
      <Sheet open={showAddPayment} onOpenChange={setShowAddPayment}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Añadir pago</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 px-4 py-4">
            <div className="space-y-2">
              <Label>Concepto *</Label>
              <Input
                value={newPayment.description}
                onChange={(e) => setNewPayment({ ...newPayment, description: e.target.value })}
                placeholder="Ej: Seña del salón"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Monto *</Label>
                <Input
                  type="number"
                  value={newPayment.amount}
                  onChange={(e) => setNewPayment({ ...newPayment, amount: e.target.value })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Fecha de vencimiento</Label>
                <Input
                  type="date"
                  value={newPayment.dueDate}
                  onChange={(e) => setNewPayment({ ...newPayment, dueDate: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Pagado a</Label>
                <Input
                  value={newPayment.paidTo}
                  onChange={(e) => setNewPayment({ ...newPayment, paidTo: e.target.value })}
                  placeholder="Nombre del proveedor"
                />
              </div>
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select
                  value={newPayment.status}
                  onValueChange={(value) => setNewPayment({ ...newPayment, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pendiente</SelectItem>
                    <SelectItem value="paid">Pagado</SelectItem>
                    <SelectItem value="overdue">Vencido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowAddPayment(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddPayment} disabled={!newPayment.description || !newPayment.amount}>
                Añadir pago
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Document Drawer */}
      <DocumentDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) { setDrawerInitialData(undefined); setEditingDocId(undefined); }
        }}
        type={drawerType}
        documentId={editingDocId}
        initialData={drawerInitialData}
        onSuccess={() => {
          fetchDocuments("quote");
          fetchDocuments("invoice");
        }}
        onDuplicate={() => {
          setDrawerOpen(false);
          if (editingDocId) fetchDocAndConvert(editingDocId, drawerType);
        }}
        onConvert={(targetType) => {
          setDrawerOpen(false);
          if (editingDocId) fetchDocAndConvert(editingDocId, targetType as "quote" | "invoice" | "delivery_note");
        }}
      />

      {/* Document Preview */}
      <DocumentPreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        document={previewDoc}
        onEdit={() => {
          setPreviewOpen(false);
          if (previewDoc) openEditDoc(previewDoc.id, previewDoc.type === "invoice" ? "invoice" : "quote");
        }}
        onRefresh={() => {
          fetchDocuments("quote");
          fetchDocuments("invoice");
        }}
      />
    </div>
  );
}
