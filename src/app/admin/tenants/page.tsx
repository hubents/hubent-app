import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Building2, 
  Search, 
  MoreVertical,
  Eye,
  UserCog,
  Ban,
  Trash2
} from "lucide-react";
import { db } from "@/db";
import { organizations, subscriptionPlans, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import Link from "next/link";

async function getTenants() {
  return await db
    .select({
      id: organizations.id,
      name: organizations.name,
      slug: organizations.slug,
      status: organizations.status,
      createdAt: organizations.createdAt,
      planId: organizations.planId,
    })
    .from(organizations)
    .orderBy(organizations.createdAt);
}

async function getPlans() {
  return await db.select().from(subscriptionPlans);
}

export default async function TenantsPage() {
  const tenants = await getTenants();
  const plans = await getPlans();

  const getPlanName = (planId: number | null) => {
    if (!planId) return "Sin plan";
    const plan = plans.find((p) => p.id === planId);
    return plan?.name || "Desconocido";
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "active":
        return "bg-green-500/10 text-green-500";
      case "suspended":
        return "bg-yellow-500/10 text-yellow-500";
      case "deleted":
        return "bg-red-500/10 text-red-500";
      default:
        return "bg-gray-500/10 text-gray-500";
    }
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Tenants</h1>
          <p className="text-[var(--muted-foreground)]">
            Gestiona todas las organizaciones de la plataforma
          </p>
        </div>
        <Button>
          <Building2 className="h-4 w-4 mr-2" />
          Nuevo Tenant
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
              <Input
                placeholder="Buscar por nombre o slug..."
                className="pl-10"
              />
            </div>
            <select className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)]">
              <option value="">Todos los estados</option>
              <option value="active">Activo</option>
              <option value="suspended">Suspendido</option>
              <option value="deleted">Eliminado</option>
            </select>
            <select className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)]">
              <option value="">Todos los planes</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Tenants Table */}
      <Card>
        <CardContent className="p-0">
          {tenants.length === 0 ? (
            <div className="p-8 text-center">
              <Building2 className="h-12 w-12 mx-auto text-[var(--muted-foreground)] mb-4" />
              <h3 className="font-medium mb-2">No hay tenants</h3>
              <p className="text-sm text-[var(--muted-foreground)]">
                Aún no se han registrado organizaciones en la plataforma
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left p-4 font-medium text-[var(--muted-foreground)]">
                    Organización
                  </th>
                  <th className="text-left p-4 font-medium text-[var(--muted-foreground)]">
                    Plan
                  </th>
                  <th className="text-left p-4 font-medium text-[var(--muted-foreground)]">
                    Estado
                  </th>
                  <th className="text-left p-4 font-medium text-[var(--muted-foreground)]">
                    Creado
                  </th>
                  <th className="text-right p-4 font-medium text-[var(--muted-foreground)]">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => (
                  <tr
                    key={tenant.id}
                    className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--muted)]/50"
                  >
                    <td className="p-4">
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
                    </td>
                    <td className="p-4">
                      <Badge variant="secondary">
                        {getPlanName(tenant.planId)}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          tenant.status
                        )}`}
                      >
                        {tenant.status}
                      </span>
                    </td>
                    <td className="p-4 text-[var(--muted-foreground)]">
                      {tenant.createdAt
                        ? new Date(tenant.createdAt).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/tenants/${tenant.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="sm">
                          <UserCog className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-500">
                          <Ban className="h-4 w-4" />
                        </Button>
                      </div>
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
