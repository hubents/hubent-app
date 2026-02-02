"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  RiArrowUpLine,
  RiArrowDownLine,
  RiMoneyDollarCircleLine,
  RiFileTextLine,
  RiAlertLine,
  RiTimeLine,
  RiUserLine,
  RiBarChartLine,
} from "@remixicon/react";
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
  Legend,
  LineChart,
  Line,
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

const AGING_COLORS = ["#10b981", "#f59e0b", "#f97316", "#ef4444", "#dc2626"];

export default function FinanceAnalyticsPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch("/api/finance/dashboard");
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setStats(data.data);
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

  const formatCurrency = (amount: number, currency = "EUR") => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency,
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    const sign = value >= 0 ? "+" : "";
    return `${sign}${value.toFixed(1)}%`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-80" />
          <Skeleton className="h-80" />
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">No se pudieron cargar los datos</p>
      </div>
    );
  }

  const agingData = [
    { name: "Al día", value: stats.aging.current, color: AGING_COLORS[0] },
    { name: "0-30 días", value: stats.aging.days0to30, color: AGING_COLORS[1] },
    { name: "31-60 días", value: stats.aging.days31to60, color: AGING_COLORS[2] },
    { name: "61-90 días", value: stats.aging.days61to90, color: AGING_COLORS[3] },
    { name: ">90 días", value: stats.aging.over90, color: AGING_COLORS[4] },
  ].filter(d => d.value > 0);

  const cashFlowData = [
    { name: "Próx. 30 días", value: stats.cashFlow.next30Days },
    { name: "30-60 días", value: stats.cashFlow.next60Days },
    { name: "60-90 días", value: stats.cashFlow.next90Days },
  ];

  const totalAging = Object.values(stats.aging).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Análisis Financiero</h1>
        <p className="text-muted-foreground">
          Dashboard CFO con métricas avanzadas
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Ingresos del Mes</CardTitle>
            <RiArrowUpLine className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalIncome, stats.currency)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              {stats.incomeChange !== 0 && (
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
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Gastos del Mes</CardTitle>
            <RiArrowDownLine className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.totalExpenses, stats.currency)}
            </div>
            <div className="flex items-center text-xs text-muted-foreground">
              {stats.expensesChange !== 0 && (
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
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Por Cobrar</CardTitle>
            <RiFileTextLine className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats.pendingInvoices, stats.currency)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.pendingInvoicesCount} facturas pendientes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Vencidas</CardTitle>
            <RiAlertLine className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(stats.overdueInvoices, stats.currency)}
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.overdueInvoicesCount} facturas vencidas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
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
            <CardDescription>
              Total: {formatCurrency(totalAging, stats.currency)}
            </CardDescription>
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
                    <Tooltip formatter={(value) => formatCurrency(Number(value), stats.currency)} />
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

      {/* Charts Row 2 */}
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
                        {formatCurrency(item.value, stats.currency)}
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
                      stats.cashFlow.next30Days + stats.cashFlow.next60Days + stats.cashFlow.next90Days,
                      stats.currency
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
            {stats.topClients.length > 0 ? (
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

      {/* Aging Detail Table */}
      <Card>
        <CardHeader>
          <CardTitle>Detalle de Antigüedad</CardTitle>
          <CardDescription>
            Desglose de cuentas por cobrar por período de vencimiento
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-5 gap-4 text-center">
            <div className="p-4 rounded-lg bg-green-50 dark:bg-green-950">
              <p className="text-sm text-muted-foreground">Al día</p>
              <p className="text-xl font-bold text-green-600">
                {formatCurrency(stats.aging.current, stats.currency)}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950">
              <p className="text-sm text-muted-foreground">0-30 días</p>
              <p className="text-xl font-bold text-yellow-600">
                {formatCurrency(stats.aging.days0to30, stats.currency)}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-orange-50 dark:bg-orange-950">
              <p className="text-sm text-muted-foreground">31-60 días</p>
              <p className="text-xl font-bold text-orange-600">
                {formatCurrency(stats.aging.days31to60, stats.currency)}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950">
              <p className="text-sm text-muted-foreground">61-90 días</p>
              <p className="text-xl font-bold text-red-600">
                {formatCurrency(stats.aging.days61to90, stats.currency)}
              </p>
            </div>
            <div className="p-4 rounded-lg bg-red-100 dark:bg-red-900">
              <p className="text-sm text-muted-foreground">&gt;90 días</p>
              <p className="text-xl font-bold text-red-700">
                {formatCurrency(stats.aging.over90, stats.currency)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
