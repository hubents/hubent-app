"use client";

import { useState, useEffect, useCallback, Suspense, useRef } from "react";
import { TIMEZONE_DEFAULTS, CURRENCIES, PHONE_PREFIXES } from "@/lib/constants/locale";
import { TimezoneCombobox } from "@/components/ui/timezone-combobox";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Loader2,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  User,
  Building2,
  Calendar,
  Users,
  Sparkles,
  Eye,
  Star,
  MapPin,
  Instagram,
  Edit,
  CalendarCheck,
  Package,
  Film,
  Briefcase,
} from "lucide-react";
import { PROVIDER_CATEGORIES, CATEGORIES_BY_MODULE } from "@/config/provider-constants";
import { getOnboardingSteps } from "@/lib/tenant-type";
import { avColor } from "@/lib/ui-utils";

// ─── Step Registry ──────────────────────────────────────────────────────────
// Maps step identifiers from tenant-types config to UI metadata.
// To add steps for a new orgType, just add the step ID to tenant-types config
// and register its metadata here.

const STEP_REGISTRY: Record<string, { title: string; description: string; icon: typeof User }> = {
  profile:                { title: "Tu perfil", description: "Cuéntanos un poco sobre ti", icon: User },
  company:                { title: "Tu empresa", description: "Personaliza tu espacio de trabajo", icon: Building2 },
  "first-event":          { title: "Primer evento", description: "Crea tu primer evento (opcional)", icon: Calendar },
  team:                   { title: "Tu equipo", description: "Invita a tu equipo (opcional)", icon: Users },
  "module-selection":     { title: "Tu módulo de gestión", description: "Elige la herramienta que mejor se adapta a tu negocio", icon: Sparkles },
  "company-public-profile": { title: "Tu empresa y perfil público", description: "Configura cómo te verán en Partners", icon: Building2 },
  "profile-preview":      { title: "Vista previa", description: "Así se verá tu perfil en Partners", icon: Eye },
};

function buildSteps(orgType: string) {
  let stepIds = [...getOnboardingSteps(orgType)];
  if (stepIds.length === 0) {
    stepIds = ["profile", "company", "team"];
  }
  return stepIds.map((stepId, index) => {
    const meta = STEP_REGISTRY[stepId] || { title: stepId, description: "", icon: User };
    return { id: index + 1, stepKey: stepId, ...meta };
  });
}

