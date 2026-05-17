"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Building2,
  Store,
  Users,
  DollarSign,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Wallet,
  ScrollText,
  Globe,
  Settings,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

interface DashboardData {
  kpis: {
    organizations: { value: number; delta: number };
    users: { value: number; delta: number };
    activeSubscriptions: { value: number; delta: number };
    mrr: { value: number };
    arr: { value: number };
  };
  health: {
    overall: "operational" | "degraded" | "down";
    services: {
      name: string;
      status: "operational" | "degraded" | "down";
      latencyMs: number;
      error?: string;
    }[];
  };
  recentOrganizations: {
    id: number;
    name: string;
    slug: string;
    orgType: string;
    status: string | null;
    createdAt: string | null;
  }[];
  dailySignups: { date: string; count: number }[];
  planDistribution: { name: string; slug: string; count: number; mrr: number }[];
  orgTypeDistribution: { type: string; count: number; label: string }[];
  recentErrors: {
    timestamp: string;
    level: string;
    message: string;
    path?: string;
    statusCode?: number;
  }[];
}

const SERVICE_LABELS: Record<string, string> = {
  database: "Database",
  stripe_platform: "Stripe",
  r2_storage: "R2 Storage",
  pusher: "Pusher",
  resend_email: "Resend",
};

const PLAN_PIE_COLORS = ["#6366f1", "#8b5cf6", "#a78bfa", "#c4b5fd", "#ddd6fe"];

const ORG_TYPE_COLORS: Record<string, string> = {
  tenant: "#3b82f6",
  provider: "#a855f7",
  client: "#10b981",
};

const ORG_TYPE_ICONS: Record<string, React.ElementType> = {
  tenant: Building2,
  provider: Store,
  client: Users,
};

const ORG_TYPE_BADGE_CLASSES: Record<string, string> = {
  tenant: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
  provider: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  client: "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
};

