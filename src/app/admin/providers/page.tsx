"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { NumericPagination } from "@/components/ui/numeric-pagination";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from "@/components/ui/sheet";
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
  RiStoreLine,
  RiShieldCheckLine,
  RiCloseCircleLine,
  RiInstagramLine,
  RiMailLine,
  RiPhoneLine,
  RiMapPinLine,
  RiTimeLine,
  RiSearchLine,
  RiGlobalLine,
  RiMapPin2Line,
  RiPriceTag3Line,
} from "@remixicon/react";
import { toast } from "sonner";

interface Provider {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
  phone: string | null;
  website: string | null;
  instagramHandle: string | null;
  providerCategory: string | null;
  verificationStatus: string;
  verifiedAt: string | null;
  rejectionReason: string | null;
  serviceRadius: number | null;
  serviceAreas: string[] | null;
  address: string | null;
  createdAt: string;
  memberCount: number;
  owner: { name: string | null; email: string } | null;
  planName: string | null;
  planSlug: string | null;
  subscriptionStatus: string | null;
  trialEndsAt: string | null;
}

const SUB_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  active: { label: "Activa", color: "bg-green-500/10 text-green-600" },
  trialing: { label: "Trial", color: "bg-yellow-500/10 text-yellow-600" },
  canceled: { label: "Cancelada", color: "bg-red-500/10 text-red-600" },
};

const STATUS_CONFIG: Record<string, { label: string; variant: "success" | "warning" | "destructive" }> = {
  verified: { label: "Verificado", variant: "success" },
  unverified: { label: "Pendiente", variant: "warning" },
  rejected: { label: "Rechazado", variant: "destructive" },
};

