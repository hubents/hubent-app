"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
  createdAt: string;
  memberCount: number;
  owner: { name: string | null; email: string } | null;
}

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

  const [selectedProvider, setSelectedProvider] = useState<Provider | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  const fetchProviders = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/providers");
      const data = await res.json();
      if (data.success) {
        setProviders(data.data);
      }
    } catch {
      toast.error("Error al cargar proveedores");
    } finally {
      setLoading(false);
    }
  }, []);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Proveedores</h1>
        <p className="text-muted-foreground">
          Gestiona y verifica las organizaciones proveedoras
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {(["all", "unverified", "verified", "rejected"] as const).map((key) => (
          <button
            key={key}
            onClick={() => setFilter(key)}
            className={`p-4 rounded-lg border text-left transition-colors ${
              filter === key
                ? "border-primary bg-primary/5"
                : "border-border hover:bg-muted/50"
            }`}
          >
            <p className="text-2xl font-bold">{counts[key]}</p>
            <p className="text-sm text-muted-foreground">
              {key === "all" ? "Total" : STATUS_CONFIG[key]?.label || key}
            </p>
          </button>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, Instagram, categoría o email..."
          className="pl-10"
        />
      </div>

      {/* Provider List */}
      <Card>
        <CardHeader>
          <CardTitle>
            {filter === "all" ? "Todos los Proveedores" : `Proveedores - ${STATUS_CONFIG[filter]?.label || filter}`}
          </CardTitle>
          <CardDescription>{filtered.length} resultados</CardDescription>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center py-8">
              <RiStoreLine className="h-12 w-12 mx-auto text-muted-foreground mb-2" />
              <p className="text-muted-foreground">No se encontraron proveedores</p>
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
        <SheetContent className="sm:max-w-xl overflow-y-auto">
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

              {/* Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold">{selectedProvider.memberCount}</p>
                  <p className="text-xs text-muted-foreground">Miembros</p>
                </div>
                <div className="p-3 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold">{selectedProvider.slug}</p>
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
    </div>
  );
}
