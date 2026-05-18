import Link from "next/link";
import { Mail } from "lucide-react";
import { AuthShell } from "../_components/auth-shell";
import { getTranslations } from "next-intl/server";

export default async function VerifyPage() {
  const t = await getTranslations("auth.verify");

  return (
    <AuthShell>
      <div className="auth-success-icon"><Mail size={22} /></div>
      <h2 className="auth-h2">{t("title")}</h2>
      <p className="auth-subtitle">{t("subtitle")}</p>

      <div className="auth-info">
        <span>{t("spamInfo")}</span>
      </div>

      <Link
        href="/auth/login"
        className="auth-btn-social"
        style={{ textDecoration: "none" }}
      >
        {t("backToLogin")}
      </Link>
    </AuthShell>
  );
}
