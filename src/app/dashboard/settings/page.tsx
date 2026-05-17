"use client";

import { Suspense, useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { useUserSession } from "@/hooks/use-user-session";
import { useTeam } from "@/hooks/use-team";
import { useRoles } from "@/hooks/use-roles";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  TIMEZONES, CURRENCIES, LANGUAGES, DATE_FORMATS, DEFAULT_LOCALE_SETTINGS, TIMEZONE_DEFAULTS,
  PHONE_PREFIXES, COUNTRIES,
} from "@/lib/constants/locale";
import type { OrgLocaleSettings } from "@/lib/constants/locale";
import { useOrgLocale } from "@/hooks/use-org-locale";
import { cn } from "@/lib/utils";
import { TimezoneCombobox } from "@/components/ui/timezone-combobox";
import { invalidateOrgLocaleCache } from "@/hooks/use-org-locale";
import { hgIcon } from "@/components/ui/hg-icon";
import { Alert01Icon, ListViewIcon, Upload01Icon, Image01Icon, Tick01Icon, LinkSquare01Icon, Mail01Icon } from "@hugeicons/core-free-icons";
import { Av } from "@/components/ui/ds";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";

const RiAlertLine = hgIcon(Alert01Icon);
const RiFileList3Line = hgIcon(ListViewIcon);
const RiUploadLine = hgIcon(Upload01Icon);
const RiImageLine = hgIcon(Image01Icon);
const RiCheckLine = hgIcon(Tick01Icon);
const RiExternalLinkLine = hgIcon(LinkSquare01Icon);
const RiMailLine = hgIcon(Mail01Icon);

// ── Types ─────────────────────────────────────────────────────────────────────
interface ProfileData {
  user: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
    phone: string | null;
  };
  organization: {
    id: number;
    name: string;
    slug: string;
    logo: string | null;
    website: string | null;
    address: string | null;
    phone: string | null;
    fiscalName: string | null;
    taxId: string | null;
    fiscalAddress: string | null;
    fiscalCity: string | null;
    fiscalPostalCode: string | null;
    fiscalCountry: string | null;
    fiscalEmail: string | null;
    fiscalPhone: string | null;
    invoiceLogo: string | null;
  } | null;
}

interface BillingData {
  plan: {
    id: number; name: string; slug: string; features: string[];
    priceMonthly: string; priceYearly: string; currency: string;
    limits: { maxUsers: number; maxEvents: number; maxStorage: number };
    trialDays: number;
  } | null;
  subscription: {
    id: number; status: string; trialEndsAt: string | null;
    currentPeriodEnd: string | null; cancelAt: string | null;
    presentmentCurrency: string | null; hasStripeSubscription: boolean;
  } | null;
  usage: { users: number; events: number; storage: number };
  availablePlans: {
    id: number; name: string; slug: string; description: string | null;
    priceMonthly: string; priceYearly: string; currency: string;
    features: string[]; limits: { maxUsers: number; maxEvents: number; maxStorage: number };
    highlighted: boolean; stripePriceIdMonthly: string | null; stripePriceIdYearly: string | null;
  }[];
  invoices: {
    id: number; amount: string; currency: string; status: string;
    paidAt: string | null; pdfUrl: string | null;
    presentmentAmount: string | null; presentmentCurrency: string | null;
    period: string | null; createdAt: string | null;
  }[];
}

// ── Design primitives ─────────────────────────────────────────────────────────
const fsInput: React.CSSProperties = {
  width: "100%", padding: "8px 10px",
  border: "1px solid var(--line-strong)", borderRadius: "var(--r-sm)",
  fontSize: 13, fontFamily: "inherit", background: "white", color: "var(--ink-1)",
  outline: "none", boxSizing: "border-box",
};

function FSCard({
  title, subtitle, action, children, id,
}: {
  title: string; subtitle?: string; action?: React.ReactNode;
  children: React.ReactNode; id?: string;
}) {
  return (
    <div id={id} style={{
      background: "var(--bg-panel)", border: "1px solid var(--line-1)",
      borderRadius: "var(--r-md)", padding: 18,
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 14 }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-1)" }}>{title}</div>
          {subtitle && <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 3 }}>{subtitle}</div>}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

function FSRow({ children, cols = 2 }: { children: React.ReactNode; cols?: number }) {
  return (
    <div style={{
      display: "grid", gridTemplateColumns: `repeat(${cols}, 1fr)`,
      gap: 14, marginBottom: 14,
    }}>{children}</div>
  );
}

function FSField({ label, hint, children }: { label: React.ReactNode; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-2)", marginBottom: 6 }}>
        {label}
        {hint && <span style={{ fontWeight: 400, color: "var(--ink-3)", marginLeft: 5 }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function SaveBtn({ saving, label = "Guardar cambios", onClick }: { saving: boolean; label?: string; onClick: () => void }) {
  return (
    <button onClick={onClick} disabled={saving} style={{
      padding: "8px 16px", fontSize: 12.5, fontWeight: 600,
      cursor: saving ? "not-allowed" : "pointer",
      background: saving ? "var(--bg-subtle)" : "var(--color-brand, #1A1A1A)",
      color: saving ? "var(--ink-3)" : "white",
      border: "none", borderRadius: "var(--r-sm)", transition: "background .15s",
    }}>
      {saving ? "Guardando…" : label}
    </button>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(d: Date | string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

// ── Tabs ──────────────────────────────────────────────────────────────────────
const TABS = [
  { id: "workspace",   label: "Espacio de trabajo", hint: "Identidad, idioma y suscripción" },
  { id: "team",        label: "Equipo y permisos",  hint: "Miembros, invitaciones y roles" },
  { id: "preferences", label: "Preferencias",       hint: "Apariencia, notificaciones e integraciones" },
];

// ══════════════════════════════════════════════════════════════════════════════
// Main component
// ══════════════════════════════════════════════════════════════════════════════
function SettingsPageContent() {
  const searchParams = useSearchParams();

  const [activeTab, setActiveTab] = useState("workspace");
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      const r = await fetch("/api/user/profile");
      const d = await r.json();
      if (d.success) setProfile(d.data);
    } catch { /* ignore */ } finally { setProfileLoading(false); }
  }, []);

  useEffect(() => { loadProfile(); }, [loadProfile]);

  const active = TABS.find(t => t.id === activeTab);

  return (
    <div style={{ maxWidth: 820 }}>
      {/* Tab bar */}
      <div style={{ display: "flex", borderBottom: "1px solid var(--line-1)", marginBottom: 6 }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            aria-selected={activeTab === t.id}
            style={{
              padding: "10px 16px", fontSize: 13.5, background: "transparent",
              border: "none", cursor: "pointer", marginBottom: -1, transition: "color .15s",
              fontWeight: activeTab === t.id ? 600 : 500,
              color: activeTab === t.id ? "var(--ink-1)" : "var(--ink-3)",
              borderBottom: `2px solid ${activeTab === t.id ? "var(--ink-1)" : "transparent"}`,
            }}
          >{t.label}</button>
        ))}
      </div>
      {active && <div style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 16 }}>{active.hint}</div>}

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {activeTab === "workspace" && (
          <WorkspaceTab profile={profile} loading={profileLoading} onReload={loadProfile} searchParams={searchParams} />
        )}
        {activeTab === "team" && <TeamTab />}
        {activeTab === "preferences" && <PreferencesTab />}
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab 1 — Espacio de trabajo
// ══════════════════════════════════════════════════════════════════════════════
function WorkspaceTab({
  profile, loading, onReload, searchParams,
}: {
  profile: ProfileData | null; loading: boolean; onReload: () => void;
  searchParams: ReturnType<typeof useSearchParams>;
}) {
  if (loading) return (
    <>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ background: "var(--bg-panel)", border: "1px solid var(--line-1)", borderRadius: "var(--r-md)", padding: 18 }}>
          <Skeleton className="h-4 w-40 mb-4" />
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
            <Skeleton className="h-9" /><Skeleton className="h-9" />
          </div>
        </div>
      ))}
    </>
  );

  return (
    <>
      <ProfileCard user={profile?.user ?? null} onReload={onReload} />
      <IdentityCard org={profile?.organization ?? null} onReload={onReload} />
      <FiscalCard org={profile?.organization ?? null} onReload={onReload} />
      <LanguageCard />
      <BillingCard searchParams={searchParams} />
    </>
  );
}

