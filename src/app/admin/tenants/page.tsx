"use client";

import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Building2, 
  Search, 
  Eye,
  UserCog,
  Ban,
  Plus,
  X,
  Loader2
} from "lucide-react";
import Link from "next/link";

interface Tenant {
  id: number;
  name: string;
  slug: string;
  status: string | null;
  planId: number | null;
  phone: string | null;
  website: string | null;
  createdAt: string | null;
}

interface Plan {
  id: number;
  name: string;
  slug: string;
}

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [planFilter, setPlanFilter] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    planId: "",
    phone: "",
    website: "",
  });

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const res = await fetch("/api/admin/tenants");
      const data = await res.json();
      setTenants(data.tenants || []);
      setPlans(data.plans || []);
    } catch (e) {
      console.error("Error fetching tenants:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError("");

    try {
      const res = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          slug: formData.slug,
          planId: formData.planId ? parseInt(formData.planId) : null,
          phone: formData.phone || null,
          website: formData.website || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Error al crear tenant");
        return;
      }

      setShowModal(false);
      setFormData({ name: "", slug: "", planId: "", phone: "", website: "" });
      fetchTenants();
    } catch (e) {
      setError("Error de conexión");
    } finally {
      setCreating(false);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
  };

  const getPlanName = (planId: number | null) => {
    if (!planId) return "Sin plan";
    const plan = plans.find((p) => p.id === planId);
    return plan?.name || "Desconocido";
  };

  const getStatusColor = (status: string | null) => {
    switch (status) {
      case "active":
        return "bg-green-500/10 text-green-500";
      case "suspended":
        return "bg-yellow-500/10 text-yellow-500";
      case "deleted":
        return "bg-red-500/10 text-red-500";
      default:
        return "bg-gray-500/10 text-gray-500";
    }
  };

  const filteredTenants = tenants.filter((tenant) => {
    const matchesSearch =
      !searchTerm ||
      tenant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      tenant.slug.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = !statusFilter || tenant.status === statusFilter;
    const matchesPlan =
      !planFilter || tenant.planId === parseInt(planFilter);
    return matchesSearch && matchesStatus && matchesPlan;
  });

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Tenants</h1>
          <p className="text-muted-foreground">
            Gestiona todas las organizaciones de la plataforma
          </p>
        </div>
        <Button onClick={() => setShowModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Tenant
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre o slug..."
                className="pl-10"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <select
              className="px-3 py-2 rounded-lg border border-border bg-background"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">Todos los estados</option>
              <option value="active">Activo</option>
              <option value="suspended">Suspendido</option>
              <option value="deleted">Eliminado</option>
            </select>
            <select
              className="px-3 py-2 rounded-lg border border-border bg-background"
              value={planFilter}
              onChange={(e) => setPlanFilter(e.target.value)}
            >
              <option value="">Todos los planes</option>
              {plans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Tenants Table */}
      <Card>
        <CardContent className="p-0">
          {filteredTenants.length === 0 ? (
            <div className="p-8 text-center">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No hay tenants</h3>
              <p className="text-sm text-muted-foreground">
                {searchTerm || statusFilter || planFilter
                  ? "No se encontraron resultados con los filtros aplicados"
                  : "Aún no se han registrado organizaciones en la plataforma"}
              </p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-4 font-medium text-muted-foreground">
                    Organización
                  </th>
                  <th className="text-left p-4 font-medium text-muted-foreground">
                    Plan
                  </th>
                  <th className="text-left p-4 font-medium text-muted-foreground">
                    Estado
                  </th>
                  <th className="text-left p-4 font-medium text-muted-foreground">
                    Creado
                  </th>
                  <th className="text-right p-4 font-medium text-muted-foreground">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.map((tenant) => (
                  <tr
                    key={tenant.id}
                    className="border-b border-border last:border-0 hover:bg-muted/50"
                  >
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Building2 className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{tenant.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {tenant.slug}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <Badge variant="secondary">
                        {getPlanName(tenant.planId)}
                      </Badge>
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(
                          tenant.status
                        )}`}
                      >
                        {tenant.status}
                      </span>
                    </td>
                    <td className="p-4 text-muted-foreground">
                      {tenant.createdAt
                        ? new Date(tenant.createdAt).toLocaleDateString()
                        : "-"}
                    </td>
                    <td className="p-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/tenants/${tenant.id}`}>
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                        <Button variant="ghost" size="sm">
                          <UserCog className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-500">
                          <Ban className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Create Tenant Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-card rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold">Nuevo Tenant</h2>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowModal(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <form onSubmit={handleCreateTenant} className="p-4 space-y-4">
              {error && (
                <div className="p-3 rounded-lg bg-red-500/10 text-red-500 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="name">Nombre de la organización *</Label>
                <Input
                  id="name"
                  placeholder="Mi Empresa S.A."
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      name: e.target.value,
                      slug: generateSlug(e.target.value),
                    });
                  }}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="slug">Slug (URL) *</Label>
                <Input
                  id="slug"
                  placeholder="mi-empresa"
                  value={formData.slug}
                  onChange={(e) =>
                    setFormData({ ...formData, slug: e.target.value })
                  }
                  required
                />
                <p className="text-xs text-muted-foreground">
                  Se usará en la URL: hubents.com/{formData.slug || "slug"}
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="plan">Plan</Label>
                <select
                  id="plan"
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background"
                  value={formData.planId}
                  onChange={(e) =>
                    setFormData({ ...formData, planId: e.target.value })
                  }
                >
                  <option value="">Sin plan</option>
                  {plans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Teléfono</Label>
                <Input
                  id="phone"
                  placeholder="+54 11 1234-5678"
                  value={formData.phone}
                  onChange={(e) =>
                    setFormData({ ...formData, phone: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="website">Sitio web</Label>
                <Input
                  id="website"
                  placeholder="https://miempresa.com"
                  value={formData.website}
                  onChange={(e) =>
                    setFormData({ ...formData, website: e.target.value })
                  }
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowModal(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" className="flex-1" disabled={creating}>
                  {creating ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Creando...
                    </>
                  ) : (
                    "Crear Tenant"
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
