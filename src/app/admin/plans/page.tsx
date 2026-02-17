"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  CreditCard,
  Plus,
  Check,
  Edit,
  Trash2,
  Star,
  Users,
  Calendar,
  HardDrive,
  Globe,
  Loader2,
  X,
} from "lucide-react";
import { toast } from "sonner";

interface PlanLimits {
  maxUsers: number;
  maxEvents: number;
  maxStorage: number;
}

interface Plan {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  orgType: string | null;
  priceMonthly: string | null;
  priceYearly: string | null;
  currency: string | null;
  features: string[] | null;
  limits: PlanLimits | null;
  isActive: boolean | null;
  highlighted: boolean | null;
  sortOrder: number | null;
  trialDays: number | null;
  stripeProductId: string | null;
  stripePriceIdMonthly: string | null;
  stripePriceIdYearly: string | null;
}

const EMPTY_PLAN = {
  name: "",
  slug: "",
  description: "",
  orgType: "tenant",
  priceMonthly: "0",
  priceYearly: "0",
  currency: "EUR",
  features: [] as string[],
  limits: { maxUsers: 1, maxEvents: 1, maxStorage: 500 },
  isActive: true,
  highlighted: false,
  sortOrder: 0,
  trialDays: 14,
};

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"tenant" | "provider">("tenant");

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [form, setForm] = useState(EMPTY_PLAN);
  const [featureInput, setFeatureInput] = useState("");
  const [saving, setSaving] = useState(false);

  // Delete dialog
  const [deleteDialog, setDeleteDialog] = useState<Plan | null>(null);

  const fetchPlans = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/plans");
      const data = await res.json();
      if (data.success) {
        setPlans(data.data.filter((p: Plan) => p.isActive));
      }
    } catch {
      toast.error("Error al cargar planes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const filteredPlans = plans.filter((p) => p.orgType === activeTab);

  function openCreate() {
    setEditingPlan(null);
    setForm({ ...EMPTY_PLAN, orgType: activeTab });
    setFeatureInput("");
    setDrawerOpen(true);
  }

  function openEdit(plan: Plan) {
    setEditingPlan(plan);
    setForm({
      name: plan.name,
      slug: plan.slug,
      description: plan.description || "",
      orgType: plan.orgType || "tenant",
      priceMonthly: plan.priceMonthly || "0",
      priceYearly: plan.priceYearly || "0",
      currency: plan.currency || "EUR",
      features: plan.features || [],
      limits: plan.limits || { maxUsers: 1, maxEvents: 1, maxStorage: 500 },
      isActive: plan.isActive ?? true,
      highlighted: plan.highlighted ?? false,
      sortOrder: plan.sortOrder ?? 0,
      trialDays: plan.trialDays ?? 14,
    });
    setFeatureInput("");
    setDrawerOpen(true);
  }

  async function handleSave() {
    if (!form.name || !form.slug) {
      toast.error("Nombre y slug son requeridos");
      return;
    }

    setSaving(true);
    try {
      const url = editingPlan
        ? `/api/admin/plans/${editingPlan.id}`
        : "/api/admin/plans";
      const method = editingPlan ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(editingPlan ? "Plan actualizado" : "Plan creado");
        setDrawerOpen(false);
        fetchPlans();
      } else {
        toast.error(data.error || "Error al guardar");
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(plan: Plan) {
    try {
      const res = await fetch(`/api/admin/plans/${plan.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Plan desactivado");
        setDeleteDialog(null);
        fetchPlans();
      } else {
        toast.error(data.error || "Error al eliminar");
      }
    } catch {
      toast.error("Error de conexión");
    }
  }

  function addFeature() {
    const trimmed = featureInput.trim();
    if (trimmed && !form.features.includes(trimmed)) {
      setForm({ ...form, features: [...form.features, trimmed] });
      setFeatureInput("");
    }
  }

  function removeFeature(idx: number) {
    setForm({
      ...form,
      features: form.features.filter((_, i) => i !== idx),
    });
  }

  function generateSlug(name: string) {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--muted-foreground)]" />
      </div>
    );
  }

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Planes de Suscripción</h1>
          <p className="text-sm text-[var(--muted-foreground)]">
            Gestiona planes y precios · Moneda base: EUR · Adaptive Pricing convierte automáticamente
          </p>
        </div>
        <Button className="gap-2" onClick={openCreate}>
          <Plus className="h-4 w-4" />
          Nuevo Plan
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 p-1 bg-[var(--muted)]/50 rounded-lg w-fit">
        <button
          onClick={() => setActiveTab("tenant")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "tenant"
              ? "bg-[var(--background)] shadow-sm"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          Wedding Planners
        </button>
        <button
          onClick={() => setActiveTab("provider")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeTab === "provider"
              ? "bg-[var(--background)] shadow-sm"
              : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
          }`}
        >
          Proveedores
        </button>
      </div>

      {/* Plans Grid */}
      {filteredPlans.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <CreditCard className="h-12 w-12 mx-auto text-[var(--muted-foreground)] mb-4" />
            <h3 className="font-medium mb-2">
              No hay planes de {activeTab === "tenant" ? "wedding planners" : "proveedores"}
            </h3>
            <Button className="gap-2 mt-2" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Crear Plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPlans.map((plan) => (
            <Card
              key={plan.id}
              className={`relative ${
                plan.highlighted
                  ? "ring-2 ring-[var(--primary)]"
                  : ""
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="gap-1">
                    <Star className="h-3 w-3" />
                    POPULAR
                  </Badge>
                </div>
              )}
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between">
                  <span>{plan.name}</span>
                  <Badge variant="outline" className="text-xs font-normal">
                    {plan.currency || "EUR"}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Pricing */}
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">
                      €{plan.priceMonthly}
                    </span>
                    <span className="text-[var(--muted-foreground)]">/mes</span>
                  </div>
                  {plan.priceYearly && Number(plan.priceYearly) > 0 && (
                    <p className="text-sm text-[var(--muted-foreground)]">
                      €{plan.priceYearly}/año
                    </p>
                  )}
                </div>

                {plan.description && (
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {plan.description}
                  </p>
                )}

                {/* Limits */}
                {plan.limits && (
                  <div className="space-y-1.5 pt-3 border-t border-[var(--border)]">
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                      {plan.limits.maxUsers === -1
                        ? "Usuarios ilimitados"
                        : `${plan.limits.maxUsers} usuario${plan.limits.maxUsers > 1 ? "s" : ""}`}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                      {plan.limits.maxEvents === -1
                        ? "Eventos ilimitados"
                        : `${plan.limits.maxEvents} evento${plan.limits.maxEvents > 1 ? "s" : ""}`}
                    </div>
                    <div className="flex items-center gap-2 text-sm">
                      <HardDrive className="h-3.5 w-3.5 text-[var(--muted-foreground)]" />
                      {plan.limits.maxStorage === -1
                        ? "Storage ilimitado"
                        : `${plan.limits.maxStorage} MB`}
                    </div>
                  </div>
                )}

                {/* Features */}
                {plan.features && plan.features.length > 0 && (
                  <div className="space-y-1.5 pt-3 border-t border-[var(--border)]">
                    {plan.features.map((feature, i) => (
                      <div key={i} className="flex items-center gap-2 text-sm">
                        <Check className="h-3.5 w-3.5 text-green-500 shrink-0" />
                        {feature}
                      </div>
                    ))}
                  </div>
                )}

                {/* Stripe Status */}
                <div className="pt-3 border-t border-[var(--border)]">
                  {plan.stripeProductId ? (
                    <Badge variant="outline" className="text-xs text-green-600">
                      <Globe className="h-3 w-3 mr-1" />
                      Stripe sincronizado
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-xs text-amber-600">
                      Sin Stripe
                    </Badge>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 gap-1"
                    onClick={() => openEdit(plan)}
                  >
                    <Edit className="h-4 w-4" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-500"
                    onClick={() => setDeleteDialog(plan)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create/Edit Drawer */}
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetContent className="overflow-y-auto w-full sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>
              {editingPlan ? `Editar: ${editingPlan.name}` : "Nuevo Plan"}
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-6 py-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <div>
                <Label>Nombre</Label>
                <Input
                  value={form.name}
                  onChange={(e) => {
                    const name = e.target.value;
                    setForm({
                      ...form,
                      name,
                      slug: !editingPlan ? generateSlug(name) : form.slug,
                    });
                  }}
                />
              </div>
              <div>
                <Label>Slug</Label>
                <Input
                  value={form.slug}
                  onChange={(e) =>
                    setForm({ ...form, slug: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Descripción</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={2}
                />
              </div>
              <div>
                <Label>Tipo de organización</Label>
                <Select
                  value={form.orgType}
                  onValueChange={(v) => setForm({ ...form, orgType: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="tenant">Wedding Planner</SelectItem>
                    <SelectItem value="provider">Proveedor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Pricing */}
            <div className="space-y-4">
              <h3 className="font-medium">Precios (EUR)</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Mensual (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.priceMonthly}
                    onChange={(e) =>
                      setForm({ ...form, priceMonthly: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Anual (€)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={form.priceYearly}
                    onChange={(e) =>
                      setForm({ ...form, priceYearly: e.target.value })
                    }
                  />
                </div>
              </div>
              <p className="text-xs text-[var(--muted-foreground)]">
                Precios en EUR. Stripe Adaptive Pricing convierte automáticamente a la moneda local del cliente.
              </p>
            </div>

            {/* Limits */}
            <div className="space-y-4">
              <h3 className="font-medium">Límites</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Usuarios</Label>
                  <Input
                    type="number"
                    value={form.limits.maxUsers}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        limits: {
                          ...form.limits,
                          maxUsers: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                  />
                  <p className="text-xs text-[var(--muted-foreground)] mt-1">
                    -1 = ilimitados
                  </p>
                </div>
                <div>
                  <Label>Eventos</Label>
                  <Input
                    type="number"
                    value={form.limits.maxEvents}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        limits: {
                          ...form.limits,
                          maxEvents: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Storage (MB)</Label>
                  <Input
                    type="number"
                    value={form.limits.maxStorage}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        limits: {
                          ...form.limits,
                          maxStorage: parseInt(e.target.value) || 0,
                        },
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="space-y-4">
              <h3 className="font-medium">Características</h3>
              <div className="flex gap-2">
                <Input
                  value={featureInput}
                  onChange={(e) => setFeatureInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addFeature();
                    }
                  }}
                  placeholder="Ej: CRM de contactos"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={addFeature}
                  type="button"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-1">
                {form.features.map((f, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between text-sm bg-[var(--muted)]/50 rounded px-3 py-1.5"
                  >
                    <span className="flex items-center gap-2">
                      <Check className="h-3.5 w-3.5 text-green-500" />
                      {f}
                    </span>
                    <button
                      onClick={() => removeFeature(i)}
                      className="text-[var(--muted-foreground)] hover:text-red-500"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Options */}
            <div className="space-y-4">
              <h3 className="font-medium">Opciones</h3>
              <div className="flex items-center justify-between">
                <Label>Plan destacado (POPULAR)</Label>
                <Switch
                  checked={form.highlighted}
                  onCheckedChange={(v) =>
                    setForm({ ...form, highlighted: v })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label>Activo</Label>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(v) =>
                    setForm({ ...form, isActive: v })
                  }
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Días de trial</Label>
                  <Input
                    type="number"
                    value={form.trialDays}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        trialDays: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Orden</Label>
                  <Input
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        sortOrder: parseInt(e.target.value) || 0,
                      })
                    }
                  />
                </div>
              </div>
            </div>

            {/* Save */}
            <Button
              className="w-full gap-2"
              onClick={handleSave}
              disabled={saving}
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              {editingPlan ? "Guardar Cambios" : "Crear Plan"}
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteDialog}
        onOpenChange={() => setDeleteDialog(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Desactivar plan?</AlertDialogTitle>
            <AlertDialogDescription>
              El plan &quot;{deleteDialog?.name}&quot; será desactivado. Los tenants con
              este plan activo no serán afectados, pero no se podrán crear
              nuevas suscripciones.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-500 hover:bg-red-600"
              onClick={() => deleteDialog && handleDelete(deleteDialog)}
            >
              Desactivar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
