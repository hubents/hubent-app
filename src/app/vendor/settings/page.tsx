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

const TIMEZONES = [
  "America/Argentina/Buenos_Aires",
  "America/Sao_Paulo",
  "America/Santiago",
  "America/Bogota",
  "America/Mexico_City",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/Madrid",
  "Europe/London",
  "UTC",
];

const CURRENCIES = ["ARS", "USD", "EUR", "BRL", "CLP", "COP", "MXN", "GBP"];

export default function VendorSettingsPage() {
  const router = useRouter();
  const { can } = useUserSession();
  const canUpdateSettings = can("settings:update");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [settings, setSettings] = useState({
    timezone: "America/Argentina/Buenos_Aires",
    currency: "ARS",
    language: "es",
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
            timezone: orgSettings.timezone || "America/Argentina/Buenos_Aires",
            currency: orgSettings.currency || "ARS",
            language: orgSettings.language || "es",
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
                    <SelectItem key={tz} value={tz}>{tz}</SelectItem>
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
                    <SelectItem key={c} value={c}>{c}</SelectItem>
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
  const [plan, setPlan] = useState<{ name: string; status: string } | null>(null);

  useEffect(() => {
    async function fetchBilling() {
      try {
        const res = await fetch("/api/user/billing");
        const data = await res.json();
        if (data.success && data.data?.plan) {
          setPlan({ name: data.data.plan.name, status: data.data.subscription?.status || "active" });
        }
      } catch { /* silent */ }
    }
    fetchBilling();
  }, []);

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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RiBankCardLine className="h-5 w-5" />
          Plan y Facturación
        </CardTitle>
        <CardDescription>
          {plan ? `Plan actual: ${plan.name}` : "Gestiona tu suscripción y facturación"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Button variant="outline" onClick={openPortal} disabled={loading}>
          {loading ? (
            <RiLoader4Line className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <RiExternalLinkLine className="h-4 w-4 mr-2" />
          )}
          {loading ? "Abriendo..." : "Gestionar Suscripción"}
        </Button>
      </CardContent>
    </Card>
  );
}
