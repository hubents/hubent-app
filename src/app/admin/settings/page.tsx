import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Settings, 
  Save,
  Globe,
  Mail,
  Shield,
  Database
} from "lucide-react";

export const dynamic = 'force-dynamic';

async function getSettings() {
  // Return empty array for now - settings will be loaded from DB later
  return [] as { key: string; value: string }[];
}

export default async function SettingsPage() {
  const settings = await getSettings();

  const getSettingValue = (key: string) => {
    const setting = settings.find((s) => s.key === key);
    return setting?.value || "";
  };

  return (
    <div className="p-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-[var(--muted-foreground)]">
          Configuración global de la plataforma HubEnts
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* General Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Globe className="h-5 w-5" />
              General
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre de la Plataforma</label>
              <Input
                defaultValue={getSettingValue("platform_name") || "HubEnts"}
                placeholder="Nombre de la plataforma"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">URL de la Plataforma</label>
              <Input
                defaultValue={getSettingValue("platform_url") || "https://hubents.com"}
                placeholder="https://..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Descripción</label>
              <textarea
                className="w-full px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--background)] min-h-[80px]"
                defaultValue={getSettingValue("platform_description") || "Plataforma de gestión de eventos"}
                placeholder="Descripción de la plataforma"
              />
            </div>
            <Button className="gap-2">
              <Save className="h-4 w-4" />
              Guardar
            </Button>
          </CardContent>
        </Card>

        {/* Email Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Mail className="h-5 w-5" />
              Email
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email de Soporte</label>
              <Input
                defaultValue={getSettingValue("support_email") || "soporte@hubents.com"}
                placeholder="soporte@..."
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Email de Notificaciones</label>
              <Input
                defaultValue={getSettingValue("notifications_email") || "no-reply@hubents.com"}
                placeholder="no-reply@..."
              />
            </div>
            <Button className="gap-2">
              <Save className="h-4 w-4" />
              Guardar
            </Button>
          </CardContent>
        </Card>

        {/* Security Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5" />
              Seguridad
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">Registro Abierto</p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Permitir que nuevos usuarios se registren
                </p>
              </div>
              <input
                type="checkbox"
                defaultChecked={getSettingValue("allow_registration") === "true"}
                className="w-5 h-5"
              />
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="font-medium">Verificación de Email</p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Requerir verificación de email
                </p>
              </div>
              <input
                type="checkbox"
                defaultChecked={getSettingValue("require_email_verification") === "true"}
                className="w-5 h-5"
              />
            </div>
            <Button className="gap-2">
              <Save className="h-4 w-4" />
              Guardar
            </Button>
          </CardContent>
        </Card>

        {/* Database Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Database className="h-5 w-5" />
              Base de Datos
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between py-2 border-b border-[var(--border)]">
              <span className="text-[var(--muted-foreground)]">Proveedor</span>
              <span className="font-medium">Neon PostgreSQL</span>
            </div>
            <div className="flex justify-between py-2 border-b border-[var(--border)]">
              <span className="text-[var(--muted-foreground)]">Región</span>
              <span className="font-medium">US East</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-[var(--muted-foreground)]">Estado</span>
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-green-500/10 text-green-500">
                Conectado
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
