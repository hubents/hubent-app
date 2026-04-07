"use client";

import { useEffect, useState, useCallback } from "react";
import { EventScopedGuard } from "@/components/layout/event-scoped-guard";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  RiStore2Line,
  RiSearchLine,
  RiInstagramLine,
  RiMapPinLine,
  RiShieldCheckLine,
  RiExternalLinkLine,
  RiStarFill,
  RiPriceTag3Line,
  RiHeartLine,
  RiHeartFill,
  RiAddLine,
  RiGridLine,
  RiListUnordered,
  RiCloseLine,
  RiUserUnfollowLine,
  RiCalendarEventLine,
  RiSendPlaneLine,
  RiBuilding2Line,
  RiTeamLine,
} from "@remixicon/react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import {
  PROVIDER_CATEGORIES,
  PRICE_RANGES,
  getOrgTypeLabel,
  getOrgTypeBadgeVariant,
} from "@/config/provider-constants";

const PARTNERS_VIEW_STORAGE = "partners-view";
const LEGACY_MARKETPLACE_VIEW_STORAGE = "marketplace-view";

interface PartnersListing {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
  orgType: string | null;
  tagline: string | null;
  description: string | null;
  providerCategory: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  priceRange: string | null;
  averageRating: string | null;
  totalReviews: number | null;
  verificationStatus: string | null;
  isFeatured: boolean;
  coverImage: string | null;
  instagramHandle: string | null;
  services: string[] | null;
  categories: string[] | null;
  profileCompleteness: number | null;
  phone: string | null;
  website: string | null;
  isFavorite: boolean;
  isUnclaimed: boolean;
  isMyProvider: boolean;
}

function readStoredViewMode(): "cards" | "list" {
  if (typeof window === "undefined") return "cards";
  const next = localStorage.getItem(PARTNERS_VIEW_STORAGE) as "cards" | "list" | null;
  if (next === "cards" || next === "list") return next;
  const legacy = localStorage.getItem(LEGACY_MARKETPLACE_VIEW_STORAGE) as "cards" | "list" | null;
  if (legacy === "cards" || legacy === "list") return legacy;
  return "cards";
}

export default function PartnersPage() {
  return <EventScopedGuard><PartnersContent /></EventScopedGuard>;
}

