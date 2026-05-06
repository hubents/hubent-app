"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Mail } from "lucide-react";
import { AuthShell } from "../_components/auth-shell";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  const validEmail = /^\S+@\S+\.\S+$/.test(email);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validEmail || loading) return;
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
      <AuthShell>
        <div className="auth-success-icon"><Mail size={20} /></div>
        <h2 className="auth-h2">Email enviado</h2>
        <p className="auth-subtitle">
          Si existe una cuenta con <strong>{email}</strong>, recibirás un email con
          instrucciones para restablecer tu contraseña. El link expira en 1 hora.
        </p>
        <Link href="/auth/login" className="auth-btn-social" style={{ textDecoration: "none" }}>
          Volver al login
        </Link>
        <div className="auth-footer-text">
          ¿No te llegó? Revisa tu carpeta de spam o{" "}
          <button type="button" onClick={() => setSent(false)} className="auth-link">
            prueba otro email
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <form onSubmit={handleSubmit}>
        <h2 className="auth-h2">¿Olvidaste tu contraseña?</h2>
        <p className="auth-subtitle">
          Ingresa tu email y te enviaremos un link para restablecer tu contraseña.
        </p>

        <div className="auth-field">
          <div className="auth-field__label-row">
            <label className="auth-field__label" htmlFor="email">Email</label>
          </div>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="hola@empresa.com"
            autoComplete="email"
            autoFocus
            required
          />
        </div>

        {error && <div className="auth-error">{error}</div>}

        <button
          type="submit"
          disabled={!validEmail || loading}
          aria-disabled={!validEmail || loading}
          className="auth-btn-primary"
        >
          {loading && <Loader2 size={14} className="auth-spinner" style={{ animation: "authSpin .8s linear infinite" }} />}
          {loading ? "Enviando..." : "Enviar instrucciones"}
        </button>

        <div className="auth-footer-text">
          ¿Recuerdas tu contraseña?{" "}
          <Link href="/auth/login" className="auth-link">
            Volver al login
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
