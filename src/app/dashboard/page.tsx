import { StatsCard } from "@/components/dashboard/stats-card";
import { RecentEvents } from "@/components/dashboard/recent-events";
import { PendingTasks } from "@/components/dashboard/pending-tasks";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  RiCalendarEventLine,
  RiFileListLine,
  RiMoneyDollarCircleLine,
  RiUserAddLine,
  RiArrowRightUpLine,
  RiTimeLine,
} from "@remixicon/react";
import { mockStats } from "@/lib/mock-data";

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="animate-fade-in">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-[var(--muted-foreground)]">
          Bienvenido de vuelta. Aquí está el resumen de tu actividad.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div className="animate-slide-in-bottom stagger-1">
          <StatsCard
            title="Eventos Activos"
            value={mockStats.totalEvents}
            description="3 este mes"
            icon={RiCalendarEventLine}
            trend={{ value: 12, isPositive: true }}
          />
        </div>
        <div className="animate-slide-in-bottom stagger-2">
          <StatsCard
            title="Tareas Pendientes"
            value={mockStats.pendingTasks}
            description="8 vencen esta semana"
            icon={RiFileListLine}
            trend={{ value: 5, isPositive: false }}
          />
        </div>
        <div className="animate-slide-in-bottom stagger-3">
          <StatsCard
            title="Pagos Pendientes"
            value={mockStats.pendingPayments}
            description="$12,500 por cobrar"
            icon={RiMoneyDollarCircleLine}
          />
        </div>
        <div className="animate-slide-in-bottom stagger-4">
          <StatsCard
            title="Leads Activos"
            value={mockStats.activeLeads}
            description="5 nuevos esta semana"
            icon={RiUserAddLine}
            trend={{ value: 23, isPositive: true }}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-4 animate-fade-in">
        <Card className="cursor-pointer transition-all hover:shadow-lg hover:border-[var(--primary)] hover:-translate-y-1 bg-[var(--primary)] text-[var(--primary-foreground)]">
          <CardContent className="p-4 flex items-center gap-3">
            <RiCalendarEventLine className="h-8 w-8" />
            <div>
              <p className="font-semibold">Nuevo Evento</p>
              <p className="text-xs opacity-80">Crear evento rápido</p>
            </div>
            <RiArrowRightUpLine className="h-5 w-5 ml-auto" />
          </CardContent>
        </Card>
        <Card className="cursor-pointer transition-all hover:shadow-lg hover:border-[var(--success)] hover:-translate-y-1">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[var(--success)]/10 flex items-center justify-center">
              <RiUserAddLine className="h-5 w-5 text-[var(--success)]" />
            </div>
            <div>
              <p className="font-semibold">Agregar Lead</p>
              <p className="text-xs text-[var(--muted-foreground)]">CRM rápido</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer transition-all hover:shadow-lg hover:border-[var(--warning)] hover:-translate-y-1">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[var(--warning)]/10 flex items-center justify-center">
              <RiFileListLine className="h-5 w-5 text-[var(--warning)]" />
            </div>
            <div>
              <p className="font-semibold">Nueva Tarea</p>
              <p className="text-xs text-[var(--muted-foreground)]">Agregar tarea</p>
            </div>
          </CardContent>
        </Card>
        <Card className="cursor-pointer transition-all hover:shadow-lg hover:border-[var(--info)] hover:-translate-y-1">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-[var(--info)]/10 flex items-center justify-center">
              <RiMoneyDollarCircleLine className="h-5 w-5 text-[var(--info)]" />
            </div>
            <div>
              <p className="font-semibold">Registrar Pago</p>
              <p className="text-xs text-[var(--muted-foreground)]">Cobros</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="animate-slide-in-bottom">
          <RecentEvents />
        </div>
        <div className="animate-slide-in-bottom stagger-2">
          <PendingTasks />
        </div>
      </div>

      {/* Progress Section */}
      <div className="grid gap-6 lg:grid-cols-3 animate-fade-in">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center justify-between">
              Próximo Evento
              <Badge variant="warning" className="animate-pulse">
                <RiTimeLine className="h-3 w-3 mr-1" />
                En 3 días
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <h3 className="font-semibold text-lg">Boda García-López</h3>
            <p className="text-sm text-[var(--muted-foreground)]">Sábado, 18 de Enero</p>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Progreso general</span>
                <span className="font-medium">78%</span>
              </div>
              <Progress value={78} className="h-2" />
            </div>
            <div className="mt-3 flex gap-2">
              <Badge variant="success">150 invitados</Badge>
              <Badge variant="secondary">12 proveedores</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Ingresos del Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-[var(--primary)]">$24,500</p>
            <p className="text-sm text-[var(--success)] flex items-center gap-1">
              <RiArrowRightUpLine className="h-4 w-4" />
              +18% vs mes anterior
            </p>
            <div className="mt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Meta mensual</span>
                <span className="font-medium">$30,000</span>
              </div>
              <Progress value={82} variant="success" className="h-2" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Actividad Reciente</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3 text-sm">
              <div className="h-2 w-2 rounded-full bg-[var(--success)] animate-pulse" />
              <span>Nuevo lead: María González</span>
              <span className="text-[var(--muted-foreground)] ml-auto">2m</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="h-2 w-2 rounded-full bg-[var(--primary)]" />
              <span>Pago recibido: $2,500</span>
              <span className="text-[var(--muted-foreground)] ml-auto">15m</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="h-2 w-2 rounded-full bg-[var(--warning)]" />
              <span>Tarea completada: Confirmar DJ</span>
              <span className="text-[var(--muted-foreground)] ml-auto">1h</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <div className="h-2 w-2 rounded-full bg-[var(--info)]" />
              <span>Evento creado: Cumpleaños Ana</span>
              <span className="text-[var(--muted-foreground)] ml-auto">2h</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
