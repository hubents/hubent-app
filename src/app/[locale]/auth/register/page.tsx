"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, CalendarRange, Eye, EyeOff, Loader2, Store, Sparkles } from "lucide-react";
import { AuthShell, GoogleIcon } from "../_components/auth-shell";
import { Suspense } from "react";
import { useTranslations } from "next-intl";

type OrgType = "tenant" | "provider";

function RegisterContent() {
  const t = useTranslations("auth.register");

  const router = useRouter();
  const searchParams = useSearchParams();
  const claimToken = searchParams.get("claim") || "";
  const orgTypeParam = searchParams.get("orgType") as OrgType | null;

  const [step, setStep] = useState<1 | 2>(1);
  const [orgType, setOrgType] = useState<OrgType>(orgTypeParam === "provider" ? "provider" : "tenant");
  const [showPassword, setShowPassword] = useState(false);
  const [terms, setTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [claimInfo, setClaimInfo] = useState<{ providerName: string; plannerOrgName?: string | null } | null>(null);

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    companyName: "",
  });

  // Load claim info if token present
  useEffect(() => {
    if (!claimToken) return;
    fetch(`/api/claim/${claimToken}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data.status === "pending") {
          setClaimInfo({ providerName: d.data.providerName, plannerOrgName: d.data.plannerOrgName });
          setOrgType("provider");
          setForm((f) => ({ ...f, companyName: d.data.providerName }));
        }
      })
      .catch(() => {});
  }, [claimToken]);

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

    // 1) Crear cuenta. Si esto falla, paramos y mostramos el error.
    let registered = false;
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, orgType }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          (typeof data.error === "string" && data.error) ||
          (typeof data?.error?.message === "string" && data.error.message) ||
          t("errors.createFailed");
        setError(msg);
        return;
      }
      registered = true;
    } catch (err) {
      console.error("register: API error", err);
      setError(t("errors.createFailedRetry"));
      return;
    } finally {
      if (!registered) setLoading(false);
    }

    // 2) La cuenta está creada — pase lo que pase ahora, NO debemos
    //    quedarnos en /auth/register. Auto-login best-effort, y luego
    //    redirigir SIEMPRE (a /onboarding si logueó, a /auth/login si no).
    let signedIn = false;
    try {
      const { signIn } = await import("next-auth/react");
      const loginResult = await signIn("credentials", {
        email: form.email.toLowerCase(),
        password: form.password,
        redirect: false,
      });
      signedIn = !!loginResult?.ok;
    } catch (err) {
      console.error("register: auto-login error", err);
    }

    // 3) If there's a claim token, complete the claim before redirecting
    if (signedIn && claimToken) {
      try {
        await fetch(`/api/claim/${claimToken}`, { method: "POST" });
      } catch {
        // non-critical, ignore
      }
    }

    // 4) Redirigir siempre. router.refresh() para que NextAuth
    //    reconozca el cookie nuevo en el primer render del destino.
    if (signedIn) {
      router.push(claimToken ? "/onboarding?welcome=true&claimed=1" : "/onboarding?welcome=true");
    } else {
      router.push("/auth/login");
    }
    router.refresh();
  };

  const handleGoogleSignUp = async () => {
    const { signIn } = await import("next-auth/react");
    signIn("google", { callbackUrl: `/onboarding?welcome=true&orgType=${orgType}` });
  };

  if (step === 2) {
    return (
      <AuthShell>
        <form onSubmit={handleSubmit}>
          {claimInfo ? (
            <>
              <h2 className="auth-h2">{t("claimTitle")}</h2>
              <div className="auth-info" style={{ background: "#f0fdf4", borderColor: "#bbf7d0", marginBottom: 16 }}>
                <Sparkles size={13} style={{ color: "#16a34a", flexShrink: 0, marginRight: 6 }} />
                <span style={{ color: "#15803d" }}>
                  {claimInfo.plannerOrgName
                    ? t("claimInfoWithPlanner", { providerName: claimInfo.providerName, plannerOrgName: claimInfo.plannerOrgName })
                    : t("claimInfoNoPlanner", { providerName: claimInfo.providerName })}
                </span>
              </div>
            </>
          ) : (
            <>
              <h2 className="auth-h2">{t("step2Title")}</h2>
              <p className="auth-subtitle">{t("step2Subtitle")}</p>
            </>
          )}

          <div className="auth-field">
            <div className="auth-field__label-row">
              <label className="auth-field__label" htmlFor="companyName">
                {isProvider ? t("companyNameLabelProvider") : t("companyNameLabelTenant")}
              </label>
            </div>
            <input
              id="companyName"
              type="text"
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              placeholder={isProvider ? t("companyNamePlaceholderProvider") : t("companyNamePlaceholderTenant")}
              autoFocus
              required
            />
            <div className="auth-field__hint">
              {t("companyNameHint")}
            </div>
          </div>

          <div className="auth-info">
            <span>
              {isProvider ? t("planProvider") : t("planTenant")}
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
              {t("backButton")}
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
                ? t("loading")
                : isProvider
                  ? t("submitProvider")
                  : t("submitTenant")}
            </button>
          </div>

          <div className="auth-footer-text">
            {t("hasAccount")}{" "}
            <Link href="/auth/login" className="auth-link">
              {t("loginLink")}
            </Link>
          </div>
        </form>
      </AuthShell>
    );
  }

  return (
    <AuthShell>
      <form onSubmit={handleContinue}>
        <h2 className="auth-h2">{t("step1Title")}</h2>
        <p className="auth-subtitle">{t("step1Subtitle")}</p>

        <div className="auth-field">
          <div className="auth-field__label-row">
            <span className="auth-field__label">{t("accountTypeLabel")}</span>
          </div>
          <div className="auth-roles">
            <button
              type="button"
              onClick={() => setOrgType("tenant")}
              className={`auth-role-card ${orgType === "tenant" ? "auth-role-card--active" : ""}`}
            >
              <div className="auth-role-card__icon"><CalendarRange size={20} /></div>
              <div className="auth-role-card__title">{t("roleTenantTitle")}</div>
              <div className="auth-role-card__desc">{t("roleTenantDesc")}</div>
            </button>
            <button
              type="button"
              onClick={() => setOrgType("provider")}
              className={`auth-role-card ${orgType === "provider" ? "auth-role-card--active" : ""}`}
            >
              <div className="auth-role-card__icon"><Store size={20} /></div>
              <div className="auth-role-card__title">{t("roleProviderTitle")}</div>
              <div className="auth-role-card__desc">{t("roleProviderDesc")}</div>
            </button>
          </div>
        </div>

        <div className="auth-field">
          <div className="auth-field__label-row">
            <label className="auth-field__label" htmlFor="name">{t("nameLabel")}</label>
          </div>
          <input
            id="name"
            type="text"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder={t("namePlaceholder")}
            autoComplete="name"
            required
          />
        </div>

        <div className="auth-field">
          <div className="auth-field__label-row">
            <label className="auth-field__label" htmlFor="email">{t("emailLabel")}</label>
          </div>
          <input
            id="email"
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            placeholder={t("emailPlaceholder")}
            autoComplete="email"
            required
          />
        </div>

        <div className="auth-field">
          <div className="auth-field__label-row">
            <label className="auth-field__label" htmlFor="password">{t("passwordLabel")}</label>
          </div>
          <div className="auth-pwd">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              placeholder={t("passwordPlaceholder")}
              autoComplete="new-password"
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
            value={form.confirmPassword}
            onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
            placeholder={t("confirmPasswordPlaceholder")}
            autoComplete="new-password"
            required
          />
          {form.confirmPassword.length > 0 && !pwdMatch && (
            <div className="auth-field__hint auth-field__hint--err">
              {t("passwordMismatch")}
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
            {t("termsAccept")}{" "}
            <Link href="/terms" className="auth-link">{t("termsLink")}</Link>{" "}
            {t("termsAnd")}{" "}
            <Link href="/privacy" className="auth-link">{t("privacyLink")}</Link>
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
          {t("continueButton")}
          <ArrowRight size={14} />
        </button>

        <div className="auth-divider">
          <span className="auth-divider__label">{t("dividerOr")}</span>
        </div>

        <button
          type="button"
          onClick={handleGoogleSignUp}
          className="auth-btn-social"
        >
          <GoogleIcon /> {t("googleButton")}
        </button>

        <div className="auth-footer-text">
          {t("hasAccount")}{" "}
          <Link href="/auth/login" className="auth-link">
            {t("loginLink")}
          </Link>
        </div>
      </form>
    </AuthShell>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterContent />
    </Suspense>
  );
}
