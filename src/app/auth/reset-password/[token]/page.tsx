"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import { AuthShell } from "../../_components/auth-shell";

export default function ResetPasswordPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const validPwd = password.length >= 8;
  const pwdMatch = password.length > 0 && password === confirmPassword;
  const valid = validPwd && pwdMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || loading) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al restablecer la contraseña");

      setSuccess(true);
      setTimeout(() => router.push("/auth/login"), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al restablecer la contraseña");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthShell>
        <div className="auth-success-icon"><CheckCircle2 size={22} /></div>
        <h2 className="auth-h2">¡Contraseña actualizada!</h2>
        <p className="auth-subtitle">
          Tu contraseña ha sido restablecida exitosamente. Te llevamos al login en
          unos segundos…
        </p>
        <Link
          href="/auth/login"
          className="auth-btn-primary"
          style={{ textDecoration: "none", display: "inline-flex" }}
        >
          Ir al login
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <form onSubmit={handleSubmit}>
        <h2 className="auth-h2">Nueva contraseña</h2>
        <p className="auth-subtitle">Ingresa tu nueva contraseña para entrar de nuevo a tu cuenta.</p>

        <div className="auth-field">
          <div className="auth-field__label-row">
            <label className="auth-field__label" htmlFor="password">Nueva contraseña</label>
          </div>
          <div className="auth-pwd">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Crea una contraseña segura"
              autoComplete="new-password"
              autoFocus
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="auth-pwd__toggle"
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="auth-field__hint">Mínimo 8 caracteres</div>
        </div>

        <div className="auth-field">
          <div className="auth-field__label-row">
            <label className="auth-field__label" htmlFor="confirmPassword">
              Confirmar contraseña
            </label>
          </div>
          <input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repite tu contraseña"
            autoComplete="new-password"
            required
          />
          {confirmPassword.length > 0 && !pwdMatch && (
            <div className="auth-field__hint auth-field__hint--err">
              Las contraseñas no coinciden
            </div>
          )}
        </div>

        {error && <div className="auth-error">{error}</div>}

        <button
          type="submit"
          disabled={!valid || loading}
          aria-disabled={!valid || loading}
          className="auth-btn-primary"
        >
          {loading && <Loader2 size={14} className="auth-spinner" style={{ animation: "authSpin .8s linear infinite" }} />}
          {loading ? "Guardando..." : "Restablecer contraseña"}
        </button>
      </form>
    </AuthShell>
  );
}
