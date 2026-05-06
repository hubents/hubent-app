"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Info, Lock, Mail, Sparkles } from "lucide-react";

const ERROR_MESSAGES: Record<string, string> = {
  Configuration: "Error de configuración del servidor. Contacta al soporte.",
  CredentialsSignin: "Email o contraseña incorrectos",
  OAuthSignin: "Error al iniciar sesión con el proveedor",
  OAuthCallback: "Error en la respuesta del proveedor",
  OAuthCreateAccount: "Error al crear la cuenta",
  EmailCreateAccount: "Error al crear la cuenta con email",
  Callback: "Error en el proceso de autenticación",
  OAuthAccountNotLinked: "Este email ya está registrado con otro método",
  EmailSignin: "Error al enviar el email de verificación",
  SessionRequired: "Debes iniciar sesión para acceder",
  Default: "Error de autenticación",
};

function HubentsMark({ size = 28 }: { size?: number }) {
  return (
    <svg
      width={size * 0.545}
      height={size}
      viewBox="0 0 54.4 99.8"
      fill="currentColor"
      aria-hidden
      style={{ display: "block" }}
    >
      <path d="M0,0h0C12.4,0,22.5,10.1,22.5,22.5v77.3h0C10.1,99.8,0,89.8,0,77.3V0H0Z" />
      <path d="M31.9,30.5h0c12.4,0,22.5,10.1,22.5,22.5v46.8h0c-12.4,0-22.5-10.1-22.5-22.5V30.5h0Z" />
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

function AuthHero() {
  return (
    <div className="auth-hero">
      <div className="auth-hero__deco auth-hero__deco--tr" aria-hidden />
      <div className="auth-hero__deco auth-hero__deco--bl" aria-hidden />
      <div className="auth-hero__deco auth-hero__deco--mid" aria-hidden />

      <div className="auth-hero__inner">
        <div className="auth-hero__badge">
          <Sparkles size={12} /> Con asistente de IA
        </div>
        <h1 className="auth-hero__title">
          Organiza eventos de ensueño sin perder el hilo, de manera sencilla y rápida.
        </h1>
        <p className="auth-hero__lead">
          CRM, finanzas, RSVP, agenda y proveedores en un solo sitio. Diseñado para
          wedding planners, profesionales del sector y agencias que cuidan cada detalle.
        </p>

        <div className="auth-hero__quote">
          <div className="auth-hero__quote-text">
            &ldquo;Pasamos de 6 hojas de cálculo a una sola plataforma. Ahora nuestro
            equipo de 4 planners coordina 18 bodas a la vez sin estresarnos.&rdquo;
          </div>
          <div className="auth-hero__quote-meta">
            <div className="auth-hero__avatars">
              <div className="auth-hero__avatar" style={{ background: "#E8D5C4", color: "#7A5A3A" }}>L</div>
              <div className="auth-hero__avatar" style={{ background: "#D4E4D8", color: "#2F5233" }}>F</div>
              <div className="auth-hero__avatar" style={{ background: "#F0D4D0", color: "#8A5555" }}>M</div>
            </div>
            <div>
              <div className="auth-hero__name">Laura · Studio Bouquet</div>
              <div className="auth-hero__name-sub">Madrid · 18 eventos / año</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const errorParam = searchParams.get("error");

  const [mode, setMode] = useState<"password" | "magic">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [error, setError] = useState(errorParam ? ERROR_MESSAGES[errorParam] || ERROR_MESSAGES.Default : "");

  const validEmail = /^\S+@\S+\.\S+$/.test(email);
  const valid = mode === "password" ? validEmail && password.length >= 6 : validEmail;

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || loading) return;
    setLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email: email.toLowerCase(),
        password,
        redirect: false,
      });

      if (result?.error) {
        setError(ERROR_MESSAGES[result.error] || result.error);
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
    if (!valid || loading) return;
    setLoading(true);
    setError("");

    try {
      const result = await signIn("resend", {
        email: email.toLowerCase(),
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
      <div data-theme="sand" className="auth-root">
        <div className="auth-form-col">
          <div className="auth-form-inner">
            <div className="auth-brand">
              <HubentsMark size={28} />
              <span className="auth-brand__name">Hubents</span>
            </div>
            <div className="auth-form-card">
              <div className="auth-success-icon"><Sparkles size={20} /></div>
              <h2 className="auth-h2">Enlace mágico enviado</h2>
              <p className="auth-subtitle">
                Hemos enviado un enlace de acceso a <strong>{email}</strong>. Ábrelo desde
                el mismo dispositivo para entrar sin contraseña. Caduca en 24 horas.
              </p>
              <button
                type="button"
                onClick={() => setMagicLinkSent(false)}
                className="auth-btn-primary"
                style={{ background: "transparent", color: "var(--ink-1)", border: "1px solid var(--line-strong)" }}
              >
                Volver al login
              </button>
              <div className="auth-footer-text">
                ¿No te llegó? Revisa tu carpeta de spam o{" "}
                <button type="button" onClick={() => setMagicLinkSent(false)} className="auth-link">
                  prueba con contraseña
                </button>
              </div>
            </div>
            <div className="auth-footer-meta">
              <Link href="/terms">Términos</Link>
              <span className="sep">·</span>
              <Link href="/privacy">Privacidad</Link>
              <span className="sep">·</span>
              <a href="mailto:hello@hubents.com">Contacto</a>
            </div>
          </div>
        </div>
        <AuthHero />
      </div>
    );
  }

  return (
    <div data-theme="sand" className="auth-root">
      <div className="auth-form-col">
        <div className="auth-form-inner">
          <div className="auth-brand">
            <HubentsMark size={28} />
            <span className="auth-brand__name">Hubents</span>
          </div>

          <div className="auth-form-card">
            <form onSubmit={mode === "magic" ? handleMagicLink : handlePasswordLogin}>
              <h2 className="auth-h2">
                {mode === "magic" ? "Inicia sesión sin contraseña" : "Bienvenido de vuelta"}
              </h2>
              <p className="auth-subtitle">
                {mode === "magic"
                  ? "Te enviaremos un enlace al email para que entres con un solo clic."
                  : "Inicia sesión para continuar gestionando tus eventos"}
              </p>

              <button
                type="button"
                onClick={handleGoogleLogin}
                className="auth-btn-social"
              >
                <GoogleIcon />
                Continuar con Google
              </button>

              <div className="auth-divider">
                <span className="auth-divider__label">o continúa con tu email</span>
              </div>

              <div className="auth-tabs">
                <button
                  type="button"
                  onClick={() => setMode("password")}
                  className={`auth-tab ${mode === "password" ? "auth-tab--active" : ""}`}
                >
                  <Lock size={11} /> Contraseña
                </button>
                <button
                  type="button"
                  onClick={() => setMode("magic")}
                  className={`auth-tab ${mode === "magic" ? "auth-tab--active" : ""}`}
                >
                  <Sparkles size={11} /> Magic link
                </button>
              </div>

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

              {mode === "password" && (
                <div className="auth-field">
                  <div className="auth-field__label-row">
                    <label className="auth-field__label" htmlFor="password">Contraseña</label>
                    <Link href="/auth/forgot-password" className="auth-link--field">
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </div>
                  <div className="auth-pwd">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Tu contraseña"
                      autoComplete="current-password"
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
                </div>
              )}

              {mode === "magic" && (
                <div className="auth-info">
                  <Info size={13} className="auth-info-icon" />
                  <span>
                    Sin contraseñas que recordar. Te enviaremos un enlace de un solo uso, válido durante 24 horas.
                  </span>
                </div>
              )}

              {mode === "password" && (
                <label className="auth-checkbox-row">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  Mantener sesión iniciada
                </label>
              )}

              {error && <div className="auth-error">{error}</div>}

              <button
                type="submit"
                disabled={!valid || loading}
                aria-disabled={!valid || loading}
                className="auth-btn-primary"
              >
                {loading && <span className="auth-spinner" />}
                {loading
                  ? mode === "magic" ? "Enviando..." : "Iniciando sesión..."
                  : mode === "magic" ? "Enviar enlace mágico" : "Iniciar sesión"}
              </button>

              <div className="auth-footer-text">
                ¿No tienes cuenta?{" "}
                <Link href="/auth/register" className="auth-link">
                  Crear cuenta
                </Link>
              </div>
            </form>
          </div>

          <div className="auth-footer-meta">
            <Link href="/terms">Términos</Link>
            <span className="sep">·</span>
            <Link href="/privacy">Privacidad</Link>
            <span className="sep">·</span>
            <a href="mailto:hello@hubents.com">Contacto</a>
          </div>
        </div>
      </div>

      <AuthHero />
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  );
}
