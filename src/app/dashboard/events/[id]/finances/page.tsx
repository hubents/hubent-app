"use client";

import { useState, useEffect, use } from "react";
import { useEvent } from "@/contexts/event-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RiMoneyDollarCircleLine,
  RiAddLine,
  RiArrowUpLine,
  RiArrowDownLine,
  RiCheckLine,
  RiTimeLine,
  RiAlertLine,
} from "@remixicon/react";
import { cn } from "@/lib/utils";

interface Payment {
  id: number;
  description: string;
  amount: string;
  status: string;
  dueDate: string | null;
  paidDate: string | null;
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
          <h1 className="text-2xl font-bold">Finanzas</h1>
          <p className="text-[var(--muted-foreground)]">
            Control de presupuesto y pagos del evento
          </p>
        </div>
        <Button className="gap-2">
          <RiAddLine className="h-4 w-4" />
          Registrar Pago
        </Button>
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

      {/* Payments List */}
      <Card>
        <CardHeader>
          <CardTitle>Pagos y Gastos</CardTitle>
        </CardHeader>
        <CardContent>
          {payments.length > 0 ? (
            <div className="divide-y">
              {payments.map((payment) => {
                const status = statusConfig[payment.status] || statusConfig.pending;
                return (
                  <div key={payment.id} className="flex items-center justify-between py-4">
                    <div className="flex-1">
                      <p className="font-medium">{payment.description}</p>
                      <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                        {payment.vendorName && <span>{payment.vendorName}</span>}
                        {payment.taskTitle && <span>• {payment.taskTitle}</span>}
                        {payment.dueDate && (
                          <span>• Vence: {new Date(payment.dueDate).toLocaleDateString("es-ES")}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="font-semibold">${parseFloat(payment.amount).toLocaleString()}</span>
                      <Badge className={status.color}>{status.label}</Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-[var(--muted-foreground)]">
              <RiMoneyDollarCircleLine className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No hay pagos registrados</p>
              <p className="text-sm mt-1">Los pagos de tareas aparecerán aquí automáticamente</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