// ─── Profile Card ─────────────────────────────────────────────────────────────
function ProfileCard({ user, onReload }: { user: ProfileData["user"] | null; onReload: () => void }) {
  const orgLocale = useOrgLocale();
  const [form, setForm] = useState({ firstName: "", lastName: "", phonePrefix: "", phoneNumber: "" });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const p = (user.name || "").trim().split(" ");
    const rawPhone = user.phone || "";
    // Separar prefijo y número si el teléfono guardado ya incluye un prefijo conocido
    const matchedPrefix = PHONE_PREFIXES.find(pp => rawPhone.startsWith(pp.prefix + " ") || rawPhone === pp.prefix);
    const prefix = matchedPrefix ? matchedPrefix.prefix : orgLocale.phonePrefix;
    const number = matchedPrefix
      ? rawPhone.slice(prefix.length).trim()
      : rawPhone.startsWith("+") ? rawPhone : rawPhone;
    setForm({
      firstName: p[0] || "",
      lastName: p.slice(1).join(" ") || "",
      phonePrefix: prefix,
      phoneNumber: number,
    });
  }, [user, orgLocale.phonePrefix]);

  const handleSave = async () => {
    setSaving(true);
    const phone = form.phoneNumber.trim()
      ? `${form.phonePrefix} ${form.phoneNumber.trim()}`
      : "";
    try {
      const r = await fetch("/api/user/profile", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: `${form.firstName} ${form.lastName}`.trim(), phone }),
      });
      const d = await r.json();
      if (r.ok && d.success) { toast.success("Perfil actualizado"); onReload(); }
      else toast.error(d.error || "Error al guardar");
    } catch { toast.error("Error de conexión"); }
    finally { setSaving(false); }
  };

  return (
    <FSCard title="Perfil de usuario" subtitle="Tu nombre y datos de contacto personal">
      <FSRow>
        <FSField label="Nombre">
          <input style={fsInput} value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))} placeholder="Tu nombre" />
        </FSField>
        <FSField label="Apellido">
          <input style={fsInput} value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Apellido" />
        </FSField>
      </FSRow>
      <FSRow>
        <FSField label="Email" hint="(no editable)">
          <input style={{ ...fsInput, background: "var(--bg-subtle)", color: "var(--ink-3)" }} value={user?.email || ""} disabled />
        </FSField>
        <FSField label="Teléfono">
          <div style={{ display: "flex", gap: 6 }}>
            <select
              value={form.phonePrefix}
              onChange={e => setForm(f => ({ ...f, phonePrefix: e.target.value }))}
              style={{ ...fsInput, width: 96, flex: "0 0 96px" }}
            >
              {PHONE_PREFIXES.map(p => (
                <option key={`${p.code}-${p.prefix}`} value={p.prefix}>{p.flag} {p.prefix}</option>
              ))}
            </select>
            <input
              style={{ ...fsInput, flex: 1 }}
              value={form.phoneNumber}
              onChange={e => setForm(f => ({ ...f, phoneNumber: e.target.value }))}
              placeholder={PHONE_PREFIXES.find(p => p.prefix === form.phonePrefix)?.phoneFormat ?? "000 000 000"}
              type="tel"
            />
          </div>
        </FSField>
      </FSRow>
      <SaveBtn saving={saving} onClick={handleSave} />
    </FSCard>
  );
}

// ─── Identity Card ────────────────────────────────────────────────────────────
function IdentityCard({ org, onReload }: { org: ProfileData["organization"] | null; onReload: () => void }) {
  const [name, setName] = useState("");
  const [color, setColor] = useState("#1A1A1A");
  const [logo, setLogo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (!org) return;
    setName(org.name || "");
    setLogo(org.logo || null);
  }, [org]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Solo se permiten imágenes"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Máx. 2MB"); return; }
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await r.json();
      if (d.success) { setLogo(d.data.url); toast.success("Logo subido"); }
      else toast.error(d.error || "Error al subir");
    } catch { toast.error("Error al subir"); }
    finally { setUploading(false); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const r = await fetch("/api/user/profile", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organization: { name, logo: logo || undefined } }),
      });
      const d = await r.json();
      if (r.ok && d.success) { toast.success("Identidad guardada"); onReload(); }
      else toast.error(d.error || "Error al guardar");
    } catch { toast.error("Error de conexión"); }
    finally { setSaving(false); }
  };

  return (
    <FSCard title="Identidad" subtitle="Logo, nombre comercial y color de marca">
      <FSRow>
        <FSField label="Nombre comercial">
          <input style={fsInput} value={name} onChange={e => setName(e.target.value)} placeholder="Mi empresa" />
        </FSField>
        <FSField label="Color de marca">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: "var(--r-sm)", background: color, border: "1px solid var(--line-strong)", flexShrink: 0 }} />
            <input style={{ ...fsInput, fontFamily: "monospace" }} value={color} onChange={e => setColor(e.target.value)} placeholder="#1A1A1A" />
          </div>
        </FSField>
      </FSRow>
      <FSField label="Logo" hint="PNG, JPG o WebP · máx. 2MB">
        <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 6 }}>
          {logo ? (
            <div style={{ position: "relative", flexShrink: 0 }}>
              <img src={logo} alt="Logo" style={{ height: 48, width: "auto", maxWidth: 120, objectFit: "contain", border: "1px solid var(--line-1)", borderRadius: "var(--r-sm)", padding: 4 }} />
              <button onClick={() => setLogo(null)} style={{ position: "absolute", top: -8, right: -8, width: 20, height: 20, borderRadius: "50%", background: "#fee2e2", border: "none", cursor: "pointer", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center", color: "#b91c1c" }}>×</button>
            </div>
          ) : (
            <div style={{ width: 80, height: 48, border: "1.5px dashed var(--line-strong)", borderRadius: "var(--r-sm)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-4)" }}>
              <RiImageLine style={{ width: 20, height: 20 }} />
            </div>
          )}
          <label htmlFor="identity-logo-upload" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 12px", background: "white", border: "1px solid var(--line-strong)", borderRadius: "var(--r-sm)", fontSize: 12.5, fontWeight: 500, cursor: uploading ? "not-allowed" : "pointer", color: "var(--ink-2)" }}>
            {uploading ? "Subiendo…" : <><RiUploadLine style={{ width: 12, height: 12 }} />Cambiar logo</>}
            <input id="identity-logo-upload" type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploading} style={{ display: "none" }} />
          </label>
        </div>
      </FSField>
      <div style={{ marginTop: 14 }}><SaveBtn saving={saving} onClick={handleSave} /></div>
    </FSCard>
  );
}

