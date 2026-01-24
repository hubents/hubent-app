"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RiMoneyDollarCircleLine,
  RiFileTextLine,
  RiFileList2Line,
  RiArrowUpLine,
  RiArrowDownLine,
  RiAlertLine,
  RiAddLine,
  RiTimeLine,
} from "@remixicon/react";
import Link from "next/link";
import { useState, useEffect } from "react";

interface DashboardStats {
  totalIncome: number;
  totalExpenses: number;
  balance: number;
  pendingInvoices: number;
  pendingPayments: number;
  overdueInvoices: number;
  currency: string;
}

interface RecentDocument {
  id: number;
  type: string;
  number: string;
  clientName: string;
  total: string;
  status: string;
  dueDate: string | null;
}

export default function FinanceDashboardPage() {
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

  const formatCurrency = (amount: number, currency = "EUR") => {
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency,
    }).format(amount);
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
            Resumen financiero de tu organización
          </p>
        </div>
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
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos</CardTitle>
            <RiArrowUpLine className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {formatCurrency(stats?.totalIncome || 0, stats?.currency)}
            </div>
            <p className="text-xs text-muted-foreground">Este mes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos</CardTitle>
            <RiArrowDownLine className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(stats?.totalExpenses || 0, stats?.currency)}
            </div>
            <p className="text-xs text-muted-foreground">Este mes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Por Cobrar</CardTitle>
            <RiTimeLine className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(stats?.pendingInvoices || 0, stats?.currency)}
            </div>
            <p className="text-xs text-muted-foreground">Facturas pendientes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencido</CardTitle>
            <RiAlertLine className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(stats?.overdueInvoices || 0, stats?.currency)}
            </div>
            <p className="text-xs text-muted-foreground">Requiere atención</p>
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
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/dashboard/finance/quotes/new">
                <RiFileTextLine className="mr-2 h-4 w-4" />
                Crear Presupuesto
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/dashboard/finance/invoices/new">
                <RiFileList2Line className="mr-2 h-4 w-4" />
                Crear Factura
              </Link>
            </Button>
            <Button variant="outline" className="justify-start" asChild>
              <Link href="/dashboard/finance/payments">
                <RiMoneyDollarCircleLine className="mr-2 h-4 w-4" />
                Registrar Pago
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
                        {formatCurrency(parseFloat(doc.total || "0"))}
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