export default function AdminDashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/dashboard");
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch {
      console.error("Failed to fetch dashboard data");
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
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
        <Skeleton className="h-16" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-72 lg:col-span-2" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center">
        <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
        <p className="font-medium">Error al cargar el dashboard</p>
        <Button variant="outline" className="mt-4" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Reintentar
        </Button>
      </div>
    );
  }

  const kpiCards = [
    {
      title: "Organizaciones",
      value: data.kpis.organizations.value,
      delta: data.kpis.organizations.delta,
      icon: Building2,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Usuarios",
      value: data.kpis.users.value,
      delta: data.kpis.users.delta,
      icon: Users,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Suscripciones",
      value: data.kpis.activeSubscriptions.value,
      delta: data.kpis.activeSubscriptions.delta,
      icon: TrendingUp,
      color: "text-indigo-500",
      bgColor: "bg-indigo-500/10",
    },
    {
      title: "MRR",
      value: `€${data.kpis.mrr.value.toLocaleString()}`,
      icon: DollarSign,
      color: "text-emerald-500",
      bgColor: "bg-emerald-500/10",
    },
    {
      title: "ARR",
      value: `€${data.kpis.arr.value.toLocaleString()}`,
      icon: Wallet,
      color: "text-amber-500",
      bgColor: "bg-amber-500/10",
    },
  ];

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Platform Overview</h1>
          <p className="text-muted-foreground">
            Métricas y estado de la plataforma Hubents
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* KPI Grid — 5 cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        {kpiCards.map((kpi) => (
          <Card key={kpi.title}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className={`p-2 rounded-lg ${kpi.bgColor}`}>
                  <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
                </div>
                {"delta" in kpi && kpi.delta !== undefined && (
                  <span
                    className={cn(
                      "flex items-center gap-0.5 text-xs font-medium",
                      kpi.delta >= 0 ? "text-green-600" : "text-red-500"
                    )}
                  >
                    {kpi.delta >= 0 ? (
                      <ArrowUpRight className="h-3 w-3" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3" />
                    )}
                    {Math.abs(kpi.delta)}%
                  </span>
                )}
              </div>
              <p className="text-xl font-bold">{kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Health Strip */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-4 flex-wrap min-w-0">
              <div className="flex items-center gap-2 shrink-0">
                <Activity className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Estado de Servicios</span>
              </div>
              {data.health.services.map((svc) => (
                <div key={svc.name} className="flex items-center gap-2">
                  <span
                    className={cn(
                      "h-2 w-2 rounded-full",
                      svc.status === "operational" && "bg-green-500",
                      svc.status === "degraded" && "bg-yellow-500",
                      svc.status === "down" && "bg-red-500"
                    )}
                  />
                  <span className="text-xs text-muted-foreground">
                    {SERVICE_LABELS[svc.name] || svc.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground/60">
                    {svc.latencyMs}ms
                  </span>
                </div>
              ))}
            </div>
            <Link href="/admin/status">
              <Button variant="ghost" size="sm" className="text-xs">
                Ver detalle
                <ExternalLink className="h-3 w-3 ml-1" />
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Charts Row: Area chart (2/3) + stacked donuts (1/3) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Signups Area Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Registros últimos 30 días
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.dailySignups.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-sm text-muted-foreground">
                Sin datos de registros
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={data.dailySignups}>
                  <defs>
                    <linearGradient id="signupGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(v) =>
                      new Date(v).toLocaleDateString("es", {
                        day: "2-digit",
                        month: "short",
                      })
                    }
                  />
                  <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                  <Tooltip
                    labelFormatter={(v) =>
                      new Date(v).toLocaleDateString("es", {
                        day: "2-digit",
                        month: "long",
                      })
                    }
                    contentStyle={{
                      fontSize: 12,
                      borderRadius: 8,
                      border: "1px solid hsl(var(--border))",
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="count"
                    stroke="#6366f1"
                    fill="url(#signupGrad)"
                    strokeWidth={2}
                    name="Registros"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Right column: stacked donuts */}
        <div className="flex flex-col gap-4">
          {/* Org Type Donut */}
          <Card className="flex-1">
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Organizaciones por Tipo
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {data.orgTypeDistribution.length === 0 ? (
                <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
                  Sin datos
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={120}>
                    <PieChart>
                      <Pie
                        data={data.orgTypeDistribution}
                        dataKey="count"
                        nameKey="label"
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={50}
                        paddingAngle={3}
                      >
                        {data.orgTypeDistribution.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={
                              ORG_TYPE_COLORS[entry.type] ||
                              PLAN_PIE_COLORS[i % PLAN_PIE_COLORS.length]
                            }
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(val, name) => [`${val}`, name]}
                        contentStyle={{
                          fontSize: 11,
                          borderRadius: 8,
                          border: "1px solid hsl(var(--border))",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {data.orgTypeDistribution.map((entry) => (
                      <div
                        key={entry.type}
                        className="flex items-center gap-1.5 text-xs"
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{
                            backgroundColor:
                              ORG_TYPE_COLORS[entry.type] || "#6366f1",
                          }}
                        />
                        {entry.label}{" "}
                        <span className="text-muted-foreground">
                          ({entry.count})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Plan Distribution Donut */}
          <Card className="flex-1">
            <CardHeader className="pb-1">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Distribución de Planes
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {data.planDistribution.length === 0 ? (
                <div className="h-32 flex items-center justify-center text-sm text-muted-foreground">
                  Sin suscripciones activas
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <ResponsiveContainer width="100%" height={120}>
                    <PieChart>
                      <Pie
                        data={data.planDistribution}
                        dataKey="count"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={30}
                        outerRadius={50}
                        paddingAngle={3}
                      >
                        {data.planDistribution.map((_, i) => (
                          <Cell
                            key={i}
                            fill={PLAN_PIE_COLORS[i % PLAN_PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          fontSize: 11,
                          borderRadius: 8,
                          border: "1px solid hsl(var(--border))",
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {data.planDistribution.map((plan, i) => (
                      <div
                        key={plan.slug}
                        className="flex items-center gap-1.5 text-xs"
                      >
                        <span
                          className="h-2 w-2 rounded-full"
                          style={{
                            backgroundColor:
                              PLAN_PIE_COLORS[i % PLAN_PIE_COLORS.length],
                          }}
                        />
                        {plan.name}{" "}
                        <span className="text-muted-foreground">
                          ({plan.count})
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Bottom Row: Recent Orgs + Errors + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Organizations */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Registros Recientes
            </CardTitle>
            <Link href="/admin/tenants">
              <Button variant="ghost" size="sm" className="text-xs h-7">
                Ver todos
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentOrganizations.length === 0 ? (
              <p className="text-muted-foreground text-sm py-4 text-center">
                No hay organizaciones registradas
              </p>
            ) : (
              <div className="space-y-2">
                {data.recentOrganizations.map((org) => {
                  const OrgIcon = ORG_TYPE_ICONS[org.orgType] || Building2;
                  const badgeClass =
                    ORG_TYPE_BADGE_CLASSES[org.orgType] ||
                    ORG_TYPE_BADGE_CLASSES["tenant"];
                  return (
                    <Link
                      key={org.id}
                      href={`/admin/tenants/${org.id}`}
                      className="block"
                    >
                      <div className="flex items-center justify-between p-2.5 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div
                            className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                            style={{
                              backgroundColor: `${ORG_TYPE_COLORS[org.orgType] || "#6366f1"}18`,
                            }}
                          >
                            <OrgIcon
                              className="h-4 w-4"
                              style={{
                                color:
                                  ORG_TYPE_COLORS[org.orgType] || "#6366f1",
                              }}
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium truncate">
                              {org.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {org.slug}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span
                            className={cn(
                              "px-1.5 py-0.5 rounded text-[10px] font-medium",
                              badgeClass
                            )}
                          >
                            {org.orgType === "tenant"
                              ? "Planif."
                              : org.orgType === "provider"
                                ? "Prov."
                                : org.orgType}
                          </span>
                          <Badge
                            variant={
                              org.status === "active" ? "default" : "secondary"
                            }
                            className="text-[10px]"
                          >
                            {org.status}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Errors */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Errores Recientes
            </CardTitle>
            <Link href="/admin/audit">
              <Button variant="ghost" size="sm" className="text-xs h-7">
                Ver logs
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {data.recentErrors.length === 0 ? (
              <div className="py-4 text-center">
                <div className="inline-flex items-center gap-2 text-green-600 text-sm">
                  <span className="h-2 w-2 rounded-full bg-green-500" />
                  Sin errores recientes
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {data.recentErrors.map((err, i) => (
                  <div
                    key={i}
                    className="p-2.5 rounded-lg bg-red-500/5 border border-red-500/10"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <Badge
                        variant="destructive"
                        className="text-[10px] h-4 px-1.5"
                      >
                        {err.statusCode || err.level}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(err.timestamp).toLocaleTimeString("es")}
                      </span>
                    </div>
                    <p className="text-xs truncate text-muted-foreground">
                      {err.path && (
                        <span className="font-mono">{err.path} — </span>
                      )}
                      {err.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Acciones Rápidas
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              {
                href: "/admin/status",
                label: "Health Check",
                desc: "Estado de servicios",
                icon: Activity,
                color: "text-green-500",
                bg: "bg-green-500/10",
              },
              {
                href: "/admin/billing",
                label: "Billing",
                desc: "Revenue y suscripciones",
                icon: Wallet,
                color: "text-emerald-500",
                bg: "bg-emerald-500/10",
              },
              {
                href: "/admin/api-platform",
                label: "API Platform",
                desc: "Requests y API keys",
                icon: Globe,
                color: "text-blue-500",
                bg: "bg-blue-500/10",
              },
              {
                href: "/admin/audit",
                label: "Auditoría",
                desc: "Logs de actividad",
                icon: ScrollText,
                color: "text-orange-500",
                bg: "bg-orange-500/10",
              },
              {
                href: "/admin/settings",
                label: "Configuración",
                desc: "Ajustes de plataforma",
                icon: Settings,
                color: "text-slate-500",
                bg: "bg-slate-500/10",
              },
            ].map((action) => (
              <Link key={action.href} href={action.href}>
                <div className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-muted/50 transition-colors">
                  <div className={`p-2 rounded-lg ${action.bg}`}>
                    <action.icon className={`h-4 w-4 ${action.color}`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{action.label}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {action.desc}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
