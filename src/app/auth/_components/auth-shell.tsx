import Link from "next/link";
import type { ReactNode } from "react";

export function HubentsMark({ size = 28 }: { size?: number }) {
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

export function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  );
}

export function AuthHero({
  badge = "Con asistente de IA",
  title = "Organiza eventos de ensueño sin perder el hilo, de manera sencilla y rápida.",
  lead = "CRM, finanzas, RSVP, agenda y proveedores en un solo sitio. Diseñado para wedding planners, profesionales del sector y agencias que cuidan cada detalle.",
}: {
  badge?: string;
  title?: string;
  lead?: string;
}) {
  return (
    <div className="auth-hero">
      <div className="auth-hero__deco auth-hero__deco--tr" aria-hidden />
      <div className="auth-hero__deco auth-hero__deco--bl" aria-hidden />
      <div className="auth-hero__deco auth-hero__deco--mid" aria-hidden />

      <div className="auth-hero__inner">
        <div className="auth-hero__badge">{badge}</div>
        <h1 className="auth-hero__title">{title}</h1>
        <p className="auth-hero__lead">{lead}</p>

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

export function AuthShell({
  children,
  hero,
}: {
  children: ReactNode;
  hero?: ReactNode;
}) {
  return (
    <div data-theme="sand" className="auth-root">
      <div className="auth-form-col">
        <div className="auth-form-inner">
          <div className="auth-brand">
            <HubentsMark size={28} />
            <span className="auth-brand__name">Hubents</span>
          </div>

          <div className="auth-form-card">{children}</div>

          <div className="auth-footer-meta">
            <Link href="/terms">Términos</Link>
            <span className="sep">·</span>
            <Link href="/privacy">Privacidad</Link>
            <span className="sep">·</span>
            <a href="mailto:hello@hubents.com">Contacto</a>
          </div>
        </div>
      </div>

      {hero ?? <AuthHero />}
    </div>
  );
}
