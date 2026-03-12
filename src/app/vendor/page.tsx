"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RiCalendarEventLine,
  RiFileListLine,
  RiMoneyDollarCircleLine,
  RiCheckboxCircleLine,
  RiTimeLine,
  RiAlertLine,
  RiStoreLine,
  RiInstagramLine,
  RiShieldCheckLine,
} from "@remixicon/react";
import Link from "next/link";
import { useUserSession } from "@/hooks/use-user-session";

interface ProviderDashboard {
  organization: {
    name: string;
    verificationStatus: string;
    instagramHandle: string | null;
    providerCategory: string | null;
  };
  stats: {
    activeEvents: number;
    pendingTasks: number;
    totalRevenue: number;
    pendingInvoices: number;
    currency: string;
  };
}

const VERIFICATION_STATUS_MAP: Record<string, { label: string; variant: "success" | "warning" | "destructive" }> = {
  verified: { label: "Verificado", variant: "success" },
  unverified: { label: "Pendiente de verificación", variant: "warning" },
  rejected: { label: "Rechazado", variant: "destructive" },
};

export default function VendorDashboardPage() {
  const { can } = useUserSession();
  const canReadFinance = can("finance:read");
  const [data, setData] = useState<ProviderDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      try {
        const res = await fetch("/api/vendor/dashboard");
        const result = await res.json();
        if (result.success) {
          setData(result.data);
        } else {
          setError(result.error?.message || "Error al cargar el dashboard");
        }
      } catch (err) {
        console.error("Error loading vendor dashboard:", err);
        setError("Error de conexión");
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="flex items-center gap-4 p-6">
            <RiAlertLine className="h-8 w-8 text-red-600 shrink-0" />
            <div>
              <p className="font-medium text-red-800">Error al cargar el dashboard</p>
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const verification = VERIFICATION_STATUS_MAP[data?.organization?.verificationStatus || "unverified"];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            Bienvenido, {data?.organization?.name || "Proveedor"}
          </h1>
          <div className="flex items-center gap-2 mt-1">
            {data?.organization?.providerCategory && (
              <Badge variant="outline">{data.organization.providerCategory}</Badge>
            )}
            <Badge variant={verification.variant}>
              <RiShieldCheckLine className="h-3 w-3 mr-1" />
              {verification.label}
            </Badge>
            {data?.organization?.instagramHandle && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <RiInstagramLine className="h-3.5 w-3.5" />
                @{data.organization.instagramHandle}
              </span>
            )}
          </div>
        </div>
        <Button asChild>
          <Link href="/vendor/profile">
            <RiStoreLine className="h-4 w-4 mr-2" />
            Mi Perfil
          </Link>
        </Button>
      </div>

      {/* Verification Warning */}
      {data?.organization?.verificationStatus === "unverified" && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex items-center gap-4 p-4">
            <RiAlertLine className="h-8 w-8 text-amber-600 shrink-0" />
            <div>
              <p className="font-medium text-amber-800">Tu cuenta está pendiente de verificación</p>
              <p className="text-sm text-amber-700">
                Completa tu perfil para acelerar el proceso. Las empresas verificadas aparecen destacadas en búsquedas.
              </p>
            </div>
            <Button variant="outline" className="shrink-0 ml-auto" asChild>
              <Link href="/vendor/profile">Completar Perfil</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Eventos Activos</p>
                <p className="text-3xl font-bold">{data?.stats?.activeEvents ?? 0}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <RiCalendarEventLine className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tareas Pendientes</p>
                <p className="text-3xl font-bold">{data?.stats?.pendingTasks ?? 0}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-amber-100 flex items-center justify-center">
                <RiFileListLine className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        {canReadFinance && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Ingresos Totales</p>
                  <p className="text-3xl font-bold">
                    {(data?.stats?.totalRevenue ?? 0).toLocaleString(undefined, { style: "currency", currency: data?.stats?.currency || "EUR", minimumFractionDigits: 0 })}
                  </p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                  <RiMoneyDollarCircleLine className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {canReadFinance && (
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Facturas Pendientes</p>
                  <p className="text-3xl font-bold">{data?.stats?.pendingInvoices ?? 0}</p>
                </div>
                <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center">
                  <RiTimeLine className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/vendor/events">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <RiCalendarEventLine className="h-5 w-5 text-blue-600" />
                Mis Eventos
              </CardTitle>
              <CardDescription>
                Ver los eventos donde participas como proveedor
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer">
          <Link href="/vendor/tasks">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <RiCheckboxCircleLine className="h-5 w-5 text-amber-600" />
                Mis Tareas
              </CardTitle>
              <CardDescription>
                Gestiona las tareas asignadas a tu equipo
              </CardDescription>
            </CardHeader>
          </Link>
        </Card>

        {canReadFinance && (
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <Link href="/vendor/finance">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <RiMoneyDollarCircleLine className="h-5 w-5 text-green-600" />
                  Finanzas
                </CardTitle>
                <CardDescription>
                  Presupuestos, facturas y pagos
                </CardDescription>
              </CardHeader>
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}
