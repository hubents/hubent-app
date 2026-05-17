"use client";

import Link from "next/link";
import { useEffect, useState, useCallback, useRef } from "react";
import { FileUploader } from "@/components/ui/file-uploader";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useUserSession } from "@/hooks/use-user-session";
import { getCategoriesForOrgType, getOrgTypeLabel } from "@/config/provider-constants";
import { EventScopedGuard } from "@/components/layout/event-scoped-guard";
import { isInstagramPostUrl } from "@/lib/instagram-post-url";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Store02Icon,
  ArrowUpRight01Icon,
  FloppyDiskIcon,
  Shield01Icon,
  Alert01Icon,
  Cancel01Icon,
  PhoneCheckIcon,
  Location01Icon,
  Camera01Icon,
  File01Icon,
  StarIcon,
  Settings01Icon,
  Add01Icon,
  Delete01Icon,
  CheckmarkCircle01Icon,
  InformationCircleIcon,
  Image01Icon,
  LinkSquare01Icon,
} from "@hugeicons/core-free-icons";

// ── Design tokens ──────────────────────────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid var(--line-strong)",
  borderRadius: "var(--r-sm)",
  fontSize: 13,
  fontFamily: "inherit",
  background: "white",
  color: "var(--ink-1)",
  outline: "none",
  boxSizing: "border-box",
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  resize: "vertical" as const,
  fontFamily: "inherit",
  lineHeight: 1.5,
  minHeight: 80,
};

// ── Primitive components ───────────────────────────────────────────────────────

function RadialProgress({ value, size = 74 }: { value: number; size?: number }) {
  const r = (size - 10) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  const color = value >= 80 ? "var(--ink-1)" : value >= 50 ? "#9A7218" : "#B54632";
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--line-1)" strokeWidth="7" fill="none" />
      <circle
        cx={size / 2} cy={size / 2} r={r}
        stroke={color} strokeWidth="7" fill="none"
        strokeDasharray={c} strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
        style={{ transition: "stroke-dashoffset .4s ease" }}
      />
      <text x="50%" y="52%" textAnchor="middle" dominantBaseline="middle"
        style={{ fontSize: size < 70 ? 13 : 15, fontWeight: 700, fill: "var(--ink-1)" }}>
        {value}%
      </text>
    </svg>
  );
}

function SectionCard({
  icon,
  title,
  subtitle,
  headerRight,
  children,
}: {
  icon: React.ComponentProps<typeof HugeiconsIcon>["icon"];
  title: string;
  subtitle?: string;
  headerRight?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      background: "var(--bg-panel)",
      border: "1px solid var(--line-1)",
      borderRadius: "var(--r-md)",
      padding: 18,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 32, height: 32,
          background: "var(--bg-subtle)",
          borderRadius: 8,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "var(--color-brand)", flexShrink: 0,
        }}>
          <HugeiconsIcon icon={icon} size={15} strokeWidth={1.5} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-1)" }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{subtitle}</div>}
        </div>
        {headerRight}
      </div>
      {children}
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: "block", fontSize: 11.5, fontWeight: 500, color: "var(--ink-2)", marginBottom: 5, letterSpacing: ".01em" }}>
        {label}
      </label>
      {children}
      {hint && <div style={{ fontSize: 10.5, color: "var(--ink-3)", marginTop: 4, lineHeight: 1.4 }}>{hint}</div>}
    </div>
  );
}

// ── Data types ─────────────────────────────────────────────────────────────────

interface PortfolioItem {
  id: number;
  url: string;
  thumbnail: string | null;
  title: string | null;
  sortOrder: number | null;
}

interface ProfileData {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
  invoiceLogo?: string | null;
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

// ── Page ───────────────────────────────────────────────────────────────────────

export default function PublicProfilePage() {
  const { loading: sessionLoading } = useUserSession();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editData, setEditData] = useState<Record<string, unknown>>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [requestingVerif, setRequestingVerif] = useState(false);
  const [verifRequested, setVerifRequested] = useState(false);

