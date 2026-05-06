"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarRange, Eye, EyeOff, Loader2, Store } from "lucide-react";
import { AuthShell, GoogleIcon } from "../_components/auth-shell";

type OrgType = "tenant" | "provider";

export default function RegisterPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [orgType, setOrgType] = useState<OrgType>("tenant");
  const [showPassword, setShowPassword] = useState(false);
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    companyName: "",
  });

  const validEmail = /^\S+@\S+\.\S+$/.test(form.email);
  const validPwd = form.password.length >= 8;
  const pwdMatch = form.password.length > 0 && form.password === form.confirmPassword;
  const step1Valid =
    form.name.trim().length >= 2 && validEmail && validPwd && pwdMatch && terms;
  const step2Valid = form.companyName.trim().length >= 2;

  const isProvider = orgType === "provider";

  const handleContinue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!step1Valid) return;
    setStep(2);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!step2Valid || loading) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, orgType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Error al registrar");

      const { signIn } = await import("next-auth/react");
      const loginResult = await signIn("credentials", {
        email: form.email.toLowerCase(),
        password: form.password,
        redirect: false,
      });

      if (loginResult?.ok) {
        router.push("/onboarding?welcome=true");
      } else {
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
    signIn("google", { callbackUrl: `/onboarding?welcome=true&orgType=${orgType}` });
  };

  if (step === 2) {
    return (
      <AuthShell>
        <form onSubmit={handleSubmit}>
          <h2 className="auth-h2">Cuéntanos sobre tu empresa</h2>
          <p className="auth-subtitle">Casi listo. Solo necesitamos un dato más.</p>

          <div className="auth-field">
            <div className="auth-field__label-row">
              <label className="auth-field__label" htmlFor="companyName">
                {isProvider ? "Nombre del negocio" : "Nombre de tu empresa"}
              </label>
            </div>
            <input
              id="companyName"
              type="text"
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              placeholder={isProvider ? "Mi empresa de servicios" : "Mi empresa de eventos"}
              autoFocus
              required
            />
            <div className="auth-field__hint">
              Este será el nombre de tu espacio de trabajo
            </div>
          </div>

          <div className="auth-info">
            <span>
              {isProvider
                ? "Plan gratuito · Perfil público en Partners · Sin tarjeta de crédito requerida"
                : "14 días de prueba gratis · Acceso completo · Sin tarjeta de crédito"}
            </span>
          </div>

          {error && <div className="auth-error">{error}</div>}

          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="auth-btn-social"
              style={{ width: "auto", marginBottom: 0, padding: "12px 14px" }}
            >
              <ArrowLeft size={14} />
              Atrás
            </button>
            <button
              type="submit"
              disabled={!step2Valid || loading}
              aria-disabled={!step2Valid || loading}
              className="auth-btn-primary"
              style={{ flex: 1, marginTop: 0 }}
            >
              {loading && (
                <Loader2
                  size={14}
                  style={{ animation: "authSpin .8s linear infinite" }}
                />
              )}
              {loading
                ? "Creando cuenta..."
                : isProvider
                  ? "Crear cuenta gratis"
                  : "Comenzar prueba gratis"}
            </button>
          </div>

          <div className="auth-footer-text">
            ¿Ya tienes cuenta?{" "}
            <Link href="/auth/login" className="auth-link">
              Iniciar sesión
            </Link>
          </div>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <form onSubmit={handleContinue}>
        <h2 className="auth-h2">Crear cuenta</h2>
        <p className="auth-subtitle">Ingresa tus datos para comenzar</p>

        <div className="auth-field">
          <div className="auth-field__label-row">
            <span className="auth-field__label">Tipo de cuenta</span>
          </div>
          <div className="auth-roles">
            <button
              type="button"
              onClick={() => setOrgType("tenant")}
              className={`auth-role-card ${orgType === "tenant" ? "auth-role-card--active" : ""}`}
            >
              <div className="auth-role-card__icon"><CalendarRange size={20} /></div>
              <div className="auth-role-card__title">Wedding planner</div>
              <div className="auth-role-card__desc">Organizo eventos</div>
            </button>
            <button
              type="button"
              onClick={() => setOrgType("provider")}
              className={`auth-role-card ${orgType === "provider" ? "auth-role-card--active" : ""}`}
            >
              <div className="auth-role-card__icon"><Store size={20} /></div>
              <div className="auth-role-card__title">Proveedor</div>
              <div className="auth-role-card__desc">Ofrezco servicios</div>
            </button>
          </div>
        </div>

        <div className="auth-field">
          <div className="auth-field__label-row">
            <label className="auth-field__label" htmlFor="name">Nombre completo</label>
          </div>
          <input
            id="name"
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Tu nombre"
            autoComplete="name"
            required
          />
        </div>

        <div className="auth-field">
          <div className="auth-field__label-row">
            <label className="auth-field__label" htmlFor="email">Email</label>
          </div>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder="hola@empresa.com"
            autoComplete="email"
            required
          />
        </div>

        <div className="auth-field">
          <div className="auth-field__label-row">
            <label className="auth-field__label" htmlFor="password">Contraseña</label>
          </div>
          <div className="auth-pwd">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder="Crea una contraseña segura"
              autoComplete="new-password"
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
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            placeholder="Repite tu contraseña"
            autoComplete="new-password"
            required
          />
          {form.confirmPassword.length > 0 && !pwdMatch && (
            <div className="auth-field__hint auth-field__hint--err">
              Las contraseñas no coinciden
            </div>
          )}
        </div>

        <label className="auth-checkbox-row">
          <input
            type="checkbox"
            checked={terms}
            onChange={(e) => setTerms(e.target.checked)}
          />
          <span>
            Acepto los{" "}
            <Link href="/terms" className="auth-link">Términos del servicio</Link>{" "}
            y la{" "}
            <Link href="/privacy" className="auth-link">Política de privacidad</Link>
            .
          </span>
        </label>

        {error && <div className="auth-error">{error}</div>}

        <button
          type="submit"
          disabled={!step1Valid}
          aria-disabled={!step1Valid}
          className="auth-btn-primary"
        >
          Continuar
          <ArrowRight size={14} />
        </button>

        <div className="auth-divider">
          <span className="auth-divider__label">o regístrate con</span>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignUp}
          className="auth-btn-social"
        >
          <GoogleIcon /> Registrarme con Google
        </button>

        <div className="auth-footer-text">
          ¿Ya tienes cuenta?{" "}
          <Link href="/auth/login" className="auth-link">
            Iniciar sesión
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
