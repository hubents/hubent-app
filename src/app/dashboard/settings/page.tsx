import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  RiUserLine,
  RiLockLine,
  RiNotification3Line,
  RiPaletteLine,
  RiGlobalLine,
  RiBankCardLine,
  RiTeamLine,
  RiShieldLine,
} from "@remixicon/react";

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
              {settingsSections.map((section, index) => (
                <button
                  key={section.id}
                  className={`flex w-full items-center gap-3 rounded-[var(--radius)] px-3 py-2.5 text-left text-sm transition-colors ${
                    index === 0
                      ? "bg-[var(--primary)] text-white"
                      : "text-[var(--muted-foreground)] hover:bg-[var(--muted)] hover:text-[var(--foreground)]"
                  }`}
                >
                  <section.icon className="h-5 w-5" />
                  <div>
                    <p className="font-medium">{section.title}</p>
                    <p
                      className={`text-xs ${
                        index === 0
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
          {/* Profile Section */}
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
                  <Input defaultValue="Juan" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Apellido</label>
                  <Input defaultValue="Demo" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input type="email" defaultValue="juan@hubents.com" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Teléfono</label>
                <Input type="tel" defaultValue="+34 612 345 678" />
              </div>
              <Button>Guardar Cambios</Button>
            </CardContent>
          </Card>

          {/* Company Section */}
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
                <Input defaultValue="HubEnts Wedding Planners" />
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium">NIF/CIF</label>
                  <Input defaultValue="B12345678" />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Sitio Web</label>
                  <Input defaultValue="https://hubents.com" />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Dirección</label>
                <Input defaultValue="Calle Principal 123, Madrid" />
              </div>
              <Button>Guardar Cambios</Button>
            </CardContent>
          </Card>

          {/* Plan Section */}
          <Card>
            <CardHeader>
              <CardTitle>Plan Actual</CardTitle>
              <CardDescription>
                Gestiona tu suscripción y facturación
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between rounded-lg border border-[var(--border)] p-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">Plan Pro</h3>
                    <Badge variant="success">Activo</Badge>
                  </div>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    $49/mes • Renovación: 15 Feb 2025
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline">Ver Facturas</Button>
                  <Button>Cambiar Plan</Button>
                </div>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-3">
                <div className="rounded-lg bg-[var(--muted)] p-4">
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Eventos Activos
                  </p>
                  <p className="text-2xl font-bold">12 / 25</p>
                </div>
                <div className="rounded-lg bg-[var(--muted)] p-4">
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Miembros del Equipo
                  </p>
                  <p className="text-2xl font-bold">6 / 10</p>
                </div>
                <div className="rounded-lg bg-[var(--muted)] p-4">
                  <p className="text-sm text-[var(--muted-foreground)]">
                    Almacenamiento
                  </p>
                  <p className="text-2xl font-bold">2.4 / 10 GB</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
