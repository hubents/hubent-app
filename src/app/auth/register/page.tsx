"use client";

import { useState, Suspense } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, ArrowRight, ArrowLeft, CalendarDays, Store } from "lucide-react";

const PROVIDER_CATEGORIES = [
  "Catering", "Fotografía", "Video", "Música / DJ", "Decoración",
  "Florería", "Iluminación", "Sonido", "Mobiliario", "Transporte",
  "Animación", "Wedding Planner", "Pastelería", "Bartender", "Otro",
];

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialType = searchParams.get("type") === "provider" ? "provider" : null;

  const [step, setStep] = useState(initialType ? 1 : 0);
  const [accountType, setAccountType] = useState<"planner" | "provider" | null>(initialType === "provider" ? "provider" : null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    companyName: "",
    providerCategory: "",
    phone: "",
    instagram: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError("");
  };

  const validateStep1 = () => {
    if (!formData.name.trim()) {
      setError("El nombre es requerido");
      return false;
    }
    if (!formData.email.trim()) {
      setError("El email es requerido");
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError("Email inválido");
      return false;
    }
    if (formData.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return false;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return false;
    }
    return true;
  };

  const handleNextStep = () => {
    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.companyName.trim()) {
      setError("El nombre de la empresa es requerido");
      return;
    }

    if (accountType === "provider" && !formData.providerCategory) {
      setError("Selecciona una categoría");
      return;
    }

    setLoading(true);
    setError("");

    try {
      if (accountType === "provider") {
        const res = await fetch("/api/auth/provider-register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            companyName: formData.companyName,
            category: formData.providerCategory,
            phone: formData.phone || undefined,
            instagram: formData.instagram || undefined,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || data.error || "Error al registrar");

        const { signIn } = await import("next-auth/react");
        const loginResult = await signIn("credentials", {
          email: formData.email,
          password: formData.password,
          redirect: false,
        });
        if (loginResult?.ok) {
          router.push("/onboarding?welcome=true");
        } else {
          router.push("/auth/login");
        }
      } else {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            companyName: formData.companyName,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || data.error || "Error al registrar");

        const { signIn } = await import("next-auth/react");
        const loginResult = await signIn("credentials", {
          email: formData.email,
          password: formData.password,
          redirect: false,
        });
        if (loginResult?.ok) {
          router.push("/onboarding?welcome=true");
        } else {
          router.push("/auth/login");
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    const { signIn } = await import("next-auth/react");
    signIn("google", { callbackUrl: "/onboarding?welcome=true" });
  };

  const selectType = (type: "planner" | "provider") => {
    setAccountType(type);
    setStep(1);
    setError("");
  };

  const stepLabels = {
    0: "Elige tu tipo de cuenta",
    1: "Ingresa tus datos para comenzar",
    2: accountType === "provider" ? "Datos de tu empresa proveedora" : "Cuéntanos sobre tu empresa",
  };

  const totalSteps = 3;

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader className="text-center space-y-2 pb-4">
        <CardTitle className="text-2xl">Crear cuenta</CardTitle>
        <CardDescription>
          {stepLabels[step as keyof typeof stepLabels]}
        </CardDescription>
        
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 pt-2">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div key={i} className={`w-8 h-1 rounded-full transition-colors ${step >= i ? "bg-[var(--primary)]" : "bg-[var(--muted)]"}`} />
          ))}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
            {error}
          </div>
        )}

        {/* Step 0: Type selector */}
        {step === 0 && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => selectType("planner")}
                className="flex flex-col items-center gap-3 p-6 rounded-lg border-2 hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 transition-colors text-center"
              >
                <CalendarDays className="h-8 w-8 text-[var(--primary)]" />
                <div>
                  <p className="font-semibold">Planificador</p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">
                    Organizo eventos y busco proveedores
                  </p>
                </div>
              </button>
              <button
                type="button"
                onClick={() => selectType("provider")}
                className="flex flex-col items-center gap-3 p-6 rounded-lg border-2 hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 transition-colors text-center"
              >
                <Store className="h-8 w-8 text-[var(--primary)]" />
                <div>
                  <p className="font-semibold">Proveedor</p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">
                    Ofrezco servicios para eventos
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Personal info */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre completo</Label>
              <Input
                id="name"
                name="name"
                placeholder="Tu nombre"
                value={formData.name}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="tu@email.com"
                value={formData.email}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="Mínimo 8 caracteres"
                value={formData.password}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="Repite tu contraseña"
                value={formData.confirmPassword}
                onChange={handleChange}
              />
            </div>

            <div className="flex gap-3">
              {!initialType && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => { setStep(0); setAccountType(null); }}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Atrás
                </Button>
              )}
              <Button 
                type="button" 
                className="flex-1 gap-2" 
                onClick={handleNextStep}
              >
                Continuar
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>

            {accountType === "planner" && (
              <>
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-[var(--border)]" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-[var(--card)] px-2 text-[var(--muted-foreground)]">
                      O regístrate con
                    </span>
                  </div>
                </div>

                <Button 
                  type="button" 
                  variant="outline" 
                  className="w-full gap-2"
                  onClick={handleGoogleSignUp}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  Google
                </Button>
              </>
            )}
          </div>
        )}

        {/* Step 2: Company details */}
        {step === 2 && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">
                {accountType === "provider" ? "Nombre de tu empresa" : "Nombre de tu empresa"}
              </Label>
              <Input
                id="companyName"
                name="companyName"
                placeholder={accountType === "provider" ? "Mi Empresa de Catering" : "Mi Empresa de Eventos"}
                value={formData.companyName}
                onChange={handleChange}
              />
            </div>

            {accountType === "provider" && (
              <>
                <div className="space-y-2">
                  <Label>Categoría principal</Label>
                  <Select
                    value={formData.providerCategory}
                    onValueChange={(v) => { setFormData({ ...formData, providerCategory: v }); setError(""); }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecciona tu categoría" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROVIDER_CATEGORIES.map((cat) => (
                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono (opcional)</Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="+34 600 000 000"
                      value={formData.phone}
                      onChange={handleChange}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="instagram">Instagram (opcional)</Label>
                    <Input
                      id="instagram"
                      name="instagram"
                      placeholder="@tuempresa"
                      value={formData.instagram}
                      onChange={handleChange}
                    />
                  </div>
                </div>
              </>
            )}

            {/* Benefit info */}
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 space-y-2">
              <div className="flex items-center gap-2 text-green-600 font-medium">
                <CheckCircle2 className="h-5 w-5" />
                <span>
                  {accountType === "provider" ? "Cuenta gratuita incluida" : "14 días de prueba gratis"}
                </span>
              </div>
              <ul className="text-sm text-[var(--muted-foreground)] space-y-1 ml-7">
                {accountType === "provider" ? (
                  <>
                    <li>• Perfil público en el directorio</li>
                    <li>• Recibe solicitudes de planificadores</li>
                    <li>• Gestiona tus eventos y tareas</li>
                  </>
                ) : (
                  <>
                    <li>• Acceso completo a todas las funciones</li>
                    <li>• Sin tarjeta de crédito requerida</li>
                    <li>• Cancela cuando quieras</li>
                  </>
                )}
              </ul>
            </div>

            <div className="flex gap-3">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => setStep(1)}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Atrás
              </Button>
              <Button 
                type="submit" 
                className="flex-1 gap-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creando cuenta...
                  </>
                ) : (
                  <>
                    {accountType === "provider" ? "Crear cuenta gratuita" : "Comenzar prueba gratis"}
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </form>
        )}

        <p className="text-center text-sm text-[var(--muted-foreground)] pt-2">
          ¿Ya tienes cuenta?{" "}
          <Link href="/auth/login" className="text-[var(--primary)] hover:underline font-medium">
            Iniciar sesión
          </Link>
        </p>

        <p className="text-center text-xs text-[var(--muted-foreground)]">
          Al registrarte, aceptas nuestros{" "}
          <Link href="/terms" className="text-[var(--primary)] hover:underline">
            Términos
          </Link>{" "}
          y{" "}
          <Link href="/privacy" className="text-[var(--primary)] hover:underline">
            Privacidad
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={
      <Card className="border-0 shadow-xl">
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
        </CardContent>
      </Card>
    }>
      <RegisterContent />
    </Suspense>
  );
}
