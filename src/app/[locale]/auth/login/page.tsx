"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff, Info, Lock, Mail, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { AuthHero, HubentsMark, GoogleIcon } from "../_components/auth-shell";

function LoginContent() {
  const t = useTranslations("auth");
  const tLogin = useTranslations("auth.login");
  const tFooter = useTranslations("auth.footer");

  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";
  const errorParam = searchParams.get("error");
  const claimToken = searchParams.get("claim") || "";

  const [mode, setMode] = useState<"password" | "magic">("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [magicLinkSent, setMagicLinkSent] = useState(false);
  const [error, setError] = useState(
    errorParam
      ? tLogin(`errors.${errorParam}` as Parameters<typeof tLogin>[0]) || tLogin("errors.Default")
      : ""
  );

  const validEmail = /^\S+@\S+\.\S+$/.test(email);
  const valid = mode === "password" ? validEmail && password.length >= 6 : validEmail;

  // After successful login: complete an explicit claim token, or auto-detect
  // pending claims by email/domain and redirect to the claim landing page.
  const SEEN_CLAIMS_KEY = "hubents-seen-claims";

  const getSeenClaims = (): string[] => {
    try { return JSON.parse(localStorage.getItem(SEEN_CLAIMS_KEY) || "[]"); } catch { return []; }
  };

  const markClaimSeen = (token: string) => {
    try {
      const seen = getSeenClaims();
      if (!seen.includes(token)) {
        localStorage.setItem(SEEN_CLAIMS_KEY, JSON.stringify([...seen, token].slice(-50)));
      }
    } catch { /* non-critical */ }
  };

  const checkAndRedirectClaim = async (loggedEmail: string): Promise<string> => {
    if (claimToken) {
      try {
        await fetch(`/api/claim/${claimToken}`, { method: "POST" });
      } catch { /* non-critical */ }
      return "/onboarding?welcome=true&claimed=1";
    }
    try {
      const res = await fetch(`/api/claim/check?email=${encodeURIComponent(loggedEmail)}`);
      const d = await res.json();
      if (d.success && d.data?.length > 0) {
        const seen = getSeenClaims();
        const unseen = (d.data as { token: string }[]).find((c) => !seen.includes(c.token));
        if (unseen) {
          markClaimSeen(unseen.token);
          return `/claim/${unseen.token}`;
        }
      }
    } catch { /* non-critical */ }
    return callbackUrl;
  };

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
        const key = `errors.${result.error}` as Parameters<typeof tLogin>[0];
        setError(tLogin(key) || result.error);
      } else if (result?.ok) {
        const dest = await checkAndRedirectClaim(email.toLowerCase());
        router.push(dest);
        router.refresh();
      }
    } catch {
      setError(tLogin("errors.loginFailed"));
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
          setError(tLogin("errors.magicLinkConfigError"));
        } else {
          setError(tLogin("errors.magicLinkFailed"));
        }
      } else {
        setMagicLinkSent(true);
      }
    } catch {
      setError(tLogin("errors.magicLinkFailed"));
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
              <span className="auth-brand__name">{t("brand")}</span>
            </div>
            <div className="auth-form-card">
              <div className="auth-success-icon"><Sparkles size={20} /></div>
              <h2 className="auth-h2">{tLogin("magicSentTitle")}</h2>
              <p className="auth-subtitle">
                {tLogin("magicSentSubtitlePre")} <strong>{email}</strong>{tLogin("magicSentSubtitlePost")}
              </p>
              <button
                type="button"
                onClick={() => setMagicLinkSent(false)}
                className="auth-btn-primary"
                style={{ background: "transparent", color: "var(--ink-1)", border: "1px solid var(--line-strong)" }}
              >
                {tLogin("backToLogin")}
              </button>
              <div className="auth-footer-text">
                {tLogin("magicNotReceived")}{" "}
                <button type="button" onClick={() => setMagicLinkSent(false)} className="auth-link">
                  {tLogin("tryPassword")}
                </button>
              </div>
            </div>
            <div className="auth-footer-meta">
              <Link href="/terms">{tFooter("terms")}</Link>
              <span className="sep">·</span>
              <Link href="/privacy">{tFooter("privacy")}</Link>
              <span className="sep">·</span>
              <a href="mailto:hello@hubents.com">{tFooter("contact")}</a>
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
            <span className="auth-brand__name">{t("brand")}</span>
          </div>

          <div className="auth-form-card">
            <form onSubmit={mode === "magic" ? handleMagicLink : handlePasswordLogin}>
              <h2 className="auth-h2">
                {mode === "magic" ? tLogin("titleMagic") : tLogin("title")}
              </h2>
              <p className="auth-subtitle">
                {mode === "magic" ? tLogin("subtitleMagic") : tLogin("subtitle")}
              </p>

              <button
                type="button"
                onClick={handleGoogleLogin}
                className="auth-btn-social"
              >
                <GoogleIcon />
                {tLogin("continueGoogle")}
              </button>

              <div className="auth-divider">
                <span className="auth-divider__label">{tLogin("dividerEmail")}</span>
              </div>

              <div className="auth-tabs">
                <button
                  type="button"
                  onClick={() => setMode("password")}
                  className={`auth-tab ${mode === "password" ? "auth-tab--active" : ""}`}
                >
                  <Lock size={11} /> {tLogin("tabPassword")}
                </button>
                <button
                  type="button"
                  onClick={() => setMode("magic")}
                  className={`auth-tab ${mode === "magic" ? "auth-tab--active" : ""}`}
                >
                  <Sparkles size={11} /> {tLogin("tabMagic")}
                </button>
              </div>

              <div className="auth-field">
                <div className="auth-field__label-row">
                  <label className="auth-field__label" htmlFor="email">{tLogin("emailLabel")}</label>
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={tLogin("emailPlaceholder")}
                  autoComplete="email"
                  autoFocus
                  required
                />
              </div>

              {mode === "password" && (
                <div className="auth-field">
                  <div className="auth-field__label-row">
                    <label className="auth-field__label" htmlFor="password">{tLogin("passwordLabel")}</label>
                    <Link href="/auth/forgot-password" className="auth-link--field">
                      {tLogin("forgotPassword")}
                    </Link>
                  </div>
                  <div className="auth-pwd">
                    <input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={tLogin("passwordPlaceholder")}
                      autoComplete="current-password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="auth-pwd__toggle"
                      aria-label={showPassword ? tLogin("hidePassword") : tLogin("showPassword")}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              )}

              {mode === "magic" && (
                <div className="auth-info">
                  <Info size={13} className="auth-info-icon" />
                  <span>{tLogin("magicInfo")}</span>
                </div>
              )}

              {mode === "password" && (
                <label className="auth-checkbox-row">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                  />
                  {tLogin("rememberMe")}
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
                  ? mode === "magic" ? tLogin("loadingMagic") : tLogin("loadingPassword")
                  : mode === "magic" ? tLogin("submitMagic") : tLogin("submitPassword")}
              </button>

              <div className="auth-footer-text">
                {tLogin("noAccount")}{" "}
                <Link href="/auth/register" className="auth-link">
                  {tLogin("createAccount")}
                </Link>
              </div>
            </form>
          </div>

          <div className="auth-footer-meta">
            <Link href="/terms">{tFooter("terms")}</Link>
            <span className="sep">·</span>
            <Link href="/privacy">{tFooter("privacy")}</Link>
            <span className="sep">·</span>
            <a href="mailto:hello@hubents.com">{tFooter("contact")}</a>
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
