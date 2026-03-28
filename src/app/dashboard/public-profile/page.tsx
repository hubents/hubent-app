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
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { FileUploader } from "@/components/ui/file-uploader";
import {
  RiStoreLine,
  RiInstagramLine,
  RiShieldCheckLine,
  RiSaveLine,
  RiExternalLinkLine,
  RiMapPinLine,
  RiPhoneLine,
  RiStarLine,
  RiInformationLine,
  RiAddLine,
  RiDeleteBinLine,
  RiFileTextLine,
  RiCloseLine,
  RiAlertLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { useUserSession } from "@/hooks/use-user-session";
import { getCategoriesForOrgType, PRICE_RANGES, getOrgTypeLabel } from "@/config/provider-constants";
import { EventScopedGuard } from "@/components/layout/event-scoped-guard";

interface ProfileData {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
  phone: string | null;
  website: string | null;
  orgType: string | null;
  instagramHandle: string | null;
  providerCategory: string | null;
  verificationStatus: string;
  description: string | null;
  tagline: string | null;
  coverImage: string | null;
  publicEmail: string | null;
  priceRange: string | null;
  city: string | null;
  region: string | null;
  country: string | null;
  profileCompleteness: number | null;
  totalReviews: number | null;
  averageRating: string | null;
  instagramPosts: string[] | null;
  brochureUrl: string | null;
}

const IG_URL_REGEX = /^https?:\/\/(www\.)?instagram\.com\/(p|reel|tv)\/[\w-]+\/?/;

function InfoTooltip({ text }: { text: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
          <RiInformationLine className="h-4 w-4" />
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[280px]">
        <p>{text}</p>
      </TooltipContent>
    </Tooltip>
  );
}

export default function PublicProfilePage() {
  const { loading: sessionLoading } = useUserSession();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<Record<string, unknown>>({});
  const [saveError, setSaveError] = useState<string | null>(null);

  const fetchProfile = useCallback(async () => {
    try {
      const res = await fetch("/api/organizations/profile");
      if (res.ok) {
        const { data } = await res.json();
        setProfile(data);
        setEditData({});
        setSaveError(null);
      }
    } catch {
      toast.error("Error al cargar el perfil");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!sessionLoading) fetchProfile();
  }, [sessionLoading, fetchProfile]);

  const handleSave = async () => {
    if (Object.keys(editData).length === 0) return;
    setSaving(true);
    setSaveError(null);
    try {
      const payload = { ...editData };
      if (Array.isArray(payload.instagramPosts)) {
        payload.instagramPosts = (payload.instagramPosts as string[]).filter((u) => u.trim().length > 0);
      }
      const res = await fetch("/api/organizations/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (res.ok && json.success) {
        toast.success("Perfil actualizado");
        fetchProfile();
      } else {
        const msg = json.error?.details
          ? json.error.details.map((d: { field: string; message: string }) => `${d.field}: ${d.message}`).join(", ")
          : json.error?.message || "Error al guardar";
        setSaveError(msg);
        toast.error(msg);
      }
    } catch {
      setSaveError("Error de conexión");
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const updateField = (key: string, value: unknown) => {
    setEditData((prev) => ({ ...prev, [key]: value }));
    setSaveError(null);
  };

  const getValue = (key: keyof ProfileData): string => {
    const edited = editData[key];
    if (edited !== undefined) return String(edited ?? "");
    return String(profile?.[key] ?? "");
  };

  const getSelectValue = (key: keyof ProfileData): string | undefined => {
    const edited = editData[key];
    if (edited !== undefined) return edited ? String(edited) : undefined;
    const val = profile?.[key];
    return val ? String(val) : undefined;
  };

  const getInstagramPosts = (): string[] => {
    if (editData.instagramPosts !== undefined) return editData.instagramPosts as string[];
    return profile?.instagramPosts || [];
  };

  const getBrochureUrl = (): string => {
    if (editData.brochureUrl !== undefined) return String(editData.brochureUrl ?? "");
    return profile?.brochureUrl || "";
  };

  if (sessionLoading || loading) {
    return (
      <EventScopedGuard>
        <div className="space-y-6 max-w-4xl">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </EventScopedGuard>
    );
  }

  if (!profile) return null;

  const completeness = profile.profileCompleteness ?? 0;
  const hasChanges = Object.keys(editData).length > 0;
  const isVerified = profile.verificationStatus === "verified";
  const categories = getCategoriesForOrgType(profile.orgType);
  const orgLabel = getOrgTypeLabel(profile.orgType);

  return (
    <EventScopedGuard>
      <div className="space-y-6 max-w-4xl">
        {/* Header with always-visible actions */}
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
          <div className="flex items-center gap-2">
            {isVerified ? (
              <Button variant="outline" size="sm" asChild>
                <a href={`/providers/${profile.slug}`} target="_blank" rel="noopener noreferrer">
                  <RiExternalLinkLine className="h-4 w-4 mr-1" />
                  Ver perfil público
                </a>
              </Button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span>
                    <Button variant="outline" size="sm" disabled>
                      <RiExternalLinkLine className="h-4 w-4 mr-1" />
                      Ver perfil público
                    </Button>
                  </span>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Tu perfil público será visible una vez que un administrador verifique tu cuenta.</p>
                </TooltipContent>
              </Tooltip>
            )}
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button onClick={handleSave} disabled={!hasChanges || saving} size="sm">
                    <RiSaveLine className="h-4 w-4 mr-1" />
                    {saving ? "Guardando..." : "Guardar cambios"}
                  </Button>
                </span>
              </TooltipTrigger>
              {!hasChanges && (
                <TooltipContent>
                  <p>Editá algún campo para habilitar el guardado.</p>
                </TooltipContent>
              )}
            </Tooltip>
          </div>
        </div>

        {/* Unsaved changes banner */}
        {hasChanges && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-sm text-amber-800">
            <RiAlertLine className="h-4 w-4 shrink-0" />
            <span>Tenés cambios sin guardar.</span>
            <Button variant="link" size="sm" className="ml-auto p-0 h-auto text-amber-800 underline" onClick={() => { setEditData({}); setSaveError(null); }}>
              Descartar
            </Button>
          </div>
        )}

        {/* Validation error */}
        {saveError && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
            <RiCloseLine className="h-4 w-4 shrink-0" />
            <span>{saveError}</span>
          </div>
        )}

        {/* Profile Completeness */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium">Completitud del perfil</span>
              <span className="text-sm text-[var(--muted-foreground)]">{completeness}%</span>
            </div>
            <Progress value={completeness} className="h-2" />
            <div className="flex items-center gap-2 mt-2">
              <Badge variant={isVerified ? "success" : "secondary"}>
                <RiShieldCheckLine className="h-3 w-3 mr-1" />
                {isVerified ? "Verificado" : "Sin verificar"}
              </Badge>
              <Badge variant="outline">{orgLabel}</Badge>
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
                  value={getSelectValue("providerCategory")}
                  onValueChange={(v) => updateField("providerCategory", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Rango de precio</label>
                <Select
                  value={getSelectValue("priceRange")}
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
                value={getValue("tagline")}
                onChange={(e) => updateField("tagline", e.target.value)}
                maxLength={120}
              />
              <p className="text-xs text-[var(--muted-foreground)]">{getValue("tagline").length}/120</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Descripción</label>
              <Textarea
                placeholder="Describe tu empresa y servicios..."
                value={getValue("description")}
                onChange={(e) => updateField("description", e.target.value)}
                rows={4}
                maxLength={2000}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Logo URL</label>
                <Input
                  placeholder="https://..."
                  value={getValue("logo")}
                  onChange={(e) => updateField("logo", e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Imagen de portada URL</label>
                <Input
                  placeholder="https://..."
                  value={getValue("coverImage")}
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
                  value={getValue("phone")}
                  onChange={(e) => updateField("phone", e.target.value)}
                  placeholder="+54 11 ..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email público</label>
                <Input
                  type="email"
                  value={getValue("publicEmail")}
                  onChange={(e) => updateField("publicEmail", e.target.value)}
                  placeholder="contacto@empresa.com"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Sitio web</label>
                <Input
                  value={getValue("website")}
                  onChange={(e) => updateField("website", e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Instagram</label>
                <Input
                  value={getValue("instagramHandle")}
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
                  value={getValue("city")}
                  onChange={(e) => updateField("city", e.target.value)}
                  placeholder="Buenos Aires"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Región</label>
                <Input
                  value={getValue("region")}
                  onChange={(e) => updateField("region", e.target.value)}
                  placeholder="CABA"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">País</label>
                <Input
                  value={getValue("country")}
                  onChange={(e) => updateField("country", e.target.value)}
                  placeholder="Argentina"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Instagram Posts */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <RiInstagramLine className="h-5 w-5" />
                Instagram
                <InfoTooltip text="Pegá las URLs de tus publicaciones de Instagram. Se mostrarán como previews interactivos en tu perfil público del Marketplace." />
              </CardTitle>
              <span className="text-xs text-[var(--muted-foreground)]">{getInstagramPosts().length}/6 posts</span>
            </div>
            <CardDescription>Mostrá tus mejores posts en tu perfil público</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {getInstagramPosts().map((url, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <RiInstagramLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
                  <Input
                    value={url}
                    onChange={(e) => {
                      const posts = [...getInstagramPosts()];
                      posts[idx] = e.target.value;
                      updateField("instagramPosts", posts);
                    }}
                    placeholder="https://www.instagram.com/p/ABC123/"
                    className="pl-10"
                  />
                </div>
                {url && !IG_URL_REGEX.test(url) && (
                  <span className="text-xs text-red-500 shrink-0">URL inválida</span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 h-9 w-9 text-[var(--muted-foreground)] hover:text-red-500"
                  onClick={() => {
                    const posts = getInstagramPosts().filter((_, i) => i !== idx);
                    updateField("instagramPosts", posts);
                  }}
                >
                  <RiDeleteBinLine className="h-4 w-4" />
                </Button>
              </div>
            ))}
            {getInstagramPosts().length < 6 && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      updateField("instagramPosts", [...getInstagramPosts(), ""]);
                    }}
                  >
                    <RiAddLine className="h-4 w-4 mr-1" />
                    Agregar post
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Abrí Instagram, andá a un post, copiá la URL de la barra de direcciones y pegala acá.</p>
                </TooltipContent>
              </Tooltip>
            )}
          </CardContent>
        </Card>

        {/* Brochure PDF */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RiFileTextLine className="h-5 w-5" />
              Brochure / Dossier
              <InfoTooltip text="Subí un PDF con tu portfolio, tarifas o catálogo. Los visitantes podrán descargarlo desde tu perfil público." />
            </CardTitle>
            <CardDescription>PDF descargable desde tu perfil público</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {getBrochureUrl() ? (
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <RiFileTextLine className="h-8 w-8 text-red-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">Brochure subido</p>
                  <a
                    href={getBrochureUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-[var(--muted-foreground)] hover:underline truncate block"
                  >
                    {getBrochureUrl()}
                  </a>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="shrink-0 text-[var(--muted-foreground)] hover:text-red-500"
                  onClick={() => updateField("brochureUrl", "")}
                >
                  <RiDeleteBinLine className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <FileUploader
                folder="brochures"
                accept="application/pdf"
                variant="default"
                onUpload={(result) => {
                  updateField("brochureUrl", result.url);
                }}
              />
            )}
          </CardContent>
        </Card>

        {/* Stats (read-only) */}
        {(profile.totalReviews ?? 0) > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RiStarLine className="h-5 w-5" />
                Reseñas y calificación
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div className="text-3xl font-bold">{profile.averageRating || "—"}</div>
                <div className="text-sm text-[var(--muted-foreground)]">
                  {profile.totalReviews} reseña{(profile.totalReviews ?? 0) > 1 ? "s" : ""}
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </EventScopedGuard>
  );
}
