"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  Wallet,
  Clock,
  RefreshCw,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface BillingData {
  stats: {
    totalRevenue: number;
    pendingRevenue: number;
    activeSubscriptions: number;
    trialingSubscriptions: number;
    canceledSubscriptions: number;
    mrr: number;
    arr: number;
  };
  monthlyRevenue: { month: string; revenue: number }[];
  planBreakdown: {
    name: string;
    slug: string;
    price: number;
    count: number;
    mrr: number;
    mrrPercent: number;
  }[];
  recentInvoices: {
    id: number;
    amount: string;
    status: string | null;
    createdAt: string | null;
    orgName: string | null;
  }[];
  trialingSubs: {
    id: number;
    orgName: string;
    planName: string;
    trialEnd: string | null;
    daysLeft: number;
  }[];
}

function getStatusColor(status: string | null) {
  switch (status) {
    case "paid": return "bg-green-500/10 text-green-600";
    case "pending": return "bg-yellow-500/10 text-yellow-600";
    case "failed": return "bg-red-500/10 text-red-600";
    default: return "bg-gray-500/10 text-gray-500";
  }
}

export default function BillingPage() {
  const [data, setData] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/billing");
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch {
      console.error("Failed to fetch billing data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
        <p className="font-medium">Error al cargar datos de billing</p>
        <Button variant="outline" className="mt-4" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reintentar
        </Button>
      </div>
    );
  }

  const { stats } = data;

  const kpiCards = [
    { title: "Ingresos Totales", value: `€${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: "text-green-500", bg: "bg-green-500/10" },
    { title: "Pagos Pendientes", value: `€${stats.pendingRevenue.toLocaleString()}`, icon: CreditCard, color: "text-yellow-500", bg: "bg-yellow-500/10" },
    { title: "Suscripciones Activas", value: stats.activeSubscriptions, icon: TrendingUp, color: "text-blue-500", bg: "bg-blue-500/10", sub: `${stats.trialingSubscriptions} en trial` },
    { title: "MRR", value: `€${stats.mrr.toLocaleString()}`, icon: Wallet, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { title: "ARR", value: `€${stats.arr.toLocaleString()}`, icon: TrendingUp, color: "text-indigo-500", bg: "bg-indigo-500/10" },
  ];

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Billing & Ingresos</h1>
          <p className="text-muted-foreground">
            Métricas financieras y facturación de la plataforma
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className={`p-2 rounded-lg ${kpi.bg}`}>
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
              </div>
              <p className="text-xl font-bold">{kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.title}</p>
              {"sub" in kpi && kpi.sub && (
                <p className="text-[10px] text-muted-foreground mt-0.5">{kpi.sub}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Monthly Revenue Bar Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Revenue Mensual (últimos 6 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.monthlyRevenue.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
                Sin datos de revenue
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={data.monthlyRevenue}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => {
                      const [y, m] = v.split("-");
                      return new Date(Number(y), Number(m) - 1).toLocaleDateString("es", { month: "short" });
                    }}
                  />
                  <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => `€${v}`} />
                  <Tooltip
                    formatter={(value: number | string | undefined) => `€${Number(value ?? 0).toLocaleString()}`}
                    labelFormatter={(v) => {
                      const [y, m] = v.split("-");
                      return new Date(Number(y), Number(m) - 1).toLocaleDateString("es", { month: "long", year: "numeric" });
                    }}
                    contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid hsl(var(--border))" }}
                  />
                  <Bar dataKey="revenue" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Plan Breakdown */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Desglose por Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.planBreakdown.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
                Sin planes activos
              </div>
            ) : (
              <div className="space-y-3">
                {data.planBreakdown.map((plan) => (
                  <div key={plan.slug} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{plan.name}</span>
                      <span className="text-muted-foreground">{plan.count} subs</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500"
                          style={{ width: `${plan.mrrPercent}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-muted-foreground w-16 text-right">
                        €{plan.mrr.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span>€{plan.price}/mes por sub</span>
                      <span>{plan.mrrPercent}% del MRR</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row: Trialing + Invoices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trialing Subscriptions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Clock className="h-4 w-4 text-purple-500" />
              Suscripciones en Trial
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.trialingSubs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Sin trials activos
              </p>
            ) : (
              <div className="space-y-2">
                {data.trialingSubs.map((sub) => (
                  <div
                    key={sub.id}
                    className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{sub.orgName}</p>
                      <p className="text-[10px] text-muted-foreground">{sub.planName}</p>
                    </div>
                    <Badge
                      className={cn(
                        "text-[10px] shrink-0",
                        sub.daysLeft <= 3 ? "bg-red-500/10 text-red-600" :
                        sub.daysLeft <= 7 ? "bg-yellow-500/10 text-yellow-600" :
                        "bg-purple-500/10 text-purple-600"
                      )}
                    >
                      {sub.daysLeft}d restantes
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Invoices */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Facturas Recientes</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {data.recentInvoices.length === 0 ? (
              <div className="p-8 text-center">
                <CreditCard className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
                <p className="text-sm text-muted-foreground">No hay facturas</p>
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">ID</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Organización</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Monto</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Estado</th>
                    <th className="text-left p-3 text-xs font-medium text-muted-foreground">Fecha</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentInvoices.map((invoice) => (
                    <tr
                      key={invoice.id}
                      className="border-b border-border last:border-0 hover:bg-muted/50"
                    >
                      <td className="p-3 font-mono text-xs">#{invoice.id}</td>
                      <td className="p-3 text-sm">{invoice.orgName || "-"}</td>
                      <td className="p-3 text-sm font-medium">€{invoice.amount}</td>
                      <td className="p-3">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(invoice.status)}`}>
                          {invoice.status}
                        </span>
                      </td>
                      <td className="p-3 text-xs text-muted-foreground">
                        {invoice.createdAt
                          ? new Date(invoice.createdAt).toLocaleDateString("es-AR")
                          : "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