// ─── Main Component ───────────────────────────────────────────────────────────

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isWelcome = searchParams.get("welcome") === "true";
  const isClaimed = searchParams.get("claimed") === "1";

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(isWelcome);
  const [orgType, setOrgType] = useState<"tenant" | "provider">("tenant");
  const [orgTypeLoading, setOrgTypeLoading] = useState(true);
  const profilePrefilled = useRef(false);

  // ─── Form State ─────────────────────────────────────────────────────────────

  const [profile, setProfile] = useState(() => {
    const browserTz = typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "Europe/Madrid";
    const tzDef = TIMEZONE_DEFAULTS[browserTz];
    return {
      firstName: "",
      lastName: "",
      phonePrefix: tzDef?.phonePrefix ?? "+34",
      phoneNumber: "",
      bio: "",
    };
  });

  const [company, setCompany] = useState(() => {
    const browserTz = typeof Intl !== "undefined"
      ? Intl.DateTimeFormat().resolvedOptions().timeZone
      : "America/Argentina/Buenos_Aires";
    const tzDef = TIMEZONE_DEFAULTS[browserTz];
    return {
      name: "",
      timezone: tzDef ? browserTz : "America/Argentina/Buenos_Aires",
      currency: tzDef?.currency ?? "USD",
    };
  });

  const handleTimezoneChange = useCallback((tz: string) => {
    const tzDef = TIMEZONE_DEFAULTS[tz];
    setCompany(c => ({ ...c, timezone: tz, currency: tzDef?.currency ?? c.currency }));
    if (tzDef?.phonePrefix) setProfile(p => ({ ...p, phonePrefix: tzDef.phonePrefix }));
  }, []);

  const [event, setEvent] = useState({
    name: "",
    type: "wedding",
    date: "",
    guestCount: "",
    budget: "",
  });

  const [providerProfile, setProviderProfile] = useState({
    description: "",
    tagline: "",
    providerCategory: "" as string,
    providerModule: "" as "booking" | "logistica" | "audiovisual" | "otro" | "",
    instagramHandle: "",
    city: "",
    region: "",
    coverImage: "",
    logoUrl: "",
  });

  const [team, setTeam] = useState({
    chips: [] as string[],
    input: "",
  });

  // ─── Detect orgType ─────────────────────────────────────────────────────────
  // Priority: org data from API > URL param (Google OAuth) > default "tenant"

  useEffect(() => {
    async function detectOrgType() {
      try {
        // Pre-fill personal name from the session user record.
        if (!profilePrefilled.current) {
          const meRes = await fetch("/api/user/me");
          if (meRes.ok) {
            const { data: me } = await meRes.json();
            if (me?.name) {
              const parts = (me.name as string).trim().split(/\s+/);
              const first = parts[0] ?? "";
              const last = parts.slice(1).join(" ");
              setProfile(p => p.firstName ? p : { ...p, firstName: first, lastName: last });
              profilePrefilled.current = true;
            }
          }
        }

        const res = await fetch("/api/user/organizations");
        if (res.ok) {
          const { data } = await res.json();
          if (data && data.length > 0) {
            const org = data[0];
            // Pre-fill company name so the user doesn't retype what they entered at registration.
            if (org.name) {
              setCompany(c => c.name ? c : { ...c, name: org.name });
            }
            if (org.orgType === "provider") {
              setOrgType("provider");
              setOrgTypeLoading(false);
              return;
            }
          }
        }
      } catch {
        // fall through to URL param check
      }

      const urlOrgType = searchParams.get("orgType");
      if (urlOrgType === "provider") {
        setOrgType("provider");
      }

      setOrgTypeLoading(false);
    }
    detectOrgType();
  }, [searchParams]);

  const isProvider = orgType === "provider";
  const steps = buildSteps(orgType);
  const totalSteps = steps.length;

  // ─── Welcome screen timer ──────────────────────────────────────────────────

  useEffect(() => {
    if (showWelcome) {
      const timer = setTimeout(() => setShowWelcome(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showWelcome]);

  // ─── Navigation ─────────────────────────────────────────────────────────────

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  // ─── Complete Onboarding ───────────────────────────────────────────────────

  const handleComplete = async () => {
    setLoading(true);

    try {
      const phone = profile.phoneNumber.trim()
        ? `${profile.phonePrefix} ${profile.phoneNumber.trim()}`
        : "";
      const payload: Record<string, unknown> = {
        profile: {
          name: [profile.firstName, profile.lastName].filter(Boolean).join(" "),
          phone,
          bio: profile.bio,
        },
        company,
        orgType,
        teamEmails: team.chips,
      };

      if (isProvider) {
        payload.providerProfile = providerProfile;
      } else {
        payload.event = event.name
          ? {
              ...event,
              guestCount: event.guestCount ? Number(event.guestCount) : undefined,
              budget: event.budget ? Number(event.budget) : undefined,
            }
          : null;
      }

      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const { toast } = await import("sonner");
        toast.error("Hubo un error al guardar. Puedes completar los datos desde Configuración.");
      }

      router.push("/dashboard");
    } catch (error) {
      console.error("Onboarding error:", error);
      const { toast } = await import("sonner");
      toast.error("Error de conexión. Puedes completar los datos desde Configuración.");
      router.push("/dashboard");
    }
  };

  // ─── Welcome Screen ────────────────────────────────────────────────────────

  if (showWelcome || orgTypeLoading) {
    const claimedProvider = isClaimed && (orgType === "provider" || orgTypeLoading);
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--primary)] to-[var(--primary)]/80 p-4">
        <div className="text-center text-white space-y-6 animate-in fade-in duration-500">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-white/10 backdrop-blur">
              {claimedProvider
                ? <CheckCircle2 className="h-12 w-12" />
                : <Sparkles className="h-12 w-12" />
              }
            </div>
          </div>
          {claimedProvider ? (
            <>
              <h1 className="text-4xl font-bold">¡Perfil reclamado!</h1>
              <p className="text-xl text-white/80 max-w-md">
                Ya eres parte de Hubents.
                <br />
                Completa tu perfil para empezar a recibir oportunidades de negocio.
              </p>
            </>
          ) : (
            <>
              <h1 className="text-4xl font-bold">¡Bienvenido a Hubents!</h1>
              <p className="text-xl text-white/80 max-w-md">
                Tu cuenta ha sido creada exitosamente.
                <br />
                Vamos a configurar tu espacio de trabajo.
              </p>
            </>
          )}
          <div className="flex items-center justify-center gap-2 text-white/60">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Preparando tu experiencia...</span>
          </div>
        </div>
      </div>
    );
  }

  // ─── Step Content Renderer ─────────────────────────────────────────────────

  const currentStepKey = steps[step - 1]?.stepKey;

  const renderStepContent = () => {
    switch (currentStepKey) {
      case "profile":
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nombre</Label>
                <Input
                  id="firstName"
                  placeholder="María"
                  value={profile.firstName}
                  onChange={(e) => setProfile({ ...profile, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Apellido</Label>
                <Input
                  id="lastName"
                  placeholder="García"
                  value={profile.lastName}
                  onChange={(e) => setProfile({ ...profile, lastName: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Teléfono (opcional)</Label>
              <div className="flex gap-2">
                <select
                  className="h-10 px-2 rounded-md border border-[var(--border)] bg-[var(--background)] text-sm flex-shrink-0"
                  style={{ width: 110 }}
                  value={profile.phonePrefix}
                  onChange={(e) => setProfile({ ...profile, phonePrefix: e.target.value })}
                >
                  {PHONE_PREFIXES.map(p => (
                    <option key={p.code} value={p.prefix}>{p.flag} {p.prefix}</option>
                  ))}
                </select>
                <Input
                  type="tel"
                  placeholder={PHONE_PREFIXES.find(p => p.prefix === profile.phonePrefix)?.phoneFormat ?? "000 000 000"}
                  value={profile.phoneNumber}
                  onChange={(e) => setProfile({ ...profile, phoneNumber: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="bio">Bio (opcional)</Label>
              <Textarea
                id="bio"
                placeholder={isProvider
                  ? "Cuéntanos sobre tu empresa y los servicios que ofreces..."
                  : "Cuéntanos sobre ti y tu experiencia en eventos..."}
                value={profile.bio}
                onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                rows={3}
              />
            </div>
          </>
        );

      case "company":
        return renderPlannerCompanyStep();

      case "module-selection":
        return renderModuleSelectionStep();

      case "company-public-profile":
        return renderProviderCompanyStep();

      case "first-event":
        return renderPlannerEventStep();

      case "profile-preview":
        return renderProviderPreview();

      case "team": {
        const addChip = (raw: string) => {
          const emails = raw.split(/[\s,;]+/).map(e => e.trim().toLowerCase()).filter(e => e.includes("@"));
          const next = [...new Set([...team.chips, ...emails])];
          setTeam({ chips: next, input: "" });
        };
        return (
          <>
            <div className="space-y-2">
              <Label>Emails del equipo (opcional)</Label>
              {team.chips.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2 rounded-md border border-[var(--border)] bg-[var(--background)] min-h-[44px]">
                  {team.chips.map(email => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full"
                      style={{ background: "var(--primary)", color: "#fff" }}
                    >
                      {email}
                      <button
                        type="button"
                        onClick={() => setTeam(t => ({ ...t, chips: t.chips.filter(e => e !== email) }))}
                        style={{ lineHeight: 1, background: "none", border: "none", cursor: "pointer", color: "#fff", padding: 0 }}
                      >×</button>
                    </span>
                  ))}
                </div>
              )}
              <Input
                placeholder="nombre@empresa.com"
                value={team.input}
                onChange={(e) => setTeam(t => ({ ...t, input: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === "," || e.key === " ") {
                    e.preventDefault();
                    if (team.input.trim()) addChip(team.input);
                  }
                }}
                onBlur={() => { if (team.input.trim()) addChip(team.input); }}
              />
              <p className="text-xs text-[var(--muted-foreground)]">
                Escribe un email y pulsa Enter o coma para añadir. Les enviaremos una invitación.
              </p>
            </div>
            <div className="p-4 rounded-lg bg-[var(--primary)]/5 border border-[var(--primary)]/20">
              <h4 className="font-medium text-sm mb-2">¡Ya casi terminas!</h4>
              <p className="text-sm text-[var(--muted-foreground)]">
                Podrás invitar más miembros y configurar sus roles desde el panel de configuración.
              </p>
            </div>
          </>
        );
      }

      default:
        return null;
    }
  };

  // ─── Provider Step: Module Selection ─────────────────────────────────────

  const MODULE_OPTIONS = [
    {
      key: "booking" as const,
      icon: CalendarCheck,
      title: "Booking de espacios",
      desc: "Venues, salones, fincas, hoteles. Calendario de disponibilidad y reservas de tu espacio.",
      color: "#3A5B8A",
      bg: "#E8EFF7",
    },
    {
      key: "logistica" as const,
      icon: Package,
      title: "Logística e inventario",
      desc: "Floristerías, decoración, alquileres, catering, música/DJ, shows. Gestión de stock y material por evento.",
      color: "#1F6A3A",
      bg: "#D9ECD1",
    },
    {
      key: "audiovisual" as const,
      icon: Film,
      title: "Foto, vídeo y contenido",
      desc: "Fotógrafos, videógrafos, content creators, drones. Incluye landing de entrega de material a clientes.",
      color: "#6B3F8A",
      bg: "#EEE6F5",
    },
    {
      key: "otro" as const,
      icon: Briefcase,
      title: "Otros servicios",
      desc: "Wedding planners, papelería, maquillaje u otros servicios que no encajan en los módulos anteriores.",
      color: "#5C4A2E",
      bg: "#EDE7DC",
    },
  ] as const;

  const renderModuleSelectionStep = () => (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {MODULE_OPTIONS.map(({ key, icon: Icon, title, desc, color, bg }) => {
        const selected = providerProfile.providerModule === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => {
            const newCats = CATEGORIES_BY_MODULE[key];
            const currentCat = providerProfile.providerCategory;
            const keepCat = currentCat && newCats?.includes(currentCat) ? currentCat : "";
            setProviderProfile({ ...providerProfile, providerModule: key, providerCategory: keepCat });
          }}
            style={{
              background: selected ? bg : "var(--background)",
              border: `2px solid ${selected ? color : "var(--border)"}`,
              borderRadius: 12,
              padding: "16px 14px",
              textAlign: "left",
              cursor: "pointer",
              transition: "border-color .15s, background .15s",
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <div style={{
              width: 36, height: 36, borderRadius: 8,
              background: selected ? color : "var(--muted)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <Icon size={18} color={selected ? "#fff" : "var(--muted-foreground)"} />
            </div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 14, color: selected ? color : "var(--foreground)", marginBottom: 3 }}>
                {title}
              </div>
              <div style={{ fontSize: 12, color: "var(--muted-foreground)", lineHeight: 1.45 }}>
                {desc}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );

  // ─── Planner Step 2: Company ───────────────────────────────────────────────

  const renderPlannerCompanyStep = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="companyName">Nombre de tu empresa</Label>
        <Input
          id="companyName"
          placeholder="Eventos Mágicos S.L."
          value={company.name}
          onChange={(e) => setCompany({ ...company, name: e.target.value })}
        />
        <p className="text-[11px] text-[var(--muted-foreground)]">Podrás añadir logo y datos fiscales desde Configuración</p>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>País / Zona horaria</Label>
          <TimezoneCombobox value={company.timezone} onValueChange={handleTimezoneChange} />
          <p className="text-[11px] text-[var(--muted-foreground)]">La moneda se sugiere automáticamente</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">Moneda</Label>
          <select
            id="currency"
            className="w-full h-10 px-3 rounded-md border border-[var(--border)] bg-[var(--background)] text-sm"
            value={company.currency}
            onChange={(e) => setCompany({ ...company, currency: e.target.value })}
          >
            {CURRENCIES.map(c => (
              <option key={c.value} value={c.value}>{c.label} — {c.name}</option>
            ))}
          </select>
        </div>
      </div>
    </>
  );

  // ─── Provider Step 2: Company + Public Profile ─────────────────────────────

  const renderProviderCompanyStep = () => (
    <div className="space-y-4">
      {/* Company basics */}
      <div className="space-y-2">
        <Label htmlFor="companyNameProv">Nombre de tu empresa</Label>
        <Input
          id="companyNameProv"
          placeholder="Estudio Foto Arte"
          value={company.name}
          onChange={(e) => setCompany({ ...company, name: e.target.value })}
        />
        <p className="text-[11px] text-[var(--muted-foreground)]">Podrás añadir logo desde Configuración</p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>País / Zona horaria</Label>
          <TimezoneCombobox value={company.timezone} onValueChange={handleTimezoneChange} />
          <p className="text-[11px] text-[var(--muted-foreground)]">La moneda se sugiere automáticamente</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">Moneda</Label>
          <select
            id="currency"
            className="w-full h-10 px-3 rounded-md border border-[var(--border)] bg-[var(--background)] text-sm"
            value={company.currency}
            onChange={(e) => setCompany({ ...company, currency: e.target.value })}
          >
            {CURRENCIES.map(c => (
              <option key={c.value} value={c.value}>{c.label} — {c.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Separator */}
      <div className="border-t pt-4 mt-2">
        <p className="text-sm font-medium text-[var(--muted-foreground)] mb-3">
          Perfil público en Partners
        </p>
      </div>

      {/* Provider public profile fields */}
      <div className="space-y-2">
        <Label htmlFor="providerCategory">Categoría *</Label>
        {(() => {
          const moduleCategories = providerProfile.providerModule
            ? CATEGORIES_BY_MODULE[providerProfile.providerModule]
            : null;
          const categoryList = moduleCategories ?? PROVIDER_CATEGORIES;
          return (
            <select
              id="providerCategory"
              className="w-full h-10 px-3 rounded-md border border-[var(--border)] bg-[var(--background)]"
              value={providerProfile.providerCategory}
              onChange={(e) => setProviderProfile({ ...providerProfile, providerCategory: e.target.value })}
            >
              <option value="">Selecciona una categoría</option>
              {categoryList.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          );
        })()}
        {providerProfile.providerModule && (
          <p className="text-[11px] text-[var(--muted-foreground)]">
            Mostrando categorías relacionadas con tu módulo. Elige "Otro" si no encaja ninguna.
          </p>
        )}
      </div>

    </div>
  );

  // ─── Planner Step 3: First Event ──────────────────────────────────────────

  const renderPlannerEventStep = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="eventName">Nombre del evento</Label>
        <Input
          id="eventName"
          placeholder="Boda de María y Juan"
          value={event.name}
          onChange={(e) => setEvent({ ...event, name: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="eventType">Tipo de evento</Label>
          <select
            id="eventType"
            className="w-full h-10 px-3 rounded-md border border-[var(--border)] bg-[var(--background)]"
            value={event.type}
            onChange={(e) => setEvent({ ...event, type: e.target.value })}
          >
            <option value="wedding">Boda</option>
            <option value="birthday">Cumpleaños</option>
            <option value="corporate">Corporativo</option>
            <option value="social">Social</option>
            <option value="pre_wedding">Pre-boda</option>
            <option value="post_wedding">Post-boda</option>
            <option value="other">Otro</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="eventDate">Fecha</Label>
          <Input
            id="eventDate"
            type="date"
            value={event.date}
            onChange={(e) => setEvent({ ...event, date: e.target.value })}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="guestCount">N.º de invitados estimado</Label>
          <Input
            id="guestCount"
            type="number"
            min="0"
            placeholder="150"
            value={event.guestCount}
            onChange={(e) => setEvent({ ...event, guestCount: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="budget">Presupuesto estimado ({company.currency})</Label>
          <Input
            id="budget"
            type="number"
            min="0"
            placeholder="20000"
            value={event.budget}
            onChange={(e) => setEvent({ ...event, budget: e.target.value })}
          />
        </div>
      </div>
    </>
  );

  // ─── Provider Step 3: Profile Preview (editable) ──────────────────────────
  // Mirror the visual design of PartnerLandingDrawer so the user sees exactly
  // how their public profile will look, with inline-editable overlays.

  const COVER_PALETTE: Record<string, [string, string]> = {
    "#E89C6B": ["#D4A574", "#B8875C"], "#B8A078": ["#A89068", "#8A7252"],
    "#6B8CE8": ["#4B6EA8", "#6B88B8"], "#A8845C": ["#8B6C48", "#6B5238"],
    "#7FA890": ["#5A8B72", "#3F6E58"], "#C97A7A": ["#A55C5C", "#824444"],
    "#9B7EB8": ["#7E5FA0", "#5C4380"],
  };

  const renderProviderPreview = () => {
    const pct = getPreviewCompleteness();
    const cityLabel = [providerProfile.city, providerProfile.region].filter(Boolean).join(", ");
    const color = avColor(company.name || "preview");
    const [c1, c2] = COVER_PALETTE[color] || ["#8B7252", "#6B5238"];

    const inpStyle: React.CSSProperties = {
      width: "100%", padding: "7px 10px", fontSize: 12.5,
      border: "1px solid var(--border)", borderRadius: 6,
      background: "var(--background)", color: "var(--foreground)",
      fontFamily: "inherit", outline: "none", boxSizing: "border-box",
    };

    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* ── Real profile card preview ── */}
        <div style={{
          background: "#F0EEE8", borderRadius: 14, overflow: "hidden",
          border: "1px solid #E0DDD6",
        }}>
          {/* Inner card */}
          <div style={{ margin: 12, background: "white", borderRadius: 12, overflow: "hidden", boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
            {/* Cover */}
            <div style={{ height: 130, position: "relative", background: `linear-gradient(135deg, ${c1}, ${c2})`, overflow: "hidden" }}>
              {providerProfile.coverImage && (
                <img src={providerProfile.coverImage} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              )}
              <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 60%, rgba(0,0,0,0.15))", pointerEvents: "none" }} />
              {/* Edit cover overlay */}
              <label title="Cambiar portada (URL)" style={{
                position: "absolute", top: 8, right: 8,
                background: "rgba(0,0,0,0.4)", color: "white",
                borderRadius: 6, padding: "4px 9px", fontSize: 11, fontWeight: 500,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 4,
              }}>
                <Edit size={10} /> Portada
                <input type="url" value={providerProfile.coverImage}
                  onChange={(e) => setProviderProfile({ ...providerProfile, coverImage: e.target.value })}
                  onClick={(e) => e.stopPropagation()}
                  placeholder="https://…" style={{ ...inpStyle, width: 180, fontSize: 11, padding: "3px 7px", marginLeft: 4, borderRadius: 4 }} />
              </label>
            </div>

            {/* Avatar overlapping cover */}
            <div style={{ display: "flex", justifyContent: "center", marginTop: -28, marginBottom: 8 }}>
              <div style={{ position: "relative" }}>
                {providerProfile.logoUrl ? (
                  <img src={providerProfile.logoUrl} alt=""
                    style={{ width: 56, height: 56, borderRadius: "50%", border: "4px solid white", objectFit: "cover", display: "block" }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                ) : (
                  <div style={{ width: 56, height: 56, borderRadius: "50%", background: color, border: "4px solid white", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: 20 }}>
                    {(company.name || "?")[0]?.toUpperCase()}
                  </div>
                )}
                {/* Edit logo button */}
                <label title="URL del logo" style={{
                  position: "absolute", bottom: -2, right: -2,
                  width: 20, height: 20, borderRadius: "50%",
                  background: "var(--foreground)", border: "2px solid white",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  cursor: "pointer", color: "white",
                }}>
                  <Edit size={9} />
                  <input type="url" value={providerProfile.logoUrl}
                    onChange={(e) => setProviderProfile({ ...providerProfile, logoUrl: e.target.value })}
                    onClick={(e) => e.stopPropagation()}
                    placeholder="URL logo"
                    style={{
                      position: "absolute", bottom: 28, left: "50%", transform: "translateX(-50%)",
                      width: 220, fontSize: 11, padding: "5px 8px",
                      border: "1px solid var(--border)", borderRadius: 6,
                      background: "var(--background)", fontFamily: "inherit", outline: "none",
                      boxShadow: "0 2px 8px rgba(0,0,0,0.15)", zIndex: 10,
                      display: "none",
                    }}
                    onFocus={(e) => { (e.target as HTMLInputElement).style.display = "block"; }}
                    onBlur={(e) => { (e.target as HTMLInputElement).style.display = "none"; }}
                  />
                </label>
              </div>
            </div>

            {/* Name + pills + tagline + description */}
            <div style={{ padding: "0 20px 18px", textAlign: "center" }}>
              <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: "-0.01em", marginBottom: 8, color: "#1A1A1A" }}>
                {company.name || <span style={{ color: "#AAA", fontStyle: "italic", fontWeight: 400, fontSize: 15 }}>Nombre de empresa</span>}
              </div>
              <div style={{ display: "flex", justifyContent: "center", gap: 6, marginBottom: 12, flexWrap: "wrap" }}>
                {providerProfile.providerCategory && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#ECE8DF", color: "#5A5345", padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 500 }}>
                    <Calendar size={9} />{providerProfile.providerCategory}
                  </span>
                )}
                {cityLabel && (
                  <span style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "#F0EEE8", color: "#6B6557", padding: "4px 10px", borderRadius: 999, fontSize: 11, fontWeight: 500 }}>
                    <MapPin size={9} />{cityLabel}
                  </span>
                )}
              </div>

              {/* Inline-editable tagline */}
              <div style={{ position: "relative", marginBottom: 10 }}>
                {providerProfile.tagline ? (
                  <p style={{ fontSize: 13, color: "#666", lineHeight: 1.45, margin: 0 }}>{providerProfile.tagline}</p>
                ) : (
                  <p style={{ fontSize: 13, color: "#BBB", fontStyle: "italic", margin: 0 }}>Añade un tagline…</p>
                )}
              </div>

              {/* Inline-editable description */}
              {providerProfile.description ? (
                <p style={{ fontSize: 12.5, color: "#777", lineHeight: 1.5, margin: 0,
                  overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical" as const }}>
                  {providerProfile.description}
                </p>
              ) : (
                <p style={{ fontSize: 12.5, color: "#CCC", fontStyle: "italic", margin: 0 }}>Sin descripción todavía…</p>
              )}

              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 10, fontSize: 11, color: "#AAA" }}>
                <Star size={11} /><span>Sin reseñas aún</span>
              </div>
            </div>
          </div>

          {/* Edit hint */}
          <div style={{ padding: "8px 12px 10px", textAlign: "center", fontSize: 11, color: "#8A8278" }}>
            Así se verá tu perfil en <strong style={{ color: "#5A5045" }}>Partners Hubents</strong>
          </div>
        </div>

        {/* ── Quick-edit fields ── */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--muted-foreground)", marginBottom: 4 }}>URL del logo</label>
            <input value={providerProfile.logoUrl} onChange={(e) => setProviderProfile({ ...providerProfile, logoUrl: e.target.value })}
              placeholder="https://…/logo.png" style={inpStyle} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--muted-foreground)", marginBottom: 4 }}>URL imagen de portada</label>
            <input value={providerProfile.coverImage} onChange={(e) => setProviderProfile({ ...providerProfile, coverImage: e.target.value })}
              placeholder="https://…/banner.jpg" style={inpStyle} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--muted-foreground)", marginBottom: 4 }}>Tagline</label>
            <input value={providerProfile.tagline} onChange={(e) => setProviderProfile({ ...providerProfile, tagline: e.target.value.slice(0, 120) })}
              placeholder="Frase corta que te define…" style={inpStyle} />
          </div>
          <div style={{ gridColumn: "1 / -1" }}>
            <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--muted-foreground)", marginBottom: 4 }}>Descripción</label>
            <textarea value={providerProfile.description} onChange={(e) => setProviderProfile({ ...providerProfile, description: e.target.value })}
              rows={3} placeholder="Cuéntanos sobre tu empresa y servicios…"
              style={{ ...inpStyle, resize: "vertical", lineHeight: 1.45, minHeight: 70 }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--muted-foreground)", marginBottom: 4 }}>Ciudad</label>
            <input value={providerProfile.city} onChange={(e) => setProviderProfile({ ...providerProfile, city: e.target.value })}
              placeholder="Marbella" style={inpStyle} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 11, fontWeight: 500, color: "var(--muted-foreground)", marginBottom: 4 }}>Provincia</label>
            <input value={providerProfile.region} onChange={(e) => setProviderProfile({ ...providerProfile, region: e.target.value })}
              placeholder="Málaga" style={inpStyle} />
          </div>
        </div>

        {/* ── Completeness bar ── */}
        <div style={{ background: "var(--muted)", borderRadius: 8, padding: "10px 14px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, fontWeight: 500, marginBottom: 5 }}>
            <span>Completitud del perfil</span>
            <span style={{ color: pct >= 60 ? "var(--foreground)" : "#92400E" }}>{pct}%</span>
          </div>
          <div style={{ height: 5, borderRadius: 99, background: "var(--border)", overflow: "hidden" }}>
            <div style={{ height: "100%", width: `${pct}%`, background: pct >= 60 ? "var(--primary)" : "#F59E0B", borderRadius: 99, transition: "width .4s ease" }} />
          </div>
          <p style={{ fontSize: 11, color: "var(--muted-foreground)", marginTop: 5, margin: "5px 0 0" }}>
            {pct >= 60 ? "¡Buen trabajo! Puedes seguir completando desde el panel." : "Añade logo, portada y descripción para mejorar tu visibilidad."}
          </p>
        </div>
      </div>
    );
  };

  /** Quick completeness check for preview */
  function getPreviewCompleteness(): number {
    let score = 0;
    if (company.name) score += 10;
    if (providerProfile.logoUrl) score += 15;
    if (providerProfile.coverImage) score += 10;
    if (providerProfile.description) score += 15;
    if (providerProfile.tagline) score += 10;
    if (providerProfile.providerCategory) score += 10;
    if (providerProfile.city) score += 10;
    if (providerProfile.instagramHandle) score += 5;
    if (profile.phoneNumber) score += 5;
    return Math.min(score, 100);
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-[var(--muted)] py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="flex justify-center mb-4">
            <Image
              src="/images/logo.png"
              alt="Hubents"
              width={48}
              height={48}
              className="rounded-lg"
            />
          </div>
          <h1 className="text-2xl font-bold">Configura tu espacio de trabajo</h1>
          <p className="text-[var(--muted-foreground)]">
            {isProvider
              ? "Configuremos tu perfil de proveedor en Partners"
              : "Solo te tomará unos minutos"}
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2">
          {steps.map((s, i) => {
            const done = step > s.id;
            const active = step === s.id;
            return (
              <div key={s.id} className="flex items-center">
                <div
                  style={{
                    width: 40, height: 40, borderRadius: "50%",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "background .25s, box-shadow .25s",
                    background: done ? "#16A34A" : active ? "var(--primary)" : "var(--muted)",
                    color: done || active ? "white" : "var(--muted-foreground)",
                    border: done || active ? "none" : "1px solid var(--border)",
                    boxShadow: active ? "0 0 0 4px color-mix(in srgb, var(--primary) 20%, transparent)" : done ? "0 0 0 3px #dcfce7" : "none",
                  }}
                >
                  {done
                    ? <CheckCircle2 size={20} />
                    : <s.icon size={20} />
                  }
                </div>
                {i < steps.length - 1 && (
                  <div style={{
                    width: 48, height: 3, margin: "0 4px", borderRadius: 99,
                    background: done ? "#16A34A" : "var(--border)",
                    transition: "background .25s",
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {/* Step Content */}
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle>{steps[step - 1].title}</CardTitle>
            <CardDescription>{steps[step - 1].description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Banner for providers who just claimed their profile */}
            {isClaimed && isProvider && step === 1 && (
              <div style={{
                display: "flex", gap: 10, alignItems: "flex-start",
                background: "#f0fdf4", border: "1px solid #bbf7d0",
                borderRadius: 10, padding: "12px 14px",
              }}>
                <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" style={{ color: "#16a34a" }} />
                <div style={{ fontSize: 13, color: "#15803d", lineHeight: 1.5 }}>
                  <strong>¡Perfil reclamado con éxito!</strong> Completa los datos para que tu perfil
                  aparezca verificado en el directorio y empieces a recibir invitaciones a eventos.
                </div>
              </div>
            )}
            {renderStepContent()}

            {/* Navigation */}
            <div className="flex items-center justify-between pt-4">
              <div>
                {step > 1 && (
                  <Button variant="ghost" onClick={handleBack} className="gap-2">
                    <ArrowLeft className="h-4 w-4" />
                    Atrás
                  </Button>
                )}
              </div>
              <div className="flex gap-2">
                {step < totalSteps ? (
                  <Button
                    onClick={handleNext}
                    className="gap-2"
                    disabled={currentStepKey === "module-selection" && !providerProfile.providerModule}
                  >
                    Continuar
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button onClick={handleComplete} className="gap-2" disabled={loading}>
                    {loading ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Finalizando...
                      </>
                    ) : (
                      <>
                        Ir al dashboard
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Plan reminder */}
        <div className="text-center">
          <p className="text-sm text-[var(--muted-foreground)]">
            {isProvider
              ? <>Tu <strong>plan gratuito</strong> está activo</>
              : <>Tienes <strong>14 días de prueba gratis</strong> con acceso completo</>}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--muted)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}
