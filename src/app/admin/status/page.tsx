"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  RefreshCw,
  Database,
  CreditCard,
  HardDrive,
  Radio,
  Mail,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Shield,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ServiceHealth {
  name: string;
  status: "operational" | "degraded" | "down";
  latencyMs: number;
  error?: string;
}

interface EnvVar {
  key: string;
  label: string;
  category: string;
  configured: boolean;
}

interface StatusData {
  health: {
    overall: "operational" | "degraded" | "down";
    services: ServiceHealth[];
    checkedAt: string;
  };
  envStatus: EnvVar[];
  envSummary: { total: number; configured: number; missing: number };
  recentErrors: {
    timestamp: string;
    level: string;
    message: string;
    path?: string;
    method?: string;
    statusCode?: number;
  }[];
}

const SERVICE_META: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; desc: string }> = {
  database: { label: "Database", icon: Database, desc: "Neon PostgreSQL" },
  stripe_platform: { label: "Stripe Platform", icon: CreditCard, desc: "Pagos y suscripciones" },
  r2_storage: { label: "R2 Storage", icon: HardDrive, desc: "Cloudflare R2 archivos" },
  pusher: { label: "Pusher", icon: Radio, desc: "WebSockets en tiempo real" },
  resend_email: { label: "Resend", icon: Mail, desc: "Envío de emails" },
};

const CATEGORY_LABELS: Record<string, string> = {
  core: "Core",
  payments: "Pagos",
  email: "Email",
  storage: "Storage",
  realtime: "Realtime",
  integrations: "Integraciones",
  system: "Sistema",
  ai: "AI",
};

function StatusIcon({ status }: { status: "operational" | "degraded" | "down" }) {
  if (status === "operational") return <CheckCircle2 className="h-5 w-5 text-green-500" />;
  if (status === "degraded") return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
  return <XCircle className="h-5 w-5 text-red-500" />;
}

function StatusBadge({ status }: { status: "operational" | "degraded" | "down" }) {
  return (
    <Badge
      className={cn(
        "text-[10px]",
        status === "operational" && "bg-green-500/10 text-green-600 hover:bg-green-500/20",
        status === "degraded" && "bg-yellow-500/10 text-yellow-600 hover:bg-yellow-500/20",
        status === "down" && "bg-red-500/10 text-red-600 hover:bg-red-500/20"
      )}
    >
      {status === "operational" ? "Operativo" : status === "degraded" ? "Degradado" : "Caído"}
    </Badge>
  );
}

export default function AdminStatusPage() {
  const [data, setData] = useState<StatusData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const res = await fetch("/api/admin/status");
      const json = await res.json();
      if (json.success) setData(json.data);
    } catch {
      console.error("Failed to fetch status");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) {
    return (
      <div className="p-8 space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center">
        <XCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
        <p className="font-medium">Error al cargar el estado</p>
        <Button variant="outline" className="mt-4" onClick={() => fetchData()}>
          Reintentar
        </Button>
      </div>
    );
  }

  // Group env vars by category
  const envByCategory = data.envStatus.reduce<Record<string, EnvVar[]>>((acc, v) => {
    if (!acc[v.category]) acc[v.category] = [];
    acc[v.category].push(v);
    return acc;
  }, {});

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={cn(
            "p-2.5 rounded-xl",
            data.health.overall === "operational" ? "bg-green-500/10" :
            data.health.overall === "degraded" ? "bg-yellow-500/10" : "bg-red-500/10"
          )}>
            <Activity className={cn(
              "h-6 w-6",
              data.health.overall === "operational" ? "text-green-500" :
              data.health.overall === "degraded" ? "text-yellow-500" : "text-red-500"
            )} />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Estado de la Plataforma</h1>
            <p className="text-sm text-muted-foreground">
              Último check: {new Date(data.health.checkedAt).toLocaleString("es-AR")}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={data.health.overall} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchData(true)}
            disabled={refreshing}
          >
            {refreshing ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Re-check
          </Button>
        </div>
      </div>

      {/* Service Cards */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
          Servicios Externos
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.health.services.map((svc) => {
            const meta = SERVICE_META[svc.name] || {
              label: svc.name,
              icon: Activity,
              desc: "",
            };
            const Icon = meta.icon;

            return (
              <Card key={svc.name} className={cn(
                "transition-colors",
                svc.status === "down" && "border-red-500/30",
                svc.status === "degraded" && "border-yellow-500/30"
              )}>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        svc.status === "operational" ? "bg-green-500/10" :
                        svc.status === "degraded" ? "bg-yellow-500/10" : "bg-red-500/10"
                      )}>
                        <Icon className={cn(
                          "h-5 w-5",
                          svc.status === "operational" ? "text-green-500" :
                          svc.status === "degraded" ? "text-yellow-500" : "text-red-500"
                        )} />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{meta.label}</p>
                        <p className="text-xs text-muted-foreground">{meta.desc}</p>
                      </div>
                    </div>
                    <StatusIcon status={svc.status} />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      {svc.latencyMs}ms
                    </div>
                    <StatusBadge status={svc.status} />
                  </div>

                  {svc.error && (
                    <div className="mt-3 p-2 rounded bg-red-500/5 border border-red-500/10">
                      <p className="text-xs text-red-600 truncate">{svc.error}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Environment Variables */}
      <div>
        <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider flex items-center gap-2">
          <Shield className="h-4 w-4" />
          Variables de Entorno
          <span className="text-xs font-normal ml-2">
            {data.envSummary.configured}/{data.envSummary.total} configuradas
          </span>
          {data.envSummary.missing > 0 && (
            <Badge variant="destructive" className="text-[10px] ml-2">
              {data.envSummary.missing} faltantes
            </Badge>
          )}
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.entries(envByCategory).map(([category, vars]) => {
            const allConfigured = vars.every((v) => v.configured);
            return (
              <Card key={category}>
                <CardHeader className="pb-2 pt-4 px-4">
                  <CardTitle className="text-xs font-semibold uppercase tracking-wider flex items-center justify-between">
                    <span>{CATEGORY_LABELS[category] || category}</span>
                    {allConfigured ? (
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent className="px-4 pb-4">
                  <div className="space-y-1.5">
                    {vars.map((v) => (
                      <div
                        key={v.key}
                        className="flex items-center justify-between py-1"
                      >
                        <span className="text-xs text-muted-foreground">{v.label}</span>
                        {v.configured ? (
                          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
                        ) : (
                          <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Recent Errors */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-orange-500" />
            Errores Recientes (últimos 20)
          </CardTitle>
        </CardHeader>
        <CardContent>
          {data.recentErrors.length === 0 ? (
            <div className="py-6 text-center">
              <div className="inline-flex items-center gap-2 text-green-600 text-sm">
                <CheckCircle2 className="h-4 w-4" />
                Sin errores en el buffer
              </div>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {data.recentErrors.map((err, i) => (
                <div
                  key={i}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg text-xs",
                    err.level === "critical" ? "bg-red-500/5 border border-red-500/10" : "bg-muted/50"
                  )}
                >
                  <Badge
                    variant={err.level === "critical" ? "destructive" : "secondary"}
                    className="text-[10px] shrink-0 mt-0.5"
                  >
                    {err.statusCode || err.level.toUpperCase()}
                  </Badge>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      {err.method && err.path && (
                        <span className="font-mono text-muted-foreground">
                          {err.method} {err.path}
                        </span>
                      )}
                    </div>
                    <p className="text-muted-foreground truncate">{err.message}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(err.timestamp).toLocaleTimeString("es-AR")}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