// ─── Fiscal Card ──────────────────────────────────────────────────────────────
function FiscalCard({ org, onReload }: { org: ProfileData["organization"] | null; onReload: () => void }) {
  const orgLocale = useOrgLocale();
  const [form, setForm] = useState({
    fiscalName: "", taxId: "", fiscalAddress: "", fiscalCity: "",
    fiscalPostalCode: "", fiscalCountry: "", fiscalEmail: "",
    fiscalPhonePrefix: "", fiscalPhoneNumber: "", invoiceLogo: "",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lookingUpPostal, setLookingUpPostal] = useState(false);
  const [companySuggestions, setCompanySuggestions] = useState<Array<{
    name: string; taxId: string; address: string; city: string;
    state: string; postalCode: string; country: string; jurisdictionCode: string;
  }>>([]);
  const [searchingCompany, setSearchingCompany] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const companyTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCompanyNameChange = (value: string) => {
    setForm(f => ({ ...f, fiscalName: value }));
    if (companyTimer.current) clearTimeout(companyTimer.current);
    if (value.length < 2) { setCompanySuggestions([]); setShowSuggestions(false); return; }
    companyTimer.current = setTimeout(async () => {
      setSearchingCompany(true);
      try {
        const countryCode = COUNTRIES.find(c => c.name === form.fiscalCountry)?.code ?? orgLocale.countryCode;
        const res = await fetch(`/api/company-lookup?q=${encodeURIComponent(value)}&countryCode=${countryCode}`);
        if (!res.ok) return;
        const data = await res.json();
        setCompanySuggestions(data.results ?? []);
        setShowSuggestions((data.results ?? []).length > 0);
      } catch { /* ignore */ } finally { setSearchingCompany(false); }
    }, 420);
  };

  const handleCompanySelect = (s: typeof companySuggestions[0]) => {
    const code = s.jurisdictionCode.split("_")[0].toUpperCase();
    const countryMatch = COUNTRIES.find(c => c.code === code);
    setForm(f => ({
      ...f,
      fiscalName: s.name,
      taxId: s.taxId || f.taxId,
      fiscalAddress: s.address || f.fiscalAddress,
      fiscalCity: s.city || f.fiscalCity,
      fiscalPostalCode: s.postalCode || f.fiscalPostalCode,
      fiscalCountry: countryMatch?.name || f.fiscalCountry,
    }));
    setShowSuggestions(false);
    setCompanySuggestions([]);
  };

  const handlePostalLookup = async (postalCode: string, countryName?: string) => {
    if (!postalCode.trim() || postalCode.length < 3) return;
    const countryCode = COUNTRIES.find(c => c.name === countryName)?.code;
    setLookingUpPostal(true);
    try {
      const params = new URLSearchParams({ postalCode: postalCode.trim() });
      if (countryCode) params.set("countryCode", countryCode);
      const res = await fetch(`/api/postal-lookup?${params}`);
      if (!res.ok) return;
      const data = await res.json();
      if (data.city) setForm(f => ({ ...f, fiscalCity: data.city }));
      if (data.countryCode && !countryCode) {
        const matched = COUNTRIES.find(c => c.code === data.countryCode);
        if (matched) setForm(f => ({ ...f, fiscalCountry: matched.name }));
      }
    } catch { /* silently ignore */ }
    finally { setLookingUpPostal(false); }
  };

  useEffect(() => {
    if (!org) return;
    const rawPhone = org.fiscalPhone || "";
    const matchedPrefix = PHONE_PREFIXES.find(pp => rawPhone.startsWith(pp.prefix + " ") || rawPhone === pp.prefix);
    const prefix = matchedPrefix ? matchedPrefix.prefix : orgLocale.phonePrefix;
    const number = matchedPrefix ? rawPhone.slice(prefix.length).trim() : rawPhone.startsWith("+") ? "" : rawPhone;
    setForm({
      fiscalName: org.fiscalName || org.name || "",
      taxId: org.taxId || "",
      fiscalAddress: org.fiscalAddress || "",
      fiscalCity: org.fiscalCity || "",
      fiscalPostalCode: org.fiscalPostalCode || "",
      fiscalCountry: org.fiscalCountry || orgLocale.countryName,
      fiscalEmail: org.fiscalEmail || "",
      fiscalPhonePrefix: prefix,
      fiscalPhoneNumber: number,
      invoiceLogo: org.invoiceLogo || org.logo || "",
    });
  }, [org, orgLocale.phonePrefix, orgLocale.countryName]);

  const handleSave = async () => {
    setSaving(true);
    const { fiscalPhonePrefix, fiscalPhoneNumber, ...rest } = form;
    const fiscalPhone = fiscalPhoneNumber.trim() ? `${fiscalPhonePrefix} ${fiscalPhoneNumber.trim()}` : "";
    try {
      const r = await fetch("/api/user/profile", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ organization: { ...rest, fiscalPhone } }),
      });
      const d = await r.json();
      if (r.ok && d.success) { toast.success("Datos fiscales guardados"); onReload(); }
      else toast.error(d.error || "Error al guardar");
    } catch { toast.error("Error de conexión"); }
    finally { setSaving(false); }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) { toast.error("Solo se permiten imágenes"); return; }
    if (file.size > 2 * 1024 * 1024) { toast.error("Máx. 2MB"); return; }
    setUploading(true);
    try {
      const fd = new FormData(); fd.append("file", file);
      const r = await fetch("/api/upload", { method: "POST", body: fd });
      const d = await r.json();
      if (d.success) { setForm(f => ({ ...f, invoiceLogo: d.data.url })); toast.success("Logo subido"); }
      else toast.error(d.error || "Error al subir");
    } catch { toast.error("Error al subir"); }
    finally { setUploading(false); }
  };

  return (
    <FSCard title="Datos fiscales" subtitle="Información que aparece en facturas, presupuestos y albaranes" id="fiscal">
      <div style={{ padding: "10px 12px", background: "#fef9f0", border: "1px solid #fcd34d", borderRadius: "var(--r-sm)", marginBottom: 14, fontSize: 12, color: "#92400e", display: "flex", gap: 8, alignItems: "flex-start" }}>
        <RiAlertLine style={{ width: 14, height: 14, flexShrink: 0, marginTop: 1 }} />
        <span>Estos datos aparecerán en todos los documentos fiscales. Asegúrate de que sean correctos antes de emitir facturas.</span>
      </div>
      <FSRow>
        <FSField label={searchingCompany ? "Razón Social / Nombre Empresa (buscando…)" : "Razón Social / Nombre Empresa"}>
          <div style={{ position: "relative" }}>
            <input
              style={fsInput}
              value={form.fiscalName}
              onChange={e => handleCompanyNameChange(e.target.value)}
              onFocus={() => companySuggestions.length > 0 && setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 180)}
              placeholder="Mi Empresa S.L."
              autoComplete="off"
            />
            {showSuggestions && companySuggestions.length > 0 && (
              <div style={{
                position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, zIndex: 50,
                background: "var(--bg-card, white)", border: "1px solid var(--line-strong)",
                borderRadius: "var(--r-sm)", boxShadow: "0 4px 16px rgba(0,0,0,.1)",
                maxHeight: 280, overflowY: "auto",
              }}>
                {companySuggestions.map((s, i) => (
                  <button
                    key={i}
                    type="button"
                    onMouseDown={() => handleCompanySelect(s)}
                    style={{
                      display: "block", width: "100%", textAlign: "left",
                      padding: "9px 12px", background: "none", border: "none",
                      borderBottom: i < companySuggestions.length - 1 ? "1px solid var(--line-1)" : "none",
                      cursor: "pointer", fontSize: 13,
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-hover, #f5f5f5)")}
                    onMouseLeave={e => (e.currentTarget.style.background = "none")}
                  >
                    <div style={{ fontWeight: 500, color: "var(--ink-1)", lineHeight: 1.3 }}>{s.name}</div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2, display: "flex", gap: 8 }}>
                      {s.taxId && <span>{s.taxId}</span>}
                      {s.city && <span>{s.city}</span>}
                      {s.postalCode && <span>{s.postalCode}</span>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </FSField>
        <FSField label="NIF / CIF">
          <input style={fsInput} value={form.taxId} onChange={e => setForm(f => ({ ...f, taxId: e.target.value }))} placeholder="B12345678" />
        </FSField>
      </FSRow>
      <FSField label="Dirección fiscal">
        <AddressAutocomplete
          value={form.fiscalAddress ?? ""}
          onChange={(val) => setForm(f => ({ ...f, fiscalAddress: val }))}
          onSelect={(s) => {
            setForm(f => ({
              ...f,
              fiscalAddress: s.street || s.displayName.split(",")[0],
              ...(s.city && { fiscalCity: s.city }),
              ...(s.postalCode && { fiscalPostalCode: s.postalCode }),
              ...(s.countryName && { fiscalCountry: s.countryName }),
            }));
          }}
          countryCode={form.fiscalCountry ? undefined : undefined}
          placeholder="Calle Principal 123, 1ª A"
          style={{ ...fsInput, marginBottom: 14 }}
        />
      </FSField>
      <FSRow cols={3}>
        <FSField label="Código postal">
          <input
            style={fsInput}
            value={form.fiscalPostalCode}
            onChange={e => setForm(f => ({ ...f, fiscalPostalCode: e.target.value }))}
            onBlur={e => handlePostalLookup(e.target.value, form.fiscalCountry || undefined)}
            placeholder="28001"
          />
        </FSField>
        <FSField label={lookingUpPostal ? "Ciudad (buscando…)" : "Ciudad"}>
          <input style={fsInput} value={form.fiscalCity} onChange={e => setForm(f => ({ ...f, fiscalCity: e.target.value }))} placeholder="Madrid" />
        </FSField>
        <FSField label="País">
          <select
            style={fsInput}
            value={form.fiscalCountry}
            onChange={e => {
              setForm(f => ({ ...f, fiscalCountry: e.target.value }));
              if (form.fiscalPostalCode) handlePostalLookup(form.fiscalPostalCode, e.target.value);
            }}
          >
            <option value="">Seleccionar país</option>
            {COUNTRIES.map(c => (
              <option key={c.code} value={c.name}>{c.flag} {c.name}</option>
            ))}
          </select>
        </FSField>
      </FSRow>
      <FSRow>
        <FSField label="Email de facturación">
          <input style={fsInput} type="email" value={form.fiscalEmail} onChange={e => setForm(f => ({ ...f, fiscalEmail: e.target.value }))} placeholder="facturacion@empresa.com" />
        </FSField>
        <FSField label="Teléfono">
          <div style={{ display: "flex", gap: 8 }}>
            <select
              style={{ ...fsInput, width: 110, flexShrink: 0 }}
              value={form.fiscalPhonePrefix}
              onChange={e => setForm(f => ({ ...f, fiscalPhonePrefix: e.target.value }))}
            >
              {PHONE_PREFIXES.map(pp => (
                <option key={pp.code} value={pp.prefix}>{pp.flag} {pp.prefix}</option>
              ))}
            </select>
            <input
              style={{ ...fsInput, flex: 1 }}
              value={form.fiscalPhoneNumber}
              onChange={e => setForm(f => ({ ...f, fiscalPhoneNumber: e.target.value }))}
              placeholder={PHONE_PREFIXES.find(pp => pp.prefix === form.fiscalPhonePrefix)?.phoneFormat ?? "000 000 000"}
            />
          </div>
        </FSField>
      </FSRow>
      <FSField label="Logo para facturas" hint="PNG o WebP con fondo transparente, máx. 2MB">
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 6 }}>
          {form.invoiceLogo ? (
            <div style={{ position: "relative", flexShrink: 0 }}>
              <img src={form.invoiceLogo} alt="Logo" style={{ height: 40, maxWidth: 100, objectFit: "contain", border: "1px solid var(--line-1)", borderRadius: "var(--r-sm)", padding: 3 }} />
              <button onClick={() => setForm(f => ({ ...f, invoiceLogo: "" }))} style={{ position: "absolute", top: -8, right: -8, width: 18, height: 18, borderRadius: "50%", background: "#fee2e2", border: "none", cursor: "pointer", fontSize: 11, display: "flex", alignItems: "center", justifyContent: "center", color: "#b91c1c" }}>×</button>
            </div>
          ) : (
            <div style={{ width: 64, height: 40, border: "1.5px dashed var(--line-strong)", borderRadius: "var(--r-sm)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--ink-4)" }}>
              <RiImageLine style={{ width: 16, height: 16 }} />
            </div>
          )}
          <label htmlFor="fiscal-logo-upload" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", background: "white", border: "1px solid var(--line-strong)", borderRadius: "var(--r-sm)", fontSize: 12, fontWeight: 500, cursor: uploading ? "not-allowed" : "pointer", color: "var(--ink-2)" }}>
            {uploading ? "Subiendo…" : <><RiUploadLine style={{ width: 11, height: 11 }} />Subir logo</>}
            <input id="fiscal-logo-upload" type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploading} style={{ display: "none" }} />
          </label>
        </div>
      </FSField>
      <div style={{ marginTop: 14 }}><SaveBtn saving={saving} onClick={handleSave} /></div>
    </FSCard>
  );
}

// ─── Language Card ────────────────────────────────────────────────────────────

// Badge pequeño para indicar que un campo fue auto-sugerido por la región
function SuggestedBadge() {
  return (
    <span style={{
      fontSize: 10, fontWeight: 600, letterSpacing: ".04em",
      background: "var(--bg-accent-subtle, #EEF4FF)",
      color: "var(--ink-accent, #4B6FE5)",
      padding: "1px 7px", borderRadius: 99,
    }}>
      Sugerido
    </span>
  );
}

function LanguageCard() {
  const { can } = useUserSession();
  const canUpdate = can("settings:update");
  const [locale, setLocale] = useState<OrgLocaleSettings>({ ...DEFAULT_LOCALE_SETTINGS });
  // Tracks which fields were set by the timezone auto-suggest (not manually by the user).
  // When the timezone changes again, only these fields get auto-updated.
  const [suggested, setSuggested] = useState<Set<"language" | "currency">>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/user/preferences");
        const d = await r.json();
        if (d.success && d.data?.locale) {
          setLocale({
            language: d.data.locale.language || DEFAULT_LOCALE_SETTINGS.language,
            timezone: d.data.locale.timezone || DEFAULT_LOCALE_SETTINGS.timezone,
            dateFormat: d.data.locale.dateFormat || DEFAULT_LOCALE_SETTINGS.dateFormat,
            currency: d.data.locale.currency || DEFAULT_LOCALE_SETTINGS.currency,
          });
        }
      } catch { /* use defaults */ } finally { setLoading(false); }
    })();
  }, []);

  const handleTimezoneChange = useCallback((tz: string) => {
    const defaults = TIMEZONE_DEFAULTS[tz];
    if (!defaults) {
      setLocale(l => ({ ...l, timezone: tz }));
      setSuggested(new Set());
      return;
    }
    // Al cambiar zona horaria: siempre sugerir idioma y moneda de esa región.
    // El usuario puede sobrescribir cualquiera después (el badge desaparecerá).
    setLocale(l => ({ ...l, timezone: tz, language: defaults.language, currency: defaults.currency }));
    setSuggested(new Set<"language" | "currency">(["language", "currency"]));
  }, []);

  const handleLanguageChange = useCallback((v: string) => {
    setLocale(l => ({ ...l, language: v }));
    // User manually changed → remove from suggested set
    setSuggested(prev => { const s = new Set(prev); s.delete("language"); return s; });
  }, []);

  const handleCurrencyChange = useCallback((v: string) => {
    setLocale(l => ({ ...l, currency: v }));
    setSuggested(prev => { const s = new Set(prev); s.delete("currency"); return s; });
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const r = await fetch("/api/user/preferences", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "locale", data: locale }),
      });
      const d = await r.json();
      if (d.success) { toast.success("Preferencias regionales guardadas"); setSuggested(new Set()); invalidateOrgLocaleCache(); }
      else toast.error(d.error || "Error al guardar");
    } catch { toast.error("Error de conexión"); }
    finally { setSaving(false); }
  }, [locale]);

  if (loading) return (
    <div style={{ background: "var(--bg-panel)", border: "1px solid var(--line-1)", borderRadius: "var(--r-md)", padding: 18 }}>
      <Skeleton className="h-4 w-36 mb-4" />
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
        {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-9" />)}
      </div>
    </div>
  );

  return (
    <FSCard
      title="Idioma y región"
      subtitle="Elige tu zona horaria y el resto se auto-completa según la región"
    >
      {/* 1 — Zona horaria: campo ancla, ancho completo */}
      <FSField label="Zona horaria">
        <TimezoneCombobox value={locale.timezone ?? ""} onValueChange={handleTimezoneChange} />
      </FSField>

      {/* 2 — Idioma y Moneda: auto-sugeridos desde la zona horaria */}
      <FSRow>
        <FSField label={<span className="flex items-center gap-1.5">Idioma {suggested.has("language") && <SuggestedBadge />}</span>}>
          <Select value={locale.language} onValueChange={handleLanguageChange}>
            <SelectTrigger style={{ fontSize: 13, height: 36 }}><SelectValue /></SelectTrigger>
            <SelectContent>
              {LANGUAGES.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </FSField>
        <FSField label={<span className="flex items-center gap-1.5">Moneda {suggested.has("currency") && <SuggestedBadge />}</span>}>
          <Select value={locale.currency} onValueChange={handleCurrencyChange}>
            <SelectTrigger style={{ fontSize: 13, height: 36 }}><SelectValue /></SelectTrigger>
            <SelectContent>
              {CURRENCIES.map(c => <SelectItem key={c.value} value={c.value}>{c.label} — {c.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </FSField>
      </FSRow>

      {/* 3 — Formato de fecha */}
      <FSField label="Formato de fecha">
        <Select value={locale.dateFormat} onValueChange={v => setLocale(l => ({ ...l, dateFormat: v }))}>
          <SelectTrigger style={{ fontSize: 13, height: 36 }}><SelectValue /></SelectTrigger>
          <SelectContent>
            {DATE_FORMATS.map(f => <SelectItem key={f.value} value={f.value}>{f.label} — {f.example}</SelectItem>)}
          </SelectContent>
        </Select>
      </FSField>

      {canUpdate && <SaveBtn saving={saving} onClick={handleSave} />}
    </FSCard>
  );
}

// ─── Billing Card ─────────────────────────────────────────────────────────────
function BillingCard({ searchParams }: { searchParams: ReturnType<typeof useSearchParams> }) {
  const [billing, setBilling] = useState<BillingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPlans, setShowPlans] = useState(false);
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");
  const [checkoutLoading, setCheckoutLoading] = useState<number | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("/api/user/billing");
        if (r.ok) { const d = await r.json(); if (d.success) setBilling(d.data); }
      } catch { /* ignore */ } finally { setLoading(false); }
    })();
  }, []);

  const handlePortal = useCallback(async () => {
    setPortalLoading(true);
    try {
      const r = await fetch("/api/subscriptions/portal", { method: "POST" });
      const d = await r.json();
      if (d.success && d.data.url) window.location.href = d.data.url;
      else toast.error(d.error || "Error al abrir portal");
    } catch { toast.error("Error de conexión"); }
    finally { setPortalLoading(false); }
  }, []);

  useEffect(() => {
    const p = searchParams.get("billing");
    if (p === "success") toast.success("Suscripción activada correctamente");
    else if (p === "cancelled") toast.info("Checkout cancelado");
    else if (p === "upgrade") setShowPlans(true);
    else if (p === "update-payment") {
      toast.warning("Actualiza tu método de pago para evitar la suspensión del servicio.");
      if (billing?.subscription?.hasStripeSubscription) handlePortal();
    }
  }, [searchParams, billing?.subscription?.hasStripeSubscription, handlePortal]);

  async function handleCheckout(planId: number) {
    setCheckoutLoading(planId);
    try {
      const r = await fetch("/api/subscriptions/checkout", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, interval: billingInterval }),
      });
      const d = await r.json();
      if (d.success && d.data.url) window.location.href = d.data.url;
      else toast.error(d.error || "Error al crear checkout");
    } catch { toast.error("Error de conexión"); }
    finally { setCheckoutLoading(null); }
  }

  function trialDaysLeft() {
    if (!billing?.subscription?.trialEndsAt) return null;
    const days = Math.ceil((new Date(billing.subscription.trialEndsAt).getTime() - Date.now()) / 86400000);
    return days > 0 ? days : 0;
  }

  function statusLabel(status: string) {
    const m: Record<string, string> = {
      active: "Activo", trialing: "Prueba gratuita", past_due: "Pago pendiente",
      canceled: "Cancelado", paused: "Pausado",
    };
    return m[status] || status;
  }

  if (loading) return (
    <div style={{ background: "var(--bg-panel)", border: "1px solid var(--line-1)", borderRadius: "var(--r-md)", padding: 18 }}>
      <Skeleton className="h-4 w-32 mb-4" /><Skeleton className="h-20 w-full" />
    </div>
  );

  const trialDays = trialDaysLeft();

  return (
    <>
      <FSCard title="Suscripción" subtitle="Plan actual y facturación de Hubents">
        {/* Current plan row */}
        <div style={{ display: "flex", alignItems: "center", gap: 14, padding: 16, background: "var(--bg-app)", border: "1px solid var(--line-strong)", borderRadius: "var(--r-sm)", marginBottom: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: "var(--r-sm)", background: "#D4E4D8", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <RiCheckLine style={{ width: 20, height: 20, color: "#2F5233" }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-1)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              {billing?.plan?.name || "Sin plan"}
              {billing?.subscription && (
                <span style={{ background: "#D4E4D8", color: "#2F5233", fontSize: 10, fontWeight: 500, padding: "2px 7px", borderRadius: 999 }}>
                  {statusLabel(billing.subscription.status)}
                </span>
              )}
            </div>
            {billing?.plan && (
              <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>
                €{billing.plan.priceMonthly}/mes · €{billing.plan.priceYearly}/año
              </div>
            )}
            {trialDays !== null && trialDays > 0 && (
              <div style={{ marginTop: 6 }}>
                <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginBottom: 4, display: "flex", alignItems: "center", gap: 5 }}>
                  <RiAlertLine style={{ width: 12, height: 12, color: "#d97706" }} />
                  {trialDays} días restantes de prueba
                </div>
                <div style={{ height: 4, width: 160, background: "var(--bg-subtle)", borderRadius: 999 }}>
                  <div style={{ height: 4, borderRadius: 999, background: "#d97706", width: `${Math.max(5, (((billing?.plan?.trialDays ?? 14) - trialDays) / (billing?.plan?.trialDays ?? 14)) * 100)}%` }} />
                </div>
              </div>
            )}
            {billing?.subscription?.currentPeriodEnd && billing.subscription.status === "active" && (
              <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>
                Próxima renovación: {new Date(billing.subscription.currentPeriodEnd).toLocaleDateString("es-ES")}
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
            {billing?.subscription?.hasStripeSubscription && (
              <button onClick={handlePortal} disabled={portalLoading} style={{ background: "white", border: "1px solid var(--line-strong)", padding: "8px 14px", borderRadius: "var(--r-sm)", fontSize: 12.5, fontWeight: 500, cursor: portalLoading ? "not-allowed" : "pointer", color: "var(--ink-2)" }}>
                {portalLoading ? "Cargando…" : "Gestionar"}
              </button>
            )}
            <button onClick={() => setShowPlans(true)} style={{ background: "var(--color-brand, #1A1A1A)", color: "white", border: "none", padding: "8px 14px", borderRadius: "var(--r-sm)", fontSize: 12.5, fontWeight: 500, cursor: "pointer" }}>
              Cambiar plan
            </button>
          </div>
        </div>

        {billing?.subscription?.status === "past_due" && (
          <div style={{ padding: "10px 12px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "var(--r-sm)", marginBottom: 12, fontSize: 12, color: "#b91c1c", display: "flex", gap: 8, alignItems: "flex-start" }}>
            <RiAlertLine style={{ width: 14, height: 14, flexShrink: 0, marginTop: 1 }} />
            <span><strong>Pago pendiente.</strong> No pudimos procesar tu último pago. {billing?.subscription?.hasStripeSubscription && <button onClick={handlePortal} style={{ background: "none", border: "none", cursor: "pointer", color: "#b91c1c", textDecoration: "underline", fontSize: 12, padding: 0 }}>Actualizar pago</button>}</span>
          </div>
        )}

        {/* Usage */}
        {billing?.plan?.limits && billing.usage && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-2)", marginBottom: 8 }}>Uso actual</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {[
                { label: "Usuarios", used: billing.usage.users, max: billing.plan.limits.maxUsers },
                { label: "Eventos", used: billing.usage.events, max: billing.plan.limits.maxEvents },
              ].map(item => (
                <div key={item.label}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: "var(--ink-3)" }}>{item.label}</span>
                    <span style={{ color: item.used >= item.max ? "#b91c1c" : "var(--ink-2)", fontWeight: 500 }}>{item.used} / {item.max}</span>
                  </div>
                  <div style={{ height: 4, borderRadius: 999, background: "var(--bg-subtle)" }}>
                    <div style={{ height: 4, borderRadius: 999, background: item.used >= item.max ? "#ef4444" : "var(--color-brand, #1A1A1A)", width: `${Math.min(100, (item.used / item.max) * 100)}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Features */}
        {billing?.plan?.features && billing.plan.features.length > 0 && (
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-2)", marginBottom: 8 }}>Incluido en tu plan</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
              {billing.plan.features.map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: "var(--ink-2)" }}>
                  <RiCheckLine style={{ width: 13, height: 13, color: "#0ab55c", flexShrink: 0 }} />{f}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Invoices */}
        {billing?.invoices && billing.invoices.length > 0 && (
          <div style={{ borderTop: "1px solid var(--line-1)", paddingTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "var(--ink-2)", marginBottom: 8 }}>Últimas facturas</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {billing.invoices.slice(0, 5).map(inv => (
                <div key={inv.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", background: "var(--bg-app)", border: "1px solid var(--line-1)", borderRadius: "var(--r-sm)" }}>
                  <RiFileList3Line style={{ width: 14, height: 14, color: "var(--ink-3)", flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12.5, color: "var(--ink-2)" }}>{inv.period || (inv.createdAt ? new Date(inv.createdAt).toLocaleDateString("es-ES") : "—")}</span>
                  <span style={{ fontSize: 12.5, color: "var(--ink-1)", fontWeight: 500 }}>
                    {inv.presentmentAmount && inv.presentmentCurrency ? `${inv.presentmentCurrency} ${inv.presentmentAmount}` : `€${inv.amount}`}
                  </span>
                  <span style={{ fontSize: 10.5, padding: "2px 8px", borderRadius: 999, background: inv.status === "paid" ? "#D4E4D8" : "var(--bg-subtle)", color: inv.status === "paid" ? "#2F5233" : "var(--ink-3)", fontWeight: 500 }}>
                    {inv.status === "paid" ? "Pagado" : inv.status}
                  </span>
                  {inv.pdfUrl && <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer" style={{ fontSize: 11.5, color: "var(--ink-3)", textDecoration: "underline" }}>PDF</a>}
                </div>
              ))}
            </div>
            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              {billing?.subscription?.hasStripeSubscription && (
                <button onClick={handlePortal} disabled={portalLoading} style={{ background: "white", border: "1px solid var(--line-strong)", padding: "7px 12px", borderRadius: "var(--r-sm)", fontSize: 12, color: "var(--ink-2)", cursor: "pointer" }}>
                  Método de pago
                </button>
              )}
            </div>
          </div>
        )}
      </FSCard>

      {/* Plans Modal */}
      {showPlans && (
        <div onClick={() => setShowPlans(false)} style={{ position: "fixed", inset: 0, background: "rgba(20,18,12,0.55)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 24, overflowY: "auto" }}>
          <div onClick={e => e.stopPropagation()} style={{ background: "var(--bg-app)", borderRadius: "var(--r-lg)", width: "100%", maxWidth: 900, maxHeight: "90vh", overflowY: "auto", boxShadow: "var(--shadow-pop, 0 20px 60px rgba(0,0,0,.18))", position: "relative" }}>
            <button onClick={() => setShowPlans(false)} style={{ position: "absolute", top: 16, right: 16, background: "transparent", border: "none", cursor: "pointer", fontSize: 18, color: "var(--ink-3)", zIndex: 1 }}>✕</button>
            <div style={{ padding: "36px 40px 40px" }}>
              <h2 style={{ fontSize: 22, fontWeight: 600, color: "var(--ink-1)", margin: "0 0 4px" }}>Elige tu plan</h2>
              <div style={{ fontSize: 13, color: "var(--ink-3)", marginBottom: 28 }}>El precio se mostrará en tu moneda local al pagar</div>
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
                <div style={{ display: "inline-flex", background: "var(--bg-panel)", border: "1px solid var(--line-1)", borderRadius: 999, padding: 4 }}>
                  {(["month", "year"] as const).map(iv => (
                    <button key={iv} onClick={() => setBillingInterval(iv)} style={{ background: billingInterval === iv ? "white" : "transparent", color: billingInterval === iv ? "var(--ink-1)" : "var(--ink-3)", border: "none", padding: "8px 22px", borderRadius: 999, fontSize: 13, fontWeight: billingInterval === iv ? 600 : 500, cursor: "pointer", boxShadow: billingInterval === iv ? "0 1px 3px rgba(0,0,0,.06)" : "none", display: "inline-flex", alignItems: "center", gap: 8 }}>
                      {iv === "month" ? "Mensual" : <><span>Anual</span><span style={{ color: "#0ab55c", fontSize: 11.5 }}>Ahorra 2 meses</span></>}
                    </button>
                  ))}
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
                {billing?.availablePlans?.map(plan => {
                  const isCurrent = plan.id === billing?.plan?.id;
                  const price = billingInterval === "month" ? plan.priceMonthly : plan.priceYearly;
                  const hasPriceId = billingInterval === "month" ? plan.stripePriceIdMonthly : plan.stripePriceIdYearly;
                  const isFree = Number(plan.priceMonthly) === 0;
                  return (
                    <div key={plan.id} style={{ position: "relative", background: "var(--bg-panel)", border: plan.highlighted ? "1.5px solid var(--ink-1)" : "1px solid var(--line-1)", borderRadius: "var(--r-md)", padding: "24px 22px", display: "flex", flexDirection: "column", gap: 14 }}>
                      {plan.highlighted && <span style={{ position: "absolute", top: -12, left: 20, background: "var(--color-brand, #1A1A1A)", color: "white", fontSize: 10, fontWeight: 700, padding: "4px 10px", borderRadius: 999, letterSpacing: ".06em" }}>POPULAR</span>}
                      <div>
                        <div style={{ fontSize: 18, fontWeight: 600, color: "var(--ink-1)", marginBottom: 6 }}>{plan.name}</div>
                        {plan.description && <div style={{ fontSize: 12.5, color: "var(--ink-3)", lineHeight: 1.5 }}>{plan.description}</div>}
                      </div>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 2 }}>
                        <span style={{ fontSize: 34, fontWeight: 700, color: "var(--ink-1)" }}>€{price}</span>
                        <span style={{ fontSize: 13, color: "var(--ink-3)", marginLeft: 2 }}>/{billingInterval === "month" ? "mes" : "año"}</span>
                      </div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 7, flex: 1 }}>
                        {plan.features.map((f, i) => (
                          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 12.5, color: "var(--ink-1)" }}>
                            <RiCheckLine style={{ width: 14, height: 14, color: "#0ab55c", flexShrink: 0 }} />{f}
                          </div>
                        ))}
                      </div>
                      <button onClick={() => handleCheckout(plan.id)} disabled={isCurrent || !hasPriceId || checkoutLoading === plan.id || isFree} style={{ width: "100%", padding: "11px", background: isCurrent ? "var(--bg-subtle)" : "var(--color-brand, #1A1A1A)", color: isCurrent ? "var(--ink-3)" : "white", border: isCurrent ? "1px solid var(--line-strong)" : "none", borderRadius: "var(--r-sm)", fontSize: 13, fontWeight: 600, cursor: (isCurrent || isFree || !hasPriceId) ? "not-allowed" : "pointer", marginTop: 4 }}>
                        {checkoutLoading === plan.id ? "Redirigiendo…" : isCurrent ? "Tu plan actual" : isFree ? "Plan gratuito" : !hasPriceId ? "No disponible" : "Suscribirse"}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab 2 — Equipo y permisos
// ══════════════════════════════════════════════════════════════════════════════
function TeamTab() {
  const { members, invitations, loading: teamLoading, inviteMember, removeMember, cancelInvitation, resendInvitation } = useTeam();
  const { allRoles, loading: rolesLoading } = useRoles();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("");
  const [inviting, setInviting] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);

  useEffect(() => {
    if (allRoles.length > 0 && !inviteRole) setInviteRole(allRoles[0]?.slug || "");
  }, [allRoles, inviteRole]);

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    const result = await inviteMember({ email: inviteEmail, role: inviteRole });
    if (result.success) {
      toast.success(`Invitación enviada a ${inviteEmail}`);
      setInviteEmail(""); setShowInviteForm(false);
    } else {
      toast.error(result.error || "Error al enviar invitación");
    }
    setInviting(false);
  };

  if (teamLoading || rolesLoading) return (
    <>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ background: "var(--bg-panel)", border: "1px solid var(--line-1)", borderRadius: "var(--r-md)", padding: 18 }}>
          <Skeleton className="h-4 w-36 mb-4" />
          {[0, 1, 2].map(j => <Skeleton key={j} className="h-14 w-full mb-2" />)}
        </div>
      ))}
    </>
  );

  return (
    <>
      {/* Members card */}
      <FSCard
        title="Miembros"
        subtitle="Personas con acceso a tu espacio de trabajo"
        action={
          <button onClick={() => setShowInviteForm(v => !v)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", background: "var(--color-brand, #1A1A1A)", color: "white", border: "none", borderRadius: "var(--r-sm)", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
            + Invitar miembro
          </button>
        }
      >
        {showInviteForm && (
          <div style={{ display: "flex", gap: 8, marginBottom: 12, padding: 12, background: "var(--bg-app)", border: "1px solid var(--line-1)", borderRadius: "var(--r-sm)", flexWrap: "wrap" }}>
            <input
              style={{ ...fsInput, flex: 1, minWidth: 180 }}
              type="email" placeholder="email@empresa.com"
              value={inviteEmail} onChange={e => setInviteEmail(e.target.value)}
              onKeyDown={e => e.key === "Enter" && handleInvite()}
            />
            <select
              value={inviteRole} onChange={e => setInviteRole(e.target.value)}
              style={{ ...fsInput, flex: "0 0 auto", width: "auto", cursor: "pointer" }}
            >
              {allRoles.map(r => <option key={r.id} value={r.slug}>{r.name}</option>)}
            </select>
            <button onClick={handleInvite} disabled={inviting || !inviteEmail} style={{ padding: "8px 14px", background: "var(--color-brand, #1A1A1A)", color: "white", border: "none", borderRadius: "var(--r-sm)", fontSize: 12.5, fontWeight: 600, cursor: (inviting || !inviteEmail) ? "not-allowed" : "pointer" }}>
              {inviting ? "Enviando…" : "Enviar"}
            </button>
            <button onClick={() => setShowInviteForm(false)} style={{ padding: "8px 10px", background: "transparent", border: "1px solid var(--line-strong)", borderRadius: "var(--r-sm)", fontSize: 12, color: "var(--ink-3)", cursor: "pointer" }}>Cancelar</button>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {members.length === 0 && (
            <div style={{ padding: 16, textAlign: "center", fontSize: 12.5, color: "var(--ink-3)", border: "1px dashed var(--line-strong)", borderRadius: "var(--r-sm)" }}>
              No hay miembros todavía
            </div>
          )}
          {members.map(m => {
            return (
              <div key={m.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "var(--bg-app)", border: "1px solid var(--line-strong)", borderRadius: "var(--r-sm)" }}>
                <Av src={m.image} name={m.name ?? m.email} seed={m.email} size={36} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.name || m.email}</div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>{m.email}</div>
                </div>
                <span style={{ fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 999, background: "var(--bg-subtle)", color: "var(--ink-2)", flexShrink: 0 }}>
                  {m.role || "Miembro"}
                </span>
                <button onClick={() => removeMember(m.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-4)", padding: 4, fontSize: 16, lineHeight: 1 }} title="Quitar miembro">×</button>
              </div>
            );
          })}
        </div>
      </FSCard>

      {/* Pending invitations card */}
      <FSCard title="Invitaciones pendientes" subtitle="Emails enviados que aún no han aceptado">
        {invitations.length === 0 ? (
          <div style={{ padding: 16, textAlign: "center", fontSize: 12.5, color: "var(--ink-3)", border: "1px dashed var(--line-strong)", borderRadius: "var(--r-sm)" }}>
            No hay invitaciones pendientes
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {invitations.map(inv => (
              <div key={inv.id} style={{ padding: "12px 14px", background: "var(--bg-app)", border: "1px solid var(--line-strong)", borderRadius: "var(--r-sm)", display: "flex", alignItems: "center", gap: 12 }}>
                <RiMailLine style={{ width: 16, height: 16, color: "var(--ink-3)", flexShrink: 0 }} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, color: "var(--ink-1)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{inv.email}</div>
                  <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 1 }}>
                    Invitada {inv.createdAt ? fmtDate(inv.createdAt) : "—"} · Rol: {inv.role || "—"}
                  </div>
                </div>
                <button onClick={() => resendInvitation(inv.id).then(() => toast.success(`Reenviado a ${inv.email}`))} style={{ background: "white", border: "1px solid var(--line-strong)", padding: "6px 11px", borderRadius: "var(--r-sm)", fontSize: 12, cursor: "pointer", color: "var(--ink-2)" }}>Reenviar</button>
                <button onClick={() => cancelInvitation(inv.id).then(() => toast.success("Invitación cancelada"))} style={{ background: "none", border: "none", color: "var(--ink-3)", cursor: "pointer", padding: 4, fontSize: 12 }}>Cancelar</button>
              </div>
            ))}
          </div>
        )}
      </FSCard>

      {/* Roles card */}
      <FSCard
        title="Roles y permisos"
        subtitle="Define qué puede hacer cada rol en cada módulo"
        action={
          <a href="/dashboard/settings/roles" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 12px", background: "white", border: "1px solid var(--line-strong)", borderRadius: "var(--r-sm)", fontSize: 12, fontWeight: 500, color: "var(--ink-2)", textDecoration: "none" }}>
            <RiExternalLinkLine style={{ width: 12, height: 12 }} /> Gestionar roles
          </a>
        }
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {allRoles.length === 0 && (
            <div style={{ padding: 16, textAlign: "center", fontSize: 12.5, color: "var(--ink-3)", border: "1px dashed var(--line-strong)", borderRadius: "var(--r-sm)" }}>
              Sin roles definidos
            </div>
          )}
          {allRoles.map(r => (
            <div key={r.id} style={{ padding: "12px 14px", background: "var(--bg-app)", border: "1px solid var(--line-strong)", borderRadius: "var(--r-sm)", display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 8, background: "var(--bg-subtle)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: "var(--ink-2)" }}>{r.name[0]}</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 2 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-1)" }}>{r.name}</span>
                  {r.isSystem && <span style={{ fontSize: 10, color: "var(--ink-3)", background: "var(--bg-subtle)", padding: "1px 7px", borderRadius: 999, fontWeight: 500 }}>Sistema</span>}
                  <span style={{ fontSize: 10.5, color: "var(--ink-3)" }}>· {r.memberCount} {r.memberCount === 1 ? "miembro" : "miembros"}</span>
                </div>
                {r.description && <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>{r.description}</div>}
              </div>
              <a href="/dashboard/settings/roles" style={{ display: "inline-flex", alignItems: "center", gap: 4, background: "white", border: "1px solid var(--line-strong)", padding: "6px 11px", borderRadius: "var(--r-sm)", fontSize: 12, cursor: "pointer", color: "var(--ink-2)", textDecoration: "none" }}>
                {r.isSystem ? "Ver" : "Editar"}
              </a>
            </div>
          ))}
        </div>
      </FSCard>
    </>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Tab 3 — Preferencias
// ══════════════════════════════════════════════════════════════════════════════
function PreferencesTab() {
  return (
    <>
      <AppearanceCard />
      <NotificationsCard />
      <IntegrationsCard />
      <SecurityCard />
      <PrivacyCard />
      <DevelopersCard />
    </>
  );
}

// ─── Appearance Card ──────────────────────────────────────────────────────────
function AppearanceCard() {
  const [theme, setTheme] = useState("sand");
  const [density, setDensity] = useState("comfortable");

  const themes = [
    { id: "sand",  label: "Sand",  bg: "#EBE4D4" },
    { id: "ivory", label: "Ivory", bg: "#F5F0E6" },
    { id: "mocha", label: "Mocha", bg: "#C9B89F" },
    { id: "dark",  label: "Dark",  bg: "#2A2520" },
  ];

  return (
    <FSCard title="Apariencia" subtitle="Tema y densidad de la interfaz">
      <FSField label="Tema">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          {themes.map(t => (
            <button key={t.id} onClick={() => setTheme(t.id)} style={{
              display: "flex", alignItems: "center", gap: 8, padding: "8px 12px",
              background: theme === t.id ? "white" : "transparent",
              border: theme === t.id ? "2px solid var(--ink-1)" : "1px solid var(--line-strong)",
              borderRadius: "var(--r-sm)", cursor: "pointer", fontSize: 12.5, fontWeight: theme === t.id ? 600 : 500, color: "var(--ink-1)",
            }}>
              <div style={{ width: 16, height: 16, borderRadius: "50%", background: t.bg, border: "1px solid var(--line-strong)", flexShrink: 0 }} />
              {t.label}
            </button>
          ))}
        </div>
      </FSField>
      <FSField label="Densidad">
        <div style={{ display: "flex", gap: 8 }}>
          {[{ id: "comfortable", label: "Confortable" }, { id: "compact", label: "Compacta" }].map(d => (
            <button key={d.id} onClick={() => setDensity(d.id)} style={{
              padding: "8px 14px",
              background: density === d.id ? "var(--color-brand, #1A1A1A)" : "white",
              color: density === d.id ? "white" : "var(--ink-2)",
              border: density === d.id ? "1px solid var(--color-brand, #1A1A1A)" : "1px solid var(--line-strong)",
              borderRadius: "var(--r-sm)", cursor: "pointer", fontSize: 12.5, fontWeight: 500,
            }}>{d.label}</button>
          ))}
        </div>
      </FSField>
    </FSCard>
  );
}

// ─── Notifications Card ───────────────────────────────────────────────────────
function NotificationsCard() {
  const [prefs, setPrefs] = useState({
    tasksOverdue:   { email: true,  push: true  },
    payments:       { email: true,  push: false },
    teamMessages:   { email: false, push: true  },
    eventReminders: { email: true,  push: true  },
    weeklySummary:  { email: true,  push: false },
  });

  type PrefKey = keyof typeof prefs;

  const toggle = (key: PrefKey, ch: "email" | "push") =>
    setPrefs(p => ({ ...p, [key]: { ...p[key], [ch]: !p[key][ch] } }));

  const rows: { key: PrefKey; name: string; desc: string }[] = [
    { key: "tasksOverdue",   name: "Tareas vencidas",        desc: "Cuando una tarea pasa de su fecha límite" },
    { key: "payments",       name: "Pagos recibidos",        desc: "Cuando un cliente paga una factura" },
    { key: "teamMessages",   name: "Mensajes de equipo",     desc: "Menciones y comentarios en eventos" },
    { key: "eventReminders", name: "Recordatorios de evento",desc: "24h antes del inicio del evento" },
    { key: "weeklySummary",  name: "Resumen semanal",        desc: "Cada lunes por la mañana" },
  ];

  return (
    <FSCard title="Notificaciones" subtitle="Qué quieres recibir y por qué canal">
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ display: "flex", alignItems: "center", paddingBottom: 6, borderBottom: "1px solid var(--line-1)", marginBottom: 2 }}>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-3)", width: 60, textAlign: "center", textTransform: "uppercase", letterSpacing: ".04em" }}>Email</span>
          <span style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-3)", width: 60, textAlign: "center", textTransform: "uppercase", letterSpacing: ".04em" }}>Push</span>
        </div>
        {rows.map(n => (
          <div key={n.key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "var(--bg-app)", border: "1px solid var(--line-strong)", borderRadius: "var(--r-sm)" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-1)" }}>{n.name}</div>
              <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>{n.desc}</div>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--ink-2)", cursor: "pointer", width: 60, justifyContent: "center" }}>
              <input type="checkbox" checked={prefs[n.key].email} onChange={() => toggle(n.key, "email")} style={{ accentColor: "#1A1A1A", width: 14, height: 14 }} />
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--ink-2)", cursor: "pointer", width: 60, justifyContent: "center" }}>
              <input type="checkbox" checked={prefs[n.key].push} onChange={() => toggle(n.key, "push")} style={{ accentColor: "#1A1A1A", width: 14, height: 14 }} />
            </label>
          </div>
        ))}
      </div>
    </FSCard>
  );
}

// ─── Integrations Card ────────────────────────────────────────────────────────
function IntegrationsCard() {
  const [icalUrl, setIcalUrl] = useState<string | null>(null);
  const [gcalOpen, setGcalOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleGcalToggle = async () => {
    if (!gcalOpen && !icalUrl) {
      try {
        const res = await fetch("/api/calendar/ical-url");
        if (res.ok) { const d = await res.json(); setIcalUrl(d.data?.url ?? null); }
      } catch { /* ignore */ }
    }
    setGcalOpen(o => !o);
  };

  const handleCopy = () => {
    if (!icalUrl) return;
    navigator.clipboard.writeText(icalUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const integrations = [
    { key: "gmail",  name: "Gmail",             desc: "Envía documentos y facturas" },
    { key: "wa",     name: "WhatsApp Business", desc: "Avisos automáticos a clientes" },
    { key: "stripe", name: "Stripe",            desc: "Cobros con tarjeta" },
    { key: "drive",  name: "Google Drive",      desc: "Almacenamiento en la nube" },
  ];

  return (
    <FSCard
      title="Integraciones"
      subtitle="Conecta Hubents con otras herramientas"
      action={
        <a href="/dashboard/settings/integrations" style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "7px 12px", background: "white", border: "1px solid var(--line-strong)", borderRadius: "var(--r-sm)", fontSize: 12, fontWeight: 500, color: "var(--ink-2)", textDecoration: "none" }}>
          <RiExternalLinkLine style={{ width: 12, height: 12 }} /> Ver todas
        </a>
      }
    >
      {/* Google Calendar — expandible con URL de suscripción */}
      <div style={{ border: "1px solid var(--line-strong)", borderRadius: "var(--r-sm)", overflow: "hidden", marginBottom: 8 }}>
        <button
          type="button"
          onClick={handleGcalToggle}
          style={{ width: "100%", padding: 12, background: gcalOpen ? "var(--bg-subtle)" : "var(--bg-app)", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 10, textAlign: "left" }}
        >
          <div style={{ width: 36, height: 36, borderRadius: "var(--r-sm)", background: "var(--bg-subtle)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 18 }}>📅</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-1)" }}>Google Calendar</div>
            <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 1 }}>Suscríbete a tu calendario de eventos</div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-accent, #4B6FE5)", background: "var(--bg-accent-subtle, #EEF4FF)", padding: "2px 8px", borderRadius: 99 }}>Activo</div>
        </button>
        {gcalOpen && (
          <div style={{ padding: "12px 14px 14px", borderTop: "1px solid var(--line-1)", background: "var(--bg-card)" }}>
            <div style={{ fontSize: 12, color: "var(--ink-2)", marginBottom: 8 }}>
              Copia esta URL y añádela en tu aplicación de calendario para que tus eventos de Hubents aparezcan automáticamente.
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
              <input
                readOnly
                value={icalUrl ?? "Cargando…"}
                style={{ ...fsInput, flex: 1, fontSize: 11, fontFamily: "monospace", background: "var(--bg-subtle)", color: "var(--ink-2)" }}
                onFocus={e => e.target.select()}
              />
              <button
                type="button"
                onClick={handleCopy}
                style={{ padding: "0 12px", background: copied ? "#dcfce7" : "white", border: "1px solid var(--line-strong)", borderRadius: "var(--r-sm)", fontSize: 12, fontWeight: 500, cursor: "pointer", color: copied ? "#166534" : "var(--ink-2)", flexShrink: 0, display: "flex", alignItems: "center", gap: 5 }}
              >
                {copied ? <><RiCheckLine style={{ width: 12, height: 12 }} /> Copiado</> : "Copiar"}
              </button>
            </div>
            <div style={{ fontSize: 11.5, color: "var(--ink-3)", display: "flex", flexDirection: "column", gap: 3 }}>
              <span style={{ fontWeight: 600, color: "var(--ink-2)" }}>Cómo añadirlo:</span>
              <span>📅 <strong>Google Calendar</strong> → Otros calendarios → Desde URL → Pegar URL</span>
              <span>🍎 <strong>Apple Calendar</strong> → Archivo → Nueva suscripción a calendario</span>
              <span>📧 <strong>Outlook</strong> → Agregar calendario → Suscribirse desde Web</span>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 8 }}>
        {integrations.map(it => (
          <a key={it.key} href="/dashboard/settings/integrations" style={{ padding: 12, background: "var(--bg-app)", border: "1px solid var(--line-strong)", borderRadius: "var(--r-sm)", display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <div style={{ width: 36, height: 36, borderRadius: "var(--r-sm)", background: "var(--bg-subtle)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 18 }}>
              {it.key === "gmail" ? "✉️" : it.key === "wa" ? "💬" : it.key === "stripe" ? "💳" : "☁️"}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-1)" }}>{it.name}</div>
              <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 1 }}>{it.desc}</div>
            </div>
          </a>
        ))}
      </div>
    </FSCard>
  );
}

// ─── Security Card ────────────────────────────────────────────────────────────
function SecurityCard() {
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const handleSave = async () => {
    if (passwords.new !== passwords.confirm) { setMsg({ ok: false, text: "Las contraseñas no coinciden" }); return; }
    if (passwords.new.length < 8) { setMsg({ ok: false, text: "Mínimo 8 caracteres" }); return; }
    setSaving(true); setMsg(null);
    try {
      const r = await fetch("/api/user/security", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: passwords.current, newPassword: passwords.new }),
      });
      const d = await r.json();
      if (r.ok) { setMsg({ ok: true, text: "Contraseña actualizada correctamente" }); setPasswords({ current: "", new: "", confirm: "" }); }
      else setMsg({ ok: false, text: d.error || "Error al cambiar contraseña" });
    } catch { setMsg({ ok: false, text: "Error de conexión" }); }
    finally { setSaving(false); }
  };

  return (
    <FSCard title="Seguridad" subtitle="Contraseña y autenticación de tu cuenta">
      {msg && (
        <div style={{ padding: "8px 12px", borderRadius: "var(--r-sm)", marginBottom: 12, fontSize: 12.5, background: msg.ok ? "#f0fdf4" : "#fef2f2", color: msg.ok ? "#166534" : "#b91c1c", border: `1px solid ${msg.ok ? "#bbf7d0" : "#fca5a5"}`, display: "flex", alignItems: "center", gap: 7 }}>
          {msg.ok ? <RiCheckLine style={{ width: 13, height: 13 }} /> : <RiAlertLine style={{ width: 13, height: 13 }} />} {msg.text}
        </div>
      )}
      <FSRow>
        <FSField label="Contraseña actual">
          <input style={fsInput} type="password" value={passwords.current} onChange={e => setPasswords(p => ({ ...p, current: e.target.value }))} placeholder="••••••••" />
        </FSField>
        <div />
      </FSRow>
      <FSRow>
        <FSField label="Nueva contraseña">
          <input style={fsInput} type="password" value={passwords.new} onChange={e => setPasswords(p => ({ ...p, new: e.target.value }))} placeholder="Mínimo 8 caracteres" />
        </FSField>
        <FSField label="Confirmar contraseña">
          <input style={fsInput} type="password" value={passwords.confirm} onChange={e => setPasswords(p => ({ ...p, confirm: e.target.value }))} placeholder="Repite la nueva contraseña" />
        </FSField>
      </FSRow>
      <SaveBtn saving={saving} label="Cambiar contraseña" onClick={handleSave} />
    </FSCard>
  );
}

// ─── Privacy Card ─────────────────────────────────────────────────────────────
function PrivacyCard() {
  const [prefs, setPrefs] = useState({ showProfile: true, showActivity: true, allowAnalytics: true });

  return (
    <FSCard title="Privacidad" subtitle="Controla tu información y datos personales">
      <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
        {[
          { key: "showProfile" as const, name: "Perfil visible", desc: "Otros miembros pueden ver tu perfil" },
          { key: "showActivity" as const, name: "Mostrar actividad", desc: "Tu actividad es visible para el equipo" },
          { key: "allowAnalytics" as const, name: "Análisis de uso", desc: "Ayúdanos a mejorar con datos anónimos" },
        ].map(item => (
          <div key={item.key} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 14px", background: "var(--bg-app)", border: "1px solid var(--line-strong)", borderRadius: "var(--r-sm)" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-1)" }}>{item.name}</div>
              <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>{item.desc}</div>
            </div>
            <button
              onClick={() => setPrefs(p => ({ ...p, [item.key]: !p[item.key] }))}
              style={{
                width: 40, height: 22, borderRadius: 999, border: "none", cursor: "pointer", flexShrink: 0,
                background: prefs[item.key] ? "var(--color-brand, #1A1A1A)" : "var(--bg-subtle)",
                position: "relative", transition: "background .2s",
              }}
            >
              <span style={{
                position: "absolute", top: 2, width: 18, height: 18, borderRadius: "50%", background: "white",
                transition: "left .2s", left: prefs[item.key] ? 20 : 2,
                boxShadow: "0 1px 3px rgba(0,0,0,.2)",
              }} />
            </button>
          </div>
        ))}
      </div>
      <div style={{ borderTop: "1px solid var(--line-1)", paddingTop: 14 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-1)", marginBottom: 10 }}>Tus datos</div>
        <div style={{ display: "flex", gap: 8 }}>
          <button style={{ padding: "8px 14px", background: "white", border: "1px solid var(--line-strong)", borderRadius: "var(--r-sm)", fontSize: 12.5, fontWeight: 500, cursor: "pointer", color: "var(--ink-2)" }}>
            Exportar datos
          </button>
          <button style={{ padding: "8px 14px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "var(--r-sm)", fontSize: 12.5, fontWeight: 500, cursor: "pointer", color: "#b91c1c" }}>
            Eliminar cuenta
          </button>
        </div>
      </div>
    </FSCard>
  );
}

// ─── Developers Card ──────────────────────────────────────────────────────────
function DevelopersCard() {
  return (
    <FSCard title="Developers" subtitle="API keys, webhooks y documentación técnica">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 16px", background: "var(--bg-app)", border: "1px solid var(--line-strong)", borderRadius: "var(--r-sm)" }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-1)", marginBottom: 3 }}>Panel de desarrolladores</div>
          <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>Gestiona API keys, webhooks y credenciales de integración</div>
        </div>
        <a href="/dashboard/settings/developers" style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 14px", background: "white", border: "1px solid var(--line-strong)", borderRadius: "var(--r-sm)", fontSize: 12.5, fontWeight: 500, color: "var(--ink-2)", textDecoration: "none" }}>
          <RiExternalLinkLine style={{ width: 13, height: 13 }} /> Abrir panel
        </a>
      </div>
    </FSCard>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// Fallback + Export
// ══════════════════════════════════════════════════════════════════════════════
function SettingsPageFallback() {
  return (
    <div style={{ maxWidth: 820 }}>
      <Skeleton className="h-7 w-48 mb-2" />
      <Skeleton className="h-4 w-72 mb-6" />
      <div style={{ display: "flex", gap: 2, borderBottom: "1px solid var(--line-1)", marginBottom: 16 }}>
        {[120, 130, 110].map((w, i) => <Skeleton key={i} className="h-10" style={{ width: w }} />)}
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{ background: "var(--bg-panel)", border: "1px solid var(--line-1)", borderRadius: "var(--r-md)", padding: 18 }}>
            <Skeleton className="h-4 w-36 mb-4" />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
              <Skeleton className="h-9" /><Skeleton className="h-9" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={<SettingsPageFallback />}>
      <SettingsPageContent />
    </Suspense>
  );
}
