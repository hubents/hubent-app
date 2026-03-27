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
  RiTimeLine,
  RiSaveLine,
  RiGlobalLine,
  RiImageAddLine,
  RiDeleteBinLine,
  RiExternalLinkLine,
  RiMapPinLine,
  RiPriceTag3Line,
  RiTiktokLine,
  RiFacebookCircleLine,
  RiLinkedinBoxLine,
  RiPhoneLine,
  RiMailLine,
  RiStarLine,
} from "@remixicon/react";
import { toast } from "sonner";

const PROVIDER_CATEGORIES = [
  "Catering",
  "Fotografía",
  "Video",
  "Música / DJ",
  "Decoración",
  "Florería",
  "Iluminación",
  "Sonido",
  "Mobiliario",
  "Transporte",
  "Animación",
  "Wedding Planner",
  "Pastelería",
  "Bartender",
  "Otro",
];

const PRICE_RANGES = [
  { value: "$", label: "$ — Económico" },
  { value: "$$", label: "$$ — Moderado" },
  { value: "$$$", label: "$$$ — Premium" },
  { value: "$$$$", label: "$$$$ — Lujo" },
];

const RESPONSE_TIMES = [
  { value: "< 1h", label: "Menos de 1 hora" },
  { value: "< 4h", label: "Menos de 4 horas" },
  { value: "< 24h", label: "Menos de 24 horas" },
  { value: "1-3 days", label: "1-3 días" },
];

interface ProfileData {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  instagramHandle: string | null;
  providerCategory: string | null;
  serviceRadius: number | null;
  serviceAreas: string[] | null;
  verificationStatus: string;
  description: string | null;
  tagline: string | null;
  coverImage: string | null;
  publicEmail: string | null;
  tiktokHandle: string | null;
  facebookUrl: string | null;
  linkedinUrl: string | null;
  priceRange: string | null;
  services: string[] | null;
  categories: string[] | null;
  foundedYear: number | null;
  city: string | null;
  region: string | null;
  country: string | null;
  languagesSpoken: string[] | null;
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
  url: string;
  thumbnail: string | null;
  title: string | null;
  description: string | null;
  type: string | null;
  eventType: string | null;
  sortOrder: number | null;
}

interface FormData {
  name: string;
  tagline: string;
  description: string;
  phone: string;
  publicEmail: string;
  website: string;
  address: string;
  city: string;
  region: string;
  country: string;
  instagramHandle: string;
  tiktokHandle: string;
  facebookUrl: string;
  linkedinUrl: string;
  providerCategory: string;
  serviceRadius: string;
  priceRange: string;
  responseTime: string;
  foundedYear: string;
  services: string;
  minBudget: string;
  maxBudget: string;
}

