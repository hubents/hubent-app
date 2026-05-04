"use client";

import { useState, useEffect } from "react";
import { useOrgCurrency } from "@/hooks/use-org-currency";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  RiMoneyDollarCircleLine,
  RiFileTextLine,
  RiFileList2Line,
  RiArrowUpLine,
  RiArrowDownLine,
  RiAlertLine,
  RiAddLine,
  RiTimeLine,
  RiUserLine,
  RiBarChartLine,
} from "@remixicon/react";
import Link from "next/link";
import { useUserSession } from "@/hooks/use-user-session";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface DashboardStats {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  pendingInvoices: number;
  pendingInvoicesCount: number;
  pendingPayments: number;
  overdueInvoices: number;
  overdueInvoicesCount: number;
  currency: string;
  incomeChange: number;
  expensesChange: number;
  aging: {
    current: number;
    days0to30: number;
    days31to60: number;
    days61to90: number;
    over90: number;
  };
  cashFlow: {
    next30Days: number;
    next60Days: number;
    next90Days: number;
  };
  topClients: Array<{
    id: number;
    name: string;
    total: number;
    invoiceCount: number;
  }>;
  monthlyRevenue: Array<{
    month: string;
    income: number;
    expenses: number;
  }>;
}

interface RecentDocument {
  id: number;
  type: string;
  number: string;
  clientName: string;
  total: string;
  status: string;
  currency?: string | null;
  dueDate: string | null;
}

const AGING_COLORS = ["#10b981", "#f59e0b", "#f97316", "#ef4444", "#dc2626"];

