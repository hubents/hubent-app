"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  Search,
  Eye,
  ExternalLink,
  Ban,
  Plus,
  X,
  Loader2,
  Play,
  Trash2,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  ShieldCheck,
} from "lucide-react";
import Link from "next/link";
import { NumericPagination } from "@/components/ui/numeric-pagination";

interface Tenant {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
  orgType: string | null;
  status: string | null;
  planId: number | null;
  planName: string | null;
  subscriptionStatus: string | null;
  phone: string | null;
  website: string | null;
  ownerId: string | null;
  createdAt: string | null;
  verificationStatus: string | null;
  verifiedAt: string | null;
  providerCategory: string | null;
  instagramHandle: string | null;
  profileCompleteness: number | null;
  city: string | null;
  region: string | null;
}

interface Plan {
  id: number;
  name: string;
  slug: string;
}

interface Meta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  globalTotal: number;
  typeCounts: Record<string, number>;
  pendingVerification: number;
}

const ORG_TYPE_CONFIG: Record<string, { label: string; color: string; icon: React.ComponentType<{ className?: string }> }> = {
  tenant: { label: "Planificador", color: "bg-blue-500/10 text-blue-600", icon: Building2 },
  provider: { label: "Proveedor", color: "bg-purple-500/10 text-purple-600", icon: Store },
  client: { label: "Cliente", color: "bg-gray-500/10 text-gray-600", icon: Users },
};

const VERIFICATION_CONFIG: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline"; icon: React.ComponentType<{ className?: string }> }> = {
  verified: { label: "Verificado", variant: "default", icon: CheckCircle },
  unverified: { label: "Pendiente", variant: "secondary", icon: Clock },
  rejected: { label: "Rechazado", variant: "destructive", icon: XCircle },
  suspended: { label: "Suspendido", variant: "outline", icon: Ban },
};

const MARKETPLACE_VISIBLE_TYPES = ["tenant", "provider"];

