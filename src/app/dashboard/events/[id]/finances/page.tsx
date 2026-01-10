"use client";

import { useState, useEffect, use } from "react";
import { useEvent } from "@/contexts/event-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
} from "@remixicon/react";
import { cn } from "@/lib/utils";

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

const statusConfig: Record<string, { label: string; color: string; icon: typeof RiCheckLine }> = {
  paid: { label: "Pagado", color: "bg-green-100 text-green-700", icon: RiCheckLine },
  pending: { label: "Pendiente", color: "bg-yellow-100 text-yellow-700", icon: RiTimeLine },
  overdue: { label: "Vencido", color: "bg-red-100 text-red-700", icon: RiAlertLine },
};

export default function EventFinancesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const eventId = parseInt(id, 10);
  const { activeEvent, setActiveEvent } = useEvent();

  const [loading, setLoading] = useState(true);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<FinanceSummary>({
    budget: 0,
    totalPaid: 0,
    totalPending: 0,
    totalOverdue: 0,
  });
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newPayment, setNewPayment] = useState({
    description: "",
    amount: "",
    dueDate: "",
    paidTo: "",
    status: "pending",
  });

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch event
        const eventRes = await fetch(`/api/events/${eventId}`);
        const eventData = await eventRes.json();
        if (eventData.success) {
          setActiveEvent(eventData.data);
          setSummary((prev) => ({
            ...prev,
            budget: parseFloat(eventData.data.budget || "0"),
          }));
        }

        // Fetch payments (from tasks with payments)
        const paymentsRes = await fetch(`/api/events/${eventId}/payments`);
        const paymentsData = await paymentsRes.json();
        if (paymentsData.success) {
          setPayments(paymentsData.data || []);
          
          // Calculate summary
          const paid = paymentsData.data
            .filter((p: Payment) => p.status === "paid")
            .reduce((sum: number, p: Payment) => sum + parseFloat(p.amount), 0);
          const pending = paymentsData.data
            .filter((p: Payment) => p.status === "pending")
            .reduce((sum: number, p: Payment) => sum + parseFloat(p.amount), 0);
          const overdue = paymentsData.data
            .filter((p: Payment) => p.status === "overdue")
            .reduce((sum: number, p: Payment) => sum + parseFloat(p.amount), 0);
          
          setSummary((prev) => ({
            ...prev,
            totalPaid: paid,
            totalPending: pending,
            totalOverdue: overdue,
          }));
        }
      } catch (error) {
        console.error("Failed to fetch data:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [eventId, setActiveEvent]);

  const totalSpent = summary.totalPaid + summary.totalPending + summary.totalOverdue;
  const budgetUsedPercent = summary.budget > 0 ? Math.round((totalSpent / summary.budget) * 100) : 0;
  const remaining = summary.budget - totalSpent;

  // Calendar helpers
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    const startingDay = firstDay.getDay();
    return { daysInMonth, startingDay };
  };

  const getPaymentsForDay = (day: number) => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    return payments.filter((p) => {
      if (!p.dueDate) return false;
      const dueDate = new Date(p.dueDate);
      return dueDate.getFullYear() === year && dueDate.getMonth() === month && dueDate.getDate() === day;
    });
  };

  const prevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const goToToday = () => {
    setCurrentMonth(new Date());
  };

  const handleAddPayment = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/payments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPayment),
      });
      const data = await res.json();
      if (data.success) {
        setPayments([...payments, data.data]);
        setShowAddDialog(false);
        setNewPayment({ description: "", amount: "", dueDate: "", paidTo: "", status: "pending" });
        // Recalculate summary
        const amount = parseFloat(newPayment.amount);
        if (newPayment.status === "paid") {
          setSummary((prev) => ({ ...prev, totalPaid: prev.totalPaid + amount }));
        } else if (newPayment.status === "pending") {
          setSummary((prev) => ({ ...prev, totalPending: prev.totalPending + amount }));
        } else if (newPayment.status === "overdue") {
          setSummary((prev) => ({ ...prev, totalOverdue: prev.totalOverdue + amount }));
        }
      }
    } catch (error) {
      console.error("Failed to add payment:", error);
    }
  };

  const { daysInMonth, startingDay } = getDaysInMonth(currentMonth);
  const calendarDays = Array.from({ length: 42 }, (_, i) => {
    const day = i - startingDay + 1;
    return day > 0 && day <= daysInMonth ? day : null;
  });

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Pagos</h1>
          <div className="flex items-center gap-4 mt-1 text-sm">
            <span className="text-primary font-medium">Presupuesto total {summary.budget.toLocaleString()} $</span>
            <span className="text-green-600">Pagados {summary.totalPaid.toLocaleString()} $</span>
            <span className="text-yellow-600">Pendientes {summary.totalPending.toLocaleString()} $</span>
            <span className="text-red-600">Vencidos {summary.totalOverdue.toLocaleString()} $</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* View Toggle */}
          <div className="flex items-center border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "p-2 transition-colors",
                viewMode === "list" ? "bg-primary text-white" : "hover:bg-muted"
              )}
            >
              <RiListCheck className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode("calendar")}
              className={cn(
                "p-2 transition-colors",
                viewMode === "calendar" ? "bg-primary text-white" : "hover:bg-muted"
              )}
            >
              <RiCalendarLine className="h-5 w-5" />
            </button>
          </div>
          <Button className="gap-2" onClick={() => setShowAddDialog(true)}>
            <RiAddLine className="h-4 w-4" />
            Añadir pago
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[var(--muted-foreground)]">Presupuesto</p>
                <p className="text-2xl font-bold">${summary.budget.toLocaleString()}</p>
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
                <p className="text-2xl font-bold text-green-700">${summary.totalPaid.toLocaleString()}</p>
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
                <p className="text-2xl font-bold text-yellow-700">${summary.totalPending.toLocaleString()}</p>
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
                <p className="text-sm text-[var(--muted-foreground)]">Disponible</p>
                <p className={cn("text-2xl font-bold", remaining < 0 ? "text-red-600" : "text-gray-900")}>
                  ${remaining.toLocaleString()}
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
            <span>Gastado: ${totalSpent.toLocaleString()} de ${summary.budget.toLocaleString()}</span>
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

      {/* Payments View - List or Calendar */}
      {viewMode === "list" ? (
        <Card>
          <CardContent className="p-0">
            {payments.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr className="text-left text-sm">
                      <th className="p-4 font-medium">Payment Concept</th>
                      <th className="p-4 font-medium">Due Date</th>
                      <th className="p-4 font-medium">Status</th>
                      <th className="p-4 font-medium">Paid to</th>
                      <th className="p-4 font-medium">Paid by</th>
                      <th className="p-4 font-medium text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {payments.map((payment) => {
                      const status = statusConfig[payment.status] || statusConfig.pending;
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
                              : "-"}
                          </td>
                          <td className="p-4">
                            <Badge className={status.color}>{status.label}</Badge>
                          </td>
                          <td className="p-4 text-sm">{payment.paidTo || payment.vendorName || "-"}</td>
                          <td className="p-4 text-sm">{payment.paidBy || "-"}</td>
                          <td className="p-4 text-right font-semibold">
                            ${parseFloat(payment.amount).toLocaleString()}
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
                <p className="text-sm mt-1">No tienes pago. ¿Por qué no añadir uno ahora?</p>
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        /* Calendar View */
        <Card>
          <CardContent className="p-4">
            {/* Calendar Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Button variant="outline" size="icon" onClick={prevMonth}>
                  <RiArrowLeftSLine className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={nextMonth}>
                  <RiArrowRightSLine className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={goToToday}>
                  Today
                </Button>
              </div>
              <h3 className="text-lg font-medium">
                {currentMonth.toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
              </h3>
            </div>

            {/* Calendar Grid */}
            <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
              {/* Day Headers */}
              {["dom", "lun", "mar", "mié", "jue", "vie", "sáb"].map((day) => (
                <div key={day} className="bg-muted p-2 text-center text-sm font-medium text-muted-foreground">
                  {day}
                </div>
              ))}
              {/* Calendar Days */}
              {calendarDays.map((day, index) => {
                const dayPayments = day ? getPaymentsForDay(day) : [];
                const isToday =
                  day === new Date().getDate() &&
                  currentMonth.getMonth() === new Date().getMonth() &&
                  currentMonth.getFullYear() === new Date().getFullYear();
                return (
                  <div
                    key={index}
                    className={cn(
                      "bg-card min-h-[80px] p-1",
                      !day && "bg-muted/30"
                    )}
                  >
                    {day && (
                      <>
                        <span
                          className={cn(
                            "inline-flex h-6 w-6 items-center justify-center rounded-full text-sm",
                            isToday && "bg-primary text-white"
                          )}
                        >
                          {day}
                        </span>
                        <div className="mt-1 space-y-1">
                          {dayPayments.slice(0, 2).map((p) => (
                            <div
                              key={p.id}
                              className={cn(
                                "text-xs p-1 rounded truncate",
                                p.status === "paid" && "bg-green-100 text-green-700",
                                p.status === "pending" && "bg-yellow-100 text-yellow-700",
                                p.status === "overdue" && "bg-red-100 text-red-700"
                              )}
                            >
                              ${parseFloat(p.amount).toLocaleString()}
                            </div>
                          ))}
                          {dayPayments.length > 2 && (
                            <div className="text-xs text-muted-foreground">
                              +{dayPayments.length - 2} más
                            </div>
                          )}
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

      {/* Add Payment Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Añadir pago</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
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
              <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddPayment} disabled={!newPayment.description || !newPayment.amount}>
                Añadir pago
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
