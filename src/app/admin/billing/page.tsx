import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  DollarSign, 
  TrendingUp,
  TrendingDown,
  CreditCard,
  ArrowUpRight,
  Calendar
} from "lucide-react";
import { db } from "@/db";
import { invoices, subscriptions, subscriptionPlans, organizations } from "@/db/schema";
import { eq, sum, count, desc } from "drizzle-orm";

async function getBillingStats() {
  const [totalRevenue] = await db
    .select({ total: sum(invoices.amount) })
    .from(invoices)
    .where(eq(invoices.status, "paid"));

  const [pendingRevenue] = await db
    .select({ total: sum(invoices.amount) })
    .from(invoices)
    .where(eq(invoices.status, "pending"));

  const [activeSubscriptionsCount] = await db
    .select({ count: count() })
    .from(subscriptions)
    .where(eq(subscriptions.status, "active"));

  return {
    totalRevenue: Number(totalRevenue?.total || 0),
    pendingRevenue: Number(pendingRevenue?.total || 0),
    activeSubscriptions: activeSubscriptionsCount?.count || 0,
  };
}

async function getRecentInvoices() {
  return await db
    .select({
      id: invoices.id,
      amount: invoices.amount,
      status: invoices.status,
      createdAt: invoices.createdAt,
      orgName: organizations.name,
    })
    .from(invoices)
    .leftJoin(organizations, eq(invoices.organizationId, organizations.id))
    .orderBy(desc(invoices.createdAt))
    .limit(10);
}

export default async function BillingPage() {
  const stats = await getBillingStats();
  const recentInvoices = await getRecentInvoices();

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "paid":
        return "bg-green-500/10 text-green-500";
      case "pending":
        return "bg-yellow-500/10 text-yellow-500";
      case "failed":
        return "bg-red-500/10 text-red-500";
      default:
        return "bg-gray-500/10 text-gray-500";
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Billing & Ingresos</h1>
        <p className="text-[var(--muted-foreground)]">
          Métricas financieras y facturación de la plataforma
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-lg bg-green-500/10">
                <DollarSign className="h-5 w-5 text-green-500" />
              </div>
              <div className="flex items-center gap-1 text-sm text-green-500">
                +12%
                <ArrowUpRight className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold">
                ${stats.totalRevenue.toLocaleString()}
              </p>
              <p className="text-sm text-[var(--muted-foreground)]">
                Ingresos Totales
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-lg bg-yellow-500/10">
                <CreditCard className="h-5 w-5 text-yellow-500" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold">
                ${stats.pendingRevenue.toLocaleString()}
              </p>
              <p className="text-sm text-[var(--muted-foreground)]">
                Pagos Pendientes
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <TrendingUp className="h-5 w-5 text-blue-500" />
              </div>
            </div>
            <div className="mt-4">
              <p className="text-2xl font-bold">{stats.activeSubscriptions}</p>
              <p className="text-sm text-[var(--muted-foreground)]">
                Suscripciones Activas
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Invoices */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Facturas Recientes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recentInvoices.length === 0 ? (
            <div className="p-8 text-center">
              <CreditCard className="h-12 w-12 mx-auto text-[var(--muted-foreground)] mb-4" />
              <h3 className="font-medium mb-2">No hay facturas</h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                Aún no se han generado facturas
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left p-4 font-medium text-[var(--muted-foreground)]">
                    ID
                  </th>
                  <th className="text-left p-4 font-medium text-[var(--muted-foreground)]">
                    Organización
                  </th>
                  <th className="text-left p-4 font-medium text-[var(--muted-foreground)]">
                    Monto
                  </th>
                  <th className="text-left p-4 font-medium text-[var(--muted-foreground)]">
                    Estado
                  </th>
                  <th className="text-left p-4 font-medium text-[var(--muted-foreground)]">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/50"
                  >
                    <td className="p-4 font-mono text-sm">#{invoice.id}</td>
                    <td className="p-4">{invoice.orgName || "-"}</td>
                    <td className="p-4 font-medium">${invoice.amount}</td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          invoice.status
                        )}`}
                      >
                        {invoice.status}
                      </span>
                    </td>
                    <td className="p-4 text-[var(--muted-foreground)]">
                      {invoice.createdAt
                        ? new Date(invoice.createdAt).toLocaleDateString()
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
  );
}
