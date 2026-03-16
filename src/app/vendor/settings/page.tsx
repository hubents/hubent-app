"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserSession } from "@/hooks/use-user-session";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RiSettings4Line,
  RiLockLine,
  RiSaveLine,
  RiPlugLine,
  RiBankCardLine,
  RiLoader4Line,
  RiExternalLinkLine,
} from "@remixicon/react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  TIMEZONES,
  CURRENCIES,
  LANGUAGES,
  DATE_FORMATS,
  DEFAULT_LOCALE_SETTINGS,
} from "@/lib/constants/locale";
import type { OrgLocaleSettings } from "@/lib/constants/locale";

export default function VendorSettingsPage() {
  const router = useRouter();
  const { can } = useUserSession();
  const canUpdateSettings = can("settings:update");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [settings, setSettings] = useState<OrgLocaleSettings>({
    ...DEFAULT_LOCALE_SETTINGS,
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    async function fetchSettings() {
      try {
        const res = await fetch("/api/vendor/profile");
        const data = await res.json();
        if (data.success && data.data) {
          const orgSettings = data.data.settings || {};
          setSettings({
            timezone: orgSettings.timezone || DEFAULT_LOCALE_SETTINGS.timezone,
            currency: orgSettings.currency || DEFAULT_LOCALE_SETTINGS.currency,
            language: orgSettings.language || DEFAULT_LOCALE_SETTINGS.language,
            dateFormat: orgSettings.dateFormat || DEFAULT_LOCALE_SETTINGS.dateFormat,
          });
        }
      } catch {
        // Use defaults
      } finally {
        setLoading(false);
      }
    }
    fetchSettings();
  }, []);

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/vendor/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Configuración guardada");
      } else {
        toast.error(data.error?.message || "Error al guardar");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordForm.newPassword.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres");
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("Las contraseñas no coinciden");
      return;
    }

    setChangingPassword(true);
    try {
      const res = await fetch("/api/user/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Contraseña actualizada");
        setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      } else {
        toast.error(data.error?.message || "Error al cambiar contraseña");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-muted-foreground text-sm">Ajustes generales de tu cuenta</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RiSettings4Line className="h-5 w-5" />
            General
          </CardTitle>
          <CardDescription>Zona horaria, moneda y preferencias</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Zona Horaria</label>
              <Select
                value={settings.timezone}
                onValueChange={(v) => setSettings((p) => ({ ...p, timezone: v }))}
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
            <div className="space-y-2">
              <label className="text-sm font-medium">Moneda</label>
              <Select
                value={settings.currency}
                onValueChange={(v) => setSettings((p) => ({ ...p, currency: v }))}
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Idioma</label>
              <Select
                value={settings.language}
                onValueChange={(v) => setSettings((p) => ({ ...p, language: v }))}
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
              <label className="text-sm font-medium">Formato de Fecha</label>
              <Select
                value={settings.dateFormat}
                onValueChange={(v) => setSettings((p) => ({ ...p, dateFormat: v }))}
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
          </div>

          {canUpdateSettings && (
            <div className="pt-2">
              <Button onClick={handleSaveSettings} disabled={saving}>
                <RiSaveLine className="h-4 w-4 mr-2" />
                {saving ? "Guardando..." : "Guardar"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <BillingCard />

      <Card
        className="cursor-pointer hover:border-primary/50 transition-colors"
        onClick={() => router.push("/vendor/settings/integrations")}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RiPlugLine className="h-5 w-5" />
            Integraciones
          </CardTitle>
          <CardDescription>Gmail, WhatsApp y más</CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RiLockLine className="h-5 w-5" />
            Cambiar Contraseña
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Contraseña Actual</label>
            <Input
              type="password"
              value={passwordForm.currentPassword}
              onChange={(e) => setPasswordForm((p) => ({ ...p, currentPassword: e.target.value }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nueva Contraseña</label>
              <Input
                type="password"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm((p) => ({ ...p, newPassword: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Confirmar</label>
              <Input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm((p) => ({ ...p, confirmPassword: e.target.value }))}
              />
            </div>
          </div>

          <div className="pt-2">
            <Button
              onClick={handleChangePassword}
              disabled={changingPassword || !passwordForm.currentPassword || !passwordForm.newPassword}
              variant="outline"
            >
              {changingPassword ? "Cambiando..." : "Cambiar Contraseña"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function BillingCard() {
  const [loading, setLoading] = useState(false);
  const [billingData, setBillingData] = useState<{
    plan?: { name: string; slug: string };
    subscription?: { status: string; stripeCustomerId?: string | null };
    availablePlans?: Array<{ id: number; name: string; slug: string; priceMonthly: string }>;
  } | null>(null);

  useEffect(() => {
    async function fetchBilling() {
      try {
        const res = await fetch("/api/user/billing");
        const data = await res.json();
        if (data.success && data.data) {
          setBillingData(data.data);
        }
      } catch { /* silent */ }
    }
    fetchBilling();
  }, []);

  const isFreePlan = billingData?.plan?.slug === "provider-free";

  const openPortal = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/subscriptions/portal", { method: "POST" });
      const data = await res.json();
      if (data.success && data.data?.url) {
        window.location.href = data.data.url;
      } else {
        toast.error("No se pudo abrir el portal de facturación");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async () => {
    setLoading(true);
    try {
      const proPlan = billingData?.availablePlans?.find(p => p.slug === "provider-pro");
      if (!proPlan) {
        toast.error("No hay planes de upgrade disponibles");
        return;
      }
      const res = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: proPlan.id, interval: "month" }),
      });
      const data = await res.json();
      if (data.success && data.data?.url) {
        window.location.href = data.data.url;
      } else {
        toast.error(data.error || "Error al iniciar el checkout");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RiBankCardLine className="h-5 w-5" />
          Plan y Facturación
        </CardTitle>
        <CardDescription>
          {billingData?.plan ? `Plan actual: ${billingData.plan.name}` : "Gestiona tu suscripción y facturación"}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isFreePlan && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm text-muted-foreground">
            Estás en el plan gratuito. Actualiza a <strong>Pro</strong> para desbloquear bloqueo inteligente de fechas, visibilidad premium y más.
          </div>
        )}
        <div className="flex gap-2">
          {isFreePlan ? (
            <Button onClick={handleUpgrade} disabled={loading}>
              {loading ? (
                <RiLoader4Line className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RiExternalLinkLine className="h-4 w-4 mr-2" />
              )}
              {loading ? "Procesando..." : "Actualizar a Pro"}
            </Button>
          ) : (
            <Button variant="outline" onClick={openPortal} disabled={loading}>
              {loading ? (
                <RiLoader4Line className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <RiExternalLinkLine className="h-4 w-4 mr-2" />
              )}
              {loading ? "Abriendo..." : "Gestionar Suscripción"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
