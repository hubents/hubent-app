"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Link from "next/link";
import { Loader2, Mail, ArrowLeft, CheckCircle2 } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Error al enviar el email");
      }

      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al enviar el email");
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <Card className="border-0 shadow-xl">
        <CardHeader className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="p-4 rounded-full bg-green-500/10">
              <CheckCircle2 className="h-8 w-8 text-green-500" />
            </div>
          </div>
          <CardTitle className="text-2xl">Email enviado</CardTitle>
          <CardDescription>
            Si existe una cuenta con <strong>{email}</strong>, recibirás un email con instrucciones para restablecer tu contraseña.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-4 rounded-lg bg-[var(--muted)] text-sm text-center">
            <p className="text-[var(--muted-foreground)]">
              El link expira en <strong>1 hora</strong>.
              <br />
              Si no lo ves, revisa tu carpeta de spam.
            </p>
          </div>

          <Link href="/auth/login">
            <Button variant="outline" className="w-full gap-2">
              <ArrowLeft className="h-4 w-4" />
              Volver al login
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-xl">
      <CardHeader className="text-center space-y-2">
        <div className="flex justify-center mb-2">
          <div className="p-4 rounded-full bg-[var(--primary)]/10">
            <Mail className="h-8 w-8 text-[var(--primary)]" />
          </div>
        </div>
        <CardTitle className="text-2xl">¿Olvidaste tu contraseña?</CardTitle>
        <CardDescription>
          Ingresa tu email y te enviaremos un link para restablecer tu contraseña.
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {error && (
          <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-600 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                Enviando...
              </>
            ) : (
              "Enviar instrucciones"
            )}
          </Button>
        </form>

        <Link href="/auth/login">
          <Button variant="ghost" className="w-full gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver al login
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
