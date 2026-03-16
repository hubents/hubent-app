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
  Sparkles
} from "lucide-react";

const steps = [
  { id: 1, title: "Tu perfil", icon: User },
  { id: 2, title: "Tu empresa", icon: Building2 },
  { id: 3, title: "Primer evento", icon: Calendar },
  { id: 4, title: "Tu equipo", icon: Users },
];

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isWelcome = searchParams.get("welcome") === "true";
  
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showWelcome, setShowWelcome] = useState(isWelcome);
  
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
  
  const [team, setTeam] = useState({
    emails: "",
  });

  useEffect(() => {
    if (showWelcome) {
      const timer = setTimeout(() => setShowWelcome(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showWelcome]);

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1);
    }
  };

  const handleSkip = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    setLoading(true);
    
    try {
      const res = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          profile,
          company,
          event: event.name ? event : null,
          teamEmails: team.emails ? team.emails.split(",").map(e => e.trim()) : [],
        }),
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

  if (showWelcome) {
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
            Solo te tomará unos minutos
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
            <CardDescription>
              {step === 1 && "Cuéntanos un poco sobre ti"}
              {step === 2 && "Personaliza tu espacio de trabajo"}
              {step === 3 && "Crea tu primer evento (opcional)"}
              {step === 4 && "Invita a tu equipo (opcional)"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {step === 1 && (
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
                    placeholder="Cuéntanos sobre ti y tu experiencia en eventos..."
                    value={profile.bio}
                    onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                    rows={3}
                  />
                </div>
              </>
            )}

            {step === 2 && (
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
            )}

            {step === 3 && (
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
            )}

            {step === 4 && (
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
                  <h4 className="font-medium text-sm mb-2">🎉 ¡Ya casi terminas!</h4>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Podrás invitar más miembros y configurar sus roles desde el panel de configuración.
                  </p>
                </div>
              </>
            )}

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
                <Button variant="ghost" onClick={handleSkip}>
                  {step === 4 ? "Omitir y terminar" : "Omitir"}
                </Button>
                {step < 4 ? (
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

        {/* Trial reminder */}
        <div className="text-center">
          <p className="text-sm text-[var(--muted-foreground)]">
            🎁 Tienes <strong>7 días de prueba gratis</strong> con acceso completo
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
