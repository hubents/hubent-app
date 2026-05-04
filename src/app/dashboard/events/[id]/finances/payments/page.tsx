"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useEvent } from "@/contexts/event-context";
import { useOrgCurrency } from "@/hooks/use-org-currency";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
  RiListCheck,
  RiCalendarLine,
  RiArrowLeftSLine,
  RiArrowRightSLine,
  RiMoreLine,
  RiEditLine,
  RiDeleteBinLine,
  RiFileDownloadLine,
} from "@remixicon/react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { PaymentDrawer, type EditPaymentData, type ConciliableDocument } from "@/components/finance/payment-drawer";
import { useUserSessionContext } from "@/contexts/user-session-context";
import { useEventPermissions } from "@/hooks/use-event-permissions";
import { EventSectionGuard } from "@/components/events/event-section-guard";
import { downloadFile } from "@/lib/file-download";

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
  source?: string;
  paymentMethod?: string | null;
  reference?: string | null;
  documentNumber?: string | null;
  attachmentUrl?: string | null;
  attachmentName?: string | null;
}

interface EventDocument {
  id: number;
  type: string;
  number: string;
  total: string;
  status: string;
}

const paymentStatusConfig: Record<string, { label: string; color: string; icon: typeof RiCheckLine }> = {
  paid: { label: "Pagado", color: "bg-green-100 text-green-700", icon: RiCheckLine },
  complete: { label: "Pagado", color: "bg-green-100 text-green-700", icon: RiCheckLine },
  pending: { label: "Pendiente", color: "bg-yellow-100 text-yellow-700", icon: RiTimeLine },
};

export default function EventPaymentsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const eventId = parseInt(id, 10);
  const { setActiveEvent } = useEvent();
  const { eventScoped } = useUserSessionContext();
  const { canEdit } = useEventPermissions(eventId, eventScoped);
  const canEditFinances = canEdit("finances");

  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [eventDocs, setEventDocs] = useState<EventDocument[]>([]);
  const { formatCurrency } = useOrgCurrency();
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAddPayment, setShowAddPayment] = useState(false);
  const [editPaymentData, setEditPaymentData] = useState<EditPaymentData | null>(null);



  const fetchPayments = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/payments`);
      const data = await res.json();
      if (data.success) {
        setPayments(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch payments:", error);
    }
  }, [eventId]);

  const fetchEventDocs = useCallback(async () => {
    try {
      const [invRes, quoteRes] = await Promise.all([
        fetch(`/api/events/${eventId}/documents/finance?type=invoice&limit=100`),
        fetch(`/api/events/${eventId}/documents/finance?type=quote&limit=100`),
      ]);
      const docs: EventDocument[] = [];
      if (invRes.ok) {
        const data = await invRes.json();
        if (data.success && data.data) {
          docs.push(...data.data.filter((d: EventDocument) => d.status === "sent" || d.status === "partial"));
        }
      }
      if (quoteRes.ok) {
        const data = await quoteRes.json();
        if (data.success && data.data) {
          docs.push(...data.data.filter((d: EventDocument) => d.status === "payment_promise"));
        }
      }
      setEventDocs(docs);
    } catch (error) {
      console.error("Failed to fetch event docs:", error);
    }
  }, [eventId]);

  useEffect(() => {
    async function fetchData() {
      try {
        const eventRes = await fetch(`/api/events/${eventId}`);
        const eventData = await eventRes.json();
        if (eventData.success) {
          setActiveEvent(eventData.data);
        }

        await Promise.all([fetchPayments(), fetchEventDocs()]);
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [eventId, setActiveEvent, fetchPayments, fetchEventDocs]);

  function resetAndClose() {
    setShowAddPayment(false);
    setEditPaymentData(null);
  }

  function handlePaymentSuccess() {
    resetAndClose();
    fetchPayments();
    fetchEventDocs();
  }

  function openEditPayment(payment: Payment) {
    setEditPaymentData({
      id: payment.id,
      amount: payment.amount,
      direction: "outgoing",
      paymentMethod: payment.paymentMethod,
      reference: payment.reference,
      notes: payment.description || null,
      status: payment.status || "complete",
      paymentDate: payment.paidDate || payment.dueDate || undefined,
      attachmentUrl: payment.attachmentUrl,
    });
    setShowAddPayment(true);
  }

  async function deletePayment(id: number) {
    if (!confirm("¿Estás seguro de eliminar este pago?")) return;
    try {
      const res = await fetch(`/api/events/${eventId}/payments/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Pago eliminado");
        fetchPayments();
        fetchEventDocs();
      } else {
        toast.error("Error al eliminar pago");
      }
    } catch { toast.error("Error al eliminar pago"); }
  }

  // Calendar helpers
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

  const { daysInMonth, startingDay } = getDaysInMonth(currentMonth);
  const calendarDays = Array.from({ length: 42 }, (_, i) => {
    const day = i - startingDay + 1;
    return day > 0 && day <= daysInMonth ? day : null;
  });

  const totalPaid = payments
    .filter((p) => p.status === "paid" || p.status === "complete")
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const totalPending = payments
    .filter((p) => p.status === "pending")
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <EventSectionGuard eventId={eventId} section="finances">
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Pagos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {payments.length} pago{payments.length !== 1 ? "s" : ""} — {formatCurrency(totalPaid)} pagado, {formatCurrency(totalPending)} pendiente
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          {canEditFinances && (
          <Button onClick={() => setShowAddPayment(true)}>
            <RiAddLine className="mr-2 h-4 w-4" /> Añadir pago
          </Button>
          )}
        </div>
      </div>

      {/* Content */}
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
                      <th className="p-4 font-medium">Método</th>
                      <th className="p-4 font-medium text-right">Monto</th>
                      <th className="p-4 w-12"></th>
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
                          <td className="p-4 text-sm capitalize">{payment.paymentMethod?.replace("_", " ") || payment.paidTo || "—"}</td>
                          <td className="p-4 text-right font-semibold">
                            {formatCurrency(parseFloat(payment.amount))}
                          </td>
                          <td className="p-4">
                            {(canEditFinances || payment.attachmentUrl) ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <RiMoreLine className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  {canEditFinances && (
                                  <DropdownMenuItem onClick={() => openEditPayment(payment)}>
                                    <RiEditLine className="mr-2 h-4 w-4" />
                                    Editar
                                  </DropdownMenuItem>
                                  )}
                                  {payment.attachmentUrl && (
                                    <DropdownMenuItem onClick={() => downloadFile(payment.attachmentUrl!, payment.attachmentName || "comprobante")}>
                                      <RiFileDownloadLine className="mr-2 h-4 w-4" />
                                      Descargar comprobante
                                    </DropdownMenuItem>
                                  )}
                                  {canEditFinances && (
                                  <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem className="text-red-600" onClick={() => deletePayment(payment.id)}>
                                    <RiDeleteBinLine className="mr-2 h-4 w-4" />
                                    Eliminar
                                  </DropdownMenuItem>
                                  </>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : null}
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

      {/* Add/Edit Payment Drawer */}
      <PaymentDrawer
        open={showAddPayment}
        onOpenChange={(open) => { if (!open) resetAndClose(); else setShowAddPayment(true); }}
        onSuccess={handlePaymentSuccess}
        editPayment={editPaymentData}
        eventId={eventId}
        defaultDirection="outgoing"
        conciliableDocuments={eventDocs as ConciliableDocument[]}
        showContactSelector={true}
        showDirectionSelector={false}
        apiBasePath={`/api/events/${eventId}/payments`}
      />
    </div>
    </EventSectionGuard>
  );
}
