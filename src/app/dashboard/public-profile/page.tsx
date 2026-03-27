"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RiStoreLine,
  RiInstagramLine,
  RiShieldCheckLine,
  RiSaveLine,
  RiGlobalLine,
  RiImageAddLine,
  RiDeleteBinLine,
  RiExternalLinkLine,
  RiMapPinLine,
  RiPriceTag3Line,
  RiPhoneLine,
  RiMailLine,
  RiStarLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { useUserSession } from "@/hooks/use-user-session";
import { useRouter } from "next/navigation";
import { PROVIDER_CATEGORIES, PRICE_RANGES } from "@/config/provider-constants";
import { EventScopedGuard } from "@/components/layout/event-scoped-guard";

interface ProfileData {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
  phone: string | null;
  website: string | null;
  instagramHandle: string | null;
  providerCategory: string | null;
  verificationStatus: string;
  description: string | null;
  tagline: string | null;
  coverImage: string | null;
  publicEmail: string | null;
  priceRange: string | null;
  services: string[] | null;
  foundedYear: number | null;
  city: string | null;
  region: string | null;
  country: string | null;
  minBudget: string | null;
  maxBudget: string | null;
  responseTime: string | null;
  profileCompleteness: number | null;
  totalReviews: number | null;
  averageRating: string | null;
  isFeatured: boolean;
}

interface PortfolioItem {
  id: number;
  type: string;
  url: string;
  title: string | null;
  description: string | null;
}

