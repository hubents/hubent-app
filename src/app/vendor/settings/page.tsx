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
  RiAlertLine,
  RiCheckLine,
  RiFileList3Line,
  RiSparklingLine,
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
    plan?: {
      id: number; name: string; slug: string; priceMonthly: string; priceYearly: string;
      features: string[];
      limits?: { maxUsers: number; maxEvents: number; maxStorage: number };
      trialDays?: number;
    };
    subscription?: {
      status: string;
      hasStripeSubscription: boolean;
      trialEndsAt: string | null;
      currentPeriodEnd: string | null;
      cancelAt: string | null;
    };
    usage?: {
      users: number;
      events: number;
      storage: number;
    };
    availablePlans?: Array<{
      id: number; name: string; slug: string; description?: string;
      priceMonthly: string; priceYearly: string; currency?: string;
      features?: string[]; highlighted?: boolean;
      stripePriceIdMonthly?: string; stripePriceIdYearly?: string;
    }>;
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
  const [showPlans, setShowPlans] = useState(false);
  const [billingInterval, setBillingInterval] = useState<"month" | "year">("month");
  const [checkoutLoading, setCheckoutLoading] = useState<number | null>(null);

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

  const isFreePlan = !billingData?.plan || billingData.plan.slug === "provider-free";
  const hasStripe = billingData?.subscription?.hasStripeSubscription === true;

  useEffect(() => {
    const billing = searchParams.get("billing");
    if (billing === "success") {
      toast.success("Suscripción activada correctamente");
    } else if (billing === "cancelled") {
      toast.info("Checkout cancelado");
    } else if (billing === "upgrade") {
      setShowPlans(true);
    } else if (billing === "update-payment") {
      toast.warning("Actualiza tu método de pago para evitar la suspensión del servicio.");
      if (hasStripe) {
        openPortal();
      }
    }
  }, [searchParams, hasStripe]);
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

  const handleCheckout = async (planId: number) => {
    setCheckoutLoading(planId);
    try {
      const res = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId, interval: billingInterval }),
      });
      const data = await res.json();
      if (data.success && data.data?.url) {
        window.location.href = data.data.url;
      } else {
        toast.error(data.error || "Error al crear checkout");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setCheckoutLoading(null);
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
    <>
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RiBankCardLine className="h-5 w-5" />
          Plan y Facturación
        </CardTitle>
        <CardDescription>
          Gestiona tu suscripción · Precios en EUR · Tu moneda local se aplica al pagar
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
            {billingData?.plan && (
              <p className="text-sm text-muted-foreground">
                €{billingData.plan.priceMonthly}/mes · €{billingData.plan.priceYearly}/año
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
                    style={{ width: `${Math.max(5, (((billingData?.plan?.trialDays ?? 14) - trialDays) / (billingData?.plan?.trialDays ?? 14)) * 100)}%` }}
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
            <Button onClick={() => setShowPlans(true)}>
              Cambiar Plan
            </Button>
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

        {isFreePlan && status !== "canceled" && (
          <div className="p-3 rounded-lg bg-primary/5 border border-primary/20 text-sm flex items-start gap-2">
            <RiSparklingLine className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
            <div>
              <strong>Desbloquea más con Pro</strong> — Obtén bloqueo inteligente de fechas, prioridad en el directorio y más funcionalidades avanzadas.
              <Button variant="link" className="h-auto p-0 ml-1 text-primary underline" onClick={() => setShowPlans(true)}>
                Ver planes
              </Button>
            </div>
          </div>
        )}

        {billingData?.plan?.limits && billingData.usage && (
          <div className="space-y-2">
            <p className="text-sm font-medium">Uso actual</p>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Usuarios", used: billingData.usage.users, max: billingData.plan.limits.maxUsers },
                { label: "Eventos", used: billingData.usage.events, max: billingData.plan.limits.maxEvents },
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

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {billingData?.availablePlans?.map((plan) => {
              const isCurrent = plan.id === billingData?.plan?.id;
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
