"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  Users, 
  Calendar,
  CreditCard,
  ArrowLeft,
  Ban,
  Trash2,
  ExternalLink,
  Loader2,
  CheckCircle,
  Play
} from "lucide-react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";

interface Tenant {
  id: number;
  name: string;
  slug: string;
  status: string | null;
  planId: number | null;
  phone: string | null;
  website: string | null;
  ownerId: string | null;
  createdAt: string | null;
}

interface Member {
  id: number;
  name: string | null;
  email: string;
  image: string | null;
}

interface Subscription {
  id: number;
  status: string;
  planId: number;
  planName: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
}

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.id as string;

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [owner, setOwner] = useState<{ id: string; name: string | null; email: string } | null>(null);
  const [membersCount, setMembersCount] = useState(0);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTenant();
  }, [tenantId]);

  const fetchTenant = async () => {
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}`);
      const data = await res.json();
      
      if (!res.ok) {
        setError(data.error || "Error al cargar tenant");
        return;
      }

      setTenant(data.tenant);
      setOwner(data.owner);
      setMembersCount(data.membersCount || 0);
      setSubscription(data.subscription);
    } catch (e) {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: "suspend" | "activate" | "delete") => {
    if (!confirm(`¿Estás seguro de ${action === "suspend" ? "suspender" : action === "activate" ? "activar" : "eliminar"} este tenant?`)) {
      return;
    }

    setActionLoading(action);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Error al ejecutar acción");
        return;
      }

      setTenant(data.tenant);
      if (action === "delete") {
        router.push("/admin/tenants");
      }
    } catch (e) {
      alert("Error de conexión");
    } finally {
      setActionLoading(null);
    }
  };

  const handleImpersonate = () => {
    // Open tenant dashboard in new tab
    window.open(`/dashboard?org=${tenant?.slug}`, "_blank");
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

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="p-8">
        <Link
          href="/admin/tenants"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Tenants
        </Link>
        <div className="text-center py-12">
          <p className="text-red-500">{error || "Tenant no encontrado"}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Back Button */}
      <Link
        href="/admin/tenants"
        className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
      >
        <ArrowLeft className="h-4 w-4" />
        Volver a Tenants
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-xl bg-primary/10 flex items-center justify-center">
            <Building2 className="h-8 w-8 text-primary" />
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
            <p className="text-muted-foreground">{tenant.slug}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={handleImpersonate}>
            <ExternalLink className="h-4 w-4" />
            Impersonar
          </Button>
          {tenant.status === "active" ? (
            <Button 
              variant="outline" 
              className="gap-2 text-yellow-500 border-yellow-500/50"
              onClick={() => handleAction("suspend")}
              disabled={!!actionLoading}
            >
              {actionLoading === "suspend" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Ban className="h-4 w-4" />
              )}
              Suspender
            </Button>
          ) : tenant.status === "suspended" ? (
            <Button 
              variant="outline" 
              className="gap-2 text-green-500 border-green-500/50"
              onClick={() => handleAction("activate")}
              disabled={!!actionLoading}
            >
              {actionLoading === "activate" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Play className="h-4 w-4" />
              )}
              Activar
            </Button>
          ) : null}
          {tenant.status !== "deleted" && (
            <Button 
              variant="outline" 
              className="gap-2 text-red-500 border-red-500/50"
              onClick={() => handleAction("delete")}
              disabled={!!actionLoading}
            >
              {actionLoading === "delete" ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
              Eliminar
            </Button>
          )}
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
                <p className="text-2xl font-bold">{membersCount}</p>
                <p className="text-sm text-muted-foreground">Miembros</p>
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
                <p className="text-2xl font-bold">-</p>
                <p className="text-sm text-muted-foreground">Eventos</p>
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
                  {subscription?.planName || "Sin plan"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {subscription?.status || "No suscrito"}
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
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">ID</span>
              <span className="font-mono">{tenant.id}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Slug</span>
              <span>{tenant.slug}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Creado</span>
              <span>
                {tenant.createdAt
                  ? new Date(tenant.createdAt).toLocaleDateString()
                  : "-"}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Teléfono</span>
              <span>{tenant.phone || "-"}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Sitio web</span>
              <span>{tenant.website || "-"}</span>
            </div>
          </CardContent>
        </Card>

        {/* Owner */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Propietario</CardTitle>
          </CardHeader>
          <CardContent>
            {owner ? (
              <div className="flex items-center gap-4 p-4 rounded-lg bg-muted">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{owner.name || "Sin nombre"}</p>
                  <p className="text-sm text-muted-foreground">{owner.email}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-1">{owner.id}</p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                No hay propietario asignado
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