export default function AdminProvidersPage() {
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<"all" | "unverified" | "verified" | "rejected">("all");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, limit: 50, total: 0, totalPages: 0 });

  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchProviders = useCallback(async () => {
    try {
      const params = new URLSearchParams({ page: page.toString() });
      const res = await fetch(`/api/admin/providers?${params}`);
      const data = await res.json();
      if (data.success) {
        setProviders(data.data);
        if (data.meta) setMeta(data.meta);
      } else {
        console.error("Providers API error:", data);
        toast.error(data.error?.message || "Error al cargar proveedores");
      }
    } catch (err) {
      console.error("Providers fetch error:", err);
      toast.error("Error al cargar proveedores");
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  const handleVerify = async (providerId: number) => {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/providers/${providerId}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify" }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Proveedor verificado");
        await fetchProviders();
        setDrawerOpen(false);
      } else {
        toast.error(data.error?.message || "Error al verificar");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedProvider) return;
    setActionLoading(true);
    try {
      const res = await fetch(`/api/admin/providers/${selectedProvider.id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", rejectionReason: rejectReason }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Proveedor rechazado");
        await fetchProviders();
        setDrawerOpen(false);
        setRejectDialogOpen(false);
        setRejectReason("");
      } else {
        toast.error(data.error?.message || "Error al rechazar");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setActionLoading(false);
    }
  };

  const filtered = providers.filter((p) => {
    if (filter !== "all" && p.verificationStatus !== filter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        (p.instagramHandle || "").toLowerCase().includes(q) ||
        (p.providerCategory || "").toLowerCase().includes(q) ||
        (p.owner?.email || "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const counts = {
    all: providers.length,
    unverified: providers.filter((p) => p.verificationStatus === "unverified").length,
    verified: providers.filter((p) => p.verificationStatus === "verified").length,
    rejected: providers.filter((p) => p.verificationStatus === "rejected").length,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-20 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    { key: "all" as const, label: "Total", icon: RiStoreLine, color: "text-blue-500", bgColor: "bg-blue-500/10" },
    { key: "unverified" as const, label: "Pendiente", icon: RiTimeLine, color: "text-yellow-500", bgColor: "bg-yellow-500/10" },
    { key: "verified" as const, label: "Verificado", icon: RiShieldCheckLine, color: "text-green-500", bgColor: "bg-green-500/10" },
    { key: "rejected" as const, label: "Rechazado", icon: RiCloseCircleLine, color: "text-red-500", bgColor: "bg-red-500/10" },
  ];

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Proveedores</h1>
        <p className="text-muted-foreground">
          Gestiona y verifica las organizaciones proveedoras
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-6">
        {statCards.map((stat) => (
          <Card
            key={stat.key}
            className={`cursor-pointer transition-all ${
              filter === stat.key
                ? "ring-2 ring-primary"
                : "hover:bg-muted/50"
            }`}
            onClick={() => setFilter(stat.key)}
          >
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className={`p-3 rounded-lg ${stat.bgColor}`}>
                  <stat.icon className={`h-5 w-5 ${stat.color}`} />
                </div>
              </div>
              <div className="mt-4">
                <p className="text-2xl font-bold">{counts[stat.key]}</p>
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, Instagram, categoría o email..."
          className="pl-10"
        />
      </div>

      {/* Provider List */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>
            {filter === "all" ? "Todos los Proveedores" : `Proveedores - ${STATUS_CONFIG[filter]?.label || filter}`}
          </CardTitle>
          <CardDescription>{filtered.length} resultados</CardDescription>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-12">
              <RiStoreLine className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-1">No se encontraron proveedores</h3>
              <p className="text-sm text-muted-foreground">Aún no hay organizaciones proveedoras registradas</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filtered.map((provider) => {
                const status = STATUS_CONFIG[provider.verificationStatus] || STATUS_CONFIG.unverified;
                return (
                  <div
                    key={provider.id}
                    className="flex items-center gap-4 p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => {
                      setSelectedProvider(provider);
                      setDrawerOpen(true);
                    }}
                  >
                    <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
                      <RiStoreLine className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{provider.name}</p>
                        <Badge variant={status.variant}>{status.label}</Badge>
                        {provider.providerCategory && (
                          <Badge variant="outline">{provider.providerCategory}</Badge>
                        )}
                        {provider.planName && (
                          <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            SUB_STATUS_CONFIG[provider.subscriptionStatus || ""]?.color || "bg-gray-500/10 text-gray-600"
                          }`}>
                            {provider.planName} · {SUB_STATUS_CONFIG[provider.subscriptionStatus || ""]?.label || provider.subscriptionStatus || "—"}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 text-sm text-muted-foreground mt-0.5">
                        {provider.instagramHandle && (
                          <span className="flex items-center gap-1">
                            <RiInstagramLine className="h-3.5 w-3.5" />
                            @{provider.instagramHandle}
                          </span>
                        )}
                        {provider.owner && (
                          <span className="flex items-center gap-1">
                            <RiMailLine className="h-3.5 w-3.5" />
                            {provider.owner.email}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <RiTimeLine className="h-3.5 w-3.5" />
                          {new Date(provider.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {provider.memberCount} miembro{provider.memberCount !== 1 ? "s" : ""}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Provider Detail Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{selectedProvider?.name}</SheetTitle>
            <SheetDescription>
              Detalle del proveedor y gestión de verificación
            </SheetDescription>
          </SheetHeader>

          {selectedProvider && (
            <div className="px-4 py-4 space-y-6">
              {/* Status */}
              <div className="flex items-center gap-2">
                <Badge variant={STATUS_CONFIG[selectedProvider.verificationStatus]?.variant || "warning"}>
                  {STATUS_CONFIG[selectedProvider.verificationStatus]?.label || "Pendiente"}
                </Badge>
                {selectedProvider.providerCategory && (
                  <Badge variant="outline">{selectedProvider.providerCategory}</Badge>
                )}
              </div>

              {selectedProvider.rejectionReason && (
                <div className="p-3 rounded-lg bg-red-50 text-red-700 text-sm">
                  <p className="font-medium">Motivo de rechazo:</p>
                  <p>{selectedProvider.rejectionReason}</p>
                </div>
              )}

              {/* Plan y Suscripción */}
              <div className="p-4 rounded-lg border border-border">
                <div className="flex items-center gap-2 mb-2">
                  <RiPriceTag3Line className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium text-sm">Plan y Suscripción</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">{selectedProvider.planName || "Sin plan"}</span>
                  {selectedProvider.subscriptionStatus && (
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      SUB_STATUS_CONFIG[selectedProvider.subscriptionStatus]?.color || "bg-gray-500/10 text-gray-600"
                    }`}>
                      {SUB_STATUS_CONFIG[selectedProvider.subscriptionStatus]?.label || selectedProvider.subscriptionStatus}
                    </span>
                  )}
                </div>
                {selectedProvider.subscriptionStatus === "trialing" && selectedProvider.trialEndsAt && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Trial hasta: {new Date(selectedProvider.trialEndsAt).toLocaleDateString()}
                  </p>
                )}
              </div>

              {/* Info Grid */}
              <div className="space-y-3">
                {selectedProvider.owner && (
                  <div className="flex items-center gap-3 text-sm">
                    <RiMailLine className="h-4 w-4 text-muted-foreground shrink-0" />
                    <div>
                      <p className="font-medium">{selectedProvider.owner.name || "Sin nombre"}</p>
                      <p className="text-muted-foreground">{selectedProvider.owner.email}</p>
                    </div>
                  </div>
                )}
                {selectedProvider.instagramHandle && (
                  <div className="flex items-center gap-3 text-sm">
                    <RiInstagramLine className="h-4 w-4 text-muted-foreground shrink-0" />
                    <a
                      href={`https://instagram.com/${selectedProvider.instagramHandle}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      @{selectedProvider.instagramHandle}
                    </a>
                  </div>
                )}
                {selectedProvider.phone && (
                  <div className="flex items-center gap-3 text-sm">
                    <RiPhoneLine className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{selectedProvider.phone}</span>
                  </div>
                )}
                {selectedProvider.website && (
                  <div className="flex items-center gap-3 text-sm">
                    <RiGlobalLine className="h-4 w-4 text-muted-foreground shrink-0" />
                    <a
                      href={selectedProvider.website.startsWith("http") ? selectedProvider.website : `https://${selectedProvider.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      {selectedProvider.website}
                    </a>
                  </div>
                )}
                {selectedProvider.address && (
                  <div className="flex items-center gap-3 text-sm">
                    <RiMapPin2Line className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>{selectedProvider.address}</span>
                  </div>
                )}
                {selectedProvider.serviceRadius && (
                  <div className="flex items-center gap-3 text-sm">
                    <RiMapPinLine className="h-4 w-4 text-muted-foreground shrink-0" />
                    <span>Radio: {selectedProvider.serviceRadius} km</span>
                  </div>
                )}
                <div className="flex items-center gap-3 text-sm">
                  <RiTimeLine className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span>Registrado: {new Date(selectedProvider.createdAt).toLocaleDateString()}</span>
                </div>
                {selectedProvider.verifiedAt && (
                  <div className="flex items-center gap-3 text-sm">
                    <RiShieldCheckLine className="h-4 w-4 text-green-600 shrink-0" />
                    <span>Verificado: {new Date(selectedProvider.verifiedAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              {/* Service Areas */}
              {selectedProvider.serviceAreas && selectedProvider.serviceAreas.length > 0 && (
                <div>
                  <p className="text-sm font-medium mb-2">Áreas de servicio</p>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedProvider.serviceAreas.map((area, i) => (
                      <Badge key={i} variant="outline" className="text-xs">{area}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4">
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold">{selectedProvider.memberCount}</p>
                  <p className="text-xs text-muted-foreground">Miembros</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-sm font-bold">{selectedProvider.planName || "—"}</p>
                  <p className="text-xs text-muted-foreground">Plan</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-sm font-bold">{selectedProvider.slug}</p>
                  <p className="text-xs text-muted-foreground">Slug</p>
                </div>
              </div>
            </div>
          )}

          {selectedProvider && selectedProvider.verificationStatus !== "verified" && (
            <SheetFooter className="px-4 gap-2">
              <Button
                variant="outline"
                className="text-red-600 hover:text-red-700"
                onClick={() => setRejectDialogOpen(true)}
                disabled={actionLoading}
              >
                <RiCloseCircleLine className="h-4 w-4 mr-2" />
                Rechazar
              </Button>
              <Button
                onClick={() => handleVerify(selectedProvider.id)}
                disabled={actionLoading}
              >
                <RiShieldCheckLine className="h-4 w-4 mr-2" />
                {actionLoading ? "Verificando..." : "Verificar"}
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      {/* Reject Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Rechazar Proveedor</AlertDialogTitle>
            <AlertDialogDescription>
              Indica el motivo del rechazo para &quot;{selectedProvider?.name}&quot;
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <Input
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Motivo del rechazo..."
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionLoading}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleReject}
              className="bg-red-600 hover:bg-red-700"
              disabled={actionLoading || !rejectReason.trim()}
            >
              {actionLoading ? "Rechazando..." : "Rechazar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
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
    </div>
  );
}
