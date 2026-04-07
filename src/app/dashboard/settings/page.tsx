"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  RiUserLine,
  RiLockLine,
  RiNotification3Line,
  RiPaletteLine,
  RiGlobalLine,
  RiBankCardLine,
  RiTeamLine,
  RiShieldLine,
  RiCheckLine,
  RiErrorWarningLine,
  RiFileList3Line,
  RiBuilding2Line,
  RiUploadLine,
  RiImageLine,
  RiAlertLine,
} from "@remixicon/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { useUserSession } from "@/hooks/use-user-session";
import {
  TIMEZONES,
  CURRENCIES,
  LANGUAGES,
  DATE_FORMATS,
  DEFAULT_LOCALE_SETTINGS,
} from "@/lib/constants/locale";
import type { OrgLocaleSettings } from "@/lib/constants/locale";

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
    // Fiscal data
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

const settingsSections = [
  {
    id: "profile",
    title: "Perfil",
    description: "Información personal y de la empresa",
    icon: RiUserLine,
  },
  {
    id: "fiscal",
    title: "Datos Fiscales",
    description: "Información para facturas y documentos",
    icon: RiBuilding2Line,
  },
  {
    id: "security",
    title: "Seguridad",
    description: "Contraseña y autenticación",
    icon: RiLockLine,
  },
  {
    id: "notifications",
    title: "Notificaciones",
    description: "Preferencias de alertas y emails",
    icon: RiNotification3Line,
  },
  {
    id: "appearance",
    title: "Apariencia",
    description: "Tema y personalización visual",
    icon: RiPaletteLine,
  },
  {
    id: "language",
    title: "Idioma y Región",
    description: "Idioma, zona horaria y formato",
    icon: RiGlobalLine,
  },
  {
    id: "billing",
    title: "Facturación",
    description: "Plan, pagos y facturas",
    icon: RiBankCardLine,
  },
  {
    id: "team",
    title: "Equipo",
    description: "Miembros del equipo",
    icon: RiTeamLine,
    href: "/dashboard/team",
  },
  {
    id: "roles",
    title: "Roles y Permisos",
    description: "Gestión de roles y permisos",
    icon: RiShieldLine,
    href: "/dashboard/settings/roles",
  },
  {
    id: "templates",
    title: "Templates",
    description: "Plantillas de eventos",
    icon: RiFileList3Line,
    href: "/dashboard/settings/templates",
  },
  {
    id: "integrations",
    title: "Integraciones",
    description: "Gmail, WhatsApp y más",
    icon: RiGlobalLine,
    href: "/dashboard/settings/integrations",
    requiredPermission: "integrations:read",
  },
  {
    id: "developers",
    title: "Developers",
    description: "API keys, webhooks y documentación",
    icon: RiGlobalLine,
    href: "/dashboard/settings/developers",
    requiredPermission: "settings:update",
  },
  {
    id: "privacy",
    title: "Privacidad",
    description: "Datos y configuración de privacidad",
    icon: RiShieldLine,
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { can } = useUserSession();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const searchParams = useSearchParams();
  const [activeSection, setActiveSection] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      if (params.get("billing")) return "billing";
      if (params.get("section") === "fiscal") return "fiscal";
    }
    return "profile";
  });

  useEffect(() => {
    if (searchParams.get("section") === "fiscal") {
      setActiveSection("fiscal");
    }
  }, [searchParams]);

  const filteredSections = useMemo(() =>
    settingsSections.filter((s) => !('requiredPermission' in s && s.requiredPermission) || can(s.requiredPermission as string)),
    [can]
  );
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  });
  const [saveMessage, setSaveMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    async function loadProfile() {
      try {
        const res = await fetch("/api/user/profile");
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setProfile(data.data);
            const nameParts = (data.data.user.name || "").split(" ");
            setFormData({
              firstName: nameParts[0] || "",
              lastName: nameParts.slice(1).join(" ") || "",
              email: data.data.user.email || "",
              phone: data.data.user.phone || "",
            });
          }
        }
      } catch (error) {
        console.error("Error loading profile:", error);
      } finally {
        setLoading(false);
      }
    }
    loadProfile();
  }, []);

  const handleSaveProfile = async () => {
    setSaving(true);
    setSaveMessage(null);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          phone: formData.phone,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSaveMessage({ type: "success", text: "Perfil guardado correctamente" });
      } else {
        setSaveMessage({ type: "error", text: data.error || "Error al guardar" });
      }
    } catch (error) {
      console.error("Error saving profile:", error);
      setSaveMessage({ type: "error", text: "Error de conexión" });
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-muted-foreground">
          Administra tu cuenta y preferencias
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Settings Navigation */}
        <Card className="lg:col-span-1 h-fit">
          <CardContent className="p-2">
            <nav className="space-y-1">
              {filteredSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => {
                    if ('href' in section && section.href) {
                      router.push(section.href as string);
                    } else {
                      setActiveSection(section.id);
                    }
                  }}
                  className={`flex w-full items-center gap-3 rounded-(--radius) px-3 py-2.5 text-left text-sm transition-colors ${
                    activeSection === section.id
                      ? "bg-primary text-white"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <section.icon className="h-5 w-5" />
                  <div>
                    <p className="font-medium">{section.title}</p>
                    <p
                      className={`text-xs ${
                        activeSection === section.id
                          ? "text-white/70"
                          : "text-muted-foreground"
                      }`}
                    >
                      {section.description}
                    </p>
                  </div>
                </button>
              ))}
            </nav>
          </CardContent>
        </Card>

        {/* Settings Content */}
        <div className="lg:col-span-2 space-y-6">
          {loading ? (
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
                <Skeleton className="h-4 w-64" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Save Message */}
              {saveMessage && (
                <div className={`p-3 rounded-lg flex items-center gap-2 ${
                  saveMessage.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
                }`}>
                  {saveMessage.type === "success" ? <RiCheckLine className="h-4 w-4" /> : <RiErrorWarningLine className="h-4 w-4" />}
                  {saveMessage.text}
                </div>
              )}

              {/* Profile Section */}
              {activeSection === "profile" && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>Información del Perfil</CardTitle>
                      <CardDescription>
                        Actualiza tu información personal y de contacto
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Nombre</label>
                          <Input 
                            value={formData.firstName}
                            onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Apellido</label>
                          <Input 
                            value={formData.lastName}
                            onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Email</label>
                        <Input 
                          type="email" 
                          value={formData.email}
                          disabled
                          className="bg-muted"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Teléfono</label>
                        <Input 
                          type="tel" 
                          value={formData.phone}
                          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                          placeholder="+34 612 345 678"
                        />
                      </div>
                      <Button onClick={handleSaveProfile} disabled={saving}>
                        {saving ? "Guardando..." : "Guardar Cambios"}
                      </Button>
                    </CardContent>
                  </Card>

                </>
              )}

              {/* Fiscal Section */}
              {activeSection === "fiscal" && profile?.organization && (
                <FiscalSection organization={profile.organization} onSave={() => {
                  // Reload profile after save
                  fetch("/api/user/profile").then(res => res.json()).then(data => {
                    if (data.success) setProfile(data.data);
                  });
                }} />
              )}

              {/* Security Section */}
              {activeSection === "security" && (
                <SecuritySection />
              )}

              {/* Notifications Section */}
              {activeSection === "notifications" && (
                <NotificationsSection />
              )}

              {/* Appearance Section */}
              {activeSection === "appearance" && (
                <AppearanceSection />
              )}

              {/* Language Section */}
              {activeSection === "language" && (
                <LanguageSection />
              )}

              {/* Billing Section */}
              {activeSection === "billing" && (
                <BillingSection />
              )}

              {/* Team Section */}
              {activeSection === "team" && (
                <TeamSection />
              )}

              {/* Privacy Section */}
              {activeSection === "privacy" && (
                <PrivacySection />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Security Section Component
function SecuritySection() {
  const [passwords, setPasswords] = useState({ current: "", new: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleChangePassword = async () => {
    if (passwords.new !== passwords.confirm) {
      setMessage({ type: "error", text: "Las contraseñas no coinciden" });
      return;
    }
    if (passwords.new.length < 8) {
      setMessage({ type: "error", text: "La contraseña debe tener al menos 8 caracteres" });
      return;
    }

    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/user/security", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwords.current,
          newPassword: passwords.new,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "Contraseña actualizada correctamente" });
        setPasswords({ current: "", new: "", confirm: "" });
      } else {
        setMessage({ type: "error", text: data.error || "Error al cambiar contraseña" });
      }
    } catch {
      setMessage({ type: "error", text: "Error de conexión" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cambiar Contraseña</CardTitle>
        <CardDescription>Actualiza tu contraseña de acceso</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {message && (
          <div className={`p-3 rounded-lg flex items-center gap-2 ${
            message.type === "success" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
          }`}>
            {message.type === "success" ? <RiCheckLine className="h-4 w-4" /> : <RiErrorWarningLine className="h-4 w-4" />}
            {message.text}
          </div>
        )}
        <div className="space-y-2">
          <label className="text-sm font-medium">Contraseña Actual</label>
          <Input
            type="password"
            value={passwords.current}
            onChange={(e) => setPasswords({ ...passwords, current: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Nueva Contraseña</label>
          <Input
            type="password"
            value={passwords.new}
            onChange={(e) => setPasswords({ ...passwords, new: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Confirmar Nueva Contraseña</label>
          <Input
            type="password"
            value={passwords.confirm}
            onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
          />
        </div>
        <Button onClick={handleChangePassword} disabled={saving}>
          {saving ? "Guardando..." : "Cambiar Contraseña"}
        </Button>
      </CardContent>
    </Card>
  );
}

// Notifications Section Component
function NotificationsSection() {
  const [prefs, setPrefs] = useState({
    email: true,
    push: true,
    taskReminders: true,
    eventUpdates: true,
    teamActivity: true,
    marketing: false,
  });

  const handleToggle = (key: keyof typeof prefs) => {
    setPrefs({ ...prefs, [key]: !prefs[key] });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Preferencias de Notificaciones</CardTitle>
        <CardDescription>Configura cómo y cuándo recibir alertas</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Notificaciones por Email</p>
              <p className="text-sm text-muted-foreground">Recibir alertas importantes por correo</p>
            </div>
            <Switch checked={prefs.email} onCheckedChange={() => handleToggle("email")} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Notificaciones Push</p>
              <p className="text-sm text-muted-foreground">Alertas en tiempo real en el navegador</p>
            </div>
            <Switch checked={prefs.push} onCheckedChange={() => handleToggle("push")} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Recordatorios de Tareas</p>
              <p className="text-sm text-muted-foreground">Alertas antes de fechas límite</p>
            </div>
            <Switch checked={prefs.taskReminders} onCheckedChange={() => handleToggle("taskReminders")} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Actualizaciones de Eventos</p>
              <p className="text-sm text-muted-foreground">Cambios en tus eventos</p>
            </div>
            <Switch checked={prefs.eventUpdates} onCheckedChange={() => handleToggle("eventUpdates")} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Actividad del Equipo</p>
              <p className="text-sm text-muted-foreground">Cuando alguien del equipo hace cambios</p>
            </div>
            <Switch checked={prefs.teamActivity} onCheckedChange={() => handleToggle("teamActivity")} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Comunicaciones de Marketing</p>
              <p className="text-sm text-muted-foreground">Novedades y ofertas de HubEnts</p>
            </div>
            <Switch checked={prefs.marketing} onCheckedChange={() => handleToggle("marketing")} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Appearance Section Component
function AppearanceSection() {
  const [theme, setTheme] = useState<"light" | "dark" | "system">("system");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Apariencia</CardTitle>
        <CardDescription>Personaliza el aspecto visual de la aplicación</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          <label className="text-sm font-medium">Tema</label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { value: "light", label: "Claro", icon: "☀️" },
              { value: "dark", label: "Oscuro", icon: "🌙" },
              { value: "system", label: "Sistema", icon: "💻" },
            ].map((option) => (
              <button
                key={option.value}
                onClick={() => setTheme(option.value as typeof theme)}
                className={`p-4 rounded-lg border-2 transition-colors ${
                  theme === option.value
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/50"
                }`}
              >
                <div className="text-2xl mb-2">{option.icon}</div>
                <p className="font-medium text-sm">{option.label}</p>
              </button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Language Section Component
function LanguageSection() {
  const { can } = useUserSession();
  const canUpdateSettings = can("settings:update");
  const [locale, setLocale] = useState<OrgLocaleSettings>({ ...DEFAULT_LOCALE_SETTINGS });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function fetchLocale() {
      try {
        const res = await fetch("/api/user/preferences");
        const data = await res.json();
        if (data.success && data.data?.locale) {
          setLocale({
            language: data.data.locale.language || DEFAULT_LOCALE_SETTINGS.language,
            timezone: data.data.locale.timezone || DEFAULT_LOCALE_SETTINGS.timezone,
            dateFormat: data.data.locale.dateFormat || DEFAULT_LOCALE_SETTINGS.dateFormat,
            currency: data.data.locale.currency || DEFAULT_LOCALE_SETTINGS.currency,
          });
        }
      } catch {
        // Use defaults
      } finally {
        setLoading(false);
      }
    }
    fetchLocale();
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/user/preferences", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ section: "locale", data: locale }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Preferencias regionales guardadas");
      } else {
        toast.error(data.error || "Error al guardar preferencias");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  }, [locale]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Idioma y Región</CardTitle>
          <CardDescription>Configura tu idioma y preferencias regionales</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Idioma y Región</CardTitle>
        <CardDescription>Configura tu idioma y preferencias regionales</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Idioma</label>
            <Select
              value={locale.language}
              onValueChange={(v) => setLocale((p) => ({ ...p, language: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Zona Horaria</label>
            <Select
              value={locale.timezone}
              onValueChange={(v) => setLocale((p) => ({ ...p, timezone: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz.value} value={tz.value}>
                    {tz.label} ({tz.offset})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Formato de Fecha</label>
            <Select
              value={locale.dateFormat}
              onValueChange={(v) => setLocale((p) => ({ ...p, dateFormat: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DATE_FORMATS.map((fmt) => (
                  <SelectItem key={fmt.value} value={fmt.value}>
                    {fmt.label} — {fmt.example}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Moneda</label>
            <Select
              value={locale.currency}
              onValueChange={(v) => setLocale((p) => ({ ...p, currency: v }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label} — {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {canUpdateSettings && (
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "Guardar Preferencias"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// Billing Section Component
function BillingSection() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [billing, setBilling] = useState<{
    plan: {
      id: number;
      name: string;
      slug: string;
      features: string[];
      priceMonthly: string;
      priceYearly: string;
      currency: string;
      limits: { maxUsers: number; maxEvents: number; maxStorage: number };
      trialDays: number;
    } | null;
    subscription: {
      id: number;
      status: string;
      trialEndsAt: string | null;
      currentPeriodEnd: string | null;
      cancelAt: string | null;
      presentmentCurrency: string | null;
      hasStripeSubscription: boolean;
    } | null;
    usage: {
      users: number;
      events: number;
      storage: number;
    };
    availablePlans: {
      id: number;
      name: string;
      slug: string;
      description: string | null;
      priceMonthly: string;
      priceYearly: string;
      currency: string;
      features: string[];
      limits: { maxUsers: number; maxEvents: number; maxStorage: number };
      highlighted: boolean;
      stripePriceIdMonthly: string | null;
      stripePriceIdYearly: string | null;
    }[];
    invoices: {
      id: number;
      amount: string;
      currency: string;
      status: string;
      paidAt: string | null;
      pdfUrl: string | null;
      presentmentAmount: string | null;
      presentmentCurrency: string | null;
      period: string | null;
      createdAt: string | null;
    }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPlans, setShowPlans] = useState(false);
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");
  const [checkoutLoading, setCheckoutLoading] = useState<number | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    async function loadBilling() {
      try {
        const res = await fetch("/api/user/billing");
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            setBilling(data.data);
          }
        }
      } catch (error) {
        console.error("Error loading billing:", error);
      } finally {
        setLoading(false);
      }
    }
    loadBilling();
  }, []);

  useEffect(() => {
    const billingParam = searchParams.get("billing");
    if (billingParam === "success") {
      toast.success("Suscripción activada correctamente");
    } else if (billingParam === "cancelled") {
      toast.info("Checkout cancelado");
    } else if (billingParam === "upgrade") {
      setShowPlans(true);
    } else if (billingParam === "update-payment") {
      toast.warning("Actualiza tu método de pago para evitar la suspensión del servicio.");
      if (billing?.subscription?.hasStripeSubscription) {
        handlePortal();
      }
    }
  }, [searchParams, billing?.subscription?.hasStripeSubscription]);

  async function handleCheckout(planId: number) {
    setCheckoutLoading(planId);
    try {
      const res = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, interval: billingInterval }),
      });
      const data = await res.json();
      if (data.success && data.data.url) {
        window.location.href = data.data.url;
      } else {
        toast.error(data.error || "Error al crear checkout");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setCheckoutLoading(null);
    }
  }

  async function handlePortal() {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/subscriptions/portal", { method: "POST" });
      const data = await res.json();
      if (data.success && data.data.url) {
        window.location.href = data.data.url;
      } else {
        toast.error(data.error || "Error al abrir portal");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setPortalLoading(false);
    }
  }

  function getStatusBadge(status: string) {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      active: { label: "Activo", variant: "default" },
      trialing: { label: "Prueba gratuita", variant: "secondary" },
      past_due: { label: "Pago pendiente", variant: "destructive" },
      canceled: { label: "Cancelado", variant: "outline" },
      paused: { label: "Pausado", variant: "outline" },
    };
    const info = map[status] || { label: status, variant: "outline" as const };
    return <Badge variant={info.variant}>{info.label}</Badge>;
  }

  function getTrialDaysLeft() {
    if (!billing?.subscription?.trialEndsAt) return null;
    const end = new Date(billing.subscription.trialEndsAt);
    const now = new Date();
    const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  const trialDays = getTrialDaysLeft();

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Plan y Facturación</CardTitle>
          <CardDescription>
            Gestiona tu suscripción · Precios en EUR · Tu moneda local se aplica al pagar
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Plan */}
          <div className="flex items-center justify-between rounded-lg border border-border p-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-lg">
                  {billing?.plan?.name || "Sin plan"}
                </h3>
                {billing?.subscription && getStatusBadge(billing.subscription.status)}
              </div>
              {billing?.plan && (
                <p className="text-sm text-muted-foreground">
                  €{billing.plan.priceMonthly}/mes · €{billing.plan.priceYearly}/año
                </p>
              )}
              {trialDays !== null && trialDays > 0 && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 text-sm">
                    <RiAlertLine className="h-4 w-4 text-amber-500" />
                    <span>{trialDays} días restantes de prueba</span>
                  </div>
                  <div className="mt-1 h-2 w-48 rounded-full bg-muted">
                    <div
                      className="h-2 rounded-full bg-amber-500 transition-all"
                      style={{ width: `${Math.max(5, (((billing?.plan?.trialDays ?? 14) - trialDays) / (billing?.plan?.trialDays ?? 14)) * 100)}%` }}
                    />
                  </div>
                </div>
              )}
              {billing?.subscription?.currentPeriodEnd && billing.subscription.status === "active" && (
                <p className="text-xs text-muted-foreground">
                  Próxima facturación: {new Date(billing.subscription.currentPeriodEnd).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="flex gap-2">
              {billing?.subscription?.hasStripeSubscription && (
                <Button
                  variant="outline"
                  onClick={handlePortal}
                  disabled={portalLoading}
                >
                  {portalLoading ? "Cargando..." : "Gestionar"}
                </Button>
              )}
              <Button onClick={() => setShowPlans(true)}>
                Cambiar Plan
              </Button>
            </div>
          </div>

          {billing?.subscription?.status === "past_due" && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive flex items-start gap-2">
              <RiAlertLine className="h-4 w-4 mt-0.5 shrink-0" />
              <div>
                <strong>Pago pendiente.</strong> No pudimos procesar tu último pago. Actualiza tu método de pago para evitar la suspensión del servicio.
                {billing?.subscription?.hasStripeSubscription && (
                  <Button variant="link" className="h-auto p-0 ml-1 text-destructive underline" onClick={handlePortal}>
                    Actualizar pago
                  </Button>
                )}
              </div>
            </div>
          )}

          {billing?.subscription?.status === "canceled" && (
            <div className="p-3 rounded-lg bg-muted border border-border text-sm text-muted-foreground flex items-start gap-2">
              <RiAlertLine className="h-4 w-4 mt-0.5 shrink-0" />
              <span>Tu suscripción ha sido cancelada. Algunas funciones pueden estar limitadas.</span>
            </div>
          )}

          {/* Usage */}
          {billing?.plan?.limits && billing.usage && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Uso actual</p>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { label: "Usuarios", used: billing.usage.users, max: billing.plan.limits.maxUsers },
                  { label: "Eventos", used: billing.usage.events, max: billing.plan.limits.maxEvents },
                ].map((item) => (
                  <div key={item.label} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className={item.used >= item.max ? "text-destructive font-medium" : ""}>
                        {item.used} de {item.max}
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-muted">
                      <div
                        className={`h-1.5 rounded-full transition-all ${item.used >= item.max ? "bg-destructive" : "bg-primary"}`}
                        style={{ width: `${Math.min(100, (item.used / item.max) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Features */}
          {billing?.plan?.features && billing.plan.features.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Incluido en tu plan:</p>
              <div className="grid grid-cols-2 gap-1">
                {billing.plan.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                    <RiCheckLine className="h-4 w-4 text-green-500 shrink-0" />
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Invoices */}
          {billing?.invoices && billing.invoices.length > 0 && (
            <div className="space-y-2 pt-4 border-t border-border">
              <p className="text-sm font-medium">Últimas facturas</p>
              <div className="space-y-1">
                {billing.invoices.slice(0, 5).map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between text-sm py-1">
                    <div className="flex items-center gap-2">
                      <RiFileList3Line className="h-4 w-4 text-muted-foreground" />
                      <span>{inv.period || (inv.createdAt ? new Date(inv.createdAt).toLocaleDateString() : "—")}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span>
                        {inv.presentmentAmount && inv.presentmentCurrency
                          ? `${inv.presentmentCurrency} ${inv.presentmentAmount}`
                          : `€${inv.amount}`}
                      </span>
                      <Badge variant={inv.status === "paid" ? "default" : "outline"} className="text-xs">
                        {inv.status === "paid" ? "Pagado" : inv.status}
                      </Badge>
                      {inv.pdfUrl && (
                        <a href={inv.pdfUrl} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline text-xs">
                          PDF
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Plan Selector Dialog */}
      {showPlans && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-xl shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-bold">Elige tu plan</h2>
                <p className="text-sm text-muted-foreground">
                  El precio se mostrará en tu moneda local al pagar
                </p>
              </div>
              <button onClick={() => setShowPlans(false)} className="text-muted-foreground hover:text-foreground">
                ✕
              </button>
            </div>

            {/* Interval Toggle */}
            <div className="flex justify-center mb-6">
              <div className="flex gap-1 p-1 bg-muted/50 rounded-lg">
                <button
                  onClick={() => setBillingInterval("month")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    billingInterval === "month" ? "bg-background shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  Mensual
                </button>
                <button
                  onClick={() => setBillingInterval("year")}
                  className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    billingInterval === "year" ? "bg-background shadow-sm" : "text-muted-foreground"
                  }`}
                >
                  Anual <span className="text-green-600 text-xs ml-1">Ahorra 2 meses</span>
                </button>
              </div>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {billing?.availablePlans?.map((plan) => {
                const isCurrent = plan.id === billing?.plan?.id;
                const price = billingInterval === "month" ? plan.priceMonthly : plan.priceYearly;
                const hasPriceId = billingInterval === "month" ? plan.stripePriceIdMonthly : plan.stripePriceIdYearly;
                const isFree = Number(plan.priceMonthly) === 0;

                return (
                  <div
                    key={plan.id}
                    className={`rounded-lg border p-4 space-y-4 ${
                      plan.highlighted ? "border-primary ring-1 ring-primary" : "border-border"
                    } ${isCurrent ? "bg-muted/30" : ""}`}
                  >
                    {plan.highlighted && (
                      <Badge className="w-fit">POPULAR</Badge>
                    )}
                    <div>
                      <h3 className="font-semibold text-lg">{plan.name}</h3>
                      {plan.description && (
                        <p className="text-xs text-muted-foreground mt-1">{plan.description}</p>
                      )}
                    </div>
                    <div>
                      <span className="text-3xl font-bold">€{price}</span>
                      <span className="text-muted-foreground">/{billingInterval === "month" ? "mes" : "año"}</span>
                    </div>
                    {plan.features?.map((f, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <RiCheckLine className="h-4 w-4 text-green-500 shrink-0" />
                        {f}
                      </div>
                    ))}
                    <Button
                      className="w-full"
                      variant={isCurrent ? "outline" : "default"}
                      disabled={isCurrent || !hasPriceId || checkoutLoading === plan.id || isFree}
                      onClick={() => handleCheckout(plan.id)}
                    >
                      {checkoutLoading === plan.id
                        ? "Redirigiendo..."
                        : isCurrent
                        ? "Tu plan actual"
                        : isFree
                        ? "Plan gratuito"
                        : !hasPriceId
                        ? "No disponible"
                        : "Suscribirse"}
                    </Button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Team Section Component
function TeamSection() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Gestión del Equipo</CardTitle>
        <CardDescription>Administra los miembros y roles de tu equipo</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-muted-foreground mb-4">
          Para gestionar tu equipo, ve a la sección de Equipo en el menú principal.
        </p>
        <Button onClick={() => window.location.href = "/dashboard/team"}>
          Ir a Equipo
        </Button>
      </CardContent>
    </Card>
  );
}

// Privacy Section Component
function PrivacySection() {
  const [privacy, setPrivacy] = useState({
    showProfile: true,
    showActivity: true,
    allowAnalytics: true,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Privacidad</CardTitle>
        <CardDescription>Controla tu información y datos</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Perfil Visible</p>
              <p className="text-sm text-muted-foreground">Otros miembros pueden ver tu perfil</p>
            </div>
            <Switch 
              checked={privacy.showProfile} 
              onCheckedChange={() => setPrivacy({ ...privacy, showProfile: !privacy.showProfile })} 
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Mostrar Actividad</p>
              <p className="text-sm text-muted-foreground">Tu actividad es visible para el equipo</p>
            </div>
            <Switch 
              checked={privacy.showActivity} 
              onCheckedChange={() => setPrivacy({ ...privacy, showActivity: !privacy.showActivity })} 
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Análisis de Uso</p>
              <p className="text-sm text-muted-foreground">Ayúdanos a mejorar con datos anónimos</p>
            </div>
            <Switch 
              checked={privacy.allowAnalytics} 
              onCheckedChange={() => setPrivacy({ ...privacy, allowAnalytics: !privacy.allowAnalytics })} 
            />
          </div>
        </div>
        <div className="pt-4 border-t border-border">
          <h4 className="font-medium mb-2">Tus Datos</h4>
          <div className="flex gap-2">
            <Button variant="outline">Exportar Datos</Button>
            <Button variant="destructive">Eliminar Cuenta</Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Fiscal Section Component
interface FiscalSectionProps {
  organization: NonNullable<ProfileData["organization"]>;
  onSave: () => void;
}

function FiscalSection({ organization, onSave }: FiscalSectionProps) {
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [formData, setFormData] = useState({
    fiscalName: organization.fiscalName || organization.name || "",
    taxId: organization.taxId || "",
    fiscalAddress: organization.fiscalAddress || "",
    fiscalCity: organization.fiscalCity || "",
    fiscalPostalCode: organization.fiscalPostalCode || "",
    fiscalCountry: organization.fiscalCountry || "España",
    fiscalEmail: organization.fiscalEmail || "",
    fiscalPhone: organization.fiscalPhone || "",
    invoiceLogo: organization.invoiceLogo || organization.logo || "",
  });

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization: {
            fiscalName: formData.fiscalName,
            taxId: formData.taxId,
            fiscalAddress: formData.fiscalAddress,
            fiscalCity: formData.fiscalCity,
            fiscalPostalCode: formData.fiscalPostalCode,
            fiscalCountry: formData.fiscalCountry,
            fiscalEmail: formData.fiscalEmail,
            fiscalPhone: formData.fiscalPhone,
            invoiceLogo: formData.invoiceLogo,
          },
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success("Datos fiscales guardados correctamente");
        onSave();
      } else {
        toast.error(data.error || "Error al guardar");
      }
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Solo se permiten imágenes");
      return;
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("El archivo es demasiado grande (máx. 2MB)");
      return;
    }

    setUploadingLogo(true);
    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formDataUpload,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setFormData({ ...formData, invoiceLogo: data.data.url });
        toast.success("Logo subido correctamente");
      } else {
        toast.error(data.error || "Error al subir logo");
      }
    } catch (error) {
      toast.error("Error al subir logo");
    } finally {
      setUploadingLogo(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Datos Fiscales</CardTitle>
          <CardDescription>
            Información fiscal que aparecerá en tus facturas, presupuestos y albaranes
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-2">
            <RiAlertLine className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">Importante</p>
              <p>Estos datos aparecerán en todos los documentos fiscales que generes. Asegúrate de que sean correctos.</p>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Razón Social / Nombre Empresa *</label>
              <Input
                value={formData.fiscalName}
                onChange={(e) => setFormData({ ...formData, fiscalName: e.target.value })}
                placeholder="Mi Empresa S.L."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">NIF / CIF *</label>
              <Input
                value={formData.taxId}
                onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                placeholder="B12345678"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Dirección Fiscal</label>
            <Input
              value={formData.fiscalAddress}
              onChange={(e) => setFormData({ ...formData, fiscalAddress: e.target.value })}
              placeholder="Calle Principal 123, 1º A"
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Código Postal</label>
              <Input
                value={formData.fiscalPostalCode}
                onChange={(e) => setFormData({ ...formData, fiscalPostalCode: e.target.value })}
                placeholder="28001"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Ciudad</label>
              <Input
                value={formData.fiscalCity}
                onChange={(e) => setFormData({ ...formData, fiscalCity: e.target.value })}
                placeholder="Madrid"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">País</label>
              <Input
                value={formData.fiscalCountry}
                onChange={(e) => setFormData({ ...formData, fiscalCountry: e.target.value })}
                placeholder="España"
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email de Facturación</label>
              <Input
                type="email"
                value={formData.fiscalEmail}
                onChange={(e) => setFormData({ ...formData, fiscalEmail: e.target.value })}
                placeholder="facturacion@miempresa.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Teléfono</label>
              <Input
                value={formData.fiscalPhone}
                onChange={(e) => setFormData({ ...formData, fiscalPhone: e.target.value })}
                placeholder="+34 912 345 678"
              />
            </div>
          </div>

          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Guardando..." : "Guardar Datos Fiscales"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Logo de la organización</CardTitle>
          <CardDescription>
            Mismo logo para facturas, presupuestos, albaranes, Partners y tu perfil público
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-6">
            {/* Logo Preview */}
            <div className="shrink-0">
              {formData.invoiceLogo ? (
                <div className="relative">
                  <img
                    src={formData.invoiceLogo}
                    alt="Logo"
                    className="h-24 w-auto max-w-50 object-contain border rounded-lg p-2"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full bg-red-100 hover:bg-red-200"
                    onClick={() => setFormData({ ...formData, invoiceLogo: "" })}
                  >
                    ×
                  </Button>
                </div>
              ) : (
                <div className="h-24 w-32 border-2 border-dashed rounded-lg flex items-center justify-center text-muted-foreground">
                  <RiImageLine className="h-8 w-8" />
                </div>
              )}
            </div>

            {/* Upload Area */}
            <div className="flex-1 space-y-2">
              <label
                htmlFor="logo-upload"
                className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted/50 transition-colors"
              >
                <div className="flex flex-col items-center justify-center pt-2 pb-2">
                  {uploadingLogo ? (
                    <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full" />
                  ) : (
                    <>
                      <RiUploadLine className="h-6 w-6 text-muted-foreground mb-1" />
                      <p className="text-sm text-muted-foreground">
                        <span className="font-medium text-primary">Subir logo</span> o arrastrar
                      </p>
                      <p className="text-xs text-muted-foreground">PNG, JPG, WebP · máx. 2MB</p>
                    </>
                  )}
                </div>
                <input
                  id="logo-upload"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  disabled={uploadingLogo}
                />
              </label>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Formato recomendado: PNG o WebP con fondo transparente. Proporción horizontal (aprox. 3:1 a 4:1);
                en PDF el alto visible es unos 48px, así que evitá logos muy altos o con texto diminuto. SVG no está
                soportado en este uploader.
              </p>
            </div>
          </div>

          {formData.invoiceLogo && (
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Guardando..." : "Guardar logo"}
            </Button>
          )}
        </CardContent>
      </Card>
    </>
  );
}
