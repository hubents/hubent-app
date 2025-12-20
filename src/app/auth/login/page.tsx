"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Mail, Lock } from "lucide-react";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const errorParam = searchParams.get("error");
  
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  
  // Map NextAuth error codes to user-friendly messages
  const getErrorMessage = (errorCode: string | null) => {
    if (!errorCode) return "";
    const errorMessages: Record<string, string> = {
      "Configuration": "Error de configuración del servidor. Contacta al soporte.",
      "CredentialsSignin": "Email o contraseña incorrectos",
      "OAuthSignin": "Error al iniciar sesión con el proveedor",
      "OAuthCallback": "Error en la respuesta del proveedor",
      "OAuthCreateAccount": "Error al crear la cuenta",
      "EmailCreateAccount": "Error al crear la cuenta con email",
      "Callback": "Error en el proceso de autenticación",
      "OAuthAccountNotLinked": "Este email ya está registrado con otro método",
      "EmailSignin": "Error al enviar el email de verificación",
      "SessionRequired": "Debes iniciar sesión para acceder",
      "Default": "Error de autenticación",
    };
    return errorMessages[errorCode] || errorMessages["Default"];
  };
  
  const [error, setError] = useState(getErrorMessage(errorParam));
  
  const [credentials, setCredentials] = useState({
    email: "",
    password: "",
  });
  
  const [magicEmail, setMagicEmail] = useState("");

  const handleCredentialsLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email: credentials.email.toLowerCase(),
        password: credentials.password,
        redirect: false,
      });

      if (result?.error) {
        // Map error codes to friendly messages
        if (result.error === "CredentialsSignin") {
          setError("Email o contraseña incorrectos");
        } else if (result.error === "Configuration") {
          setError("Error de configuración. Por favor intenta con Magic Link.");
        } else {
          setError(result.error);
        }
      } else if (result?.ok) {
        router.push(callbackUrl);
        router.refresh();
      }
    } catch {
      setError("Error al iniciar sesión. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const result = await signIn("resend", {
        email: magicEmail.toLowerCase(),
        callbackUrl,
        redirect: false,
      });

      if (result?.error) {
        if (result.error === "Configuration") {
          setError("El servicio de email no está configurado. Usa contraseña o Google.");
        } else {
          setError("Error al enviar el magic link. Intenta de nuevo.");
        }
      } else {
        setMagicLinkSent(true);
      }
    } catch {
      setError("Error al enviar el magic link. Intenta de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    signIn("google", { callbackUrl });
  };

  if (magicLinkSent) {
    return (
      <Card className="border-0 shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-[var(--primary)]/10">
              <Mail className="h-8 w-8 text-[var(--primary)]" />
            </div>
          </div>
          <CardTitle className="text-2xl">Revisa tu email</CardTitle>
          <CardDescription>
            Te enviamos un link de acceso a <strong>{magicEmail}</strong>
            <br />
            Haz clic en el link para iniciar sesión.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-[var(--muted)] text-sm text-center">
            <p className="text-[var(--muted-foreground)]">
              El link expira en <strong>24 horas</strong>.
              <br />
              Si no lo ves, revisa tu carpeta de spam.
            </p>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setMagicLinkSent(false)}
          >
            Volver al login
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader className="text-center space-y-2 pb-4">
        <CardTitle className="text-2xl">Iniciar sesión</CardTitle>
        <CardDescription>
          Accede a tu cuenta de HubEnts
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
            {error}
          </div>
        )}

        <Tabs defaultValue="password" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="password" className="gap-2">
              <Lock className="h-4 w-4" />
              Contraseña
            </TabsTrigger>
            <TabsTrigger value="magic" className="gap-2">
              <Mail className="h-4 w-4" />
              Magic Link
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="password" className="space-y-4 mt-4">
            <form onSubmit={handleCredentialsLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="tu@email.com"
                  value={credentials.email}
                  onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Contraseña</Label>
                  <Link 
                    href="/auth/forgot-password" 
                    className="text-xs text-[var(--primary)] hover:underline"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
                <Input
                  id="password"
                  type="password"
                  placeholder="Tu contraseña"
                  value={credentials.password}
                  onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                  required
                />
              </div>
              
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Iniciando sesión...
                  </>
                ) : (
                  "Iniciar sesión"
                )}
              </Button>
            </form>
          </TabsContent>
          
          <TabsContent value="magic" className="space-y-4 mt-4">
            <form onSubmit={handleMagicLink} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="magic-email">Email</Label>
                <Input
                  id="magic-email"
                  type="email"
                  placeholder="tu@email.com"
                  value={magicEmail}
                  onChange={(e) => setMagicEmail(e.target.value)}
                  required
                />
              </div>
              
              <Button type="submit" className="w-full gap-2" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Mail className="h-4 w-4" />
                    Enviar Magic Link
                  </>
                )}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-[var(--border)]" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[var(--card)] px-2 text-[var(--muted-foreground)]">
              O continúa con
            </span>
          </div>
        </div>

        <Button 
          type="button" 
          variant="outline" 
          className="w-full gap-2"
          onClick={handleGoogleLogin}
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

        <p className="text-center text-sm text-[var(--muted-foreground)] pt-2">
          ¿No tienes cuenta?{" "}
          <Link href="/auth/register" className="text-[var(--primary)] hover:underline font-medium">
            Regístrate gratis
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <Card className="border-0 shadow-xl">
        <CardContent className="p-8 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
        </CardContent>
      </Card>
    }>
      <LoginContent />
    </Suspense>
  );
}