export default function VendorProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [addingImage, setAddingImage] = useState(false);
  const [form, setForm] = useState<FormData>({
    name: "", tagline: "", description: "", phone: "", publicEmail: "",
    website: "", address: "", city: "", region: "", country: "",
    instagramHandle: "", tiktokHandle: "", facebookUrl: "", linkedinUrl: "",
    providerCategory: "", serviceRadius: "", priceRange: "", responseTime: "",
    foundedYear: "", services: "", minBudget: "", maxBudget: "",
  });

  const fetchProfile = useCallback(async () => {
    try {
      const [profileRes, portfolioRes] = await Promise.all([
        fetch("/api/vendor/profile"),
        fetch("/api/vendor/portfolio"),
      ]);
      const profileData = await profileRes.json();
      const portfolioData = await portfolioRes.json();

      if (profileData.success) {
        const d = profileData.data;
        setProfile(d);
        setForm({
          name: d.name || "",
          tagline: d.tagline || "",
          description: d.description || "",
          phone: d.phone || "",
          publicEmail: d.publicEmail || "",
          website: d.website || "",
          address: d.address || "",
          city: d.city || "",
          region: d.region || "",
          country: d.country || "",
          instagramHandle: d.instagramHandle || "",
          tiktokHandle: d.tiktokHandle || "",
          facebookUrl: d.facebookUrl || "",
          linkedinUrl: d.linkedinUrl || "",
          providerCategory: d.providerCategory || "",
          serviceRadius: d.serviceRadius?.toString() || "",
          priceRange: d.priceRange || "",
          responseTime: d.responseTime || "",
          foundedYear: d.foundedYear?.toString() || "",
          services: d.services?.join(", ") || "",
          minBudget: d.minBudget || "",
          maxBudget: d.maxBudget || "",
        });
      }
      if (portfolioData.success) {
        setPortfolio(portfolioData.data);
      }
    } catch {
      toast.error("Error al cargar perfil");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const servicesArr = form.services
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch("/api/vendor/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          tagline: form.tagline.trim() || "",
          description: form.description.trim() || "",
          phone: form.phone.trim() || "",
          publicEmail: form.publicEmail.trim() || "",
          website: form.website.trim() || "",
          address: form.address.trim() || "",
          city: form.city.trim() || "",
          region: form.region.trim() || "",
          country: form.country.trim() || "",
          instagramHandle: form.instagramHandle.trim() || "",
          tiktokHandle: form.tiktokHandle.trim() || "",
          facebookUrl: form.facebookUrl.trim() || "",
          linkedinUrl: form.linkedinUrl.trim() || "",
          providerCategory: form.providerCategory,
          serviceRadius: form.serviceRadius ? parseInt(form.serviceRadius) : undefined,
          priceRange: form.priceRange || "",
          responseTime: form.responseTime || "",
          foundedYear: form.foundedYear ? parseInt(form.foundedYear) : null,
          services: servicesArr,
          minBudget: form.minBudget ? parseFloat(form.minBudget) : null,
          maxBudget: form.maxBudget ? parseFloat(form.maxBudget) : null,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Perfil actualizado");
        fetchProfile();
      } else {
        toast.error(data.error?.message || "Error al guardar");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const handleAddPortfolioItem = async () => {
    if (!newImageUrl.trim()) return;
    setAddingImage(true);
    try {
      const res = await fetch("/api/vendor/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: newImageUrl.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setPortfolio((prev) => [...prev, data.data]);
        setNewImageUrl("");
        toast.success("Imagen agregada");
      } else {
        toast.error(data.error?.message || "Error al agregar");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setAddingImage(false);
    }
  };

  const handleDeletePortfolioItem = async (id: number) => {
    try {
      const res = await fetch(`/api/vendor/portfolio/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) {
        setPortfolio((prev) => prev.filter((p) => p.id !== id));
        toast.success("Imagen eliminada");
      }
    } catch {
      toast.error("Error al eliminar");
    }
  };

  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
    verified: { label: "Verificado", variant: "default" },
    unverified: { label: "Pendiente de verificación", variant: "secondary" },
    rejected: { label: "Rechazado", variant: "destructive" },
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!profile) {
    return <p className="text-muted-foreground">No se pudo cargar el perfil.</p>;
  }

  const status = statusConfig[profile.verificationStatus] || statusConfig.unverified;
  const completeness = profile.profileCompleteness || 0;

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mi Perfil</h1>
          <p className="text-muted-foreground text-sm">
            <span className="font-mono">/providers/{profile.slug}</span>
            <a
              href={`/providers/${profile.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary hover:underline ml-2"
            >
              Ver perfil público <RiExternalLinkLine className="h-3 w-3" />
            </a>
          </p>
        </div>
        <Badge variant={status.variant} className="flex items-center gap-1">
          {profile.verificationStatus === "verified" ? (
            <RiShieldCheckLine className="h-3 w-3" />
          ) : (
            <RiTimeLine className="h-3 w-3" />
          )}
          {status.label}
        </Badge>
      </div>

      {/* Profile completeness */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Completitud del perfil</span>
            <span className="text-sm font-bold text-primary">{completeness}%</span>
          </div>
          <Progress value={completeness} className="h-2" />
          {completeness < 100 && (
            <p className="text-xs text-muted-foreground mt-2">
              Completa tu perfil para aparecer mejor posicionado en el directorio.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Section 1: Basic Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RiStoreLine className="h-5 w-5" />
            Datos Básicos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nombre de Empresa</label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Tagline</label>
            <Input
              value={form.tagline}
              onChange={(e) => setForm((p) => ({ ...p, tagline: e.target.value }))}
              placeholder="Frase corta que describe tu servicio (máx 120 chars)"
              maxLength={120}
            />
            <p className="text-xs text-muted-foreground">{form.tagline.length}/120</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Categoría principal</label>
              <Select
                value={form.providerCategory}
                onValueChange={(v) => setForm((p) => ({ ...p, providerCategory: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Año de fundación</label>
              <Input
                type="number"
                value={form.foundedYear}
                onChange={(e) => setForm((p) => ({ ...p, foundedYear: e.target.value }))}
                placeholder="2018"
                min={1900}
                max={2100}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Descripción</label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Describe tu empresa, tu experiencia y lo que te hace especial..."
              rows={4}
              maxLength={2000}
            />
            <p className="text-xs text-muted-foreground">{form.description.length}/2000</p>
          </div>
        </CardContent>
      </Card>

      {/* Section 2: Contact */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RiPhoneLine className="h-5 w-5" />
            Contacto
          </CardTitle>
          <CardDescription>Datos visibles en tu perfil público</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Teléfono</label>
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+54 11 1234-5678"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <RiMailLine className="h-3.5 w-3.5" />
                Email público
              </label>
              <Input
                type="email"
                value={form.publicEmail}
                onChange={(e) => setForm((p) => ({ ...p, publicEmail: e.target.value }))}
                placeholder="info@tuempresa.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <RiGlobalLine className="h-3.5 w-3.5" />
              Sitio Web
            </label>
            <Input
              value={form.website}
              onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
              placeholder="https://tuempresa.com"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Dirección</label>
            <Input
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              placeholder="Calle y número"
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 3: Social Media */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RiInstagramLine className="h-5 w-5" />
            Redes Sociales
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <RiInstagramLine className="h-3.5 w-3.5" />
                Instagram
              </label>
              <Input
                value={form.instagramHandle}
                onChange={(e) => setForm((p) => ({ ...p, instagramHandle: e.target.value }))}
                placeholder="@tuempresa"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <RiTiktokLine className="h-3.5 w-3.5" />
                TikTok
              </label>
              <Input
                value={form.tiktokHandle}
                onChange={(e) => setForm((p) => ({ ...p, tiktokHandle: e.target.value }))}
                placeholder="@tuempresa"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <RiFacebookCircleLine className="h-3.5 w-3.5" />
                Facebook
              </label>
              <Input
                value={form.facebookUrl}
                onChange={(e) => setForm((p) => ({ ...p, facebookUrl: e.target.value }))}
                placeholder="https://facebook.com/tuempresa"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-1">
                <RiLinkedinBoxLine className="h-3.5 w-3.5" />
                LinkedIn
              </label>
              <Input
                value={form.linkedinUrl}
                onChange={(e) => setForm((p) => ({ ...p, linkedinUrl: e.target.value }))}
                placeholder="https://linkedin.com/company/tuempresa"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Section 4: Services & Pricing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RiPriceTag3Line className="h-5 w-5" />
            Servicios y Precios
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Servicios ofrecidos</label>
            <Textarea
              value={form.services}
              onChange={(e) => setForm((p) => ({ ...p, services: e.target.value }))}
              placeholder="Catering completo, Estaciones de comida, Servicio de mozos, Barra de tragos"
              rows={2}
            />
            <p className="text-xs text-muted-foreground">Separados por coma</p>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Rango de precio</label>
              <Select
                value={form.priceRange}
                onValueChange={(v) => setForm((p) => ({ ...p, priceRange: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {PRICE_RANGES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Presupuesto mín.</label>
              <Input
                type="number"
                value={form.minBudget}
                onChange={(e) => setForm((p) => ({ ...p, minBudget: e.target.value }))}
                placeholder="500"
                min={0}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Presupuesto máx.</label>
              <Input
                type="number"
                value={form.maxBudget}
                onChange={(e) => setForm((p) => ({ ...p, maxBudget: e.target.value }))}
                placeholder="10000"
                min={0}
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Tiempo de respuesta</label>
            <Select
              value={form.responseTime}
              onValueChange={(v) => setForm((p) => ({ ...p, responseTime: v }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecciona" />
              </SelectTrigger>
              <SelectContent>
                {RESPONSE_TIMES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Section 5: Location */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RiMapPinLine className="h-5 w-5" />
            Zona de Trabajo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Ciudad</label>
              <Input
                value={form.city}
                onChange={(e) => setForm((p) => ({ ...p, city: e.target.value }))}
                placeholder="Buenos Aires"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Región / Provincia</label>
              <Input
                value={form.region}
                onChange={(e) => setForm((p) => ({ ...p, region: e.target.value }))}
                placeholder="CABA"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">País</label>
              <Input
                value={form.country}
                onChange={(e) => setForm((p) => ({ ...p, country: e.target.value }))}
                placeholder="Argentina"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Radio de trabajo (km)</label>
            <Input
              type="number"
              value={form.serviceRadius}
              onChange={(e) => setForm((p) => ({ ...p, serviceRadius: e.target.value }))}
              placeholder="50"
              className="max-w-[200px]"
            />
          </div>
        </CardContent>
      </Card>

      {/* Section 6: Portfolio */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RiImageAddLine className="h-5 w-5" />
            Portfolio
          </CardTitle>
          <CardDescription>Fotos de tus trabajos que se muestran en tu perfil público</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {portfolio.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {portfolio.map((item) => (
                <div key={item.id} className="relative group rounded-lg overflow-hidden border aspect-square">
                  <img
                    src={item.url}
                    alt={item.title || "Portfolio"}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeletePortfolioItem(item.id)}
                    >
                      <RiDeleteBinLine className="h-4 w-4 mr-1" />
                      Eliminar
                    </Button>
                  </div>
                  {item.title && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
                      <p className="text-xs text-white truncate">{item.title}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="flex gap-2">
            <Input
              value={newImageUrl}
              onChange={(e) => setNewImageUrl(e.target.value)}
              placeholder="URL de la imagen (https://...)"
              className="flex-1"
            />
            <Button
              onClick={handleAddPortfolioItem}
              disabled={addingImage || !newImageUrl.trim()}
              size="sm"
            >
              <RiImageAddLine className="h-4 w-4 mr-1" />
              {addingImage ? "Agregando..." : "Agregar"}
            </Button>
          </div>

          {portfolio.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">
              Aún no tienes fotos en tu portfolio. Agrega imágenes de tus trabajos para atraer más clientes.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Stats (read-only) */}
      {(profile.totalReviews || 0) > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RiStarLine className="h-5 w-5" />
              Estadísticas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Rating promedio</p>
                <p className="text-2xl font-bold">{profile.averageRating || "—"} ⭐</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reseñas totales</p>
                <p className="text-2xl font-bold">{profile.totalReviews || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save button (sticky bottom) */}
      <div className="sticky bottom-4 flex justify-end">
        <Button
          onClick={handleSave}
          disabled={saving || !form.name.trim()}
          size="lg"
          className="shadow-lg"
        >
          <RiSaveLine className="h-4 w-4 mr-2" />
          {saving ? "Guardando..." : "Guardar Cambios"}
        </Button>
      </div>
    </div>
  );
}
