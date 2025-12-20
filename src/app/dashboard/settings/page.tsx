"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
            <>
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
            </>
          ) : (
            <>
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
                        Acceso completo a todas las funcionalidades
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline">Ver Facturas</Button>
                      <Button>Cambiar Plan</Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
