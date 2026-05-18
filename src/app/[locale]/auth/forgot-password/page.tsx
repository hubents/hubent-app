"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Mail } from "lucide-react";
import { AuthShell } from "../_components/auth-shell";
import { useTranslations } from "next-intl";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth.forgotPassword");

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
        throw new Error(data.error || t("errors.sendFailed"));
      }

      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.sendFailed"));
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <AuthShell>
        <div className="auth-success-icon"><Mail size={20} /></div>
        <h2 className="auth-h2">{t("sentTitle")}</h2>
        <p className="auth-subtitle">
          {t("sentSubtitlePre")} <strong>{email}</strong>{t("sentSubtitlePost")}
        </p>
        <Link href="/auth/login" className="auth-btn-social" style={{ textDecoration: "none" }}>
          {t("backToLogin")}
        </Link>
        <div className="auth-footer-text">
          {t("notReceived")}{" "}
          <button type="button" onClick={() => setSent(false)} className="auth-link">
            {t("tryOtherEmail")}
          </button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <form onSubmit={handleSubmit}>
        <h2 className="auth-h2">{t("title")}</h2>
        <p className="auth-subtitle">{t("subtitle")}</p>

        <div className="auth-field">
          <div className="auth-field__label-row">
            <label className="auth-field__label" htmlFor="email">{t("emailLabel")}</label>
          </div>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t("emailPlaceholder")}
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
          {loading ? t("loading") : t("submitButton")}
        </button>

        <div className="auth-footer-text">
          {t("rememberPassword")}{" "}
          <Link href="/auth/login" className="auth-link">
            {t("backToLogin")}
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}
