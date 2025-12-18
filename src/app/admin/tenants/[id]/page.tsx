import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  Users, 
  Calendar,
  CreditCard,
  ArrowLeft,
  UserCog,
  Ban,
  Trash2,
  ExternalLink
} from "lucide-react";
import { db } from "@/db";
import { organizations, organizationMembers, events, subscriptions, subscriptionPlans, users } from "@/db/schema";
import { eq, count } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

async function getTenant(id: number) {
  const [tenant] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, id))
    .limit(1);

  return tenant;
}

async function getTenantStats(orgId: number) {
  const [membersCount] = await db
    .select({ count: count() })
    .from(organizationMembers)
    .where(eq(organizationMembers.organizationId, orgId));

  const [eventsCount] = await db
    .select({ count: count() })
    .from(events)
    .where(eq(events.organizationId, orgId));

  const [subscription] = await db
    .select({
      status: subscriptions.status,
      planName: subscriptionPlans.name,
      currentPeriodEnd: subscriptions.currentPeriodEnd,
    })
    .from(subscriptions)
    .leftJoin(subscriptionPlans, eq(subscriptions.planId, subscriptionPlans.id))
    .where(eq(subscriptions.organizationId, orgId))
    .limit(1);

  return {
    members: membersCount?.count || 0,
    events: eventsCount?.count || 0,
    subscription,
  };
}

async function getTenantMembers(orgId: number) {
  return await db
    .select({
      id: organizationMembers.id,
      userId: organizationMembers.userId,
      userName: users.name,
      userEmail: users.email,
      userImage: users.image,
      joinedAt: organizationMembers.joinedAt,
    })
    .from(organizationMembers)
    .leftJoin(users, eq(organizationMembers.userId, users.id))
    .where(eq(organizationMembers.organizationId, orgId))
    .limit(10);
}

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const tenantId = parseInt(id);
  
  if (isNaN(tenantId)) {
    notFound();
  }

  const tenant = await getTenant(tenantId);
  
  if (!tenant) {
    notFound();
  }

  const stats = await getTenantStats(tenantId);
  const members = await getTenantMembers(tenantId);

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
      {/* Back Button */}
      <Link
        href="/admin/tenants"
        className="inline-flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Tenants
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
            <Building2 className="h-8 w-8 text-[var(--primary)]" />
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{tenant.name}</h1>
              <span
                className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                  tenant.status
                )}`}
              >
                {tenant.status}
              </span>
            </div>
            <p className="text-[var(--muted-foreground)]">{tenant.slug}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2">
            <ExternalLink className="h-4 w-4" />
            Impersonar
          </Button>
          <Button variant="outline" className="gap-2 text-yellow-500 border-yellow-500/50">
            <Ban className="h-4 w-4" />
            Suspender
          </Button>
          <Button variant="outline" className="gap-2 text-red-500 border-red-500/50">
            <Trash2 className="h-4 w-4" />
            Eliminar
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-blue-500/10">
                <Users className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.members}</p>
                <p className="text-sm text-[var(--muted-foreground)]">Miembros</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-green-500/10">
                <Calendar className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.events}</p>
                <p className="text-sm text-[var(--muted-foreground)]">Eventos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-lg bg-purple-500/10">
                <CreditCard className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {stats.subscription?.planName || "Sin plan"}
                </p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  {stats.subscription?.status || "No suscrito"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Información</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between py-2 border-b border-[var(--border)]">
              <span className="text-[var(--muted-foreground)]">ID</span>
              <span className="font-mono">{tenant.id}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[var(--border)]">
              <span className="text-[var(--muted-foreground)]">Slug</span>
              <span>{tenant.slug}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[var(--border)]">
              <span className="text-[var(--muted-foreground)]">Creado</span>
              <span>
                {tenant.createdAt
                  ? new Date(tenant.createdAt).toLocaleDateString()
                  : "-"}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-[var(--muted-foreground)]">Owner ID</span>
              <span className="font-mono text-sm">{tenant.ownerId || "-"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Members */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg">Miembros</CardTitle>
            <Button variant="ghost" size="sm">
              Ver todos
            </Button>
          </CardHeader>
          <CardContent>
            {members.length === 0 ? (
              <p className="text-[var(--muted-foreground)] text-sm">
                No hay miembros en esta organización
              </p>
            ) : (
              <div className="space-y-3">
                {members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-[var(--muted)]"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
                        {member.userImage ? (
                          <img
                            src={member.userImage}
                            alt={member.userName || ""}
                            className="w-8 h-8 rounded-full"
                          />
                        ) : (
                          <Users className="h-4 w-4 text-[var(--primary)]" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm">
                          {member.userName || "Sin nombre"}
                        </p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {member.userEmail}
                        </p>
                      </div>
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
