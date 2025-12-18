import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Building2, 
  Users, 
  DollarSign, 
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { db } from "@/db";
import { organizations, users, subscriptions, invoices } from "@/db/schema";
import { count, sum, eq } from "drizzle-orm";

async function getStats() {
  const [tenantsCount] = await db.select({ count: count() }).from(organizations);
  const [usersCount] = await db.select({ count: count() }).from(users);
  const [activeSubscriptions] = await db
    .select({ count: count() })
    .from(subscriptions)
    .where(eq(subscriptions.status, "active"));
  const [revenue] = await db
    .select({ total: sum(invoices.amount) })
    .from(invoices)
    .where(eq(invoices.status, "paid"));

  return {
    tenants: tenantsCount?.count || 0,
    users: usersCount?.count || 0,
    activeSubscriptions: activeSubscriptions?.count || 0,
    mrr: Number(revenue?.total || 0),
  };
}

async function getRecentTenants() {
  return await db
    .select()
    .from(organizations)
    .orderBy(organizations.createdAt)
    .limit(5);
}

export default async function AdminDashboardPage() {
  const stats = await getStats();
  const recentTenants = await getRecentTenants();

  const statCards = [
    {
      title: "Total Tenants",
      value: stats.tenants,
      change: "+12%",
      trend: "up",
      icon: Building2,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Total Usuarios",
      value: stats.users,
      change: "+8%",
      trend: "up",
      icon: Users,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Suscripciones Activas",
      value: stats.activeSubscriptions,
      change: "+5%",
      trend: "up",
      icon: TrendingUp,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
    {
      title: "MRR",
      value: `$${stats.mrr.toLocaleString()}`,
      change: "+15%",
      trend: "up",
      icon: DollarSign,
      color: "text-yellow-500",
      bgColor: "bg-yellow-500/10",
    },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Platform Overview</h1>
        <p className="text-[var(--muted-foreground)]">
          Métricas y estadísticas de la plataforma HubEnts
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
                <div className={`flex items-center gap-1 text-sm ${
                  stat.trend === "up" ? "text-green-500" : "text-red-500"
                }`}>
                  {stat.change}
                  {stat.trend === "up" ? (
                    <ArrowUpRight className="h-4 w-4" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4" />
                  )}
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold">{stat.value}</p>
                <p className="text-sm text-[var(--muted-foreground)]">{stat.title}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Recent Tenants */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Tenants Recientes</CardTitle>
          </CardHeader>
          <CardContent>
            {recentTenants.length === 0 ? (
              <p className="text-[var(--muted-foreground)] text-sm">
                No hay tenants registrados aún
              </p>
            ) : (
              <div className="space-y-4">
                {recentTenants.map((tenant) => (
                  <div
                    key={tenant.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-[var(--muted)]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                        <Building2 className="h-5 w-5 text-[var(--primary)]" />
                      </div>
                      <div>
                        <p className="font-medium">{tenant.name}</p>
                        <p className="text-sm text-[var(--muted-foreground)]">
                          {tenant.slug}
                        </p>
                      </div>
                    </div>
                    <Badge variant={tenant.status === "active" ? "default" : "secondary"}>
                      {tenant.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Acciones Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <a
              href="/admin/tenants"
              className="flex items-center gap-3 p-3 rounded-lg bg-[var(--muted)] hover:bg-[var(--muted)]/80 transition-colors"
            >
              <Building2 className="h-5 w-5 text-[var(--primary)]" />
              <span>Ver todos los tenants</span>
            </a>
            <a
              href="/admin/users"
              className="flex items-center gap-3 p-3 rounded-lg bg-[var(--muted)] hover:bg-[var(--muted)]/80 transition-colors"
            >
              <Users className="h-5 w-5 text-[var(--primary)]" />
              <span>Gestionar usuarios</span>
            </a>
            <a
              href="/admin/plans"
              className="flex items-center gap-3 p-3 rounded-lg bg-[var(--muted)] hover:bg-[var(--muted)]/80 transition-colors"
            >
              <DollarSign className="h-5 w-5 text-[var(--primary)]" />
              <span>Configurar planes</span>
            </a>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
