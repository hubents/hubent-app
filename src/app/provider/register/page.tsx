"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RiInstagramLine, RiStoreLine } from "@remixicon/react";
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

export default function ProviderRegisterPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    companyName: "",
    email: "",
    password: "",
    confirmPassword: "",
    instagram: "",
    category: "",
    phone: "",
    serviceRadius: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = () => {
    const newErrors: Record<string, string> = {};
    if (!form.companyName.trim()) newErrors.companyName = "Nombre de empresa requerido";
    if (!form.email.trim()) newErrors.email = "Email requerido";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) newErrors.email = "Email inválido";
    if (form.password.length < 8) newErrors.password = "Mínimo 8 caracteres";
    if (form.password !== form.confirmPassword) newErrors.confirmPassword = "Las contraseñas no coinciden";
    if (!form.instagram.trim()) newErrors.instagram = "Instagram es obligatorio";
    if (!form.category) newErrors.category = "Selecciona una categoría";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/provider-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName: form.companyName.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          instagram: form.instagram.trim(),
          category: form.category,
          phone: form.phone.trim() || undefined,
          serviceRadius: form.serviceRadius ? parseInt(form.serviceRadius) : undefined,
        }),
      });

      const data = await res.json();

      if (!data.success) {
        if (data.error?.code === "EMAIL_EXISTS") {
          setErrors({ email: "Este email ya está registrado" });
        } else {
          toast.error(data.error?.message || "Error al registrar");
        }
        return;
      }

      // Auto-login after registration
      const loginResult = await signIn("credentials", {
        email: form.email.trim().toLowerCase(),
        password: form.password,
        redirect: false,
      });

      if (loginResult?.ok) {
        toast.success("¡Registro exitoso!", {
          description: "Bienvenido a HubEnts",
        });
        router.push("/onboarding?welcome=true");
      } else {
        toast.success("Cuenta creada. Inicia sesión para continuar.");
        router.push("/auth/login");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <Image
            src="/images/isotipo-dark.png"
            alt="HubEnts"
            width={48}
            height={48}
            className="mx-auto mb-4"
          />
          <h1 className="text-3xl font-bold">Portal de Proveedores</h1>
          <p className="text-muted-foreground mt-1">
            Registra tu empresa y conecta con planificadores de eventos
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <RiStoreLine className="h-5 w-5" />
              Registro de Proveedor
            </CardTitle>
            <CardDescription>
              Completa los datos de tu empresa para crear tu cuenta
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre de Empresa *</label>
                <Input
                  value={form.companyName}
                  onChange={(e) => updateField("companyName", e.target.value)}
                  className={errors.companyName ? "border-red-500" : ""}
                />
                {errors.companyName && <p className="text-sm text-red-500">{errors.companyName}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Email *</label>
                <Input
                  type="email"
                  value={form.email}
                  onChange={(e) => updateField("email", e.target.value)}
                  className={errors.email ? "border-red-500" : ""}
                />
                {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Contraseña *</label>
                  <Input
                    type="password"
                    value={form.password}
                    onChange={(e) => updateField("password", e.target.value)}
                    className={errors.password ? "border-red-500" : ""}
                  />
                  {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Confirmar *</label>
                  <Input
                    type="password"
                    value={form.confirmPassword}
                    onChange={(e) => updateField("confirmPassword", e.target.value)}
                    className={errors.confirmPassword ? "border-red-500" : ""}
                  />
                  {errors.confirmPassword && <p className="text-sm text-red-500">{errors.confirmPassword}</p>}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-1">
                  <RiInstagramLine className="h-4 w-4" />
                  Instagram *
                </label>
                <Input
                  value={form.instagram}
                  onChange={(e) => updateField("instagram", e.target.value)}
                  placeholder="@tuempresa"
                  className={errors.instagram ? "border-red-500" : ""}
                />
                {errors.instagram && <p className="text-sm text-red-500">{errors.instagram}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Categoría *</label>
                <Select value={form.category} onValueChange={(v) => updateField("category", v)}>
                  <SelectTrigger className={errors.category ? "border-red-500" : ""}>
                    <SelectValue placeholder="Selecciona una categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROVIDER_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category && <p className="text-sm text-red-500">{errors.category}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Teléfono</label>
                  <Input
                    type="tel"
                    value={form.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="+34 612 345 678"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Radio de trabajo (km)</label>
                  <Input
                    type="number"
                    value={form.serviceRadius}
                    onChange={(e) => updateField("serviceRadius", e.target.value)}
                    placeholder="50"
                  />
                </div>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Registrando..." : "Crear Cuenta de Proveedor"}
              </Button>
            </form>

            <div className="mt-6 text-center text-sm text-muted-foreground">
              ¿Ya tienes cuenta?{" "}
              <Link href="/provider/login" className="text-primary font-medium hover:underline">
                Iniciar Sesión
              </Link>
            </div>
            <div className="mt-2 text-center text-sm text-muted-foreground">
              ¿Eres planificador?{" "}
              <Link href="/auth/login" className="text-primary font-medium hover:underline">
                Accede aquí
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
