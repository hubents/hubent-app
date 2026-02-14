"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RiStoreLine,
  RiInstagramLine,
  RiShieldCheckLine,
  RiTimeLine,
  RiSaveLine,
} from "@remixicon/react";
import { toast } from "sonner";

const PROVIDER_CATEGORIES = [
  "Catering",
  "Fotografía",
  "Video",
  "Música / DJ",
  "Decoración",
  "Florería",
  "Iluminación",
  "Sonido",
  "Mobiliario",
  "Transporte",
  "Animación",
  "Wedding Planner",
  "Pastelería",
  "Bartender",
  "Otro",
];

interface ProfileData {
  id: number;
  name: string;
  slug: string;
  logo: string | null;
  phone: string | null;
  website: string | null;
  address: string | null;
  instagramHandle: string | null;
  providerCategory: string | null;
  serviceRadius: number | null;
  serviceAreas: string[] | null;
  verificationStatus: string;
}

export default function VendorProfilePage() {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    phone: "",
    website: "",
    address: "",
    instagramHandle: "",
    providerCategory: "",
    serviceRadius: "",
  });

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await fetch("/api/vendor/profile");
        const data = await res.json();
        if (data.success) {
          setProfile(data.data);
          setForm({
            name: data.data.name || "",
            phone: data.data.phone || "",
            website: data.data.website || "",
            address: data.data.address || "",
            instagramHandle: data.data.instagramHandle || "",
            providerCategory: data.data.providerCategory || "",
            serviceRadius: data.data.serviceRadius?.toString() || "",
          });
        }
      } catch {
        toast.error("Error al cargar perfil");
      } finally {
        setLoading(false);
      }
    }
    fetchProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/vendor/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          phone: form.phone.trim() || "",
          website: form.website.trim() || "",
          address: form.address.trim() || "",
          instagramHandle: form.instagramHandle.trim() || "",
          providerCategory: form.providerCategory,
          serviceRadius: form.serviceRadius ? parseInt(form.serviceRadius) : undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Perfil actualizado");
      } else {
        toast.error(data.error?.message || "Error al guardar");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const statusConfig: Record<string, { label: string; variant: "default" | "secondary" | "destructive" }> = {
    verified: { label: "Verificado", variant: "default" },
    unverified: { label: "Pendiente de verificación", variant: "secondary" },
    rejected: { label: "Rechazado", variant: "destructive" },
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  if (!profile) {
    return <p className="text-muted-foreground">No se pudo cargar el perfil.</p>;
  }

  const status = statusConfig[profile.verificationStatus] || statusConfig.unverified;

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Mi Perfil</h1>
          <p className="text-muted-foreground text-sm">Información de tu empresa proveedora</p>
        </div>
        <Badge variant={status.variant} className="flex items-center gap-1">
          {profile.verificationStatus === "verified" ? (
            <RiShieldCheckLine className="h-3 w-3" />
          ) : (
            <RiTimeLine className="h-3 w-3" />
          )}
          {status.label}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RiStoreLine className="h-5 w-5" />
            Datos de la Empresa
          </CardTitle>
          <CardDescription>
            Slug público: <span className="font-mono text-foreground">/providers/{profile.slug}</span>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nombre de Empresa</label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Categoría</label>
              <Select
                value={form.providerCategory}
                onValueChange={(v) => setForm((p) => ({ ...p, providerCategory: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona" />
                </SelectTrigger>
                <SelectContent>
                  {PROVIDER_CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Radio de trabajo (km)</label>
              <Input
                type="number"
                value={form.serviceRadius}
                onChange={(e) => setForm((p) => ({ ...p, serviceRadius: e.target.value }))}
                placeholder="50"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium flex items-center gap-1">
              <RiInstagramLine className="h-4 w-4" />
              Instagram
            </label>
            <Input
              value={form.instagramHandle}
              onChange={(e) => setForm((p) => ({ ...p, instagramHandle: e.target.value }))}
              placeholder="@tuempresa"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Teléfono</label>
              <Input
                type="tel"
                value={form.phone}
                onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+54 11 1234-5678"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Sitio Web</label>
              <Input
                value={form.website}
                onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
                placeholder="https://tuempresa.com"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Dirección</label>
            <Input
              value={form.address}
              onChange={(e) => setForm((p) => ({ ...p, address: e.target.value }))}
              placeholder="Calle, Ciudad, País"
            />
          </div>

          <div className="pt-4">
            <Button onClick={handleSave} disabled={saving || !form.name.trim()}>
              <RiSaveLine className="h-4 w-4 mr-2" />
              {saving ? "Guardando..." : "Guardar Cambios"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