export default function PublicProfilePage() {
  const { orgType, loading: sessionLoading } = useUserSession();
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<Partial<ProfileData>>({});
  const [newPortfolioUrl, setNewPortfolioUrl] = useState("");

  // Redirect non-providers
  useEffect(() => {
    if (!sessionLoading && orgType !== "provider") {
      router.replace("/dashboard");
    }
  }, [orgType, sessionLoading, router]);

  const fetchProfile = useCallback(async () => {
    try {
      const [profileRes, portfolioRes] = await Promise.all([
        fetch("/api/vendor/profile"),
        fetch("/api/vendor/portfolio"),
      ]);
      if (profileRes.ok) {
        const data = await profileRes.json();
        setProfile(data.data || data);
        setEditData({});
      }
      if (portfolioRes.ok) {
        const data = await portfolioRes.json();
        setPortfolio(data.data || []);
      }
    } catch {
      toast.error("Error al cargar el perfil");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (orgType === "provider") fetchProfile();
  }, [orgType, fetchProfile]);

  const handleSave = async () => {
    if (Object.keys(editData).length === 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/vendor/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });
      if (res.ok) {
        toast.success("Perfil actualizado");
        fetchProfile();
      } else {
        toast.error("Error al guardar");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const handleAddPortfolio = async () => {
    if (!newPortfolioUrl.trim()) return;
    try {
      const res = await fetch("/api/vendor/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newPortfolioUrl.trim(), type: "image" }),
      });
      if (res.ok) {
        setNewPortfolioUrl("");
        fetchProfile();
      }
    } catch {
      toast.error("Error al agregar imagen");
    }
  };

  const handleDeletePortfolio = async (id: number) => {
    try {
      await fetch(`/api/vendor/portfolio/${id}`, { method: "DELETE" });
      setPortfolio((prev) => prev.filter((p) => p.id !== id));
    } catch {
      toast.error("Error al eliminar");
    }
  };

  const updateField = (key: string, value: unknown) => {
    setEditData((prev) => ({ ...prev, [key]: value }));
  };

  const getValue = (key: keyof ProfileData) => {
    return (editData as Record<string, unknown>)[key] ?? profile?.[key] ?? "";
  };

  if (sessionLoading || (orgType !== "provider")) {
    return null;
  }

  if (loading) {
    return (
      <EventScopedGuard>
        <div className="space-y-6">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </EventScopedGuard>
    );
  }

  const completeness = profile?.profileCompleteness ?? 0;
  const hasChanges = Object.keys(editData).length > 0;

  return (
    <EventScopedGuard>
      <div className="space-y-6 max-w-4xl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <RiStoreLine className="h-6 w-6" />
              Mi Perfil Público
            </h1>
            <p className="text-[var(--muted-foreground)]">
              Gestiona cómo apareces en el Marketplace HubEnts
            </p>
          </div>
          <div className="flex gap-2">
            {profile?.slug && (
              <Button variant="outline" size="sm" asChild>
                <a href={`/providers/${profile.slug}`} target="_blank" rel="noopener noreferrer">
                  <RiExternalLinkLine className="h-4 w-4 mr-1" />
                  Ver perfil público
                </a>
              </Button>
            )}
            {hasChanges && (
              <Button onClick={handleSave} disabled={saving} size="sm">
                <RiSaveLine className="h-4 w-4 mr-1" />
                {saving ? "Guardando..." : "Guardar cambios"}
              </Button>
            )}
          </div>
        </div>

        {/* Profile Completeness */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Completitud del perfil</span>
              <span className="text-sm text-[var(--muted-foreground)]">{completeness}%</span>
            </div>
            <Progress value={completeness} className="h-2" />
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={profile?.verificationStatus === "verified" ? "success" : "secondary"}>
                <RiShieldCheckLine className="h-3 w-3 mr-1" />
                {profile?.verificationStatus === "verified" ? "Verificado" : "Sin verificar"}
              </Badge>
              {profile?.isFeatured && (
                <Badge variant="default">
                  <RiStarLine className="h-3 w-3 mr-1" />
                  Destacado
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Información básica</CardTitle>
            <CardDescription>Nombre, categoría y descripción</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Categoría</label>
                <Select
                  value={String(getValue("providerCategory"))}
                  onValueChange={(v) => updateField("providerCategory", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDER_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Rango de precio</label>
                <Select
                  value={String(getValue("priceRange"))}
                  onValueChange={(v) => updateField("priceRange", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar rango" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRICE_RANGES.map((r) => (
                      <SelectItem key={r} value={r}>{r}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tagline</label>
              <Input
                placeholder="Frase corta que te describe"
                value={String(getValue("tagline"))}
                onChange={(e) => updateField("tagline", e.target.value)}
                maxLength={120}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Descripción</label>
              <Textarea
                placeholder="Describe tu empresa y servicios..."
                value={String(getValue("description"))}
                onChange={(e) => updateField("description", e.target.value)}
                rows={4}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Logo URL</label>
                <Input
                  placeholder="https://..."
                  value={String(getValue("logo"))}
                  onChange={(e) => updateField("logo", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Imagen de portada URL</label>
                <Input
                  placeholder="https://..."
                  value={String(getValue("coverImage"))}
                  onChange={(e) => updateField("coverImage", e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RiPhoneLine className="h-5 w-5" />
              Contacto
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Teléfono</label>
                <Input
                  value={String(getValue("phone"))}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="+54 11 ..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email público</label>
                <Input
                  type="email"
                  value={String(getValue("publicEmail"))}
                  onChange={(e) => updateField("publicEmail", e.target.value)}
                  placeholder="contacto@empresa.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Sitio web</label>
                <Input
                  value={String(getValue("website"))}
                  onChange={(e) => updateField("website", e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Instagram</label>
                <Input
                  value={String(getValue("instagramHandle"))}
                  onChange={(e) => updateField("instagramHandle", e.target.value)}
                  placeholder="@tu_empresa"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RiMapPinLine className="h-5 w-5" />
              Ubicación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Ciudad</label>
                <Input
                  value={String(getValue("city"))}
                  onChange={(e) => updateField("city", e.target.value)}
                  placeholder="Buenos Aires"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Región</label>
                <Input
                  value={String(getValue("region"))}
                  onChange={(e) => updateField("region", e.target.value)}
                  placeholder="CABA"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">País</label>
                <Input
                  value={String(getValue("country"))}
                  onChange={(e) => updateField("country", e.target.value)}
                  placeholder="Argentina"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Portfolio */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RiImageAddLine className="h-5 w-5" />
              Portfolio
            </CardTitle>
            <CardDescription>Muestra tu mejor trabajo</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="URL de imagen..."
                value={newPortfolioUrl}
                onChange={(e) => setNewPortfolioUrl(e.target.value)}
              />
              <Button onClick={handleAddPortfolio} disabled={!newPortfolioUrl.trim()}>
                Agregar
              </Button>
            </div>
            {portfolio.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {portfolio.map((item) => (
                  <div key={item.id} className="relative group rounded-lg overflow-hidden aspect-video bg-[var(--muted)]">
                    <img src={item.url} alt={item.title || ""} className="w-full h-full object-cover" />
                    <button
                      onClick={() => handleDeletePortfolio(item.id)}
                      className="absolute top-2 right-2 p-1.5 rounded-full bg-red-500 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <RiDeleteBinLine className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center py-6 text-[var(--muted-foreground)]">
                Agrega imágenes de tu trabajo para atraer más clientes
              </p>
            )}
          </CardContent>
        </Card>

        {/* Stats (read-only) */}
        {(profile?.totalReviews ?? 0) > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RiStarLine className="h-5 w-5" />
                Reseñas y calificación
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="text-3xl font-bold">{profile?.averageRating || "—"}</div>
                <div className="text-sm text-[var(--muted-foreground)]">
                  {profile?.totalReviews} reseña{(profile?.totalReviews ?? 0) > 1 ? "s" : ""}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </EventScopedGuard>
  );
}