function PartnersContent() {
  const [providers, setProviders] = useState<PartnersListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [myProvidersOnly, setMyProvidersOnly] = useState(false);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<"cards" | "list">(readStoredViewMode);
  const [showCreateDrawer, setShowCreateDrawer] = useState(false);
  const [inviteTarget, setInviteTarget] = useState<PartnersListing | null>(null);
  const [events, setEvents] = useState<{ id: number; name: string }[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [inviting, setInviting] = useState(false);

  useEffect(() => {
    if (inviteTarget) {
      fetch("/api/events?limit=50")
        .then((r) => r.json())
        .then((d) => {
          if (d.success) setEvents(d.data?.map((e: { id: number; name: string }) => ({ id: e.id, name: e.name })) || []);
        })
        .catch(() => {});
    }
  }, [inviteTarget]);

  const handleInviteToEvent = async () => {
    if (!inviteTarget || !selectedEventId) return;
    setInviting(true);
    try {
      const res = await fetch(`/api/events/${selectedEventId}/partners`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guestOrgId: inviteTarget.id }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(`${inviteTarget.name} invitado al evento`);
      } else if (data.error?.code === "DUPLICATE") {
        toast.info("Este partner ya está invitado al evento");
      } else {
        toast.error(data.error?.message || "Error al invitar");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setInviting(false);
      setInviteTarget(null);
      setSelectedEventId("");
    }
  };

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (category) params.set("category", category);
      if (city) params.set("city", city);
      if (priceRange) params.set("priceRange", priceRange);
      if (typeFilter) params.set("type", typeFilter);
      if (favoritesOnly) params.set("favorites", "true");
      if (myProvidersOnly) params.set("myProviders", "true");
      if (verifiedOnly) params.set("verified", "true");
      params.set("page", page.toString());
      params.set("limit", "50");

      const res = await fetch(`/api/providers?${params}`);
      const data = await res.json();
      if (data.success) {
        setProviders(data.data);
        setTotal(data.meta?.total ?? data.data.length);
      }
    } catch {
      console.error("Error fetching providers");
    } finally {
      setLoading(false);
    }
  }, [search, category, city, priceRange, typeFilter, favoritesOnly, myProvidersOnly, verifiedOnly, page]);

  useEffect(() => {
    setPage(1);
  }, [search, category, city, priceRange, typeFilter, favoritesOnly, myProvidersOnly, verifiedOnly]);

  useEffect(() => {
    const timer = setTimeout(fetchProviders, 300);
    return () => clearTimeout(timer);
  }, [fetchProviders]);

  const toggleViewMode = (mode: "cards" | "list") => {
    setViewMode(mode);
    localStorage.setItem(PARTNERS_VIEW_STORAGE, mode);
  };

  const toggleFavorite = async (provider: PartnersListing) => {
    try {
      let res: Response;
      if (provider.isFavorite) {
        res = await fetch(`/api/providers/favorites/${provider.id}`, { method: "DELETE" });
      } else {
        res = await fetch("/api/providers/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ providerOrgId: provider.id }),
        });
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        toast.error(data?.error?.message || "No se pudo actualizar favorito");
        return;
      }
      setProviders((prev) =>
        prev.map((p) =>
          p.id === provider.id ? { ...p, isFavorite: !p.isFavorite } : p
        )
      );
      if (!provider.isFavorite) {
        toast.success(`${provider.name} agregado a favoritos`);
      }
    } catch {
      toast.error("No se pudo actualizar favorito");
    }
  };

  const clearFilters = () => {
    setSearch("");
    setCategory("");
    setCity("");
    setPriceRange("");
    setTypeFilter("");
    setFavoritesOnly(false);
    setMyProvidersOnly(false);
    setVerifiedOnly(false);
  };

  const hasFilters = search || category || city || priceRange || typeFilter || favoritesOnly || myProvidersOnly || verifiedOnly;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Partners HubEnts</h1>
          <p className="text-muted-foreground">
            Encuentra y gestiona proveedores para tus eventos
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center border rounded-md">
            <Button
              variant={viewMode === "cards" ? "default" : "ghost"}
              size="icon"
              className="h-8 w-8 rounded-r-none"
              onClick={() => toggleViewMode("cards")}
            >
              <RiGridLine className="h-4 w-4" />
            </Button>
            <Button
              variant={viewMode === "list" ? "default" : "ghost"}
              size="icon"
              className="h-8 w-8 rounded-l-none"
              onClick={() => toggleViewMode("list")}
            >
              <RiListUnordered className="h-4 w-4" />
            </Button>
          </div>
          <Button onClick={() => setShowCreateDrawer(true)} className="gap-1.5">
            <RiAddLine className="h-4 w-4" />
            Crear Proveedor
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre, servicio o ciudad..."
              className="pl-10"
            />
          </div>
          <Select value={typeFilter || "all"} onValueChange={(v) => setTypeFilter(v === "all" ? "" : v)}>
            <SelectTrigger className="w-full sm:w-[170px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los tipos</SelectItem>
              <SelectItem value="provider">Proveedores</SelectItem>
              <SelectItem value="planner">Planificadores</SelectItem>
            </SelectContent>
          </Select>
          <Select value={category || "all"} onValueChange={(v) => setCategory(v === "all" ? "" : v)}>
            <SelectTrigger className="w-full sm:w-[190px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas las categorias</SelectItem>
              {PROVIDER_CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={priceRange || "all"} onValueChange={(v) => setPriceRange(v === "all" ? "" : v)}>
            <SelectTrigger className="w-full sm:w-[130px]">
              <SelectValue placeholder="Precio" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todo precio</SelectItem>
              {PRICE_RANGES.map((pr) => (
                <SelectItem key={pr} value={pr}>{pr}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            value={city}
            onChange={(e) => setCity(e.target.value)}
            placeholder="Ciudad..."
            className="w-full sm:w-[150px]"
          />
        </div>

        {/* Filter chips */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFavoritesOnly(!favoritesOnly)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              favoritesOnly
                ? "bg-red-100 text-red-700 border border-red-300"
                : "bg-muted text-muted-foreground hover:bg-muted/80 border border-transparent"
            }`}
          >
            {favoritesOnly ? <RiHeartFill className="h-3.5 w-3.5" /> : <RiHeartLine className="h-3.5 w-3.5" />}
            Mis Favoritos
          </button>
          <button
            onClick={() => setMyProvidersOnly(!myProvidersOnly)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              myProvidersOnly
                ? "bg-purple-100 text-purple-700 border border-purple-300"
                : "bg-muted text-muted-foreground hover:bg-muted/80 border border-transparent"
            }`}
          >
            <RiStore2Line className="h-3.5 w-3.5" />
            Mis Proveedores
          </button>
          <button
            onClick={() => setVerifiedOnly(!verifiedOnly)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              verifiedOnly
                ? "bg-green-100 text-green-700 border border-green-300"
                : "bg-muted text-muted-foreground hover:bg-muted/80 border border-transparent"
            }`}
          >
            <RiShieldCheckLine className="h-3.5 w-3.5" />
            Verificados
          </button>
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <RiCloseLine className="h-3.5 w-3.5" />
              Limpiar filtros
            </button>
          )}
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-64 w-full rounded-lg" />
          ))}
        </div>
      ) : providers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <RiStore2Line className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-lg font-medium">
              {favoritesOnly
                ? "No tienes favoritos aún"
                : myProvidersOnly
                ? "No has creado proveedores aún"
                : "No se encontraron proveedores"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {favoritesOnly
                ? "Marca proveedores con el corazón para encontrarlos rápido"
                : myProvidersOnly
                ? "Crea un proveedor para empezar a gestionarlo"
                : hasFilters
                ? "Intenta con otros filtros de búsqueda"
                : "Aún no hay proveedores en la plataforma"}
            </p>
            {!hasFilters && (
              <Button className="mt-4 gap-1.5" onClick={() => setShowCreateDrawer(true)}>
                <RiAddLine className="h-4 w-4" />
                Crear primer proveedor
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {total} {total === 1 ? "resultado encontrado" : "resultados encontrados"}
          </p>

          {viewMode === "cards" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {providers.map((provider) => (
                <ProviderCard key={provider.id} provider={provider} onToggleFavorite={toggleFavorite} onInviteToEvent={setInviteTarget} />
              ))}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left text-sm font-medium p-3">Proveedor</th>
                    <th className="text-left text-sm font-medium p-3 hidden sm:table-cell">Tipo</th>
                    <th className="text-left text-sm font-medium p-3 hidden md:table-cell">Categoría</th>
                    <th className="text-left text-sm font-medium p-3 hidden md:table-cell">Ciudad</th>
                    <th className="text-left text-sm font-medium p-3 hidden lg:table-cell">Rating</th>
                    <th className="text-center text-sm font-medium p-3 w-16">Fav</th>
                    <th className="text-right text-sm font-medium p-3 w-28">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {providers.map((provider) => (
                    <ProviderRow key={provider.id} provider={provider} onToggleFavorite={toggleFavorite} onInviteToEvent={setInviteTarget} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {/* Pagination */}
      {total > 50 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            {Math.min((page - 1) * 50 + 1, total)}–{Math.min(page * 50, total)} de {total} organizaciones
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Anterior
            </Button>
            <span className="text-sm text-muted-foreground">
              Página {page} de {Math.ceil(total / 50)}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= Math.ceil(total / 50)}
              onClick={() => setPage((p) => p + 1)}
            >
              Siguiente
            </Button>
          </div>
        </div>
      )}

      {/* Invite to Event Sheet */}
      <Sheet open={!!inviteTarget} onOpenChange={(o) => { if (!o) { setInviteTarget(null); setSelectedEventId(""); } }}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle className="flex items-center gap-2">
              <RiCalendarEventLine className="h-5 w-5" />
              Invitar a Evento
            </SheetTitle>
            <SheetDescription>
              Invitar a <strong>{inviteTarget?.name}</strong> a participar en un evento
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label>Seleccionar evento</Label>
              <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                <SelectTrigger>
                  <SelectValue placeholder="Elegir evento..." />
                </SelectTrigger>
                <SelectContent>
                  {events.map((ev) => (
                    <SelectItem key={ev.id} value={ev.id.toString()}>
                      {ev.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {events.length === 0 && (
                <p className="text-xs text-muted-foreground">No hay eventos disponibles</p>
              )}
            </div>
            <div className="flex gap-3 pt-4">
              <Button variant="outline" className="flex-1" onClick={() => { setInviteTarget(null); setSelectedEventId(""); }}>
                Cancelar
              </Button>
              <Button className="flex-1 gap-1.5" onClick={handleInviteToEvent} disabled={inviting || !selectedEventId}>
                <RiSendPlaneLine className="h-4 w-4" />
                {inviting ? "Invitando..." : "Invitar"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Create Provider Drawer */}
      <CreateProviderDrawer
        open={showCreateDrawer}
        onOpenChange={setShowCreateDrawer}
        onCreated={() => {
          setShowCreateDrawer(false);
          fetchProviders();
        }}
      />
    </div>
  );
}

// ─── Avatar with verified badge overlay ─────────────────────────────────────

function ProviderAvatar({ provider, size = "md" }: { provider: PartnersListing; size?: "sm" | "md" }) {
  const isProvider = provider.orgType === "provider";
  const dim = size === "sm" ? "h-10 w-10" : "h-14 w-14";
  const iconDim = size === "sm" ? "h-5 w-5" : "h-7 w-7";
  const bgColor = isProvider ? "bg-purple-100" : "bg-blue-100";
  const iconColor = isProvider ? "text-purple-600" : "text-blue-600";
  const Icon = isProvider ? RiBuilding2Line : RiTeamLine;

  return (
    <div className="relative shrink-0">
      {provider.logo ? (
        <Image
          src={provider.logo}
          alt={provider.name}
          width={size === "sm" ? 40 : 56}
          height={size === "sm" ? 40 : 56}
          className={`${dim} rounded-xl object-cover`}
        />
      ) : (
        <div className={`${dim} rounded-xl ${bgColor} flex items-center justify-center`}>
          <Icon className={`${iconDim} ${iconColor}`} />
        </div>
      )}
      {provider.verificationStatus === "verified" && (
        <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-white ring-1 ring-white">
          <RiShieldCheckLine className="h-3.5 w-3.5 text-green-500" />
        </span>
      )}
    </div>
  );
}

// ─── Card View ──────────────────────────────────────────────────────────────

function ProviderCard({
  provider,
  onToggleFavorite,
  onInviteToEvent,
}: {
  provider: PartnersListing;
  onToggleFavorite: (p: PartnersListing) => void;
  onInviteToEvent: (p: PartnersListing) => void;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow overflow-hidden relative group flex flex-col">
      {/* Favorite button */}
      <button
        onClick={(e) => { e.preventDefault(); onToggleFavorite(provider); }}
        className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-background/80 hover:bg-background shadow-sm transition-colors"
        aria-label={provider.isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
      >
        {provider.isFavorite ? (
          <RiHeartFill className="h-4 w-4 text-red-500" />
        ) : (
          <RiHeartLine className="h-4 w-4 text-muted-foreground group-hover:text-red-400 transition-colors" />
        )}
      </button>

      <div className="p-4 flex flex-col gap-3 flex-1">
        {/* Header: avatar + name + badges */}
        <div className="flex items-start gap-3 pr-8">
          <ProviderAvatar provider={provider} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm leading-tight truncate">{provider.name}</p>
            {provider.tagline ? (
              <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{provider.tagline}</p>
            ) : null}
            {/* Org type + featured */}
            <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
              <Badge
                variant={getOrgTypeBadgeVariant(provider.orgType)}
                className="text-[10px] px-1.5 py-0 h-4"
              >
                {getOrgTypeLabel(provider.orgType)}
              </Badge>
              {provider.isFeatured && (
                <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4">Destacado</Badge>
              )}
              {provider.isUnclaimed && (
                <span className="inline-flex items-center gap-0.5 text-[10px] text-orange-600">
                  <RiUserUnfollowLine className="h-3 w-3" />
                  Sin reclamar
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Rating */}
        {(provider.totalReviews || 0) > 0 && (
          <div className="flex items-center gap-1">
            {Array.from({ length: 5 }).map((_, i) => (
              <RiStarFill
                key={i}
                className={`h-3.5 w-3.5 ${i < Math.round(parseFloat(provider.averageRating || "0")) ? "text-yellow-400" : "text-muted"}`}
              />
            ))}
            <span className="text-xs font-medium ml-0.5">{provider.averageRating}</span>
            <span className="text-xs text-muted-foreground">({provider.totalReviews})</span>
          </div>
        )}

        {/* Category + location + price badges */}
        <div className="flex flex-wrap gap-1.5">
          {provider.providerCategory && (
            <Badge variant="secondary" className="text-xs">{provider.providerCategory}</Badge>
          )}
          {provider.priceRange && (
            <Badge variant="outline" className="gap-1 text-xs">
              <RiPriceTag3Line className="h-3 w-3" />
              {provider.priceRange}
            </Badge>
          )}
          {(provider.city || provider.region) && (
            <Badge variant="outline" className="gap-1 text-xs">
              <RiMapPinLine className="h-3 w-3" />
              {[provider.city, provider.region].filter(Boolean).join(", ")}
            </Badge>
          )}
        </div>

        {/* Instagram */}
        {provider.instagramHandle && (
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <RiInstagramLine className="h-3.5 w-3.5 shrink-0" />
            @{provider.instagramHandle}
          </p>
        )}

        {/* Actions — pushed to bottom */}
        <div className="flex gap-2 mt-auto pt-1">
          <Button variant="outline" size="sm" className="flex-1 text-xs" asChild>
            <Link href={`/providers/${provider.slug}`} target="_blank">
              <RiExternalLinkLine className="h-3.5 w-3.5 mr-1" />
              Ver Perfil
            </Link>
          </Button>
          <Button
            variant="default"
            size="sm"
            className="flex-1 gap-1 text-xs"
            onClick={(e) => { e.preventDefault(); onInviteToEvent(provider); }}
          >
            <RiCalendarEventLine className="h-3.5 w-3.5" />
            Invitar
          </Button>
        </div>
      </div>
    </Card>
  );
}

// ─── List View Row ──────────────────────────────────────────────────────────

function ProviderRow({
  provider,
  onToggleFavorite,
  onInviteToEvent,
}: {
  provider: PartnersListing;
  onToggleFavorite: (p: PartnersListing) => void;
  onInviteToEvent: (p: PartnersListing) => void;
}) {
  return (
    <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
      <td className="p-3">
        <div className="flex items-center gap-3">
          <ProviderAvatar provider={provider} size="sm" />
          <div className="min-w-0">
            <p className="text-sm font-medium truncate flex items-center gap-1.5">
              {provider.name}
              {provider.isUnclaimed && (
                <Badge variant="outline" className="text-[10px] px-1 py-0 text-orange-600 border-orange-300">
                  Sin reclamar
                </Badge>
              )}
            </p>
            {provider.tagline && (
              <p className="text-xs text-muted-foreground truncate max-w-[200px]">{provider.tagline}</p>
            )}
          </div>
        </div>
      </td>
      <td className="p-3 hidden sm:table-cell">
        <Badge variant={getOrgTypeBadgeVariant(provider.orgType)} className="text-xs whitespace-nowrap">
          {getOrgTypeLabel(provider.orgType)}
        </Badge>
      </td>
      <td className="p-3 hidden md:table-cell">
        {provider.providerCategory && <Badge variant="secondary" className="text-xs">{provider.providerCategory}</Badge>}
      </td>
      <td className="p-3 hidden md:table-cell text-sm text-muted-foreground">
        {[provider.city, provider.region].filter(Boolean).join(", ") || "—"}
      </td>
      <td className="p-3 hidden lg:table-cell text-sm">
        {(provider.totalReviews || 0) > 0 ? (
          <span className="flex items-center gap-0.5">
            <RiStarFill className="h-3 w-3 text-yellow-400" />
            <span className="font-medium">{provider.averageRating}</span>
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="p-3 text-center">
        <button
          onClick={() => onToggleFavorite(provider)}
          className="p-1 rounded hover:bg-muted transition-colors"
          aria-label={provider.isFavorite ? "Quitar de favoritos" : "Agregar a favoritos"}
        >
          {provider.isFavorite ? (
            <RiHeartFill className="h-4 w-4 text-red-500" />
          ) : (
            <RiHeartLine className="h-4 w-4 text-muted-foreground" />
          )}
        </button>
      </td>
      <td className="p-3 text-right">
        <div className="flex items-center justify-end gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onInviteToEvent(provider)}
          >
            <RiCalendarEventLine className="h-3.5 w-3.5 mr-1" />
            Invitar
          </Button>
          <Button variant="ghost" size="sm" className="h-7 text-xs" asChild>
            <Link href={`/providers/${provider.slug}`} target="_blank">
              Ver
            </Link>
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ─── Create Provider Drawer ─────────────────────────────────────────────────

function CreateProviderDrawer({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCreated: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    category: "",
    instagram: "",
    city: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.category) {
      toast.error("Nombre y categoría son requeridos");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "Error al crear");

      toast.success(
        data.data.invitationSent
          ? `Se envió invitación por email a ${form.email}`
          : `${form.name} fue agregado a Partners`
      );
      setForm({ name: "", email: "", phone: "", category: "", instagram: "", city: "" });
      onCreated();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo crear el proveedor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Crear Proveedor</SheetTitle>
          <SheetDescription>
            Agrega un proveedor a Partners. Si tiene email, recibirá una invitación para reclamar su perfil.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div className="space-y-2">
            <Label htmlFor="cp-name">Nombre *</Label>
            <Input
              id="cp-name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Nombre de la empresa"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Categoría *</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona categoría" />
              </SelectTrigger>
              <SelectContent>
                {PROVIDER_CATEGORIES.map((cat) => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cp-email">Email (opcional)</Label>
            <Input
              id="cp-email"
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="contacto@empresa.com"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="cp-phone">Teléfono</Label>
              <Input
                id="cp-phone"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="+34 600..."
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cp-instagram">Instagram</Label>
              <Input
                id="cp-instagram"
                value={form.instagram}
                onChange={(e) => setForm({ ...form, instagram: e.target.value })}
                placeholder="@empresa"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cp-city">Ciudad</Label>
            <Input
              id="cp-city"
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="Madrid"
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="flex-1 gap-1.5" disabled={loading}>
              {loading ? "Creando..." : "Crear Proveedor"}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
