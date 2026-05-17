"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { CheckCircle, Clock, Building2, ArrowRight, Sparkles } from "lucide-react";

interface ClaimInfo {
  status: "pending" | "claimed" | "expired";
  providerName: string;
  email?: string;
  plannerOrgName?: string | null;
  plannerOrgCity?: string | null;
}

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

export default function ClaimPage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const [info, setInfo] = useState<ClaimInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/claim/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success) setInfo(d.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

  const handleRegister = () =>
    router.push(`/auth/register?claim=${token}&orgType=provider`);
  const handleLogin = () =>
    router.push(`/auth/login?claim=${token}`);

  if (loading) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.logo}><HubentsMark size={32} /></div>
          <div style={{ color: "#6b7280", fontSize: 14, textAlign: "center" }}>
            Cargando perfil…
          </div>
        </div>
      </div>
    );
  }

  if (!info) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.logo}><HubentsMark size={32} /></div>
          <h1 style={styles.title}>Enlace no válido</h1>
          <p style={styles.subtitle}>
            Este enlace de reclamación no existe o ha caducado.
          </p>
          <Link href="/auth/register" style={styles.btnPrimary}>
            Crear una cuenta nueva
          </Link>
        </div>
      </div>
    );
  }

  if (info.status === "claimed") {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.logo}><HubentsMark size={32} /></div>
          <div style={{ ...styles.iconWrap, background: "#ecfdf5", color: "#10b981" }}>
            <CheckCircle size={28} />
          </div>
          <h1 style={styles.title}>Perfil ya reclamado</h1>
          <p style={styles.subtitle}>
            El perfil de <strong>{info.providerName}</strong> ya ha sido verificado
            por su propietario.
          </p>
          <Link href="/auth/login" style={styles.btnPrimary}>
            Iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  if (info.status === "expired") {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.logo}><HubentsMark size={32} /></div>
          <div style={{ ...styles.iconWrap, background: "#fff7ed", color: "#f97316" }}>
            <Clock size={28} />
          </div>
          <h1 style={styles.title}>Enlace expirado</h1>
          <p style={styles.subtitle}>
            El enlace para reclamar el perfil de <strong>{info.providerName}</strong> ha expirado.
            Contacta con la empresa que te lo envió para que genere uno nuevo.
          </p>
        </div>
      </div>
    );
  }

  // status === "pending"
  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}><HubentsMark size={32} /></div>

        <div style={{ ...styles.iconWrap, background: "#f0fdf4", color: "#16a34a" }}>
          <Building2 size={28} />
        </div>

        <h1 style={styles.title}>Tu empresa está en Hubents</h1>

        <div style={styles.companyBox}>
          <div style={styles.companyName}>{info.providerName}</div>
          {info.plannerOrgName && (
            <div style={styles.companyMeta}>
              Añadida por <strong>{info.plannerOrgName}</strong>
              {info.plannerOrgCity ? ` · ${info.plannerOrgCity}` : ""}
            </div>
          )}
        </div>

        <p style={styles.subtitle}>
          El perfil de tu empresa ya es visible en el directorio de proveedores.
          Reclámalo para verificarlo, recibir oportunidades de negocio y gestionar
          todo desde tu panel.
        </p>

        <div style={styles.benefitsList}>
          {[
            "Verificación de empresa · más visibilidad",
            "Invitaciones directas de organizadores de eventos",
            "Gestión de presupuestos, tareas y pagos",
            "Acceso gratuito — sin tarjeta de crédito",
          ].map((b) => (
            <div key={b} style={styles.benefitItem}>
              <Sparkles size={13} style={{ color: "#10b981", flexShrink: 0 }} />
              <span>{b}</span>
            </div>
          ))}
        </div>

        <button onClick={handleRegister} style={styles.btnPrimary}>
          Crear cuenta y reclamar perfil
          <ArrowRight size={14} />
        </button>

        <button onClick={handleLogin} style={styles.btnSecondary}>
          Ya tengo cuenta — iniciar sesión
        </button>

        <p style={styles.footer}>
          ¿No reconoces este perfil?{" "}
          <Link href="/" style={{ color: "#6b7280" }}>
            Ignorar
          </Link>
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: "100vh",
    background: "#f9fafb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 16px",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
  },
  card: {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: 12,
    padding: "40px 36px",
    width: "100%",
    maxWidth: 440,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 16,
  },
  logo: {
    color: "#111827",
    marginBottom: 4,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  title: {
    margin: 0,
    fontSize: 22,
    fontWeight: 700,
    color: "#111827",
    textAlign: "center",
    letterSpacing: "-0.02em",
  },
  subtitle: {
    margin: 0,
    fontSize: 14,
    color: "#6b7280",
    textAlign: "center",
    lineHeight: 1.6,
  },
  companyBox: {
    width: "100%",
    background: "#f9fafb",
    border: "1px solid #e5e7eb",
    borderRadius: 8,
    padding: "14px 18px",
    textAlign: "center",
  },
  companyName: {
    fontSize: 18,
    fontWeight: 700,
    color: "#111827",
    marginBottom: 4,
  },
  companyMeta: {
    fontSize: 13,
    color: "#6b7280",
  },
  benefitsList: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    gap: 8,
  },
  benefitItem: {
    display: "flex",
    alignItems: "flex-start",
    gap: 8,
    fontSize: 13,
    color: "#374151",
    lineHeight: 1.4,
  },
  btnPrimary: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    width: "100%",
    padding: "12px 20px",
    background: "#111827",
    color: "#ffffff",
    border: "none",
    borderRadius: 7,
    fontSize: 14,
    fontWeight: 600,
    cursor: "pointer",
    textDecoration: "none",
    marginTop: 4,
  },
  btnSecondary: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    padding: "11px 20px",
    background: "transparent",
    color: "#374151",
    border: "1px solid #e5e7eb",
    borderRadius: 7,
    fontSize: 14,
    fontWeight: 500,
    cursor: "pointer",
  },
  footer: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
    margin: 0,
  },
};
