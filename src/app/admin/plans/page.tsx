import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  CreditCard, 
  Plus,
  Check,
  Edit,
  Trash2
} from "lucide-react";
import { db } from "@/db";
import { subscriptionPlans } from "@/db/schema";

export const dynamic = 'force-dynamic';

async function getPlans() {
  return await db
    .select()
    .from(subscriptionPlans)
    .orderBy(subscriptionPlans.sortOrder);
}

export default async function PlansPage() {
  const plans = await getPlans();

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">Planes de Suscripción</h1>
          <p className="text-[var(--muted-foreground)]">
            Configura los planes disponibles para los tenants
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nuevo Plan
        </Button>
      </div>

      {/* Plans Grid */}
      {plans.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <CreditCard className="h-12 w-12 mx-auto text-[var(--muted-foreground)] mb-4" />
            <h3 className="font-medium mb-2">No hay planes configurados</h3>
            <p className="text-sm text-[var(--muted-foreground)] mb-4">
              Crea tu primer plan de suscripción para comenzar
            </p>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Crear Plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card key={plan.id} className="relative">
              {!plan.isActive && (
                <div className="absolute top-4 right-4">
                  <Badge variant="secondary">Inactivo</Badge>
                </div>
              )}
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-[var(--primary)]/10">
                    <CreditCard className="h-5 w-5 text-[var(--primary)]" />
                  </div>
                  {plan.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Pricing */}
                <div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold">
                      ${plan.priceMonthly}
                    </span>
                    <span className="text-[var(--muted-foreground)]">/mes</span>
                  </div>
                  {plan.priceYearly && Number(plan.priceYearly) > 0 && (
                    <p className="text-sm text-[var(--muted-foreground)]">
                      ${plan.priceYearly}/año (ahorra 2 meses)
                    </p>
                  )}
                </div>

                {/* Description */}
                {plan.description && (
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {plan.description}
                  </p>
                )}

                {/* Limits */}
                {plan.limits && (
                  <div className="space-y-2 pt-4 border-t border-[var(--border)]">
                    <p className="text-sm font-medium">Límites:</p>
                    <ul className="space-y-1 text-sm text-[var(--muted-foreground)]">
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        {plan.limits.maxUsers === -1 ? "Usuarios ilimitados" : `${plan.limits.maxUsers} usuarios`}
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        {plan.limits.maxEvents === -1 ? "Eventos ilimitados" : `${plan.limits.maxEvents} eventos`}
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="h-4 w-4 text-green-500" />
                        {plan.limits.maxStorage === -1 ? "Storage ilimitado" : `${plan.limits.maxStorage} MB storage`}
                      </li>
                    </ul>
                  </div>
                )}

                {/* Features */}
                {plan.features && plan.features.length > 0 && (
                  <div className="space-y-2 pt-4 border-t border-[var(--border)]">
                    <p className="text-sm font-medium">Características:</p>
                    <ul className="space-y-1 text-sm text-[var(--muted-foreground)]">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center gap-2 pt-4">
                  <Button variant="outline" size="sm" className="flex-1 gap-1">
                    <Edit className="h-4 w-4" />
                    Editar
                  </Button>
                  <Button variant="outline" size="sm" className="text-red-500">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
