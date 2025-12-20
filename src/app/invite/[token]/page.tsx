"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle2, XCircle, Users, Building2 } from "lucide-react";

interface InvitationData {
  id: number;
  email: string;
  organizationName: string;
  organizationLogo?: string;
  roleName: string;
  invitedByName?: string;
  expiresAt: string;
  status: string;
}

function InviteContent() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<InvitationData | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [newUser, setNewUser] = useState({
    name: "",
    password: "",
    confirmPassword: "",
  });

  useEffect(() => {
    fetchInvitation();
  }, [token]);

  const fetchInvitation = async () => {
    try {
      const res = await fetch(`/api/invitations/${token}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invitación no válida");
        setLoading(false);
        return;
      }

      setInvitation(data);
    } catch {
      setError("Error al cargar la invitación");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptExistingUser = async () => {
    setAccepting(true);
    setError("");

    try {
      const res = await fetch(`/api/invitations/${token}/accept`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al aceptar la invitación");
      }

      setSuccess(true);
      setTimeout(() => router.push("/dashboard"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al aceptar");
    } finally {
      setAccepting(false);
    }
  };

  const handleAcceptNewUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (newUser.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    if (newUser.password !== newUser.confirmPassword) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setAccepting(true);
    setError("");

    try {
      const res = await fetch(`/api/invitations/${token}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUser.name,
          password: newUser.password,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al aceptar la invitación");
      }

      setSuccess(true);
      
      await signIn("credentials", {
        email: invitation?.email,
        password: newUser.password,
        redirect: false,
      });

      setTimeout(() => router.push("/dashboard"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al aceptar");
    } finally {
      setAccepting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--muted)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--muted)] p-4">
        <Card className="w-full max-w-md border-0 shadow-xl">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-red-500/10">
                <XCircle className="h-8 w-8 text-red-500" />
              </div>
            </div>
            <CardTitle className="text-2xl">Invitación no válida</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={() => router.push("/auth/login")}
            >
              Ir al login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--muted)] p-4">
        <Card className="w-full max-w-md border-0 shadow-xl">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-green-500/10">
                <CheckCircle2 className="h-8 w-8 text-green-500" />
              </div>
            </div>
            <CardTitle className="text-2xl">¡Bienvenido al equipo!</CardTitle>
            <CardDescription>
              Te has unido a <strong>{invitation?.organizationName}</strong> como {invitation?.roleName}.
              <br />
              Redirigiendo al dashboard...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[var(--primary)]" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLoggedIn = sessionStatus === "authenticated";
  const isCorrectUser = isLoggedIn && session?.user?.email === invitation?.email;
  const needsLogin = isLoggedIn && !isCorrectUser;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--muted)] p-4">
      <Card className="w-full max-w-md border-0 shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <Image
              src="/images/logo.png"
              alt="HubEnts"
              width={48}
              height={48}
              className="rounded-lg"
            />
          </div>
          
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-[var(--primary)]/10">
              <Users className="h-8 w-8 text-[var(--primary)]" />
            </div>
          </div>

          <div>
            <CardTitle className="text-2xl">Invitación de equipo</CardTitle>
            <CardDescription className="mt-2">
              Has sido invitado a unirte a
            </CardDescription>
          </div>

          <div className="p-4 rounded-lg bg-[var(--muted)] flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[var(--primary)]/10">
              <Building2 className="h-6 w-6 text-[var(--primary)]" />
            </div>
            <div className="text-left">
              <p className="font-semibold">{invitation?.organizationName}</p>
              <p className="text-sm text-[var(--muted-foreground)]">
                como <strong>{invitation?.roleName}</strong>
              </p>
            </div>
          </div>

          {invitation?.invitedByName && (
            <p className="text-sm text-[var(--muted-foreground)]">
              Invitado por {invitation.invitedByName}
            </p>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
              {error}
            </div>
          )}

          {needsLogin && (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 text-sm">
              Estás logueado como <strong>{session?.user?.email}</strong>.
              <br />
              Esta invitación es para <strong>{invitation?.email}</strong>.
              <br />
              <Button 
                variant="link" 
                className="p-0 h-auto text-amber-600"
                onClick={() => signIn()}
              >
                Cambiar de cuenta
              </Button>
            </div>
          )}

          {isCorrectUser ? (
            <Button 
              className="w-full" 
              onClick={handleAcceptExistingUser}
              disabled={accepting}
            >
              {accepting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Aceptando...
                </>
              ) : (
                "Aceptar invitación"
              )}
            </Button>
          ) : !isLoggedIn ? (
            <div className="space-y-4">
              <p className="text-sm text-center text-[var(--muted-foreground)]">
                Invitación para: <strong>{invitation?.email}</strong>
              </p>

              <form onSubmit={handleAcceptNewUser} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Tu nombre</Label>
                  <Input
                    id="name"
                    placeholder="Tu nombre completo"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password">Crear contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirmar contraseña</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Repite tu contraseña"
                    value={newUser.confirmPassword}
                    onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })}
                    required
                  />
                </div>

                <Button type="submit" className="w-full" disabled={accepting}>
                  {accepting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Creando cuenta...
                    </>
                  ) : (
                    "Crear cuenta y unirme"
                  )}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-[var(--border)]" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[var(--card)] px-2 text-[var(--muted-foreground)]">
                    ¿Ya tienes cuenta?
                  </span>
                </div>
              </div>

              <Button 
                variant="outline" 
                className="w-full"
                onClick={() => signIn(undefined, { callbackUrl: `/invite/${token}` })}
              >
                Iniciar sesión
              </Button>
            </div>
          ) : null}

          <p className="text-center text-xs text-[var(--muted-foreground)]">
            La invitación expira el{" "}
            {invitation?.expiresAt && new Date(invitation.expiresAt).toLocaleDateString("es", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function InvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[var(--muted)]">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    }>
      <InviteContent />
    </Suspense>
  );
}
