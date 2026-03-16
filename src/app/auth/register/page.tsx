"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, ArrowRight, ArrowLeft } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    companyName: "",
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

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al registrar");
      }

      // Auto-login after successful registration
      const { signIn } = await import("next-auth/react");
      const loginResult = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (loginResult?.ok) {
        router.push("/onboarding?welcome=true");
      } else {
        // Fallback: redirect to login if auto-login fails
        router.push("/auth/login");
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

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader className="text-center space-y-2 pb-4">
        <CardTitle className="text-2xl">Crear cuenta</CardTitle>
        <CardDescription>
          {step === 1 
            ? "Ingresa tus datos para comenzar" 
            : "Cuéntanos sobre tu empresa"}
        </CardDescription>
        
        {/* Progress indicator */}
        <div className="flex items-center justify-center gap-2 pt-2">
          <div className={`w-8 h-1 rounded-full transition-colors ${step >= 1 ? "bg-[var(--primary)]" : "bg-[var(--muted)]"}`} />
          <div className={`w-8 h-1 rounded-full transition-colors ${step >= 2 ? "bg-[var(--primary)]" : "bg-[var(--muted)]"}`} />
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
            {error}
          </div>
        )}

        {step === 1 ? (
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

            <Button 
              type="button" 
              className="w-full gap-2" 
              onClick={handleNextStep}
            >
              Continuar
              <ArrowRight className="h-4 w-4" />
            </Button>

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
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="companyName">Nombre de tu empresa</Label>
              <Input
                id="companyName"
                name="companyName"
                placeholder="Mi Empresa de Eventos"
                value={formData.companyName}
                onChange={handleChange}
              />
              <p className="text-xs text-[var(--muted-foreground)]">
                Este será el nombre de tu espacio de trabajo
              </p>
            </div>

            {/* Trial info */}
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20 space-y-2">
              <div className="flex items-center gap-2 text-green-600 font-medium">
                <CheckCircle2 className="h-5 w-5" />
                <span>14 días de prueba gratis</span>
              </div>
              <ul className="text-sm text-[var(--muted-foreground)] space-y-1 ml-7">
                <li>• Acceso completo a todas las funciones</li>
                <li>• Sin tarjeta de crédito requerida</li>
                <li>• Cancela cuando quieras</li>
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
                    Comenzar prueba gratis
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
