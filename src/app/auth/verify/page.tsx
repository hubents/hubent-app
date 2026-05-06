import Link from "next/link";
import { Mail } from "lucide-react";
import { AuthShell } from "../_components/auth-shell";

export default function VerifyPage() {
  return (
    <AuthShell>
      <div className="auth-success-icon"><Mail size={22} /></div>
      <h2 className="auth-h2">Revisa tu email</h2>
      <p className="auth-subtitle">
        Te enviamos un link de acceso a tu correo electrónico. Haz clic en el link
        para iniciar sesión. Caduca en 24 horas.
      </p>

      <div className="auth-info">
        <span>
          Si no lo ves, revisa tu carpeta de spam. El email puede tardar hasta un
          minuto en llegar.
        </span>
      </div>

      <Link
        href="/auth/login"
        className="auth-btn-social"
        style={{ textDecoration: "none" }}
      >
        Volver al login
      </Link>
    </AuthShell>
  );
}
