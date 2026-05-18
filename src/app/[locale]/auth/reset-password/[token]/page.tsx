"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, Eye, EyeOff, Loader2 } from "lucide-react";
import { AuthShell } from "../../_components/auth-shell";
import { useTranslations } from "next-intl";

export default function ResetPasswordPage() {
  const t = useTranslations("auth.resetPassword");

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
      if (!res.ok) throw new Error(data.error || t("errors.resetFailed"));

      setSuccess(true);
      setTimeout(() => router.push("/auth/login"), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("errors.resetFailed"));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <AuthShell>
        <div className="auth-success-icon"><CheckCircle2 size={22} /></div>
        <h2 className="auth-h2">{t("successTitle")}</h2>
        <p className="auth-subtitle">{t("successSubtitle")}</p>
        <Link
          href="/auth/login"
          className="auth-btn-primary"
          style={{ textDecoration: "none", display: "inline-flex" }}
        >
          {t("goToLogin")}
        </Link>
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
            <label className="auth-field__label" htmlFor="password">{t("passwordLabel")}</label>
          </div>
          <div className="auth-pwd">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={t("passwordPlaceholder")}
              autoComplete="new-password"
              autoFocus
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="auth-pwd__toggle"
              aria-label={showPassword ? t("hidePassword") : t("showPassword")}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="auth-field__hint">{t("passwordHint")}</div>
        </div>

        <div className="auth-field">
          <div className="auth-field__label-row">
            <label className="auth-field__label" htmlFor="confirmPassword">
              {t("confirmPasswordLabel")}
            </label>
          </div>
          <input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder={t("confirmPasswordPlaceholder")}
            autoComplete="new-password"
            required
          />
          {confirmPassword.length > 0 && !pwdMatch && (
            <div className="auth-field__hint auth-field__hint--err">
              {t("passwordMismatch")}
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
          {loading ? t("loading") : t("submitButton")}
        </button>
      </form>
    </AuthShell>
  );
}
