"use client";

import { useState, useEffect, use } from "react";
import { useEvent } from "@/contexts/event-context";
import { Btn, Inp, Pill, PCard } from "@/components/ui/ds";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { useUserSessionContext } from "@/contexts/user-session-context";
import { useEventPermissions } from "@/hooks/use-event-permissions";
import { EventSectionGuard } from "@/components/events/event-section-guard";

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
  guestOrgId: number;
  status: string;
  invitedAt: string;
  acceptedAt: string | null;
  guestName: string;
  guestSlug: string;
  guestCategory: string | null;
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
  const { eventScoped } = useUserSessionContext();
  const { canEdit } = useEventPermissions(eventId, eventScoped);
  const canEditVendors = canEdit("vendors");

  const [vendors, setVendors] = useState<EventVendor[]>([]);
  const [allVendors, setAllVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

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
      const res = await fetch(`/api/events/${eventId}/partners`);
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
      if (search) {
        params.set("search", search);
      } else {
        params.set("favorites", "true");
      }
      const res = await fetch(`/api/providers?${params}`);
      const data = await res.json();
      if (data.success) {
        setDirectoryProviders(data.data?.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch Partners directory:", error);
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
    <EventSectionGuard eventId={eventId} section="vendors">
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Partners</h1>
          <p className="text-[var(--muted-foreground)]">
            {vendors.length} partners asignados
          </p>
        </div>
        <div className="flex gap-2">
          {canEditVendors && (
            <Btn variant="primary" onClick={() => setShowInviteDrawer(true)}>
              <RiAddLine className="h-4 w-4" />
              Invitar Partner
            </Btn>
          )}
          <Link href="/dashboard/partners">
            <Btn variant="outline">Partners</Btn>
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
        <Inp
          placeholder="Buscar partners..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Platform Providers Section */}
      {platformProviders.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <RiShieldCheckLine className="h-5 w-5 text-green-600" />
            Partners de Plataforma
          </h2>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            {platformProviders.map((pp) => {
              const statusMap: Record<string, { label: string; bg: string; color: string }> = {
                active: { label: "Activo", bg: "#DCFCE7", color: "#166534" },
                pending: { label: "Pendiente", bg: "#FEF9C3", color: "#854D0E" },
                rejected: { label: "Rechazado", bg: "#FEE2E2", color: "#991B1B" },
                revoked: { label: "Revocado", bg: "var(--bg-subtle)", color: "var(--ink-2)" },
              };
              const st = statusMap[pp.status] || statusMap.pending;
              return (
                <PCard key={pp.id}>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                      <RiShieldCheckLine className="h-5 w-5 text-purple-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{pp.guestName}</p>
                      <Pill bg={st.bg} color={st.color} style={{ marginTop: 2 }}>{st.label}</Pill>
                    </div>
                  </div>
                </PCard>
              );
            })}
          </div>
        </div>
      )}

      {/* Add Provider Drawer (Partners) */}
      <Sheet open={showInviteDrawer} onOpenChange={setShowInviteDrawer}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Invitar Partner al Evento</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 px-4 pb-4">
            <p className="text-sm text-muted-foreground">
              Busca en Partners Hubents. Tus favoritos aparecen primero.
            </p>
            <div className="relative">
              <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Inp
                value={providerSearch}
                onChange={(e) => setProviderSearch(e.target.value)}
                placeholder="Buscar en Partners..."
                className="pl-10"
              />
            </div>
            {directoryProviders.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No se encontraron Partners
              </p>
            ) : (
              <div className="space-y-2">
                {directoryProviders.map((dp) => {
                  const alreadyInvited = platformProviders.some((pp) => pp.guestOrgId === dp.id);
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
                        <Pill bg="var(--bg-subtle)" color="var(--ink-2)">Invitado</Pill>
                      ) : (
                        <Btn
                          size="sm"
                          onClick={() => handleInviteProvider(dp.id)}
                          disabled={inviting}
                        >
                          <RiSendPlaneLine className="h-3.5 w-3.5 mr-1" />
                          Invitar
                        </Btn>
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
            <PCard key={vendor.id} className="group">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                    <RiStore2Line className="h-5 w-5 text-[var(--primary)]" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{vendor.vendorName}</h3>
                    {vendor.category && (
                      <Pill bg="var(--bg-subtle)" color="var(--ink-2)" style={{ marginTop: 4 }}>
                        {vendor.category}
                      </Pill>
                    )}
                  </div>
                </div>
                {canEditVendors && (
                <Btn
                  variant="ghost"
                  className="h-8 w-8 opacity-0 group-hover:opacity-100 text-[var(--destructive)]"
                  onClick={() => handleRemoveVendor(vendor.id)}
                >
                  <RiDeleteBinLine className="h-4 w-4" />
                </Btn>
                )}
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
            </PCard>
          ))}
        </div>
      ) : (
        <PCard style={{ textAlign: "center", padding: "48px 24px" }}>
          <RiStore2Line className="h-12 w-12 mx-auto text-[var(--muted-foreground)] mb-4" />
          <h3 className="font-semibold mb-2">No hay partners asignados</h3>
          <p className="text-[var(--muted-foreground)] mb-4">
            Invita partners a este evento para colaborar
          </p>
          {canEditVendors && (
          <Btn onClick={() => setShowInviteDrawer(true)}>
            <RiAddLine className="h-4 w-4 mr-2" />
            Invitar primer Partner
          </Btn>
          )}
        </PCard>
      )}
    </div>
    </EventSectionGuard>
  );
}
