"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Save,
  Globe,
  Mail,
  Shield,
  Database,
  CreditCard,
  HardDrive,
  Radio,
  Link2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  ExternalLink,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface ServiceHealth {
  name: string;
  status: "operational" | "degraded" | "down";
  latencyMs: number;
  error?: string;
}

interface HealthData {
  overall: "operational" | "degraded" | "down";
  services: ServiceHealth[];
}

const SERVICE_CONFIG: Record<string, {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  desc: string;
  link?: string;
}> = {
  database: { label: "Neon PostgreSQL", icon: Database, desc: "Base de datos principal" },
  stripe_platform: { label: "Stripe Platform", icon: CreditCard, desc: "Pagos y suscripciones", link: "https://dashboard.stripe.com" },
  r2_storage: { label: "Cloudflare R2", icon: HardDrive, desc: "Almacenamiento de archivos" },
  pusher: { label: "Pusher Channels", icon: Radio, desc: "WebSockets en tiempo real", link: "https://dashboard.pusher.com" },
  resend_email: { label: "Resend", icon: Mail, desc: "Servicio de email transaccional", link: "https://resend.com/overview" },
};

export default function SettingsPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loadingHealth, setLoadingHealth] = useState(true);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/monitoring");
      const json = await res.json();
      if (json.success) setHealth(json.data.health);
    } catch {
      console.error("Failed to fetch health");
    } finally {
      setLoadingHealth(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  return (
    <div className="p-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-muted-foreground">
          Configuración global de la plataforma HubEnts
        </p>
      </div>

      {/* Connected Services */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Servicios Conectados
          </h2>
          <Link href="/admin/status">
            <Button variant="outline" size="sm" className="text-xs">
              Ver estado completo
              <ExternalLink className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>

        {loadingHealth ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {health?.services.map((svc) => {
              const config = SERVICE_CONFIG[svc.name] || {
                label: svc.name,
                icon: Globe,
                desc: "",
              };
              const Icon = config.icon;

              return (
                <Card
                  key={svc.name}
                  className={cn(
                    "transition-colors",
                    svc.status === "down" && "border-red-500/30",
                    svc.status === "degraded" && "border-yellow-500/30"
                  )}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "p-2 rounded-lg",
                          svc.status === "operational" ? "bg-green-500/10" :
                          svc.status === "degraded" ? "bg-yellow-500/10" : "bg-red-500/10"
                        )}>
                          <Icon className={cn(
                            "h-4 w-4",
                            svc.status === "operational" ? "text-green-500" :
                            svc.status === "degraded" ? "text-yellow-500" : "text-red-500"
                          )} />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{config.label}</p>
                          <p className="text-[10px] text-muted-foreground">{config.desc}</p>
                        </div>
                      </div>
                      {svc.status === "operational" ? (
                        <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                      ) : svc.status === "degraded" ? (
                        <AlertTriangle className="h-4 w-4 text-yellow-500 shrink-0" />
                      ) : (
                        <XCircle className="h-4 w-4 text-red-500 shrink-0" />
                      )}
                    </div>
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {svc.latencyMs}ms
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={cn(
                            "text-[10px]",
                            svc.status === "operational" ? "bg-green-500/10 text-green-600" :
                            svc.status === "degraded" ? "bg-yellow-500/10 text-yellow-600" :
                            "bg-red-500/10 text-red-600"
                          )}
                        >
                          {svc.status === "operational" ? "Conectado" :
                           svc.status === "degraded" ? "Lento" : "Caído"}
                        </Badge>
                        {config.link && (
                          <a href={config.link} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                          </a>
                        )}
                      </div>
                    </div>
                    {svc.error && (
                      <p className="text-[10px] text-red-500 mt-2 truncate">{svc.error}</p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Settings Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="h-5 w-5" />
              General
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre de la Plataforma</label>
              <Input defaultValue="HubEnts" placeholder="Nombre de la plataforma" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">URL de la Plataforma</label>
              <Input defaultValue="https://app.hubents.com" placeholder="https://..." />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Descripción</label>
              <textarea
                className="w-full px-3 py-2 rounded-lg border border-border bg-background min-h-[80px] text-sm"
                defaultValue="Plataforma de gestión de eventos"
                placeholder="Descripción de la plataforma"
              />
            </div>
            <Button className="gap-2">
              <Save className="h-4 w-4" />
              Guardar
            </Button>
          </CardContent>
        </Card>

        {/* Email Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="h-5 w-5" />
              Email
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email de Soporte</label>
              <Input defaultValue="soporte@hubents.com" placeholder="soporte@..." />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email de Notificaciones</label>
              <Input defaultValue="no-reply@hubents.com" placeholder="no-reply@..." />
            </div>
            <Button className="gap-2">
              <Save className="h-4 w-4" />
              Guardar
            </Button>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5" />
              Seguridad
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-sm">Registro Abierto</p>
                <p className="text-xs text-muted-foreground">
                  Permitir que nuevos usuarios se registren
                </p>
              </div>
              <input type="checkbox" defaultChecked className="w-5 h-5 rounded" />
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium text-sm">Verificación de Email</p>
                <p className="text-xs text-muted-foreground">
                  Requerir verificación de email
                </p>
              </div>
              <input type="checkbox" defaultChecked className="w-5 h-5 rounded" />
            </div>
            <Button className="gap-2">
              <Save className="h-4 w-4" />
              Guardar
            </Button>
          </CardContent>
        </Card>

        {/* Database Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="h-5 w-5" />
              Base de Datos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Proveedor</span>
              <span className="text-sm font-medium">Neon PostgreSQL</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Región</span>
              <span className="text-sm font-medium">US East</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-sm text-muted-foreground">Latencia</span>
              <span className="text-sm font-medium">
                {health?.services.find((s) => s.name === "database")?.latencyMs ?? "—"}ms
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-sm text-muted-foreground">Estado</span>
              {loadingHealth ? (
                <Skeleton className="h-6 w-20" />
              ) : (
                <Badge
                  className={cn(
                    "text-xs",
                    health?.services.find((s) => s.name === "database")?.status === "operational"
                      ? "bg-green-500/10 text-green-600"
                      : "bg-red-500/10 text-red-600"
                  )}
                >
                  {health?.services.find((s) => s.name === "database")?.status === "operational"
                    ? "Conectado"
                    : "Error"}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