export default function OrganizacionesPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [verifyLoading, setVerifyLoading] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState<Meta>({
    page: 1,
    limit: 50,
    total: 0,
    totalPages: 0,
    globalTotal: 0,
    typeCounts: {},
    pendingVerification: 0,
  });

  // Server-side filters
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [orgTypeFilter, setOrgTypeFilter] = useState("");
  const [verificationFilter, setVerificationFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(value), 350);
  };

  // Reject dialog state
  const [rejectDialog, setRejectDialog] = useState<{ open: boolean; tenantId: number | null; tenantName: string }>({
    open: false,
    tenantId: null,
    tenantName: "",
  });
  const [rejectionReason, setRejectionReason] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    orgType: "tenant",
    planId: "",
    phone: "",
    website: "",
    ownerEmail: "",
    ownerName: "",
    sendWelcomeEmail: true,
  });

  const buildParams = useCallback(() => {
    const params = new URLSearchParams({ page: page.toString() });
    if (debouncedSearch) params.set("search", debouncedSearch);
    if (orgTypeFilter) params.set("orgType", orgTypeFilter);
    if (verificationFilter) params.set("verificationStatus", verificationFilter);
    if (statusFilter) params.set("status", statusFilter);
    return params;
  }, [page, debouncedSearch, orgTypeFilter, verificationFilter, statusFilter]);

  const fetchTenants = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/tenants?${buildParams()}`);
      const data = await res.json();
      setTenants(data.tenants || []);
      setPlans(data.plans || []);
      if (data.meta) setMeta(data.meta);
    } catch (e) {
      console.error("Error fetching organizations:", e);
    } finally {
      setLoading(false);
    }
  }, [buildParams]);

  useEffect(() => {
    fetchTenants();
  }, [fetchTenants]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, orgTypeFilter, verificationFilter, statusFilter]);

  const handleTenantAction = async (tenantId: number, action: "suspend" | "activate" | "delete") => {
    const labels = { suspend: "suspender", activate: "activar", delete: "eliminar" };
    if (!confirm(`¿Estás seguro de ${labels[action]} esta organización?`)) return;

    setActionLoading(tenantId);
    try {
      const res = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Error al ejecutar acción");
        return;
      }
      fetchTenants();
    } catch {
      alert("Error de conexión");
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerify = async (tenantId: number) => {
    setVerifyLoading(tenantId);
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
      fetchTenants();
    } catch {
      alert("Error de conexión");
    } finally {
      setVerifyLoading(null);
    }
  };

  const handleRejectConfirm = async () => {
    if (!rejectDialog.tenantId || !rejectionReason.trim()) return;
    setVerifyLoading(rejectDialog.tenantId);
    try {
      const res = await fetch(`/api/admin/tenants/${rejectDialog.tenantId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", rejectionReason: rejectionReason.trim() }),
      });
      const data = await res.json();
      if (!data.success) {
        alert(data.error?.message || "Error al rechazar");
        return;
      }
      setRejectDialog({ open: false, tenantId: null, tenantName: "" });
      setRejectionReason("");
      fetchTenants();
    } catch {
      alert("Error de conexión");
    } finally {
      setVerifyLoading(null);
    }
  };

  const handleImpersonate = (slug: string) => {
    window.open(`/dashboard?org=${slug}`, "_blank");
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError("");
    try {
      const res = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          slug: formData.slug,
          orgType: formData.orgType,
          planId: formData.planId ? parseInt(formData.planId) : null,
          phone: formData.phone || null,
          website: formData.website || null,
          ownerEmail: formData.ownerEmail || null,
          ownerName: formData.ownerName || null,
          sendWelcomeEmail: formData.sendWelcomeEmail,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Error al crear organización");
        return;
      }
      setShowModal(false);
      setFormData({ name: "", slug: "", orgType: "tenant", planId: "", phone: "", website: "", ownerEmail: "", ownerName: "", sendWelcomeEmail: true });
      fetchTenants();
    } catch {
      setError("Error de conexión");
    } finally {
      setCreating(false);
    }
  };

  const generateSlug = (name: string) =>
    name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

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

  const filteredByPlan = planFilter
    ? tenants.filter((t) => t.planId === parseInt(planFilter))
    : tenants;

  const totalPlanners = meta.typeCounts["tenant"] || 0;
  const totalProviders = meta.typeCounts["provider"] || 0;

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Organizaciones</h1>
          <p className="text-muted-foreground">
            Gestiona todas las organizaciones de la plataforma
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Organización
        </Button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <button
          onClick={() => { setOrgTypeFilter(""); setVerificationFilter(""); }}
          className={`text-left rounded-lg border p-4 transition-colors hover:bg-muted/50 ${!orgTypeFilter && !verificationFilter ? "border-primary bg-primary/5" : "border-border"}`}
        >
          <p className="text-2xl font-bold">{meta.globalTotal}</p>
          <p className="text-sm text-muted-foreground">Total organizaciones</p>
        </button>
        <button
          onClick={() => { setOrgTypeFilter("tenant"); setVerificationFilter(""); }}
          className={`text-left rounded-lg border p-4 transition-colors hover:bg-muted/50 ${orgTypeFilter === "tenant" ? "border-blue-500 bg-blue-500/5" : "border-border"}`}
        >
          <p className="text-2xl font-bold text-blue-600">{totalPlanners}</p>
          <p className="text-sm text-muted-foreground">Planificadores</p>
        </button>
        <button
          onClick={() => { setOrgTypeFilter("provider"); setVerificationFilter(""); }}
          className={`text-left rounded-lg border p-4 transition-colors hover:bg-muted/50 ${orgTypeFilter === "provider" ? "border-purple-500 bg-purple-500/5" : "border-border"}`}
        >
          <p className="text-2xl font-bold text-purple-600">{totalProviders}</p>
          <p className="text-sm text-muted-foreground">Proveedores</p>
        </button>
        <button
          onClick={() => { setOrgTypeFilter(""); setVerificationFilter("unverified"); }}
          className={`text-left rounded-lg border p-4 transition-colors hover:bg-muted/50 ${verificationFilter === "unverified" ? "border-yellow-500 bg-yellow-500/5" : "border-border"}`}
        >
          <p className="text-2xl font-bold text-yellow-600">{meta.pendingVerification}</p>
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <ShieldCheck className="h-3.5 w-3.5" />
            Pendientes verificación
          </p>
        </button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o slug..."
                className="pl-10"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
              />
            </div>
            <select
              className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
              value={orgTypeFilter}
              onChange={(e) => setOrgTypeFilter(e.target.value)}
            >
              <option value="">Todos los tipos</option>
              <option value="tenant">Planificador</option>
              <option value="provider">Proveedor</option>
            </select>
            <select
              className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
              value={verificationFilter}
              onChange={(e) => setVerificationFilter(e.target.value)}
            >
              <option value="">Verificación: Todos</option>
              <option value="unverified">Pendiente</option>
              <option value="verified">Verificado</option>
              <option value="rejected">Rechazado</option>
            </select>
            <select
              className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Todos los estados</option>
              <option value="active">Activo</option>
              <option value="suspended">Suspendido</option>
              <option value="deleted">Eliminado</option>
            </select>
            <select
              className="px-3 py-2 rounded-lg border border-border bg-background text-sm"
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
            >
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

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-12 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredByPlan.length === 0 ? (
            <div className="p-8 text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No hay organizaciones</h3>
              <p className="text-sm text-muted-foreground">
                {search || orgTypeFilter || verificationFilter || statusFilter || planFilter
                  ? "No se encontraron resultados con los filtros aplicados"
                  : "Aún no se han registrado organizaciones en la plataforma"}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 font-medium text-muted-foreground">Organización</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Tipo</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Plan</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Verificación</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Estado</th>
                  <th className="text-left p-4 font-medium text-muted-foreground">Creado</th>
                  <th className="text-right p-4 font-medium text-muted-foreground">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredByPlan.map((tenant) => {
                  const typeConf = ORG_TYPE_CONFIG[tenant.orgType || ""] || ORG_TYPE_CONFIG["tenant"];
                  const TypeIcon = typeConf.icon;
                  const isMarketplace = MARKETPLACE_VISIBLE_TYPES.includes(tenant.orgType || "");
                  const verif = VERIFICATION_CONFIG[tenant.verificationStatus || "unverified"] || VERIFICATION_CONFIG["unverified"];
                  const VerifIcon = verif.icon;
                  const isActionLoading = actionLoading === tenant.id;
                  const isVerifyLoading = verifyLoading === tenant.id;

                  return (
                    <tr key={tenant.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${typeConf.color}`}>
                            <TypeIcon className="h-5 w-5" />
                          </div>
                          <div>
                            <p className="font-medium">{tenant.name}</p>
                            <p className="text-xs text-muted-foreground">{tenant.slug}</p>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${typeConf.color}`}>
                          {typeConf.label}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <Badge variant="secondary">
                            {tenant.planName || "Sin plan"}
                          </Badge>
                          {tenant.subscriptionStatus && (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              tenant.subscriptionStatus === "active" ? "bg-green-500/10 text-green-600" :
                              tenant.subscriptionStatus === "trialing" ? "bg-yellow-500/10 text-yellow-600" :
                              tenant.subscriptionStatus === "canceled" ? "bg-red-500/10 text-red-600" :
                              "bg-gray-500/10 text-gray-600"
                            }`}>
                              {tenant.subscriptionStatus}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="p-4">
                        {isMarketplace ? (
                          <div className="flex items-center gap-1.5">
                            <VerifIcon className={`h-3.5 w-3.5 ${
                              tenant.verificationStatus === "verified" ? "text-green-600" :
                              tenant.verificationStatus === "rejected" ? "text-red-500" :
                              "text-yellow-600"
                            }`} />
                            <span className={`text-xs font-medium ${
                              tenant.verificationStatus === "verified" ? "text-green-600" :
                              tenant.verificationStatus === "rejected" ? "text-red-500" :
                              "text-yellow-600"
                            }`}>
                              {verif.label}
                            </span>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(tenant.status)}`}>
                          {getStatusLabel(tenant.status)}
                        </span>
                      </td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {tenant.createdAt ? new Date(tenant.createdAt).toLocaleDateString("es-AR") : "-"}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/admin/tenants/${tenant.id}`}>
                            <Button variant="ghost" size="sm" title="Ver detalle">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            title="Impersonar"
                            onClick={() => handleImpersonate(tenant.slug)}
                          >
                            <ExternalLink className="h-4 w-4" />
                          </Button>
                          {isMarketplace && tenant.verificationStatus !== "verified" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600"
                              title="Verificar"
                              onClick={() => handleVerify(tenant.id)}
                              disabled={isVerifyLoading}
                            >
                              {isVerifyLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                            </Button>
                          )}
                          {isMarketplace && tenant.verificationStatus !== "rejected" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500"
                              title="Rechazar"
                              onClick={() => {
                                setRejectionReason("");
                                setRejectDialog({ open: true, tenantId: tenant.id, tenantName: tenant.name });
                              }}
                              disabled={isVerifyLoading}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {tenant.status === "active" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-yellow-600"
                              title="Suspender"
                              onClick={() => handleTenantAction(tenant.id, "suspend")}
                              disabled={isActionLoading}
                            >
                              {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ban className="h-4 w-4" />}
                            </Button>
                          ) : tenant.status === "suspended" ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-green-600"
                              title="Activar"
                              onClick={() => handleTenantAction(tenant.id, "activate")}
                              disabled={isActionLoading}
                            >
                              {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
                            </Button>
                          ) : null}
                          {tenant.status !== "deleted" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500"
                              title="Eliminar"
                              onClick={() => handleTenantAction(tenant.id, "delete")}
                              disabled={isActionLoading}
                            >
                              {isActionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Mostrando {((meta.page - 1) * meta.limit) + 1}–{Math.min(meta.page * meta.limit, meta.total)} de {meta.total}
          </p>
          <NumericPagination
            currentPage={meta.page}
            totalPages={meta.totalPages}
            onPageChange={setPage}
          />
        </div>
      )}

      {/* Reject dialog */}
      <AlertDialog open={rejectDialog.open} onOpenChange={(open) => setRejectDialog((prev) => ({ ...prev, open }))}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rechazar organización</AlertDialogTitle>
            <AlertDialogDescription>
              Indica el motivo de rechazo para <strong>{rejectDialog.tenantName}</strong>. Se enviará un email al propietario.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor="rejectionReason" className="text-sm font-medium mb-1 block">
              Motivo de rechazo *
            </Label>
            <textarea
              id="rejectionReason"
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
              disabled={!rejectionReason.trim() || verifyLoading === rejectDialog.tenantId}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {verifyLoading === rejectDialog.tenantId ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Rechazar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Create modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold">Nueva Organización</h2>
              <Button variant="ghost" size="sm" onClick={() => setShowModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form onSubmit={handleCreateTenant} className="p-4 space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 text-red-500 text-sm">{error}</div>
              )}

              <div className="space-y-2">
                <Label htmlFor="orgType">Tipo de organización *</Label>
                <select
                  id="orgType"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  value={formData.orgType}
                  onChange={(e) => setFormData({ ...formData, orgType: e.target.value })}
                >
                  <option value="tenant">Planificador</option>
                  <option value="provider">Proveedor</option>
                </select>
                <p className="text-xs text-muted-foreground">
                  Define las capacidades, roles y portal de acceso de la organización.
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Nombre de la organización *</Label>
                <Input
                  id="name"
                  placeholder="Mi Empresa S.A."
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value, slug: generateSlug(e.target.value) })
                  }
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug (URL) *</Label>
                <Input
                  id="slug"
                  placeholder="mi-empresa"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  required
                />
                <p className="text-xs text-muted-foreground">
                  hubents.com/{formData.slug || "slug"}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="plan">Plan</Label>
                <select
                  id="plan"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm"
                  value={formData.planId}
                  onChange={(e) => setFormData({ ...formData, planId: e.target.value })}
                >
                  <option value="">Sin plan</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>{plan.name}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="phone">Teléfono</Label>
                  <Input
                    id="phone"
                    placeholder="+54 11 1234-5678"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="website">Sitio web</Label>
                  <Input
                    id="website"
                    placeholder="https://..."
                    value={formData.website}
                    onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                  />
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <p className="text-sm font-medium mb-3">Propietario</p>
                <div className="space-y-3">
                  <div className="space-y-2">
                    <Label htmlFor="ownerEmail">Email del propietario</Label>
                    <Input
                      id="ownerEmail"
                      type="email"
                      placeholder="propietario@empresa.com"
                      value={formData.ownerEmail}
                      onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground">
                      Si el usuario no existe, se creará automáticamente.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="ownerName">Nombre del propietario</Label>
                    <Input
                      id="ownerName"
                      placeholder="Juan Pérez"
                      value={formData.ownerName}
                      onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="sendWelcomeEmail"
                      checked={formData.sendWelcomeEmail}
                      onChange={(e) => setFormData({ ...formData, sendWelcomeEmail: e.target.checked })}
                      className="rounded border-border"
                    />
                    <Label htmlFor="sendWelcomeEmail" className="text-sm font-normal cursor-pointer">
                      Enviar email de bienvenida con credenciales
                    </Label>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="button" variant="outline" className="flex-1" onClick={() => setShowModal(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Creando...
                    </>
                  ) : "Crear organización"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
