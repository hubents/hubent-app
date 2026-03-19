"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
  RiAlertLine,
  RiCheckLine,
  RiFileList3Line,
} from "@remixicon/react";
import { useRouter, useSearchParams } from "next/navigation";
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
  const searchParams = useSearchParams();
  const [actionLoading, setActionLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [billingData, setBillingData] = useState<{
    plan?: { name: string; slug: string; priceMonthly: string; priceYearly: string; features: string[] };
    subscription?: {
      status: string;
      hasStripeSubscription: boolean;
      trialEndsAt: string | null;
      currentPeriodEnd: string | null;
      cancelAt: string | null;
    };
    availablePlans?: Array<{ id: number; name: string; slug: string; priceMonthly: string }>;
    invoices?: Array<{
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
    }>;
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
      finally { setDataLoading(false); }
    }
    fetchBilling();
  }, []);

  useEffect(() => {
    const billing = searchParams.get("billing");
    if (billing === "success") {
      toast.success("Suscripción activada correctamente");
    } else if (billing === "cancelled") {
      toast.info("Checkout cancelado");
    }
  }, [searchParams]);

  const isFreePlan = billingData?.plan?.slug === "provider-free";
  const hasStripe = billingData?.subscription?.hasStripeSubscription === true;
  const status = billingData?.subscription?.status;

  function getStatusBadge(s: string) {
    const map: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
      active: { label: "Activo", variant: "default" },
      trialing: { label: "Prueba gratuita", variant: "secondary" },
      past_due: { label: "Pago pendiente", variant: "destructive" },
      canceled: { label: "Cancelado", variant: "outline" },
      paused: { label: "Pausado", variant: "outline" },
    };
    const info = map[s] || { label: s, variant: "outline" as const };
    return <Badge variant={info.variant}>{info.label}</Badge>;
  }

  function getTrialDaysLeft() {
    if (!billingData?.subscription?.trialEndsAt) return null;
    const end = new Date(billingData.subscription.trialEndsAt);
    const now = new Date();
    const days = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return days > 0 ? days : 0;
  }

  const openPortal = async () => {
    setActionLoading(true);
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
      setActionLoading(false);
    }
  };

  const handleUpgrade = async () => {
    setActionLoading(true);
    try {
      const proPlan = billingData?.availablePlans?.find(p => p.slug === "provider-pro");
      if (!proPlan) {
        toast.error("No hay planes de upgrade disponibles");
        setActionLoading(false);
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
      setActionLoading(false);
    }
  };

  if (dataLoading) {
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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RiBankCardLine className="h-5 w-5" />
          Plan y Facturación
        </CardTitle>
        <CardDescription>
          Gestiona tu suscripción y facturación
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between rounded-lg border border-border p-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-lg">
                {billingData?.plan?.name || "Sin plan"}
              </h3>
              {status && getStatusBadge(status)}
            </div>
            {billingData?.plan && !isFreePlan && (
              <p className="text-sm text-muted-foreground">
                €{billingData.plan.priceMonthly}/mes
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
                    style={{ width: `${Math.max(5, ((14 - trialDays) / 14) * 100)}%` }}
                  />
                </div>
              </div>
            )}
            {billingData?.subscription?.currentPeriodEnd && status === "active" && (
              <p className="text-xs text-muted-foreground">
                Próxima facturación: {new Date(billingData.subscription.currentPeriodEnd).toLocaleDateString()}
              </p>
            )}
          </div>
          <div className="flex gap-2">
            {hasStripe && (
              <Button variant="outline" onClick={openPortal} disabled={actionLoading}>
                {actionLoading ? "Cargando..." : "Gestionar"}
              </Button>
            )}
            {isFreePlan && (
              <Button onClick={handleUpgrade} disabled={actionLoading}>
                {actionLoading ? (
                  <RiLoader4Line className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RiExternalLinkLine className="h-4 w-4 mr-2" />
                )}
                Actualizar a Pro
              </Button>
            )}
          </div>
        </div>

        {status === "past_due" && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive flex items-start gap-2">
            <RiAlertLine className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <strong>Pago pendiente.</strong> No pudimos procesar tu último pago. Actualiza tu método de pago para evitar la suspensión del servicio.
              {hasStripe && (
                <Button variant="link" className="h-auto p-0 ml-1 text-destructive underline" onClick={openPortal}>
                  Actualizar pago
                </Button>
              )}
            </div>
          </div>
        )}

        {status === "canceled" && (
          <div className="p-3 rounded-lg bg-muted border border-border text-sm text-muted-foreground flex items-start gap-2">
            <RiAlertLine className="h-4 w-4 mt-0.5 shrink-0" />
            <span>Tu suscripción ha sido cancelada. Algunas funciones pueden estar limitadas.</span>
          </div>
        )}

        {isFreePlan && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm text-muted-foreground">
            Estás en el plan gratuito. Actualiza a <strong>Pro</strong> para desbloquear bloqueo inteligente de fechas, visibilidad premium y más.
          </div>
        )}

        {billingData?.plan?.features && billingData.plan.features.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Incluido en tu plan:</p>
            <div className="grid grid-cols-2 gap-1">
              {billingData.plan.features.map((feature, i) => (
                <div key={i} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <RiCheckLine className="h-4 w-4 text-green-500 shrink-0" />
                  {feature}
                </div>
              ))}
            </div>
          </div>
        )}

        {billingData?.invoices && billingData.invoices.length > 0 && (
          <div className="space-y-2 pt-4 border-t border-border">
            <p className="text-sm font-medium">Últimas facturas</p>
            <div className="space-y-1">
              {billingData.invoices.slice(0, 5).map((inv) => (
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
  );
}