export default function FinanceDashboardPage() {
  const { can } = useUserSession();
  const { formatCurrency: orgFmt } = useOrgCurrency();
  const canCreate = can("finance:create");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentDocuments, setRecentDocuments] = useState<RecentDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsRes, docsRes] = await Promise.all([
          fetch("/api/finance/dashboard"),
          fetch("/api/finance/documents?limit=5"),
        ]);

        if (statsRes.ok) {
          const statsData = await statsRes.json();
          if (statsData.success) {
            setStats(statsData.data);
          }
        }

        if (docsRes.ok) {
          const docsData = await docsRes.json();
          if (docsData.success) {
            setRecentDocuments(docsData.data || []);
          }
        }
      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  const formatCurrency = (amount: number, currency?: string) => orgFmt(amount, currency);

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}%`;
  };

  const statusConfig: Record<string, { label: string; color: string }> = {
    draft: { label: "Borrador", color: "bg-gray-100 text-gray-700" },
    sent: { label: "Enviado", color: "bg-blue-100 text-blue-700" },
    accepted: { label: "Aceptado", color: "bg-green-100 text-green-700" },
    rejected: { label: "Rechazado", color: "bg-red-100 text-red-700" },
    paid: { label: "Pagado", color: "bg-emerald-100 text-emerald-700" },
    cancelled: { label: "Cancelado", color: "bg-gray-100 text-gray-500" },
  };

  const typeLabels: Record<string, string> = {
    quote: "Presupuesto",
    proforma: "Proforma",
    invoice: "Factura",
    delivery_note: "Albarán",
    credit_note: "Nota de Crédito",
  };

  const agingData = stats?.aging ? [
    { name: "Al día", value: stats.aging.current, color: AGING_COLORS[0] },
    { name: "0-30 días", value: stats.aging.days0to30, color: AGING_COLORS[1] },
    { name: "31-60 días", value: stats.aging.days31to60, color: AGING_COLORS[2] },
    { name: "61-90 días", value: stats.aging.days61to90, color: AGING_COLORS[3] },
    { name: ">90 días", value: stats.aging.over90, color: AGING_COLORS[4] },
  ].filter(d => d.value > 0) : [];

  const cashFlowData = stats?.cashFlow ? [
    { name: "Próx. 30 días", value: stats.cashFlow.next30Days },
    { name: "30-60 días", value: stats.cashFlow.next60Days },
    { name: "60-90 días", value: stats.cashFlow.next90Days },
  ] : [];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-40" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Panel de Finanzas</h1>
          <p className="text-muted-foreground">
            Dashboard financiero con métricas avanzadas
          </p>
        </div>
        {canCreate && (
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/dashboard/finance/quotes/new">
                <RiAddLine className="mr-2 h-4 w-4" />
                Nuevo Presupuesto
              </Link>
            </Button>
            <Button asChild>
              <Link href="/dashboard/finance/invoices/new">
                <RiAddLine className="mr-2 h-4 w-4" />
                Nueva Factura
              </Link>
            </Button>
          </div>
        )}
      </div>

      {/* KPI Cards with CFO metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos del Mes</CardTitle>
            <RiArrowUpLine className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(stats?.totalIncome || 0, stats?.currency)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              {stats?.incomeChange !== undefined && stats.incomeChange !== 0 && (
                <Badge
                  variant={stats.incomeChange >= 0 ? "default" : "destructive"}
                  className="mr-2"
                >
                  {formatPercent(stats.incomeChange)}
                </Badge>
              )}
              vs mes anterior
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos del Mes</CardTitle>
            <RiArrowDownLine className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(stats?.totalExpenses || 0, stats?.currency)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              {stats?.expensesChange !== undefined && stats.expensesChange !== 0 && (
                <Badge
                  variant={stats.expensesChange <= 0 ? "default" : "destructive"}
                  className="mr-2"
                >
                  {formatPercent(stats.expensesChange)}
                </Badge>
              )}
              vs mes anterior
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Por Cobrar</CardTitle>
            <RiFileTextLine className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.pendingInvoices || 0, stats?.currency)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.pendingInvoicesCount || 0} facturas pendientes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencidas</CardTitle>
            <RiAlertLine className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(stats?.overdueInvoices || 0, stats?.currency)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats?.overdueInvoicesCount || 0} facturas vencidas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row - Revenue & Aging */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Monthly Revenue Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RiBarChartLine className="h-5 w-5" />
              Ingresos vs Gastos (6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              {stats?.monthlyRevenue && stats.monthlyRevenue.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.monthlyRevenue}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis dataKey="month" className="text-xs" />
                    <YAxis 
                      className="text-xs"
                      tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      formatter={(value) => formatCurrency(Number(value), stats.currency)}
                      labelClassName="font-medium"
                    />
                    <Bar dataKey="income" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="expenses" name="Gastos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  No hay datos suficientes
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Aging Analysis */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RiTimeLine className="h-5 w-5" />
              Antigüedad de Cuentas por Cobrar
            </CardTitle>
          </CardHeader>
          <CardContent>
            {agingData.length > 0 ? (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={agingData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      label={({ name, percent }) => `${name} (${((percent || 0) * 100).toFixed(0)}%)`}
                    >
                      {agingData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(Number(value), stats?.currency)} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-72 flex items-center justify-center text-muted-foreground">
                No hay facturas pendientes
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Cash Flow & Top Clients */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Cash Flow Projection */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RiMoneyDollarCircleLine className="h-5 w-5" />
              Flujo de Caja Proyectado
            </CardTitle>
            <CardDescription>
              Cobros esperados en los próximos 90 días
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {cashFlowData.map((item, index) => {
                const maxValue = Math.max(...cashFlowData.map(d => d.value));
                const percent = maxValue > 0 ? (item.value / maxValue) * 100 : 0;
                return (
                  <div key={index} className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>{item.name}</span>
                      <span className="font-medium">
                        {formatCurrency(item.value, stats?.currency)}
                      </span>
                    </div>
                    <Progress value={percent} className="h-2" />
                  </div>
                );
              })}
              <div className="pt-4 border-t">
                <div className="flex justify-between font-medium">
                  <span>Total 90 días</span>
                  <span>
                    {formatCurrency(
                      (stats?.cashFlow?.next30Days || 0) + 
                      (stats?.cashFlow?.next60Days || 0) + 
                      (stats?.cashFlow?.next90Days || 0),
                      stats?.currency
                    )}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Top Clients */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RiUserLine className="h-5 w-5" />
              Top 5 Clientes (12 meses)
            </CardTitle>
            <CardDescription>
              Por volumen de facturación pagada
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats?.topClients && stats.topClients.length > 0 ? (
              <div className="space-y-4">
                {stats.topClients.map((client, index) => {
                  const maxValue = stats.topClients[0]?.total || 1;
                  const percent = (client.total / maxValue) * 100;
                  return (
                    <div key={client.id || index} className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <Badge variant="outline" className="w-6 h-6 flex items-center justify-center p-0">
                            {index + 1}
                          </Badge>
                          {client.name}
                        </span>
                        <span className="font-medium">
                          {formatCurrency(client.total, stats.currency)}
                        </span>
                      </div>
                      <Progress value={percent} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        {client.invoiceCount} facturas
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-muted-foreground">
                No hay datos de clientes
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions & Recent Documents */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Acciones Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-2">
            {canCreate && (
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/dashboard/finance/quotes/new">
                  <RiFileTextLine className="mr-2 h-4 w-4" />
                  Crear Presupuesto
                </Link>
              </Button>
            )}
            {canCreate && (
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/dashboard/finance/invoices/new">
                  <RiFileList2Line className="mr-2 h-4 w-4" />
                  Crear Factura
                </Link>
              </Button>
            )}
            {canCreate && (
              <Button variant="outline" className="justify-start" asChild>
                <Link href="/dashboard/finance/payments">
                  <RiMoneyDollarCircleLine className="mr-2 h-4 w-4" />
                  Registrar Pago
                </Link>
              </Button>
            )}
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/dashboard/finance/reports">
                <RiBarChartLine className="mr-2 h-4 w-4" />
                Exportar Reportes
              </Link>
            </Button>
          </CardContent>
        </Card>

        {/* Recent Documents */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Documentos Recientes</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/dashboard/finance/invoices">Ver todos</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentDocuments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay documentos recientes
              </p>
            ) : (
              <div className="space-y-3">
                {recentDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between border-b pb-2 last:border-0"
                  >
                    <div>
                      <p className="font-medium text-sm">{doc.number}</p>
                      <p className="text-xs text-muted-foreground">
                        {typeLabels[doc.type] || doc.type} • {doc.clientName || "Sin cliente"}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-sm">
                        {formatCurrency(parseFloat(doc.total || "0"), doc.currency || stats?.currency)}
                      </p>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                          statusConfig[doc.status]?.color || "bg-gray-100"
                        }`}
                      >
                        {statusConfig[doc.status]?.label || doc.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
