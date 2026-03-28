"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Building2,
  Store,
  Users,
  Calendar,
  CreditCard,
  ArrowLeft,
  Ban,
  Trash2,
  ExternalLink,
  Loader2,
  Play,
  CheckCircle,
  XCircle,
  Clock,
  Instagram,
  Globe,
  MapPin,
  ShieldCheck,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";

interface Tenant {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
  orgType: string | null;
  status: string | null;
  planId: number | null;
  phone: string | null;
  website: string | null;
  ownerId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  verificationStatus: string | null;
  verifiedAt: string | null;
  verifiedBy: string | null;
  rejectionReason: string | null;
  providerCategory: string | null;
  description: string | null;
  tagline: string | null;
  instagramHandle: string | null;
  city: string | null;
  region: string | null;
  serviceAreas: string[] | null;
  serviceRadius: number | null;
  profileCompleteness: number | null;
  services: string[] | null;
  publicEmail: string | null;
  priceRange: string | null;
}

interface Subscription {
  id: number;
  status: string;
  planId: number;
  planName: string | null;
  trialEndsAt: string | null;
  currentPeriodEnd: string | null;
}

interface TypeConfig {
  slug: string;
  label: string;
  color: string;
  isMarketplaceVisible: boolean;
  hasPublicProfile: boolean;
  hasPortfolio: boolean;
  canCreateEvents: boolean;
}

const ORG_TYPE_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  tenant: Building2,
  provider: Store,
};

const VERIFICATION_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  verified: { label: "Verificado", color: "text-green-600 bg-green-500/10", icon: CheckCircle },
  unverified: { label: "Pendiente verificación", color: "text-yellow-600 bg-yellow-500/10", icon: Clock },
  rejected: { label: "Rechazado", color: "text-red-500 bg-red-500/10", icon: XCircle },
  suspended: { label: "Suspendido", color: "text-gray-500 bg-gray-500/10", icon: Ban },
};

