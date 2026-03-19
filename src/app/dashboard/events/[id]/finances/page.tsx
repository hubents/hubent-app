"use client";

import { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { useEvent } from "@/contexts/event-context";
import { EventSectionGuard } from "@/components/events/event-section-guard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RiMoneyDollarCircleLine,
  RiCheckLine,
  RiTimeLine,
  RiArrowUpLine,
  RiArrowDownLine,
  RiFileTextLine,
  RiFileList2Line,
  RiArrowRightSLine,
} from "@remixicon/react";
import { cn } from "@/lib/utils";

interface Payment {
  id: number;
  amount: string;
  status: string;
}

interface FinDoc {
  id: number;
  total: string;
  currency: string;
}

interface FinanceSummary {
  budget: number;
  totalPaid: number;
  totalPending: number;
  totalOverdue: number;
}

export default function EventFinancesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const eventId = parseInt(id, 10);
  const { setActiveEvent } = useEvent();

  const [loading, setLoading] = useState(true);
  const [currency, setCurrency] = useState("EUR");
  const [quotesCount, setQuotesCount] = useState(0);
  const [quotesTotal, setQuotesTotal] = useState(0);
  const [invoicesCount, setInvoicesCount] = useState(0);
  const [invoicesTotal, setInvoicesTotal] = useState(0);
  const [paymentsCount, setPaymentsCount] = useState(0);
  const [summary, setSummary] = useState<FinanceSummary>({
    budget: 0,
    totalPaid: 0,
    totalPending: 0,
    totalOverdue: 0,
  });

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(amount);
  }, [currency]);

  useEffect(() => {
    async function fetchData() {
      try {
        try {
          const settingsRes = await fetch("/api/finance/settings");
          if (settingsRes.ok) {
            const settingsData = await settingsRes.json();
            if (settingsData.success && settingsData.data?.defaultCurrency) {
              setCurrency(settingsData.data.defaultCurrency);
            }
          }
        } catch {
          // eventScoped users may not have finance:read — use default EUR
        }

        const eventRes = await fetch(`/api/events/${eventId}`);
        const eventData = await eventRes.json();
        if (eventData.success) {
          setActiveEvent(eventData.data);
          setSummary((prev) => ({ ...prev, budget: parseFloat(eventData.data.budget || "0") }));
        }

        // Fetch payments
        const paymentsRes = await fetch(`/api/events/${eventId}/payments`);
        const paymentsData = await paymentsRes.json();
        if (paymentsData.success) {
          const paymentsList: Payment[] = paymentsData.data || [];
          setPaymentsCount(paymentsList.length);
          const paid = paymentsList
            .filter((p) => p.status === "paid" || p.status === "complete")
            .reduce((sum, p) => sum + parseFloat(p.amount), 0);
          const pending = paymentsList
            .filter((p) => p.status === "pending")
            .reduce((sum, p) => sum + parseFloat(p.amount), 0);
          const overdue = paymentsList
            .filter((p) => p.status === "overdue")
            .reduce((sum, p) => sum + parseFloat(p.amount), 0);
          setSummary((prev) => ({ ...prev, totalPaid: paid, totalPending: pending, totalOverdue: overdue }));
        }

        // Fetch quotes count
        try {
          const quotesRes = await fetch(`/api/events/${eventId}/documents/finance?type=quote&limit=100`);
          if (quotesRes.ok) {
            const quotesData = await quotesRes.json();
            if (quotesData.success) {
              const docs: FinDoc[] = quotesData.data || [];
              setQuotesCount(docs.length);
              setQuotesTotal(docs.reduce((sum, d) => sum + parseFloat(d.total || "0"), 0));
            }
          }
        } catch { /* skip on error */ }

        // Fetch invoices count
        try {
          const invoicesRes = await fetch(`/api/events/${eventId}/documents/finance?type=invoice&limit=100`);
          if (invoicesRes.ok) {
            const invoicesData = await invoicesRes.json();
            if (invoicesData.success) {
              const docs: FinDoc[] = invoicesData.data || [];
              setInvoicesCount(docs.length);
              setInvoicesTotal(docs.reduce((sum, d) => sum + parseFloat(d.total || "0"), 0));
            }
          }
        } catch { /* skip on error */ }
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
  const basePath = `/dashboard/events/${eventId}/finances`;

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-32" />
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <EventSectionGuard eventId={eventId} section="finances">
    <div className="space-y-6">
      {/* Header */}
      <h1 className="text-2xl font-bold">Finanzas</h1>

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

      {/* Section Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Link href={`${basePath}/quotes`}>
          <Card className="hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer h-full">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-lg bg-blue-50 flex items-center justify-center">
                  <RiFileTextLine className="h-5 w-5 text-blue-600" />
                </div>
                <RiArrowRightSLine className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg">Presupuestos</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {quotesCount} presupuesto{quotesCount !== 1 ? "s" : ""}
                {quotesCount > 0 && ` · ${formatCurrency(quotesTotal)}`}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href={`${basePath}/invoices`}>
          <Card className="hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer h-full">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-lg bg-purple-50 flex items-center justify-center">
                  <RiFileList2Line className="h-5 w-5 text-purple-600" />
                </div>
                <RiArrowRightSLine className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg">Facturas</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {invoicesCount} factura{invoicesCount !== 1 ? "s" : ""}
                {invoicesCount > 0 && ` · ${formatCurrency(invoicesTotal)}`}
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href={`${basePath}/payments`}>
          <Card className="hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer h-full">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-lg bg-green-50 flex items-center justify-center">
                  <RiMoneyDollarCircleLine className="h-5 w-5 text-green-600" />
                </div>
                <RiArrowRightSLine className="h-5 w-5 text-muted-foreground" />
              </div>
              <h3 className="font-semibold text-lg">Pagos</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {paymentsCount} pago{paymentsCount !== 1 ? "s" : ""}
                {summary.totalPaid > 0 && ` · ${formatCurrency(summary.totalPaid)} pagado`}
              </p>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
    </EventSectionGuard>
  );
}
