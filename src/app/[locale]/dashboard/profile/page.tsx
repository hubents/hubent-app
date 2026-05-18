"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserEdit01Icon,
  LockKeyIcon,
  ViewOffIcon,
  UserCircleIcon,
} from "@hugeicons/core-free-icons";
import { useSession } from "next-auth/react";

// ── Design primitives ─────────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  border: "1px solid var(--line-2)",
  borderRadius: "var(--r-sm)",
  padding: "7px 10px",
  fontSize: 13,
  color: "var(--ink-1)",
  background: "var(--bg-panel)",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-2)", display: "block", marginBottom: 4 }}>
      {children}
    </label>
  );
}

function SectionCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ComponentProps<typeof HugeiconsIcon>["icon"];
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ background: "var(--bg-panel)", border: "1px solid var(--line-1)", borderRadius: "var(--r-md)", padding: 18 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 18 }}>
        <div style={{ width: 32, height: 32, background: "var(--bg-subtle)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--color-brand)", flexShrink: 0 }}>
          <HugeiconsIcon icon={icon} size={15} strokeWidth={1.5} />
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-1)" }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{subtitle}</div>}
        </div>
      </div>
      {children}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const t = useTranslations("userProfile");
  const { data: session, update: updateSession } = useSession();

  // Personal data state
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [image, setImage] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [savingProfile, setSavingProfile] = useState(false);

  // Security state
  const [currentPwd, setCurrentPwd] = useState("");
  const [newPwd, setNewPwd] = useState("");
  const [confirmPwd, setConfirmPwd] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  useEffect(() => {
    fetch("/api/user/profile")
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setName(res.data.user.name || "");
          setEmail(res.data.user.email || "");
          setImage(res.data.user.image || "");
        }
      })
      .catch(() => {})
      .finally(() => setLoadingProfile(false));
  }, []);

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, image }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(t("profileUpdated"));
        await updateSession({ name, image: image || null });
      } else {
        toast.error(data.error?.message || t("saveError"));
      }
    } catch {
      toast.error(t("connectionError"));
    } finally {
      setSavingProfile(false);
    }
  };

  const handleChangePassword = async () => {
    if (newPwd !== confirmPwd) {
      toast.error(t("passwordMismatch"));
      return;
    }
    if (newPwd.length < 8) {
      toast.error(t("passwordTooShort"));
      return;
    }
    setSavingPwd(true);
    try {
      const res = await fetch("/api/user/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(t("passwordUpdated"));
        setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
      } else {
        toast.error(data.error?.message || t("changePasswordError"));
      }
    } catch {
      toast.error(t("connectionError"));
    } finally {
      setSavingPwd(false);
    }
  };

  // Avatar initials fallback
  const initials = (name || email || "?")
    .split(" ").map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";

  if (loadingProfile) {
    return (
      <div style={{ maxWidth: 820 }}>
        <div style={{ height: 52, borderRadius: "var(--r-sm)", background: "var(--bg-subtle)", marginBottom: 24, animation: "pulse 1.5s ease-in-out infinite" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[220, 240].map((h, i) => (
            <div key={i} style={{ height: h, borderRadius: "var(--r-md)", background: "var(--bg-subtle)", animation: "pulse 1.5s ease-in-out infinite" }} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 820 }}>

      {/* Page header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 22, fontWeight: 600, margin: "0 0 4px", color: "var(--ink-1)" }}>{t("pageTitle")}</h1>
        <div style={{ fontSize: 13, color: "var(--ink-3)" }}>{t("pageSubtitle")}</div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Datos personales */}
      <SectionCard icon={UserEdit01Icon} title={t("personalData")} subtitle={t("personalDataSubtitle")}>

        {/* Avatar preview + image URL */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
          <div style={{ width: 56, height: 56, borderRadius: "50%", flexShrink: 0, overflow: "hidden", background: "var(--ink-1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            {image
              ? <img src={image} alt={name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
              : <span style={{ fontSize: 18, fontWeight: 700, color: "white" }}>{initials}</span>
            }
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <FieldLabel>{t("photoUrl")}</FieldLabel>
            <input
              style={inp}
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://..."
              type="url"
            />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div style={{ gridColumn: "1/-1" }}>
            <FieldLabel>{t("fullName")}</FieldLabel>
            <input style={inp} value={name} onChange={(e) => setName(e.target.value)} placeholder={t("namePlaceholder")} />
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <FieldLabel>{t("email")}</FieldLabel>
            <input
              style={{ ...inp, background: "var(--bg-subtle)", color: "var(--ink-3)", cursor: "not-allowed" }}
              value={email}
              readOnly
              title={t("emailReadonlyTitle")}
            />
            <div style={{ fontSize: 11, color: "var(--ink-4)", marginTop: 4 }}>
              {t("emailReadonlyHint")}
            </div>
          </div>
        </div>

        <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
          <button
            style={{ padding: "7px 16px", borderRadius: "var(--r-sm)", border: "none", background: "var(--color-brand)", color: "white", fontSize: 13, fontWeight: 600, cursor: savingProfile ? "not-allowed" : "pointer", opacity: savingProfile ? 0.7 : 1, fontFamily: "inherit" }}
            onClick={handleSaveProfile}
            disabled={savingProfile}
          >
            {savingProfile ? t("saving") : t("saveChanges")}
          </button>
        </div>
      </SectionCard>

      {/* Seguridad */}
      <SectionCard icon={LockKeyIcon} title={t("security")} subtitle={t("securitySubtitle")}>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <FieldLabel>{t("currentPassword")}</FieldLabel>
            <div style={{ position: "relative" }}>
              <input
                style={{ ...inp, paddingRight: 36 }}
                type={showCurrent ? "text" : "password"}
                value={currentPwd}
                onChange={(e) => setCurrentPwd(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                onClick={() => setShowCurrent((v) => !v)}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", lineHeight: 0, padding: 0 }}
                type="button"
              >
                <HugeiconsIcon icon={ViewOffIcon} size={14} strokeWidth={1.5} />
              </button>
            </div>
          </div>
          <div>
            <FieldLabel>{t("newPassword")}</FieldLabel>
            <div style={{ position: "relative" }}>
              <input
                style={{ ...inp, paddingRight: 36 }}
                type={showNew ? "text" : "password"}
                value={newPwd}
                onChange={(e) => setNewPwd(e.target.value)}
                placeholder={t("newPasswordPlaceholder")}
                autoComplete="new-password"
              />
              <button
                onClick={() => setShowNew((v) => !v)}
                style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", lineHeight: 0, padding: 0 }}
                type="button"
              >
                <HugeiconsIcon icon={ViewOffIcon} size={14} strokeWidth={1.5} />
              </button>
            </div>
          </div>
          <div>
            <FieldLabel>{t("confirmPassword")}</FieldLabel>
            <input
              style={{ ...inp, borderColor: confirmPwd && confirmPwd !== newPwd ? "#FECACA" : undefined }}
              type="password"
              value={confirmPwd}
              onChange={(e) => setConfirmPwd(e.target.value)}
              placeholder={t("confirmPasswordPlaceholder")}
              autoComplete="new-password"
            />
            {confirmPwd && confirmPwd !== newPwd && (
              <div style={{ fontSize: 11, color: "#B91C1C", marginTop: 4 }}>{t("passwordMismatch")}</div>
            )}
          </div>
        </div>

        <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
          <button
            style={{ padding: "7px 16px", borderRadius: "var(--r-sm)", border: "none", background: "var(--color-brand)", color: "white", fontSize: 13, fontWeight: 600, cursor: (savingPwd || !currentPwd || !newPwd) ? "not-allowed" : "pointer", opacity: (savingPwd || !currentPwd || !newPwd) ? 0.5 : 1, fontFamily: "inherit" }}
            onClick={handleChangePassword}
            disabled={savingPwd || !currentPwd || !newPwd}
          >
            {savingPwd ? t("saving") : t("changePassword")}
          </button>
        </div>
      </SectionCard>

      </div>
    </div>
  );
}
