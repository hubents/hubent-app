"use client";

import { useState, useEffect, use } from "react";
import { useEvent } from "@/contexts/event-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RiAddLine,
  RiSearchLine,
  RiStore2Line,
  RiDeleteBinLine,
  RiPhoneLine,
  RiMailLine,
  RiShieldCheckLine,
  RiSendPlaneLine,
} from "@remixicon/react";
import Link from "next/link";

interface EventVendor {
  id: number;
  vendorId: number;
  vendorName: string;
  service: string;
  category: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
}

interface Vendor {
  id: number;
  name: string;
  category: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
}

interface PlatformProvider {
  id: number;
  providerOrgId: number;
  vendorId: number | null;
  status: string;
  invitedAt: string;
  acceptedAt: string | null;
  providerName: string;
  providerSlug: string;
}

interface DirectoryProvider {
  id: number;
  name: string;
  slug: string;
  providerCategory: string | null;
  instagramHandle: string | null;
}

export default function EventVendorsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const eventId = parseInt(id, 10);
  const { setActiveEvent } = useEvent();

  const [vendors, setVendors] = useState<EventVendor[]>([]);
  const [allVendors, setAllVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);
  const [vendorService, setVendorService] = useState("");
  const [adding, setAdding] = useState(false);

  // Platform providers state
  const [platformProviders, setPlatformProviders] = useState<PlatformProvider[]>([]);
  const [directoryProviders, setDirectoryProviders] = useState<DirectoryProvider[]>([]);
  const [providerSearch, setProviderSearch] = useState("");
  const [showInviteDrawer, setShowInviteDrawer] = useState(false);
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    async function fetchEvent() {
      try {
        const res = await fetch(`/api/events/${eventId}`);
        const data = await res.json();
        if (data.success) {
          setActiveEvent(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch event:", error);
      }
    }
    fetchEvent();
  }, [eventId, setActiveEvent]);

  const fetchVendors = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/vendors`);
      const data = await res.json();
      if (data.success) {
        setVendors(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch vendors:", error);
    }
  };

  const fetchAllVendors = async () => {
    try {
      const res = await fetch("/api/vendors");
      const data = await res.json();
      if (data.success) {
        setAllVendors(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch all vendors:", error);
    }
  };

  const fetchPlatformProviders = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/providers`);
      const data = await res.json();
      if (data.success) {
        setPlatformProviders(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch platform providers:", error);
    }
  };

  const fetchDirectoryProviders = async (search: string) => {
    try {
      const params = new URLSearchParams({ limit: "20" });
      if (search) params.set("search", search);
      const res = await fetch(`/api/providers?${params}`);
      const data = await res.json();
      if (data.success) {
        setDirectoryProviders(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch directory:", error);
    }
  };

  const handleInviteProvider = async (providerOrgId: number) => {
    setInviting(true);
    try {
      const res = await fetch(`/api/events/${eventId}/providers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerOrgId }),
      });
      const data = await res.json();
      if (data.success) {
        await fetchPlatformProviders();
        setShowInviteDrawer(false);
      }
    } catch (error) {
      console.error("Failed to invite provider:", error);
    } finally {
      setInviting(false);
    }
  };

  useEffect(() => {
    Promise.all([fetchVendors(), fetchAllVendors(), fetchPlatformProviders()]).finally(() => setLoading(false));
  }, [eventId]);

  useEffect(() => {
    if (showInviteDrawer) {
      const timer = setTimeout(() => fetchDirectoryProviders(providerSearch), 300);
      return () => clearTimeout(timer);
    }
  }, [providerSearch, showInviteDrawer]);

  const handleAddVendor = async () => {
    if (!selectedVendorId) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/events/${eventId}/vendors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId: selectedVendorId, service: vendorService }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedVendorId(null);
        setVendorService("");
        setShowAddDialog(false);
        fetchVendors();
      }
    } finally {
      setAdding(false);
    }
  };

  const handleRemoveVendor = async (eventVendorId: number) => {
    try {
      await fetch(`/api/events/${eventId}/vendors?id=${eventVendorId}`, {
        method: "DELETE",
      });
      fetchVendors();
    } catch (error) {
      console.error("Failed to remove vendor:", error);
    }
  };

  const availableVendors = allVendors.filter(
    (v) => !vendors.some((ev) => ev.vendorId === v.id)
  );

  const filteredVendors = vendors.filter((v) =>
    v.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.service?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Proveedores</h1>
          <p className="text-[var(--muted-foreground)]">
            {vendors.length} proveedores asignados
          </p>
        </div>
        <div className="flex gap-2">
          <Button className="gap-2" onClick={() => setShowAddDialog(true)}>
            <RiAddLine className="h-4 w-4" />
            Asignar Proveedor
          </Button>
          <Sheet open={showAddDialog} onOpenChange={setShowAddDialog}>
            <SheetContent className="sm:max-w-2xl overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Asignar Proveedor al Evento</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 px-4 pb-4">
                <div className="space-y-2">
                  <Label>Seleccionar Proveedor</Label>
                  {availableVendors.length > 0 ? (
                    <Select
                      value={selectedVendorId?.toString() || ""}
                      onValueChange={(value) => setSelectedVendorId(parseInt(value, 10))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Elegir proveedor..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableVendors.map((v) => (
                          <SelectItem key={v.id} value={v.id.toString()}>
                            {v.name} {v.category && `(${v.category})`}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <p className="text-sm text-[var(--muted-foreground)]">
                      No hay proveedores disponibles.{" "}
                      <Link href="/dashboard/contacts?segment=vendors" className="text-[var(--primary)] underline">
                        Crear nuevo proveedor
                      </Link>
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Servicio a prestar</Label>
                  <Input
                    placeholder="Ej: Catering para 100 personas"
                    value={vendorService}
                    onChange={(e) => setVendorService(e.target.value)}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddVendor} disabled={adding || !selectedVendorId}>
                    {adding ? "Asignando..." : "Asignar"}
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <Link href="/dashboard/contacts?segment=vendors">
            <Button variant="outline">Ver todos</Button>
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
        <Input
          placeholder="Buscar proveedores..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Platform Providers Section */}
      {platformProviders.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold flex items-center gap-2">
              <RiShieldCheckLine className="h-5 w-5 text-green-600" />
              Proveedores de Plataforma
            </h2>
            <Button size="sm" variant="outline" onClick={() => setShowInviteDrawer(true)}>
              <RiSendPlaneLine className="h-4 w-4 mr-1" />
              Invitar
            </Button>
          </div>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {platformProviders.map((pp) => {
              const statusMap: Record<string, { label: string; variant: "success" | "warning" | "secondary" | "destructive" }> = {
                active: { label: "Activo", variant: "success" },
                pending: { label: "Pendiente", variant: "warning" },
                rejected: { label: "Rechazado", variant: "destructive" },
                revoked: { label: "Revocado", variant: "secondary" },
              };
              const st = statusMap[pp.status] || statusMap.pending;
              return (
                <Card key={pp.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                        <RiShieldCheckLine className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{pp.providerName}</p>
                        <Badge variant={st.variant} className="mt-0.5">{st.label}</Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Invite Provider Drawer */}
      <Sheet open={showInviteDrawer} onOpenChange={setShowInviteDrawer}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Invitar Proveedor de Plataforma</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 px-4 pb-4">
            <div className="relative">
              <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={providerSearch}
                onChange={(e) => setProviderSearch(e.target.value)}
                placeholder="Buscar proveedor verificado..."
                className="pl-10"
              />
            </div>
            {directoryProviders.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No se encontraron proveedores verificados
              </p>
            ) : (
              <div className="space-y-2">
                {directoryProviders.map((dp) => {
                  const alreadyInvited = platformProviders.some((pp) => pp.providerOrgId === dp.id);
                  return (
                    <div key={dp.id} className="flex items-center justify-between p-3 rounded-lg border">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-purple-100 flex items-center justify-center">
                          <RiStore2Line className="h-4 w-4 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{dp.name}</p>
                          {dp.providerCategory && (
                            <p className="text-xs text-muted-foreground">{dp.providerCategory}</p>
                          )}
                        </div>
                      </div>
                      {alreadyInvited ? (
                        <Badge variant="secondary">Invitado</Badge>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => handleInviteProvider(dp.id)}
                          disabled={inviting}
                        >
                          <RiSendPlaneLine className="h-3.5 w-3.5 mr-1" />
                          Invitar
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Local Vendors Grid */}
      {filteredVendors.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredVendors.map((vendor) => (
            <Card key={vendor.id} className="group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                      <RiStore2Line className="h-5 w-5 text-[var(--primary)]" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{vendor.vendorName}</h3>
                      {vendor.category && (
                        <Badge variant="secondary" className="mt-1">
                          {vendor.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 text-[var(--destructive)]"
                    onClick={() => handleRemoveVendor(vendor.id)}
                  >
                    <RiDeleteBinLine className="h-4 w-4" />
                  </Button>
                </div>

                {vendor.service && (
                  <p className="mt-3 text-sm text-[var(--muted-foreground)]">
                    {vendor.service}
                  </p>
                )}

                <div className="mt-3 pt-3 border-t space-y-1 text-sm">
                  {vendor.contactEmail && (
                    <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                      <RiMailLine className="h-4 w-4" />
                      <span>{vendor.contactEmail}</span>
                    </div>
                  )}
                  {vendor.contactPhone && (
                    <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                      <RiPhoneLine className="h-4 w-4" />
                      <span>{vendor.contactPhone}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <RiStore2Line className="h-12 w-12 mx-auto text-[var(--muted-foreground)] mb-4" />
            <h3 className="font-semibold mb-2">No hay proveedores asignados</h3>
            <p className="text-[var(--muted-foreground)] mb-4">
              Asigna proveedores a este evento para gestionar sus servicios
            </p>
            <Button onClick={() => setShowAddDialog(true)}>
              <RiAddLine className="h-4 w-4 mr-2" />
              Asignar primer proveedor
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
