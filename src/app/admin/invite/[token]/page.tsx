"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn, useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Image from "next/image";
import { useParams, useRouter } from "next/navigation";
import { Loader2, CheckCircle2, XCircle, Shield } from "lucide-react";

interface AdminInvitationData {
  id: number;
  email: string;
  level: string;
  invitedByName?: string;
  expiresAt: string;
  status: string;
}

function AdminInviteContent() {
  const params = useParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState(false);
  const [invitation, setInvitation] = useState<AdminInvitationData | null>(null);
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
      const res = await fetch(`/api/admin/invitations/${token}`);
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
      const res = await fetch(`/api/admin/invitations/${token}/accept`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al aceptar la invitación");
      }

      setSuccess(true);
      setTimeout(() => router.push("/admin"), 2000);
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
      const res = await fetch(`/api/admin/invitations/${token}/accept`, {
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

      setTimeout(() => router.push("/admin"), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al aceptar");
    } finally {
      setAccepting(false);
    }
  };

  const getLevelLabel = (level: string) => {
    switch (level) {
      case "super_admin": return "Super Administrador";
      case "support": return "Soporte";
      default: return level;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-red-400" />
      </div>
    );
  }

  if (error && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <Card className="w-full max-w-md border-slate-700 bg-slate-800">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-red-500/10">
                <XCircle className="h-8 w-8 text-red-400" />
              </div>
            </div>
            <CardTitle className="text-2xl text-white">Invitación no válida</CardTitle>
            <CardDescription className="text-slate-400">{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full bg-red-600 hover:bg-red-700" 
              onClick={() => router.push("/admin/login")}
            >
              Ir al login de admin
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <Card className="w-full max-w-md border-slate-700 bg-slate-800">
          <CardHeader className="text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-4 rounded-full bg-green-500/10">
                <CheckCircle2 className="h-8 w-8 text-green-400" />
              </div>
            </div>
            <CardTitle className="text-2xl text-white">¡Bienvenido al equipo!</CardTitle>
            <CardDescription className="text-slate-400">
              Ahora eres <strong className="text-white">{getLevelLabel(invitation?.level || "")}</strong> de Hubents.
              <br />
              Redirigiendo al panel de administración...
            </CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-red-400" />
          </CardContent>
        </Card>
      </div>
    );
  }

  const isLoggedIn = sessionStatus === "authenticated";
  const isCorrectUser = isLoggedIn && session?.user?.email === invitation?.email;

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
      <Card className="w-full max-w-md border-slate-700 bg-slate-800">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10">
              <Shield className="h-6 w-6 text-red-400" />
            </div>
            <Image
              src="/images/logo.png"
              alt="Hubents"
              width={40}
              height={40}
              className="rounded-lg"
            />
          </div>

          <div>
            <CardTitle className="text-2xl text-white">Invitación de Administrador</CardTitle>
            <CardDescription className="text-slate-400 mt-2">
              Has sido invitado como administrador de la plataforma Hubents
            </CardDescription>
          </div>

          <div className="p-4 rounded-lg bg-slate-700/50 text-center">
            <p className="text-sm text-slate-400">Nivel de acceso</p>
            <p className="text-lg font-semibold text-white">
              {getLevelLabel(invitation?.level || "")}
            </p>
          </div>

          {invitation?.invitedByName && (
            <p className="text-sm text-slate-500">
              Invitado por {invitation.invitedByName}
            </p>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {isCorrectUser ? (
            <Button 
              className="w-full bg-red-600 hover:bg-red-700" 
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
              <p className="text-sm text-center text-slate-400">
                Invitación para: <strong className="text-white">{invitation?.email}</strong>
              </p>

              <form onSubmit={handleAcceptNewUser} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-slate-300">Tu nombre</Label>
                  <Input
                    id="name"
                    placeholder="Tu nombre completo"
                    className="bg-slate-700 border-slate-600 text-white"
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-slate-300">Crear contraseña</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Mínimo 8 caracteres"
                    className="bg-slate-700 border-slate-600 text-white"
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-slate-300">Confirmar contraseña</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="Repite tu contraseña"
                    className="bg-slate-700 border-slate-600 text-white"
                    value={newUser.confirmPassword}
                    onChange={(e) => setNewUser({ ...newUser, confirmPassword: e.target.value })}
                    required
                  />
                </div>

                <Button type="submit" className="w-full bg-red-600 hover:bg-red-700" disabled={accepting}>
                  {accepting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Creando cuenta...
                    </>
                  ) : (
                    "Crear cuenta y aceptar"
                  )}
                </Button>
              </form>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-600" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-slate-800 px-2 text-slate-500">
                    ¿Ya tienes cuenta?
                  </span>
                </div>
              </div>

              <Button 
                variant="outline" 
                className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                onClick={() => signIn(undefined, { callbackUrl: `/admin/invite/${token}` })}
              >
                Iniciar sesión
              </Button>
            </div>
          ) : (
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">
              Estás logueado como <strong>{session?.user?.email}</strong>.
              <br />
              Esta invitación es para <strong>{invitation?.email}</strong>.
            </div>
          )}

          <p className="text-center text-xs text-slate-500">
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

export default function AdminInvitePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-red-400" />
      </div>
    }>
      <AdminInviteContent />
    </Suspense>
  );
}
