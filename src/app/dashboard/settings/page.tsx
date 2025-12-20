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
} from "@remixicon/react";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

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
    website: string | null;
    address: string | null;
    phone: string | null;
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
    description: "Roles y permisos del equipo",
    icon: RiTeamLine,
  },
  {
    id: "privacy",
    title: "Privacidad",
    description: "Datos y configuración de privacidad",
    icon: RiShieldLine,
  },
];

export default function SettingsPage() {
  const { data: session } = useSession();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState("profile");
  
  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    orgName: "",
    orgWebsite: "",
    orgAddress: "",
    orgPhone: "",
  });

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
              orgName: data.data.organization?.name || "",
              orgWebsite: data.data.organization?.website || "",
              orgAddress: data.data.organization?.address || "",
              orgPhone: data.data.organization?.phone || "",
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
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: `${formData.firstName} ${formData.lastName}`.trim(),
          phone: formData.phone,
        }),
      });
      if (res.ok) {
        // Show success feedback
      }
    } catch (error) {
      console.error("Error saving profile:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOrganization = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          organization: {
            name: formData.orgName,
            website: formData.orgWebsite,
            address: formData.orgAddress,
            phone: formData.orgPhone,
          },
        }),
      });
      if (res.ok) {
        // Show success feedback
      }
    } catch (error) {
      console.error("Error saving organization:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-[var(--muted-foreground)]">
          Administra tu cuenta y preferencias
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Settings Navigation */}
        <Card className="lg:col-span-1 h-fit">
          <CardContent className="p-2">
            <nav className="space-y-1">
              {settingsSections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex w-full items-center gap-3 rounded-[var(--radius)] px-3 py-2.5 text-left text-sm transition-colors ${
                    activeSection === section.id
                      ? "bg-[var(--primary)] text-white"
                      : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  <section.icon className="h-5 w-5" />
                  <div>
                    <p className="font-medium">{section.title}</p>
                    <p
                      className={`text-xs ${
                        activeSection === section.id
                          ? "text-white/70"
                          : "text-[var(--muted-foreground)]"
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
                          className="bg-[var(--muted)]"
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

                  <Card>
                    <CardHeader>
                      <CardTitle>Información de la Empresa</CardTitle>
                      <CardDescription>
                        Datos de tu empresa de wedding planning
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Nombre de la Empresa</label>
                        <Input 
                          value={formData.orgName}
                          onChange={(e) => setFormData({ ...formData, orgName: e.target.value })}
                        />
                      </div>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Teléfono</label>
                          <Input 
                            value={formData.orgPhone}
                            onChange={(e) => setFormData({ ...formData, orgPhone: e.target.value })}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-medium">Sitio Web</label>
                          <Input 
                            value={formData.orgWebsite}
                            onChange={(e) => setFormData({ ...formData, orgWebsite: e.target.value })}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Dirección</label>
                        <Input 
                          value={formData.orgAddress}
                          onChange={(e) => setFormData({ ...formData, orgAddress: e.target.value })}
                        />
                      </div>
                      <Button onClick={handleSaveOrganization} disabled={saving}>
                        {saving ? "Guardando..." : "Guardar Cambios"}
                      </Button>
                    </CardContent>
                  </Card>
                </>
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
              <p className="text-sm text-[var(--muted-foreground)]">Recibir alertas importantes por correo</p>
            </div>
            <Switch checked={prefs.email} onCheckedChange={() => handleToggle("email")} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Notificaciones Push</p>
              <p className="text-sm text-[var(--muted-foreground)]">Alertas en tiempo real en el navegador</p>
            </div>
            <Switch checked={prefs.push} onCheckedChange={() => handleToggle("push")} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Recordatorios de Tareas</p>
              <p className="text-sm text-[var(--muted-foreground)]">Alertas antes de fechas límite</p>
            </div>
            <Switch checked={prefs.taskReminders} onCheckedChange={() => handleToggle("taskReminders")} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Actualizaciones de Eventos</p>
              <p className="text-sm text-[var(--muted-foreground)]">Cambios en tus eventos</p>
            </div>
            <Switch checked={prefs.eventUpdates} onCheckedChange={() => handleToggle("eventUpdates")} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Actividad del Equipo</p>
              <p className="text-sm text-[var(--muted-foreground)]">Cuando alguien del equipo hace cambios</p>
            </div>
            <Switch checked={prefs.teamActivity} onCheckedChange={() => handleToggle("teamActivity")} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Comunicaciones de Marketing</p>
              <p className="text-sm text-[var(--muted-foreground)]">Novedades y ofertas de HubEnts</p>
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
                    ? "border-[var(--primary)] bg-[var(--primary)]/5"
                    : "border-[var(--border)] hover:border-[var(--primary)]/50"
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
  const [locale, setLocale] = useState({
    language: "es",
    timezone: "America/Argentina/Buenos_Aires",
    dateFormat: "DD/MM/YYYY",
    currency: "USD",
  });

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
            <select
              className="w-full h-10 px-3 rounded-md border border-[var(--border)] bg-[var(--background)]"
              value={locale.language}
              onChange={(e) => setLocale({ ...locale, language: e.target.value })}
            >
              <option value="es">Español</option>
              <option value="en">English</option>
              <option value="pt">Português</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Zona Horaria</label>
            <select
              className="w-full h-10 px-3 rounded-md border border-[var(--border)] bg-[var(--background)]"
              value={locale.timezone}
              onChange={(e) => setLocale({ ...locale, timezone: e.target.value })}
            >
              <option value="America/Argentina/Buenos_Aires">Buenos Aires (GMT-3)</option>
              <option value="America/Mexico_City">Ciudad de México (GMT-6)</option>
              <option value="America/Bogota">Bogotá (GMT-5)</option>
              <option value="Europe/Madrid">Madrid (GMT+1)</option>
              <option value="America/New_York">Nueva York (GMT-5)</option>
            </select>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">Formato de Fecha</label>
            <select
              className="w-full h-10 px-3 rounded-md border border-[var(--border)] bg-[var(--background)]"
              value={locale.dateFormat}
              onChange={(e) => setLocale({ ...locale, dateFormat: e.target.value })}
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Moneda</label>
            <select
              className="w-full h-10 px-3 rounded-md border border-[var(--border)] bg-[var(--background)]"
              value={locale.currency}
              onChange={(e) => setLocale({ ...locale, currency: e.target.value })}
            >
              <option value="USD">USD - Dólar</option>
              <option value="EUR">EUR - Euro</option>
              <option value="ARS">ARS - Peso Argentino</option>
              <option value="MXN">MXN - Peso Mexicano</option>
            </select>
          </div>
        </div>
        <Button>Guardar Preferencias</Button>
      </CardContent>
    </Card>
  );
}

// Billing Section Component
function BillingSection() {
  const [billing, setBilling] = useState<{
    plan: { name: string; slug: string; features: string[] } | null;
    subscription: { status: string; trialEndsAt: string | null } | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <Skeleton className="h-20 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Plan y Facturación</CardTitle>
        <CardDescription>Gestiona tu suscripción</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-[var(--border)] p-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">{billing?.plan?.name || "Plan Starter"}</h3>
              <Badge variant={billing?.subscription?.status === "trialing" ? "warning" : "success"}>
                {billing?.subscription?.status === "trialing" ? "Prueba" : "Activo"}
              </Badge>
            </div>
            <p className="text-sm text-[var(--muted-foreground)]">
              {billing?.subscription?.trialEndsAt 
                ? `Prueba hasta: ${new Date(billing.subscription.trialEndsAt).toLocaleDateString()}`
                : "Acceso completo a las funcionalidades del plan"
              }
            </p>
          </div>
          <Button>Cambiar Plan</Button>
        </div>
        {billing?.plan?.features && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Incluido en tu plan:</p>
            <ul className="space-y-1">
              {billing.plan.features.map((feature, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                  <RiCheckLine className="h-4 w-4 text-green-500" />
                  {feature}
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
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
        <p className="text-[var(--muted-foreground)] mb-4">
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
              <p className="text-sm text-[var(--muted-foreground)]">Otros miembros pueden ver tu perfil</p>
            </div>
            <Switch 
              checked={privacy.showProfile} 
              onCheckedChange={() => setPrivacy({ ...privacy, showProfile: !privacy.showProfile })} 
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Mostrar Actividad</p>
              <p className="text-sm text-[var(--muted-foreground)]">Tu actividad es visible para el equipo</p>
            </div>
            <Switch 
              checked={privacy.showActivity} 
              onCheckedChange={() => setPrivacy({ ...privacy, showActivity: !privacy.showActivity })} 
            />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Análisis de Uso</p>
              <p className="text-sm text-[var(--muted-foreground)]">Ayúdanos a mejorar con datos anónimos</p>
            </div>
            <Switch 
              checked={privacy.allowAnalytics} 
              onCheckedChange={() => setPrivacy({ ...privacy, allowAnalytics: !privacy.allowAnalytics })} 
            />
          </div>
        </div>
        <div className="pt-4 border-t border-[var(--border)]">
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