export default function TenantDetailPage() {
  const params = useParams();
  const router = useRouter();
  const tenantId = params.id as string;

  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [owner, setOwner] = useState<{ id: string; name: string | null; email: string } | null>(null);
  const [verifiedByUser, setVerifiedByUser] = useState<{ id: string; name: string | null; email: string } | null>(null);
  const [membersCount, setMembersCount] = useState(0);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [typeConfig, setTypeConfig] = useState<TypeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [error, setError] = useState("");

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    fetchTenant();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const fetchTenant = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al cargar la organización");
        return;
      }
      setTenant(data.tenant);
      setOwner(data.owner);
      setVerifiedByUser(data.verifiedByUser);
      setMembersCount(data.membersCount || 0);
      setSubscription(data.subscription);
      setTypeConfig(data.typeConfig);
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const handleAction = async (action: "suspend" | "activate" | "delete") => {
    const labels = { suspend: "suspender", activate: "activar", delete: "eliminar" };
    if (!confirm(`¿Estás seguro de ${labels[action]} esta organización?`)) return;

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
      if (action === "delete") {
        router.push("/admin/tenants");
      } else {
        setTenant(data.tenant);
      }
    } catch {
      alert("Error de conexión");
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerify = async () => {
    setVerifyLoading(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify" }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error?.message || "Error al verificar");
        return;
      }
      fetchTenant();
    } catch {
      alert("Error de conexión");
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectionReason.trim()) return;
    setVerifyLoading(true);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", rejectionReason: rejectionReason.trim() }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error?.message || "Error al rechazar");
        return;
      }
      setRejectDialogOpen(false);
      setRejectionReason("");
      fetchTenant();
    } catch {
      alert("Error de conexión");
    } finally {
      setVerifyLoading(false);
    }
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "active": return "bg-green-500/10 text-green-600";
      case "suspended": return "bg-yellow-500/10 text-yellow-600";
      case "deleted": return "bg-red-500/10 text-red-600";
      default: return "bg-gray-500/10 text-gray-600";
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case "active": return "Activo";
      case "suspended": return "Suspendido";
      case "deleted": return "Eliminado";
      default: return status || "-";
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
        <Link href="/admin/tenants" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" />
          Volver a Organizaciones
        </Link>
        <div className="text-center py-12">
          <p className="text-red-500">{error || "Organización no encontrada"}</p>
        </div>
      </div>
    );
  }

  const TypeIcon = ORG_TYPE_ICONS[tenant.orgType || ""] || Building2;
  const typeColor = typeConfig?.slug === "provider" ? "bg-purple-500/10 text-purple-600" : "bg-blue-500/10 text-blue-600";
  const verif = VERIFICATION_CONFIG[tenant.verificationStatus || "unverified"] || VERIFICATION_CONFIG["unverified"];
  const VerifIcon = verif.icon;
  const isMarketplace = typeConfig?.isMarketplaceVisible ?? false;
  const hasPublicProfile = typeConfig?.hasPublicProfile ?? false;

  return (
    <div className="p-8">
      <Link href="/admin/tenants" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="h-4 w-4" />
        Volver a Organizaciones
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${typeColor}`}>
            <TypeIcon className="h-8 w-8" />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">{tenant.name}</h1>
              {typeConfig && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeColor}`}>
                  {typeConfig.label}
                </span>
              )}
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(tenant.status)}`}>
                {getStatusLabel(tenant.status)}
              </span>
              {isMarketplace && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${verif.color}`}>
                  <VerifIcon className="h-3 w-3" />
                  {verif.label}
                </span>
              )}
            </div>
            <p className="text-muted-foreground mt-1">{tenant.slug}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap justify-end">
          <Button variant="outline" className="gap-2" onClick={() => window.open(`/dashboard?org=${tenant.slug}`, "_blank")}>
            <ExternalLink className="h-4 w-4" />
            Impersonar
          </Button>
          {tenant.status === "active" ? (
            <Button
              variant="outline"
              className="gap-2 text-yellow-600 border-yellow-500/50"
              onClick={() => handleAction("suspend")}
              disabled={!!actionLoading}
            >
              {actionLoading === "suspend" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
              Suspender
            </Button>
          ) : tenant.status === "suspended" ? (
            <Button
              variant="outline"
              className="gap-2 text-green-600 border-green-500/50"
              onClick={() => handleAction("activate")}
              disabled={!!actionLoading}
            >
              {actionLoading === "activate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
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
              {actionLoading === "delete" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              Eliminar
            </Button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
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
                <p className="text-2xl font-bold">{subscription?.planName || "Sin plan"}</p>
                <p className="text-sm text-muted-foreground">{subscription?.status || "No suscrito"}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Info */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Información</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { label: "ID", value: <span className="font-mono text-sm">{tenant.id}</span> },
              { label: "Slug", value: tenant.slug },
              { label: "Tipo", value: typeConfig?.label || tenant.orgType },
              { label: "Creado", value: tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString("es-AR") : "-" },
              { label: "Teléfono", value: tenant.phone || "-" },
              {
                label: "Sitio web",
                value: tenant.website ? (
                  <a href={tenant.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1">
                    <Globe className="h-3.5 w-3.5" />
                    {tenant.website}
                  </a>
                ) : "-",
              },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between items-center py-2 border-b border-border last:border-0">
                <span className="text-muted-foreground text-sm">{label}</span>
                <span className="text-sm font-medium">{value}</span>
              </div>
            ))}
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
                  <User className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="font-medium">{owner.name || "Sin nombre"}</p>
                  <p className="text-sm text-muted-foreground">{owner.email}</p>
                  <p className="text-xs text-muted-foreground font-mono mt-1">{owner.id}</p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">No hay propietario asignado</p>
            )}
          </CardContent>
        </Card>

        {/* Verification section — only for marketplace-visible orgs */}
        {isMarketplace && (
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <ShieldCheck className="h-5 w-5" />
                Verificación
              </CardTitle>
              <div className="flex items-center gap-2">
                {tenant.verificationStatus !== "verified" && (
                  <Button
                    size="sm"
                    className="gap-2 bg-green-600 hover:bg-green-700 text-white"
                    onClick={handleVerify}
                    disabled={verifyLoading}
                  >
                    {verifyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                    Verificar
                  </Button>
                )}
                {tenant.verificationStatus !== "rejected" && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 text-red-500 border-red-500/50"
                    onClick={() => { setRejectionReason(""); setRejectDialogOpen(true); }}
                    disabled={verifyLoading}
                  >
                    <XCircle className="h-4 w-4" />
                    Rechazar
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Estado actual</p>
                  <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium ${verif.color}`}>
                    <VerifIcon className="h-4 w-4" />
                    {verif.label}
                  </div>
                </div>
                <div className="p-4 rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Verificado el</p>
                  <p className="text-sm font-medium">
                    {tenant.verifiedAt ? new Date(tenant.verifiedAt).toLocaleDateString("es-AR") : "-"}
                  </p>
                </div>
                <div className="p-4 rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Verificado por</p>
                  <p className="text-sm font-medium">
                    {verifiedByUser ? (verifiedByUser.name || verifiedByUser.email) : "-"}
                  </p>
                </div>
              </div>
              {tenant.rejectionReason && (
                <div className="mt-4 p-4 rounded-lg bg-red-500/5 border border-red-500/20">
                  <p className="text-xs text-muted-foreground mb-1">Motivo de rechazo</p>
                  <p className="text-sm text-red-600">{tenant.rejectionReason}</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Public profile section — only for orgs with hasPublicProfile */}
        {hasPublicProfile && (
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Perfil público
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Profile completeness */}
              {tenant.profileCompleteness !== null && (
                <div className="mb-4">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-muted-foreground">Completitud del perfil</span>
                    <span className="font-medium">{tenant.profileCompleteness}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        tenant.profileCompleteness >= 80 ? "bg-green-500" :
                        tenant.profileCompleteness >= 50 ? "bg-yellow-500" :
                        "bg-red-500"
                      }`}
                      style={{ width: `${tenant.profileCompleteness}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[
                  { label: "Categoría", value: tenant.providerCategory || "-" },
                  { label: "Rango de precio", value: tenant.priceRange || "-" },
                  {
                    label: "Instagram",
                    value: tenant.instagramHandle ? (
                      <a
                        href={`https://instagram.com/${tenant.instagramHandle}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline flex items-center gap-1"
                      >
                        <Instagram className="h-3.5 w-3.5" />
                        @{tenant.instagramHandle}
                      </a>
                    ) : "-",
                  },
                  {
                    label: "Ubicación",
                    value: [tenant.city, tenant.region].filter(Boolean).join(", ") || "-",
                  },
                  { label: "Email público", value: tenant.publicEmail || "-" },
                  {
                    label: "Radio de servicio",
                    value: tenant.serviceRadius ? `${tenant.serviceRadius} km` : "-",
                  },
                ].map(({ label, value }) => (
                  <div key={label} className="p-3 rounded-lg border border-border">
                    <p className="text-xs text-muted-foreground mb-1">{label}</p>
                    <p className="text-sm font-medium">{value}</p>
                  </div>
                ))}
              </div>

              {tenant.description && (
                <div className="p-3 rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Descripción</p>
                  <p className="text-sm">{tenant.description}</p>
                </div>
              )}

              {tenant.tagline && (
                <div className="p-3 rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground mb-1">Tagline</p>
                  <p className="text-sm italic">{tenant.tagline}</p>
                </div>
              )}

              {tenant.serviceAreas && tenant.serviceAreas.length > 0 && (
                <div className="p-3 rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground mb-2 flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" />
                    Zonas de servicio
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {tenant.serviceAreas.map((area) => (
                      <Badge key={area} variant="secondary" className="text-xs">{area}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {tenant.services && tenant.services.length > 0 && (
                <div className="p-3 rounded-lg border border-border">
                  <p className="text-xs text-muted-foreground mb-2">Servicios</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tenant.services.map((service) => (
                      <Badge key={service} variant="outline" className="text-xs">{service}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Reject dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rechazar organización</AlertDialogTitle>
            <AlertDialogDescription>
              Indica el motivo de rechazo para <strong>{tenant.name}</strong>. Se enviará un email al propietario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor="detailRejectionReason" className="text-sm font-medium mb-1 block">
              Motivo de rechazo *
            </Label>
            <textarea
              id="detailRejectionReason"
              className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-none"
              rows={3}
              placeholder="Ej: El perfil está incompleto o la información no es verificable."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRejectConfirm}
              disabled={!rejectionReason.trim() || verifyLoading}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {verifyLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Rechazar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
