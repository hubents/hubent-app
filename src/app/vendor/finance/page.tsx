"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import {
  RiFileTextLine,
  RiFileList2Line,
  RiMoneyDollarCircleLine,
  RiArrowRightLine,
} from "@remixicon/react";
import { toast } from "sonner";

interface FinanceStats {
  totalRevenue: number;
  pendingInvoices: number;
  draftQuotes: number;
  currency: string;
}

export default function VendorFinancePage() {
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch("/api/vendor/dashboard");
        const data = await res.json();
        if (data.success) {
          setStats({
            totalRevenue: data.data.stats.totalRevenue,
            pendingInvoices: data.data.stats.pendingInvoices,
            draftQuotes: 0,
            currency: data.data.stats.currency || "EUR",
          });
        }
      } catch {
        toast.error("Error al cargar finanzas");
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  const formatCurrency = (amount: number) => {
    const symbol = stats?.currency === "EUR" ? "€" : stats?.currency === "USD" ? "$" : stats?.currency || "€";
    return `${symbol}${amount.toLocaleString("es-AR", { minimumFractionDigits: 2 })}`;
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  const sections = [
    {
      title: "Presupuestos",
      description: "Crea y gestiona presupuestos para tus clientes",
      href: "/vendor/finance/quotes",
      icon: RiFileTextLine,
      badge: null,
    },
    {
      title: "Facturas",
      description: "Facturación y seguimiento de cobros",
      href: "/vendor/finance/invoices",
      icon: RiFileList2Line,
      badge: stats?.pendingInvoices ? `${stats.pendingInvoices} pendientes` : null,
    },
    {
      title: "Pagos",
      description: "Historial de pagos recibidos",
      href: "/vendor/finance/payments",
      icon: RiMoneyDollarCircleLine,
      badge: null,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Finanzas</h1>
        <p className="text-muted-foreground text-sm">Gestión financiera de tu empresa</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Ingresos Totales</p>
            <p className="text-2xl font-bold mt-1">{formatCurrency(stats?.totalRevenue ?? 0)}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Facturas Pendientes</p>
            <p className="text-2xl font-bold mt-1">{stats?.pendingInvoices ?? 0}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Moneda</p>
            <p className="text-2xl font-bold mt-1">{stats?.currency ?? "EUR"}</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {sections.map((section) => (
          <Link key={section.href} href={section.href}>
            <Card className="hover:border-primary/50 transition-colors cursor-pointer h-full">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <section.icon className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-base">{section.title}</CardTitle>
                  </div>
                  {section.badge && (
                    <Badge variant="secondary" className="text-xs">{section.badge}</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{section.description}</p>
                <div className="flex items-center gap-1 mt-3 text-sm text-primary font-medium">
                  Ver <RiArrowRightLine className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