  // Slug personalizado
  const [slugInput, setSlugInput] = useState("");
  const [slugStatus, setSlugStatus] = useState<"idle" | "checking" | "available" | "taken">("idle");
  const [slugSuggestion, setSlugSuggestion] = useState<string | null>(null);
  const slugDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Portfolio state
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);
  const [portfolioLoading, setPortfolioLoading] = useState(false);
  const [addingPortfolio, setAddingPortfolio] = useState(false);
  const [newItemUrl, setNewItemUrl] = useState("");
  const [newItemTitle, setNewItemTitle] = useState("");
  const [newItemSubmitting, setNewItemSubmitting] = useState(false);

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

  const fetchPortfolio = useCallback(async (slug: string) => {
    setPortfolioLoading(true);
    try {
      const res = await fetch(`/api/providers/${slug}/portfolio`);
      if (res.ok) {
        const { data } = await res.json();
        setPortfolioItems(data || []);
      }
    } catch {
      // non-critical
    } finally {
      setPortfolioLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!sessionLoading) fetchProfile();
  }, [sessionLoading, fetchProfile]);

  // Inicializar verifRequested si ya está en pending (de una sesión anterior)
  useEffect(() => {
    if (profile?.verificationStatus === "pending") setVerifRequested(true);
  }, [profile?.verificationStatus]);

  // Inicializar slugInput desde el perfil cargado
  useEffect(() => {
    if (profile?.slug && !slugInput) setSlugInput(profile.slug);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.slug]);

  const checkSlug = useCallback((value: string) => {
    if (slugDebounce.current) clearTimeout(slugDebounce.current);
    const clean = value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").substring(0, 60);
    if (!clean || clean === profile?.slug) { setSlugStatus("idle"); return; }
    setSlugStatus("checking");
    slugDebounce.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/organizations/check-slug?slug=${encodeURIComponent(clean)}`);
        const json = await res.json();
        if (json.success) {
          setSlugStatus(json.data.available ? "available" : "taken");
          setSlugSuggestion(json.data.suggestion ?? null);
        }
      } catch { setSlugStatus("idle"); }
    }, 400);
  }, [profile?.slug]);

  const handleRequestVerification = async () => {
    setRequestingVerif(true);
    try {
      const res = await fetch("/api/organizations/request-verification", { method: "POST" });
      const json = await res.json();
      if (res.ok && json.success) {
        setVerifRequested(true);
        setProfile((prev) => prev ? { ...prev, verificationStatus: "pending" } : prev);
        toast.success("Solicitud enviada. Te contactaremos en 24–48 h.");
      } else {
        toast.error(json.error?.message || "Error al enviar la solicitud");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setRequestingVerif(false);
    }
  };

  useEffect(() => {
    if (profile?.slug) fetchPortfolio(profile.slug);
  }, [profile?.slug, fetchPortfolio]);

  const handleSave = async () => {
    const cleanSlug = slugInput.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").substring(0, 60);
    const slugChanged = cleanSlug && cleanSlug !== profile?.slug;
    if (slugChanged && slugStatus === "taken") {
      toast.error("La URL elegida ya está en uso. Elige otra o usa la sugerida.");
      return;
    }
    const hasSlugChange = slugChanged && (slugStatus === "available" || slugStatus === "idle");
    if (Object.keys(editData).length === 0 && !hasSlugChange) return;
    setSaving(true);
    setSaveError(null);
    try {
      const payload = { ...editData };
      if (hasSlugChange) payload.slug = cleanSlug;
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
        setSlugStatus("idle");
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
        <div style={{ maxWidth: 860, display: "flex", flexDirection: "column", gap: 14 }}>
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      </EventScopedGuard>
    );
  }

  if (!profile) return null;

  const completeness = profile.profileCompleteness ?? 0;
  const hasChanges = Object.keys(editData).length > 0;
  const isVerified = profile.verificationStatus === "verified";
  const isPending = profile.verificationStatus === "pending" || verifRequested;
  const categories = getCategoriesForOrgType(profile.orgType);
  const orgLabel = getOrgTypeLabel(profile.orgType);
  const completenessMsg =
    completeness >= 80
      ? "¡Listo! Tu perfil está completo y optimizado para aparecer bien posicionado."
      : completeness >= 50
      ? "Vas bien. Completa más secciones para mejorar tu visibilidad."
      : "Perfil incompleto. Añade contenido para ganar visibilidad.";
  const coverPreview = getValue("coverImage") || profile.coverImage || "";

  return (
    <EventScopedGuard>
      <div style={{ maxWidth: 860, display: "flex", flexDirection: "column", gap: 14 }}>

        {/* Header ─────────────────────────────────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: "var(--ink-1)", margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
              <HugeiconsIcon icon={Store02Icon} size={20} strokeWidth={1.5} />
              Mi Perfil Público
            </h1>
            <p style={{ fontSize: 13, color: "var(--ink-3)", margin: "4px 0 0", lineHeight: 1.4 }}>
              Gestiona cómo apareces en <span style={{ color: "var(--ink-1)", fontWeight: 500 }}>Partners Hubents</span>
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
            {/* Botón solicitar verificación — solo si no está verificado */}
            {!isVerified && (
              isPending ? (
                <span style={{
                  background: "#FFFBEB", color: "#92400E",
                  border: "1px solid #FDE68A",
                  padding: "8px 14px", borderRadius: "var(--r-sm)",
                  fontSize: 12.5, fontWeight: 500,
                  display: "inline-flex", alignItems: "center", gap: 6,
                }}>
                  <HugeiconsIcon icon={Shield01Icon} size={13} strokeWidth={1.5} />
                  Verificación en revisión
                </span>
              ) : (
                <button
                  onClick={handleRequestVerification}
                  disabled={requestingVerif}
                  style={{
                    background: "white", color: "var(--ink-1)",
                    border: "1px solid var(--line-strong)",
                    padding: "8px 14px", borderRadius: "var(--r-sm)",
                    fontSize: 12.5, fontWeight: 500,
                    display: "inline-flex", alignItems: "center", gap: 6,
                    cursor: requestingVerif ? "not-allowed" : "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  <HugeiconsIcon icon={Shield01Icon} size={13} strokeWidth={1.5} />
                  {requestingVerif ? "Enviando…" : "Solicitar verificación"}
                </button>
              )
            )}
            <a
              href={`/providers/${profile.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                background: "white", color: "var(--ink-1)",
                border: "1px solid var(--line-strong)",
                padding: "8px 14px", borderRadius: "var(--r-sm)",
                fontSize: 12.5, fontWeight: 500,
                display: "inline-flex", alignItems: "center", gap: 6,
                textDecoration: "none", cursor: "pointer",
              }}
              title={isVerified ? undefined : "Vista previa — tu perfil aparecerá en el directorio una vez verificado"}
            >
              <HugeiconsIcon icon={ArrowUpRight01Icon} size={13} strokeWidth={1.5} />
              {isVerified ? "Ver perfil público" : "Vista previa"}
            </a>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              style={{
                background: hasChanges && !saving ? "var(--ink-1)" : "var(--bg-subtle)",
                color: hasChanges && !saving ? "white" : "var(--ink-3)",
                border: "none",
                padding: "8px 18px", borderRadius: "var(--r-sm)",
                fontSize: 12.5, fontWeight: 600,
                display: "inline-flex", alignItems: "center", gap: 6,
                cursor: hasChanges && !saving ? "pointer" : "not-allowed",
                transition: "all .15s",
              }}
            >
              <HugeiconsIcon icon={FloppyDiskIcon} size={13} strokeWidth={1.5} />
              {saving ? "Guardando…" : "Guardar cambios"}
            </button>
          </div>
        </div>

        {/* Banners ─────────────────────────────────────────────────────────────── */}
        {hasChanges && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "#FFFBEB", border: "1px solid #FDE68A",
            borderRadius: "var(--r-sm)", padding: "9px 14px",
            fontSize: 12.5, color: "#92400E",
          }}>
            <HugeiconsIcon icon={Alert01Icon} size={14} strokeWidth={1.5} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1 }}>Tenés cambios sin guardar.</span>
            <button
              onClick={() => { setEditData({}); setSaveError(null); }}
              style={{ background: "none", border: "none", color: "#92400E", fontSize: 12, fontWeight: 500, cursor: "pointer", textDecoration: "underline", padding: 0 }}
            >
              Descartar
            </button>
          </div>
        )}
        {saveError && (
          <div style={{
            display: "flex", alignItems: "center", gap: 8,
            background: "#FEF2F2", border: "1px solid #FECACA",
            borderRadius: "var(--r-sm)", padding: "9px 14px",
            fontSize: 12.5, color: "#991B1B",
          }}>
            <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={1.5} style={{ flexShrink: 0 }} />
            <span style={{ flex: 1 }}>{saveError}</span>
          </div>
        )}

        {/* Completeness card ───────────────────────────────────────────────────── */}
        <div style={{
          background: "var(--bg-panel)",
          border: "1px solid var(--line-1)",
          borderRadius: "var(--r-md)",
          padding: 18,
          display: "flex", alignItems: "center", gap: 18, flexWrap: "wrap",
        }}>
          <RadialProgress value={completeness} size={74} />
          <div style={{ flex: 1, minWidth: 200 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-1)" }}>Completitud del perfil</span>
              <span style={{
                fontSize: 17, fontWeight: 700,
                color: completeness >= 80 ? "var(--ink-1)" : completeness >= 50 ? "#9A7218" : "#B54632",
              }}>{completeness}%</span>
            </div>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 10, lineHeight: 1.4 }}>
              {completenessMsg}
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 999,
                background: isVerified ? "#E4EEEA" : isPending ? "#FFFBEB" : "var(--bg-subtle)",
                color: isVerified ? "#3F6B4D" : isPending ? "#92400E" : "var(--ink-2)",
                border: "1px solid " + (isVerified ? "#BDD6C8" : isPending ? "#FDE68A" : "var(--line-1)"),
              }}>
                <HugeiconsIcon icon={isVerified ? CheckmarkCircle01Icon : Shield01Icon} size={11} strokeWidth={1.5} />
                {isVerified ? "Verificado" : isPending ? "En revisión" : "Sin verificar"}
              </span>
              <span style={{
                display: "inline-flex", alignItems: "center", gap: 5,
                fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 999,
                background: "#F0EADC", color: "#6B5B33", border: "1px solid #DFD5BD",
              }}>
                {orgLabel}
              </span>
            </div>
          </div>
        </div>

        {/* Información básica ──────────────────────────────────────────────────── */}
        <SectionCard icon={Store02Icon} title="Información básica" subtitle="Nombre, categoría y descripción">
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <Field label="Categoría">
                <Select
                  value={getSelectValue("providerCategory")}
                  onValueChange={(v) => updateField("providerCategory", v)}
                >
                  <SelectTrigger style={{ fontSize: 13, height: 36 }}>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>

            <Field label="Tagline" hint="Frase corta. 120 caracteres máx.">
              <div style={{ position: "relative" }}>
                <textarea
                  value={getValue("tagline")}
                  onChange={(e) => updateField("tagline", e.target.value.slice(0, 120))}
                  rows={2}
                  placeholder="Ej. Bodas con alma en ubicaciones singulares…"
                  style={{ ...textareaStyle, paddingRight: 52, minHeight: 52 }}
                />
                <div style={{
                  position: "absolute", right: 10, bottom: 8,
                  fontSize: 10.5, background: "white", padding: "1px 5px", borderRadius: 4,
                  color: getValue("tagline").length > 100 ? "#B54632" : "var(--ink-3)",
                }}>
                  {getValue("tagline").length}/120
                </div>
              </div>
            </Field>

            <Field label="Descripción" hint="Cuenta quién eres, qué te hace único. Mín. 50 palabras recomendado.">
              <textarea
                value={getValue("description")}
                onChange={(e) => updateField("description", e.target.value)}
                rows={4}
                placeholder="Describe tu empresa y servicios..."
                style={{ ...textareaStyle, minHeight: 90 }}
              />
            </Field>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0,260px) 1fr", gap: 14, alignItems: "start" }}>
              {/* Logo */}
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 500, color: "var(--ink-2)", marginBottom: 5 }}>
                  Logo de la organización
                </label>
                <div style={{
                  border: "1px solid var(--line-1)", borderRadius: 10, padding: 14,
                  background: "var(--bg-subtle)", display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center", gap: 10, minHeight: 160,
                }}>
                  {profile.invoiceLogo || profile.logo ? (
                    <img
                      src={(profile.invoiceLogo || profile.logo) as string}
                      alt="Logo"
                      style={{ height: 56, width: "auto", maxWidth: "100%", objectFit: "contain" }}
                    />
                  ) : (
                    <div style={{ width: 56, height: 56, borderRadius: 10, background: "white", border: "1px solid var(--line-1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <HugeiconsIcon icon={Store02Icon} size={24} strokeWidth={1.5} color="var(--ink-3)" />
                    </div>
                  )}
                  <div style={{ fontSize: 10.5, color: "var(--ink-3)", textAlign: "center", lineHeight: 1.45, padding: "0 4px" }}>
                    Se gestiona en <span style={{ color: "var(--ink-2)", fontWeight: 500 }}>Configuración → Datos fiscales</span>
                  </div>
                  <Link
                    href="/dashboard/settings?section=fiscal"
                    style={{
                      background: "white", color: "var(--ink-2)",
                      border: "1px solid var(--line-strong)",
                      padding: "6px 12px", borderRadius: "var(--r-sm)",
                      fontSize: 11.5, fontWeight: 500,
                      display: "inline-flex", alignItems: "center", gap: 6,
                      textDecoration: "none",
                    }}
                  >
                    <HugeiconsIcon icon={Settings01Icon} size={11} strokeWidth={1.5} />
                    Ir a Datos fiscales
                  </Link>
                </div>
              </div>

              {/* Cover */}
              <div>
                <label style={{ display: "block", fontSize: 11.5, fontWeight: 500, color: "var(--ink-2)", marginBottom: 5 }}>
                  Imagen de portada URL
                </label>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, minHeight: 160 }}>
                  <input
                    value={getValue("coverImage")}
                    onChange={(e) => updateField("coverImage", e.target.value)}
                    placeholder="https://..."
                    style={inputStyle}
                  />
                  <div style={{
                    flex: 1, minHeight: 110,
                    background: "var(--bg-subtle)", borderRadius: 10,
                    border: "1px solid var(--line-1)",
                    overflow: "hidden", position: "relative",
                  }}>
                    {coverPreview ? (
                      <img
                        src={coverPreview}
                        alt="Portada"
                        style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                      />
                    ) : (
                      <div style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-3)", fontSize: 12 }}>
                        Vista previa de portada
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: 10.5, color: "var(--ink-3)" }}>Formato horizontal 1600×600 px recomendado</div>
                </div>
              </div>
            </div>

            {/* URL personalizada */}
            <div style={{ borderTop: "1px solid var(--line-1)", paddingTop: 14, marginTop: 2 }}>
              <label style={{ display: "block", fontSize: 11.5, fontWeight: 500, color: "var(--ink-2)", marginBottom: 5 }}>
                URL de tu perfil público
              </label>
              <div style={{ display: "flex", alignItems: "center", gap: 0, border: "1px solid var(--line-strong)", borderRadius: "var(--r-sm)", overflow: "hidden", background: "white" }}>
                <span style={{ padding: "9px 10px 9px 12px", fontSize: 12.5, color: "var(--ink-3)", background: "var(--bg-subtle)", borderRight: "1px solid var(--line-1)", whiteSpace: "nowrap", userSelect: "none" }}>
                  hubents.com/providers/
                </span>
                <input
                  value={slugInput}
                  onChange={(e) => {
                    const raw = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "");
                    setSlugInput(raw);
                    checkSlug(raw);
                  }}
                  placeholder={profile?.slug ?? "tu-nombre"}
                  style={{ flex: 1, padding: "9px 10px", border: "none", outline: "none", fontSize: 12.5, fontFamily: "inherit", color: "var(--ink-1)" }}
                />
                {slugStatus === "checking" && (
                  <span style={{ padding: "0 12px", fontSize: 11, color: "var(--ink-3)" }}>…</span>
                )}
                {slugStatus === "available" && (
                  <span style={{ padding: "0 12px", fontSize: 11, color: "#3F6B4D", fontWeight: 500 }}>✓ Disponible</span>
                )}
                {slugStatus === "taken" && (
                  <span style={{ padding: "0 12px", fontSize: 11, color: "#B54632", fontWeight: 500 }}>✗ En uso</span>
                )}
              </div>
              {slugStatus === "taken" && slugSuggestion && (
                <div style={{ marginTop: 6, fontSize: 11.5, color: "var(--ink-3)" }}>
                  Sugerencia disponible:{" "}
                  <button
                    onClick={() => { setSlugInput(slugSuggestion); setSlugStatus("available"); setSlugSuggestion(null); }}
                    style={{ background: "none", border: "none", color: "var(--ink-1)", fontWeight: 600, cursor: "pointer", fontSize: 11.5, fontFamily: "inherit", textDecoration: "underline", padding: 0 }}
                  >
                    {slugSuggestion}
                  </button>
                </div>
              )}
              <div style={{ marginTop: 4, fontSize: 10.5, color: "var(--ink-3)" }}>
                Solo letras minúsculas, números y guiones. Se guarda al pulsar "Guardar cambios".
              </div>
            </div>

          </div>
        </SectionCard>

        {/* Contacto ────────────────────────────────────────────────────────────── */}
        <SectionCard icon={PhoneCheckIcon} title="Contacto" subtitle="Cómo te contactarán las parejas interesadas">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <Field label="Teléfono">
              <input value={getValue("phone")} onChange={(e) => updateField("phone", e.target.value)} placeholder="+34 ..." style={inputStyle} />
            </Field>
            <Field label="Email público">
              <input type="email" value={getValue("publicEmail")} onChange={(e) => updateField("publicEmail", e.target.value)} placeholder="hola@empresa.com" style={inputStyle} />
            </Field>
            <Field label="Sitio web">
              <input value={getValue("website")} onChange={(e) => updateField("website", e.target.value)} placeholder="https://" style={inputStyle} />
            </Field>
            <Field label="Instagram" hint="Sin la @">
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 14, fontWeight: 500, color: "#E1306C" }}>@</span>
                <input value={getValue("instagramHandle")} onChange={(e) => updateField("instagramHandle", e.target.value)} placeholder="tuusuario" style={{ ...inputStyle, paddingLeft: 28 }} />
              </div>
            </Field>
          </div>
        </SectionCard>

        {/* Ubicación ───────────────────────────────────────────────────────────── */}
        <SectionCard icon={Location01Icon} title="Ubicación" subtitle="Ayuda a que te encuentren por zona">
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
            <Field label="Ciudad">
              <input value={getValue("city")} onChange={(e) => updateField("city", e.target.value)} placeholder="Málaga" style={inputStyle} />
            </Field>
            <Field label="Región / Provincia">
              <input value={getValue("region")} onChange={(e) => updateField("region", e.target.value)} placeholder="Málaga" style={inputStyle} />
            </Field>
            <Field label="País">
              <input value={getValue("country")} onChange={(e) => updateField("country", e.target.value)} placeholder="España" style={inputStyle} />
            </Field>
          </div>
        </SectionCard>

        {/* Instagram posts ─────────────────────────────────────────────────────── */}
        <SectionCard
          icon={Camera01Icon}
          title="Instagram"
          subtitle="Muestra tus mejores posts en tu perfil público"
          headerRight={
            <span style={{ fontSize: 11, color: "var(--ink-3)", background: "var(--bg-subtle)", padding: "3px 9px", borderRadius: 999, fontWeight: 500 }}>
              {getInstagramPosts().length}/6 posts
            </span>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {getInstagramPosts().map((url, idx) => (
              <div key={idx} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                <div style={{ flex: 1, position: "relative" }}>
                  <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)" }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#E1306C" strokeWidth="1.8">
                      <rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1" fill="#E1306C" />
                    </svg>
                  </span>
                  <input
                    value={url}
                    onChange={(e) => {
                      const posts = [...getInstagramPosts()];
                      posts[idx] = e.target.value;
                      updateField("instagramPosts", posts);
                    }}
                    placeholder="https://www.instagram.com/p/..."
                    style={{ ...inputStyle, paddingLeft: 32 }}
                  />
                </div>
                {url && !isInstagramPostUrl(url) && (
                  <span style={{ fontSize: 11, color: "#B54632", flexShrink: 0 }}>URL inválida</span>
                )}
                <button
                  onClick={() => {
                    const posts = getInstagramPosts().filter((_, i) => i !== idx);
                    updateField("instagramPosts", posts);
                  }}
                  style={{ background: "none", border: "none", color: "var(--ink-3)", cursor: "pointer", padding: 4, display: "flex", alignItems: "center" }}
                >
                  <HugeiconsIcon icon={Delete01Icon} size={14} strokeWidth={1.5} />
                </button>
              </div>
            ))}
            {getInstagramPosts().length === 0 && (
              <div style={{ padding: 14, textAlign: "center", fontSize: 12, color: "var(--ink-3)", border: "1px dashed var(--line-1)", borderRadius: 8 }}>
                Aún no has añadido posts.
              </div>
            )}
            <button
              onClick={() => updateField("instagramPosts", [...getInstagramPosts(), ""])}
              disabled={getInstagramPosts().length >= 6}
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "transparent", color: "var(--ink-2)",
                border: "1px dashed var(--line-strong)",
                padding: "8px 14px", borderRadius: "var(--r-sm)",
                fontSize: 12.5, fontWeight: 500,
                cursor: getInstagramPosts().length >= 6 ? "not-allowed" : "pointer",
                alignSelf: "flex-start",
                opacity: getInstagramPosts().length >= 6 ? 0.5 : 1,
                fontFamily: "inherit",
              }}
            >
              <HugeiconsIcon icon={Add01Icon} size={12} strokeWidth={1.5} />
              Agregar post
            </button>
          </div>
        </SectionCard>

        {/* Portfolio ───────────────────────────────────────────────────────────── */}
        <SectionCard
          icon={Image01Icon}
          title="Portfolio"
          subtitle="Fotos de trabajos destacados — se muestran en tu perfil público"
          headerRight={
            <span style={{ fontSize: 11, color: "var(--ink-3)", background: "var(--bg-subtle)", padding: "3px 9px", borderRadius: 999, fontWeight: 500 }}>
              {portfolioItems.length}/12 fotos
            </span>
          }
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {portfolioLoading ? (
              <div style={{ padding: 20, textAlign: "center", fontSize: 12, color: "var(--ink-3)" }}>Cargando…</div>
            ) : (
              <>
                {/* Grid of existing items */}
                {portfolioItems.length > 0 && (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    {portfolioItems.map((item) => (
                      <div key={item.id} style={{ position: "relative", aspectRatio: "1", borderRadius: 8, overflow: "hidden", background: "var(--bg-subtle)", border: "1px solid var(--line-1)" }}>
                        <img
                          src={item.thumbnail ?? item.url}
                          alt={item.title ?? ""}
                          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                          onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.3"; }}
                        />
                        {item.title && (
                          <div style={{
                            position: "absolute", bottom: 0, left: 0, right: 0,
                            background: "linear-gradient(transparent, rgba(0,0,0,0.6))",
                            padding: "12px 8px 6px",
                            fontSize: 10.5, color: "white", fontWeight: 500,
                            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                          }}>
                            {item.title}
                          </div>
                        )}
                        <button
                          onClick={async () => {
                            if (!profile?.slug) return;
                            try {
                              const res = await fetch(`/api/providers/${profile.slug}/portfolio`, {
                                method: "DELETE",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ id: item.id }),
                              });
                              if (res.ok) {
                                setPortfolioItems((prev) => prev.filter((p) => p.id !== item.id));
                                toast.success("Foto eliminada");
                              }
                            } catch {
                              toast.error("Error al eliminar");
                            }
                          }}
                          title="Eliminar foto"
                          style={{
                            position: "absolute", top: 5, right: 5,
                            width: 24, height: 24, borderRadius: "50%",
                            background: "rgba(0,0,0,0.55)", border: "none",
                            display: "flex", alignItems: "center", justifyContent: "center",
                            cursor: "pointer", color: "white",
                          }}
                        >
                          <HugeiconsIcon icon={Cancel01Icon} size={11} strokeWidth={2} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {portfolioItems.length === 0 && !addingPortfolio && (
                  <div style={{ padding: 24, textAlign: "center", fontSize: 12, color: "var(--ink-3)", border: "1px dashed var(--line-1)", borderRadius: 8 }}>
                    Aún no tienes fotos en tu portfolio.<br />
                    <span style={{ fontSize: 11 }}>Se mostrarán en la sección "Trabajos destacados" de tu perfil.</span>
                  </div>
                )}

                {/* Add new photo form */}
                {addingPortfolio ? (
                  <div style={{ border: "1px solid var(--line-1)", borderRadius: 8, padding: 14, background: "var(--bg-subtle)", display: "flex", flexDirection: "column", gap: 10 }}>
                    <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-1)" }}>Nueva foto</div>
                    <Field label="URL de la imagen *">
                      <input
                        value={newItemUrl}
                        onChange={(e) => setNewItemUrl(e.target.value)}
                        placeholder="https://ejemplo.com/foto.jpg"
                        style={inputStyle}
                        autoFocus
                      />
                    </Field>
                    <Field label="Título (opcional)">
                      <input
                        value={newItemTitle}
                        onChange={(e) => setNewItemTitle(e.target.value)}
                        placeholder="Ej: Boda en finca · Primavera 2024"
                        maxLength={80}
                        style={inputStyle}
                      />
                    </Field>
                    {/* Thumbnail preview */}
                    {newItemUrl && (
                      <div style={{ width: 80, height: 80, borderRadius: 6, overflow: "hidden", border: "1px solid var(--line-1)" }}>
                        <img src={newItemUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0.2"; }} />
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={async () => {
                          if (!profile?.slug || !newItemUrl.trim()) return;
                          setNewItemSubmitting(true);
                          try {
                            const res = await fetch(`/api/providers/${profile.slug}/portfolio`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                url: newItemUrl.trim(),
                                title: newItemTitle.trim() || undefined,
                                sortOrder: portfolioItems.length,
                              }),
                            });
                            if (res.ok) {
                              const { data } = await res.json();
                              setPortfolioItems((prev) => [...prev, data]);
                              setNewItemUrl("");
                              setNewItemTitle("");
                              setAddingPortfolio(false);
                              toast.success("Foto añadida");
                            } else {
                              toast.error("Error al añadir la foto");
                            }
                          } catch {
                            toast.error("Error de conexión");
                          } finally {
                            setNewItemSubmitting(false);
                          }
                        }}
                        disabled={!newItemUrl.trim() || newItemSubmitting}
                        style={{
                          background: newItemUrl.trim() ? "var(--ink-1)" : "var(--bg-subtle)",
                          color: newItemUrl.trim() ? "white" : "var(--ink-3)",
                          border: "none", borderRadius: "var(--r-sm)",
                          padding: "8px 16px", fontSize: 12.5, fontWeight: 600,
                          cursor: newItemUrl.trim() ? "pointer" : "not-allowed",
                          fontFamily: "inherit",
                        }}
                      >
                        {newItemSubmitting ? "Guardando…" : "Añadir foto"}
                      </button>
                      <button
                        onClick={() => { setAddingPortfolio(false); setNewItemUrl(""); setNewItemTitle(""); }}
                        style={{
                          background: "white", color: "var(--ink-2)",
                          border: "1px solid var(--line-strong)",
                          borderRadius: "var(--r-sm)", padding: "8px 14px",
                          fontSize: 12.5, fontWeight: 500, cursor: "pointer", fontFamily: "inherit",
                        }}
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  portfolioItems.length < 12 && (
                    <button
                      onClick={() => setAddingPortfolio(true)}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: 6,
                        background: "transparent", color: "var(--ink-2)",
                        border: "1px dashed var(--line-strong)",
                        padding: "8px 14px", borderRadius: "var(--r-sm)",
                        fontSize: 12.5, fontWeight: 500, cursor: "pointer",
                        alignSelf: "flex-start", fontFamily: "inherit",
                      }}
                    >
                      <HugeiconsIcon icon={Add01Icon} size={12} strokeWidth={1.5} />
                      Añadir foto
                    </button>
                  )
                )}
              </>
            )}
          </div>
        </SectionCard>

        {/* Brochure ────────────────────────────────────────────────────────────── */}
        <SectionCard icon={File01Icon} title="Brochure / Dossier" subtitle="PDF descargable desde tu perfil público">
          {getBrochureUrl() ? (
            <div style={{ display: "flex", gap: 12, alignItems: "center", padding: 14, background: "var(--bg-subtle)", border: "1px solid var(--line-1)", borderRadius: 10 }}>
              <div style={{ width: 40, height: 50, background: "#FCE4E0", color: "#B54632", borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <HugeiconsIcon icon={File01Icon} size={20} strokeWidth={1.5} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-1)" }}>Brochure subido</div>
                <a href={getBrochureUrl()} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11, color: "var(--ink-3)", display: "block", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {getBrochureUrl()}
                </a>
              </div>
              <button
                onClick={() => updateField("brochureUrl", "")}
                style={{ background: "none", border: "none", color: "var(--ink-3)", cursor: "pointer", padding: 4, display: "flex", alignItems: "center" }}
              >
                <HugeiconsIcon icon={Delete01Icon} size={14} strokeWidth={1.5} />
              </button>
            </div>
          ) : (
            <FileUploader
              folder="brochures"
              accept="application/pdf"
              variant="default"
              onUpload={(result) => updateField("brochureUrl", result.url)}
            />
          )}
        </SectionCard>

        {/* Reseñas (solo lectura, solo si hay) ────────────────────────────────── */}
        {(profile.totalReviews ?? 0) > 0 && (
          <SectionCard icon={StarIcon} title="Reseñas y calificación" subtitle="Promedio de valoraciones recibidas">
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span style={{ fontSize: 32, fontWeight: 700, color: "var(--ink-1)" }}>{profile.averageRating || "—"}</span>
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <HugeiconsIcon
                    key={s}
                    icon={StarIcon}
                    size={16}
                    strokeWidth={1.5}
                    color={s <= Math.round(Number(profile.averageRating) || 0) ? "#F59E0B" : "var(--line-strong)"}
                  />
                ))}
              </div>
              <span style={{ fontSize: 12, color: "var(--ink-3)" }}>
                {profile.totalReviews} reseña{(profile.totalReviews ?? 0) > 1 ? "s" : ""}
              </span>
            </div>
          </SectionCard>
        )}

        {/* Footer de acción ────────────────────────────────────────────────────── */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12,
          padding: "14px 16px",
          background: "var(--bg-subtle)", border: "1px solid var(--line-1)",
          borderRadius: 10, marginTop: 4,
        }}>
          <div style={{ fontSize: 12.5, color: "var(--ink-2)", display: "flex", alignItems: "center", gap: 6 }}>
            <HugeiconsIcon icon={InformationCircleIcon} size={13} strokeWidth={1.5} color="var(--color-brand)" />
            Los cambios se publican en <strong>Partners Hubents</strong> al guardar.
          </div>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saving}
            style={{
              background: hasChanges && !saving ? "var(--ink-1)" : "var(--bg-subtle)",
              color: hasChanges && !saving ? "white" : "var(--ink-3)",
              border: "none",
              padding: "9px 22px", borderRadius: "var(--r-sm)",
              fontSize: 12.5, fontWeight: 600,
              cursor: hasChanges && !saving ? "pointer" : "not-allowed",
              fontFamily: "inherit",
            }}
          >
            Guardar cambios
          </button>
        </div>

      </div>
    </EventScopedGuard>
  );
}
