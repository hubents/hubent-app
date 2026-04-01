"use client";

import { useState, useEffect, Suspense } from "react";
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
  Edit
} from "lucide-react";
import { PROVIDER_CATEGORIES } from "@/config/provider-constants";
import { getOnboardingSteps } from "@/lib/tenant-type";

// ─── Step Registry ──────────────────────────────────────────────────────────
// Maps step identifiers from tenant-types config to UI metadata.
// To add steps for a new orgType, just add the step ID to tenant-types config
// and register its metadata here.

const STEP_REGISTRY: Record<string, { title: string; description: string; icon: typeof User }> = {
  profile:                { title: "Tu perfil", description: "Cuéntanos un poco sobre ti", icon: User },
  company:                { title: "Tu empresa", description: "Personaliza tu espacio de trabajo", icon: Building2 },
  "first-event":          { title: "Primer evento", description: "Crea tu primer evento (opcional)", icon: Calendar },
  team:                   { title: "Tu equipo", description: "Invita a tu equipo (opcional)", icon: Users },
  "company-public-profile": { title: "Tu empresa y perfil público", description: "Configura cómo te verán en el marketplace", icon: Building2 },
  "profile-preview":      { title: "Vista previa", description: "Así se verá tu perfil en el marketplace", icon: Eye },
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

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(isWelcome);
  const [orgType, setOrgType] = useState<"tenant" | "provider">("tenant");
  const [orgTypeLoading, setOrgTypeLoading] = useState(true);

  // ─── Form State ─────────────────────────────────────────────────────────────

  const [profile, setProfile] = useState({
    phone: "",
    bio: "",
  });

  const [company, setCompany] = useState({
    logo: "",
    timezone: "America/Argentina/Buenos_Aires",
    currency: "USD",
  });

  const [event, setEvent] = useState({
    name: "",
    type: "wedding",
    date: "",
  });

  const [providerProfile, setProviderProfile] = useState({
    description: "",
    tagline: "",
    providerCategory: "" as string,
    instagramHandle: "",
    city: "",
    region: "",
    coverImage: "",
  });

  const [team, setTeam] = useState({
    emails: "",
  });

  // ─── Detect orgType ─────────────────────────────────────────────────────────
  // Priority: org data from API > URL param (Google OAuth) > default "tenant"

  useEffect(() => {
    async function detectOrgType() {
      try {
        const res = await fetch("/api/user/organizations");
        if (res.ok) {
          const { data } = await res.json();
          if (data && data.length > 0) {
            const org = data[0];
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

  const handleSkip = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  // ─── Complete Onboarding ───────────────────────────────────────────────────

  const handleComplete = async () => {
    setLoading(true);

    try {
      const payload: Record<string, unknown> = {
        profile,
        company,
        orgType,
        teamEmails: team.emails ? team.emails.split(",").map(e => e.trim()).filter(Boolean) : [],
      };

      if (isProvider) {
        payload.providerProfile = providerProfile;
      } else {
        payload.event = event.name ? event : null;
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
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[var(--primary)] to-[var(--primary)]/80 p-4">
        <div className="text-center text-white space-y-6 animate-in fade-in duration-500">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-white/10 backdrop-blur">
              <Sparkles className="h-12 w-12" />
            </div>
          </div>
          <h1 className="text-4xl font-bold">¡Bienvenido a HubEnts!</h1>
          <p className="text-xl text-white/80 max-w-md">
            Tu cuenta ha sido creada exitosamente.
            <br />
            Vamos a configurar tu espacio de trabajo.
          </p>
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
            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono (opcional)</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="+54 11 1234-5678"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              />
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

      case "company-public-profile":
        return renderProviderCompanyStep();

      case "first-event":
        return renderPlannerEventStep();

      case "profile-preview":
        return renderProviderPreview();

      case "team":
        return (
        <>
          <div className="space-y-2">
            <Label htmlFor="emails">Emails del equipo</Label>
            <Textarea
              id="emails"
              placeholder="email1@ejemplo.com, email2@ejemplo.com"
              value={team.emails}
              onChange={(e) => setTeam({ ...team, emails: e.target.value })}
              rows={3}
            />
            <p className="text-xs text-[var(--muted-foreground)]">
              Separa los emails con comas. Les enviaremos una invitación.
            </p>
          </div>

          <div className="p-4 rounded-lg bg-[var(--primary)]/5 border border-[var(--primary)]/20">
            <h4 className="font-medium text-sm mb-2">Ya casi terminas!</h4>
            <p className="text-sm text-[var(--muted-foreground)]">
              Podrás invitar más miembros y configurar sus roles desde el panel de configuración.
            </p>
          </div>
        </>
      );

      default:
        return null;
    }
  };

  // ─── Planner Step 2: Company ───────────────────────────────────────────────

  const renderPlannerCompanyStep = () => (
    <>
      <div className="space-y-2">
        <Label htmlFor="logo">URL del logo (opcional)</Label>
        <Input
          id="logo"
          type="url"
          placeholder="https://ejemplo.com/logo.png"
          value={company.logo}
          onChange={(e) => setCompany({ ...company, logo: e.target.value })}
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="timezone">Zona horaria</Label>
          <select
            id="timezone"
            className="w-full h-10 px-3 rounded-md border border-[var(--border)] bg-[var(--background)]"
            value={company.timezone}
            onChange={(e) => setCompany({ ...company, timezone: e.target.value })}
          >
            <option value="America/Argentina/Buenos_Aires">Buenos Aires (GMT-3)</option>
            <option value="America/Mexico_City">Ciudad de México (GMT-6)</option>
            <option value="America/Bogota">Bogotá (GMT-5)</option>
            <option value="America/Santiago">Santiago (GMT-4)</option>
            <option value="Europe/Madrid">Madrid (GMT+1)</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">Moneda</Label>
          <select
            id="currency"
            className="w-full h-10 px-3 rounded-md border border-[var(--border)] bg-[var(--background)]"
            value={company.currency}
            onChange={(e) => setCompany({ ...company, currency: e.target.value })}
          >
            <option value="USD">USD - Dólar</option>
            <option value="ARS">ARS - Peso Argentino</option>
            <option value="MXN">MXN - Peso Mexicano</option>
            <option value="EUR">EUR - Euro</option>
            <option value="COP">COP - Peso Colombiano</option>
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
        <Label htmlFor="logo">URL del logo (opcional)</Label>
        <Input
          id="logo"
          type="url"
          placeholder="https://ejemplo.com/logo.png"
          value={company.logo}
          onChange={(e) => setCompany({ ...company, logo: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="timezone">Zona horaria</Label>
          <select
            id="timezone"
            className="w-full h-10 px-3 rounded-md border border-[var(--border)] bg-[var(--background)]"
            value={company.timezone}
            onChange={(e) => setCompany({ ...company, timezone: e.target.value })}
          >
            <option value="America/Argentina/Buenos_Aires">Buenos Aires (GMT-3)</option>
            <option value="America/Mexico_City">Ciudad de México (GMT-6)</option>
            <option value="America/Bogota">Bogotá (GMT-5)</option>
            <option value="America/Santiago">Santiago (GMT-4)</option>
            <option value="Europe/Madrid">Madrid (GMT+1)</option>
          </select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="currency">Moneda</Label>
          <select
            id="currency"
            className="w-full h-10 px-3 rounded-md border border-[var(--border)] bg-[var(--background)]"
            value={company.currency}
            onChange={(e) => setCompany({ ...company, currency: e.target.value })}
          >
            <option value="USD">USD - Dólar</option>
            <option value="ARS">ARS - Peso Argentino</option>
            <option value="MXN">MXN - Peso Mexicano</option>
            <option value="EUR">EUR - Euro</option>
            <option value="COP">COP - Peso Colombiano</option>
          </select>
        </div>
      </div>

      {/* Separator */}
      <div className="border-t pt-4 mt-2">
        <p className="text-sm font-medium text-[var(--muted-foreground)] mb-3">
          Perfil público en Marketplace
        </p>
      </div>

      {/* Provider public profile fields */}
      <div className="space-y-2">
        <Label htmlFor="providerCategory">Categoría *</Label>
        <select
          id="providerCategory"
          className="w-full h-10 px-3 rounded-md border border-[var(--border)] bg-[var(--background)]"
          value={providerProfile.providerCategory}
          onChange={(e) => setProviderProfile({ ...providerProfile, providerCategory: e.target.value })}
        >
          <option value="">Selecciona una categoría</option>
          {PROVIDER_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="tagline">Tagline (frase corta)</Label>
        <Input
          id="tagline"
          placeholder="Ej: Fotografía artística para bodas con alma"
          value={providerProfile.tagline}
          onChange={(e) => setProviderProfile({ ...providerProfile, tagline: e.target.value })}
          maxLength={120}
        />
        <p className="text-xs text-[var(--muted-foreground)]">
          {providerProfile.tagline.length}/120 caracteres
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descripción</Label>
        <Textarea
          id="description"
          placeholder="Describe tu empresa, servicios y experiencia..."
          value={providerProfile.description}
          onChange={(e) => setProviderProfile({ ...providerProfile, description: e.target.value })}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="city">Ciudad</Label>
          <Input
            id="city"
            placeholder="Ej: Buenos Aires"
            value={providerProfile.city}
            onChange={(e) => setProviderProfile({ ...providerProfile, city: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="region">Región / Provincia</Label>
          <Input
            id="region"
            placeholder="Ej: CABA"
            value={providerProfile.region}
            onChange={(e) => setProviderProfile({ ...providerProfile, region: e.target.value })}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="instagram">Instagram (sin @)</Label>
        <Input
          id="instagram"
          placeholder="tu_empresa"
          value={providerProfile.instagramHandle}
          onChange={(e) => setProviderProfile({ ...providerProfile, instagramHandle: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="coverImage">URL de imagen de portada (opcional)</Label>
        <Input
          id="coverImage"
          type="url"
          placeholder="https://ejemplo.com/portada.jpg"
          value={providerProfile.coverImage}
          onChange={(e) => setProviderProfile({ ...providerProfile, coverImage: e.target.value })}
        />
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
    </>
  );

  // ─── Provider Step 3: Profile Preview ─────────────────────────────────────

  const renderProviderPreview = () => (
    <div className="space-y-4">
      {/* Preview Card */}
      <div className="border rounded-lg overflow-hidden">
        {/* Cover */}
        <div className="h-32 bg-gradient-to-r from-[var(--primary)]/20 to-[var(--primary)]/10 relative">
          {providerProfile.coverImage && (
            <img
              src={providerProfile.coverImage}
              alt="Portada"
              className="w-full h-full object-cover"
            />
          )}
        </div>

        {/* Content */}
        <div className="p-4 -mt-8 relative">
          {/* Avatar */}
          <div className="w-16 h-16 rounded-full bg-[var(--muted)] border-4 border-[var(--background)] flex items-center justify-center overflow-hidden">
            {company.logo ? (
              <img src={company.logo} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <Building2 className="h-6 w-6 text-[var(--muted-foreground)]" />
            )}
          </div>

          <div className="mt-2 space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">Tu Empresa</h3>
              {providerProfile.providerCategory && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-[var(--primary)]/10 text-[var(--primary)]">
                  {providerProfile.providerCategory}
                </span>
              )}
            </div>

            {providerProfile.tagline && (
              <p className="text-sm text-[var(--muted-foreground)]">{providerProfile.tagline}</p>
            )}

            {(providerProfile.city || providerProfile.region) && (
              <div className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                <MapPin className="h-3 w-3" />
                <span>
                  {[providerProfile.city, providerProfile.region].filter(Boolean).join(", ")}
                </span>
              </div>
            )}

            {providerProfile.instagramHandle && (
              <div className="flex items-center gap-1 text-xs text-[var(--muted-foreground)]">
                <Instagram className="h-3 w-3" />
                <span>@{providerProfile.instagramHandle}</span>
              </div>
            )}
          </div>

          {providerProfile.description && (
            <p className="text-sm mt-3 text-[var(--muted-foreground)] line-clamp-3">
              {providerProfile.description}
            </p>
          )}

          {/* Rating placeholder */}
          <div className="flex items-center gap-1 mt-3 text-xs text-[var(--muted-foreground)]">
            <Star className="h-3 w-3" />
            <span>Sin reseñas aún</span>
          </div>
        </div>
      </div>

      {/* Completeness meter */}
      <div className="p-4 rounded-lg bg-[var(--muted)] space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">Completitud del perfil</span>
          <span className="text-[var(--muted-foreground)]">{getPreviewCompleteness()}%</span>
        </div>
        <div className="h-2 rounded-full bg-[var(--border)] overflow-hidden">
          <div
            className="h-full rounded-full bg-[var(--primary)] transition-all duration-500"
            style={{ width: `${getPreviewCompleteness()}%` }}
          />
        </div>
        <p className="text-xs text-[var(--muted-foreground)]">
          Podrás completar tu perfil después desde el panel de configuración.
        </p>
      </div>

      {/* Edit button */}
      <Button variant="outline" className="w-full gap-2" onClick={() => setStep(2)}>
        <Edit className="h-4 w-4" />
        Editar perfil
      </Button>
    </div>
  );

  /** Quick completeness check for preview */
  function getPreviewCompleteness(): number {
    let score = 0;
    if (company.logo) score += 15;
    if (providerProfile.description) score += 15;
    if (providerProfile.tagline) score += 10;
    if (providerProfile.providerCategory) score += 10;
    if (providerProfile.city) score += 10;
    if (providerProfile.coverImage) score += 10;
    if (providerProfile.instagramHandle) score += 5;
    if (profile.phone) score += 5;
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
              alt="HubEnts"
              width={48}
              height={48}
              className="rounded-lg"
            />
          </div>
          <h1 className="text-2xl font-bold">Configura tu espacio de trabajo</h1>
          <p className="text-[var(--muted-foreground)]">
            {isProvider
              ? "Configuremos tu perfil de proveedor en el marketplace"
              : "Solo te tomará unos minutos"}
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full transition-colors ${
                  step >= s.id
                    ? "bg-[var(--primary)] text-white"
                    : "bg-[var(--muted)] text-[var(--muted-foreground)] border border-[var(--border)]"
                }`}
              >
                {step > s.id ? (
                  <CheckCircle2 className="h-5 w-5" />
                ) : (
                  <s.icon className="h-5 w-5" />
                )}
              </div>
              {i < steps.length - 1 && (
                <div
                  className={`w-12 h-1 mx-1 rounded transition-colors ${
                    step > s.id ? "bg-[var(--primary)]" : "bg-[var(--border)]"
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <Card className="border-0 shadow-xl">
          <CardHeader>
            <CardTitle>{steps[step - 1].title}</CardTitle>
            <CardDescription>{steps[step - 1].description}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
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
                {/* Skip - not shown on provider preview step */}
                {currentStepKey !== "profile-preview" && (
                  <Button variant="ghost" onClick={handleSkip}>
                    {step === totalSteps ? "Omitir y terminar" : "Omitir"}
                  </Button>
                )}
                {step < totalSteps ? (
                  <Button onClick={handleNext} className="gap-2">
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
