"use client";

import { useEffect, useState, useCallback } from "react";
import { EventScopedGuard } from "@/components/layout/event-scoped-guard";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
  RiFilterLine,
  RiCloseLine,
  RiUserUnfollowLine,
} from "@remixicon/react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { PROVIDER_CATEGORIES, PRICE_RANGES } from "@/config/provider-constants";

interface MarketplaceProvider {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
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

export default function MarketplacePage() {
  return <EventScopedGuard><MarketplaceContent /></EventScopedGuard>;
}

function MarketplaceContent() {
  // toast imported from sonner at top level
  const [providers, setProviders] = useState<MarketplaceProvider[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [city, setCity] = useState("");
  const [priceRange, setPriceRange] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [myProvidersOnly, setMyProvidersOnly] = useState(false);
  const [total, setTotal] = useState(0);
  const [viewMode, setViewMode] = useState<"cards" | "list">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("marketplace-view") as "cards" | "list") || "cards";
    }
    return "cards";
  });
  const [showCreateDrawer, setShowCreateDrawer] = useState(false);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (category) params.set("category", category);
      if (city) params.set("city", city);
      if (priceRange) params.set("priceRange", priceRange);
      if (favoritesOnly) params.set("favorites", "true");
      if (myProvidersOnly) params.set("myProviders", "true");
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
  }, [search, category, city, priceRange, favoritesOnly, myProvidersOnly]);

  useEffect(() => {
    const timer = setTimeout(fetchProviders, 300);
    return () => clearTimeout(timer);
  }, [fetchProviders]);

  const toggleViewMode = (mode: "cards" | "list") => {
    setViewMode(mode);
    localStorage.setItem("marketplace-view", mode);
  };

  const toggleFavorite = async (provider: MarketplaceProvider) => {
    try {
      if (provider.isFavorite) {
        await fetch(`/api/providers/favorites/${provider.id}`, { method: "DELETE" });
      } else {
        await fetch("/api/providers/favorites", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ providerOrgId: provider.id }),
        });
      }
      setProviders((prev) =>
        prev.map((p) =>
          p.id === provider.id ? { ...p, isFavorite: !p.isFavorite } : p
        )
      );
    } catch {
      toast.error("No se pudo actualizar favorito");
    }
  };

  const clearFilters = () => {
    setSearch("");
    setCategory("");
    setCity("");
    setPriceRange("");
    setFavoritesOnly(false);
    setMyProvidersOnly(false);
  };

  const hasFilters = search || category || city || priceRange || favoritesOnly || myProvidersOnly;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Marketplace HubEnts</h1>
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
          <Select value={category || "all"} onValueChange={(v) => setCategory(v === "all" ? "" : v)}>
            <SelectTrigger className="w-full sm:w-[200px]">
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
            <SelectTrigger className="w-full sm:w-[140px]">
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
            className="w-full sm:w-[160px]"
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
            <Skeleton key={i} className="h-56 w-full rounded-lg" />
          ))}
        </div>
      ) : providers.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <RiStore2Line className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-lg font-medium">
              {favoritesOnly
                ? "No tienes favoritos aun"
                : myProvidersOnly
                ? "No has creado proveedores aun"
                : "No se encontraron proveedores"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {favoritesOnly
                ? "Marca proveedores con el corazon para encontrarlos rapido"
                : myProvidersOnly
                ? "Crea un proveedor para empezar a gestionarlo"
                : hasFilters
                ? "Intenta con otros filtros de busqueda"
                : "Aun no hay proveedores en la plataforma"}
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
            {total} {total === 1 ? "proveedor encontrado" : "proveedores encontrados"}
          </p>

          {viewMode === "cards" ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {providers.map((provider) => (
                <ProviderCard key={provider.id} provider={provider} onToggleFavorite={toggleFavorite} />
              ))}
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b bg-muted/50">
                    <th className="text-left text-sm font-medium p-3">Proveedor</th>
                    <th className="text-left text-sm font-medium p-3 hidden md:table-cell">Categoria</th>
                    <th className="text-left text-sm font-medium p-3 hidden md:table-cell">Ciudad</th>
                    <th className="text-left text-sm font-medium p-3 hidden lg:table-cell">Rating</th>
                    <th className="text-left text-sm font-medium p-3 hidden lg:table-cell">Precio</th>
                    <th className="text-center text-sm font-medium p-3 w-20">Fav</th>
                    <th className="text-right text-sm font-medium p-3 w-24">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {providers.map((provider) => (
                    <ProviderRow key={provider.id} provider={provider} onToggleFavorite={toggleFavorite} />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

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

// ─── Card View ──────────────────────────────────────────────────────────────

function ProviderCard({
  provider,
  onToggleFavorite,
}: {
  provider: MarketplaceProvider;
  onToggleFavorite: (p: MarketplaceProvider) => void;
}) {
  return (
    <Card className="hover:shadow-md transition-shadow overflow-hidden relative group">
      {/* Favorite button */}
      <button
        onClick={(e) => { e.preventDefault(); onToggleFavorite(provider); }}
        className="absolute top-3 right-3 z-10 p-1.5 rounded-full bg-white/80 hover:bg-white shadow-sm transition-colors"
      >
        {provider.isFavorite ? (
          <RiHeartFill className="h-4 w-4 text-red-500" />
        ) : (
          <RiHeartLine className="h-4 w-4 text-gray-400 group-hover:text-red-400" />
        )}
      </button>

      <CardHeader className="pb-3">
        <div className="flex items-start gap-3">
          {provider.logo ? (
            <Image
              src={provider.logo}
              alt={provider.name}
              width={48}
              height={48}
              className="h-12 w-12 rounded-lg object-cover shrink-0"
            />
          ) : (
            <div className="h-12 w-12 rounded-lg bg-purple-100 flex items-center justify-center shrink-0">
              <RiStore2Line className="h-6 w-6 text-purple-600" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate flex items-center gap-1.5">
              {provider.name}
              {provider.isFeatured && (
                <Badge variant="default" className="text-[10px] px-1.5 py-0">Destacado</Badge>
              )}
            </CardTitle>
            <CardDescription className="flex items-center gap-1 mt-0.5">
              {provider.verificationStatus === "verified" && (
                <>
                  <RiShieldCheckLine className="h-3 w-3 text-green-600" />
                  <span>Verificado</span>
                </>
              )}
              {provider.isUnclaimed && (
                <>
                  <RiUserUnfollowLine className="h-3 w-3 text-orange-500" />
                  <span className="text-orange-600">Sin reclamar</span>
                </>
              )}
              {(provider.totalReviews || 0) > 0 && (
                <span className="flex items-center gap-0.5 ml-2">
                  <RiStarFill className="h-3 w-3 text-yellow-500" />
                  {provider.averageRating}
                  <span className="text-muted-foreground">({provider.totalReviews})</span>
                </span>
              )}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {provider.tagline && (
          <p className="text-sm text-muted-foreground line-clamp-2">{provider.tagline}</p>
        )}

        <div className="flex flex-wrap gap-1.5">
          {provider.providerCategory && (
            <Badge variant="secondary">{provider.providerCategory}</Badge>
          )}
          {provider.priceRange && (
            <Badge variant="outline" className="gap-1">
              <RiPriceTag3Line className="h-3 w-3" />
              {provider.priceRange}
            </Badge>
          )}
          {(provider.city || provider.region) && (
            <Badge variant="outline" className="gap-1">
              <RiMapPinLine className="h-3 w-3" />
              {[provider.city, provider.region].filter(Boolean).join(", ")}
            </Badge>
          )}
        </div>

        {provider.instagramHandle && (
          <p className="text-sm text-muted-foreground flex items-center gap-1">
            <RiInstagramLine className="h-3.5 w-3.5" />
            @{provider.instagramHandle}
          </p>
        )}

        <div className="flex gap-2 pt-1">
          <Button variant="outline" size="sm" className="flex-1" asChild>
            <Link href={`/providers/${provider.slug}`} target="_blank">
              <RiExternalLinkLine className="h-3.5 w-3.5 mr-1" />
              Ver Perfil
            </Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── List View Row ──────────────────────────────────────────────────────────

function ProviderRow({
  provider,
  onToggleFavorite,
}: {
  provider: MarketplaceProvider;
  onToggleFavorite: (p: MarketplaceProvider) => void;
}) {
  return (
    <tr className="border-b last:border-0 hover:bg-muted/30 transition-colors">
      <td className="p-3">
        <div className="flex items-center gap-3">
          {provider.logo ? (
            <Image
              src={provider.logo}
              alt={provider.name}
              width={32}
              height={32}
              className="h-8 w-8 rounded-md object-cover shrink-0"
            />
          ) : (
            <div className="h-8 w-8 rounded-md bg-purple-100 flex items-center justify-center shrink-0">
              <RiStore2Line className="h-4 w-4 text-purple-600" />
            </div>
          )}
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
              <p className="text-xs text-muted-foreground truncate">{provider.tagline}</p>
            )}
          </div>
        </div>
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
            <RiStarFill className="h-3 w-3 text-yellow-500" />
            {provider.averageRating}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </td>
      <td className="p-3 hidden lg:table-cell text-sm text-muted-foreground">
        {provider.priceRange || "—"}
      </td>
      <td className="p-3 text-center">
        <button
          onClick={() => onToggleFavorite(provider)}
          className="p-1 rounded hover:bg-muted transition-colors"
        >
          {provider.isFavorite ? (
            <RiHeartFill className="h-4 w-4 text-red-500" />
          ) : (
            <RiHeartLine className="h-4 w-4 text-gray-400" />
          )}
        </button>
      </td>
      <td className="p-3 text-right">
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/providers/${provider.slug}`} target="_blank">
            Ver
          </Link>
        </Button>
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
  // toast imported from sonner at top level
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
      toast.error("Nombre y categoria son requeridos");
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
          ? `Se envio invitacion por email a ${form.email}`
          : `${form.name} fue agregado al marketplace`
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
            Agrega un proveedor al Marketplace. Si tiene email, recibira una invitacion para reclamar su perfil.
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
            <Label>Categoria *</Label>
            <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
              <SelectTrigger>
                <SelectValue placeholder="Selecciona categoria" />
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
              <Label htmlFor="cp-phone">Telefono</Label>
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
