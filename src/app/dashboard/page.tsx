"use client";

import { StatsCard } from "@/components/dashboard/stats-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  RiCalendarEventLine,
  RiFileListLine,
  RiMoneyDollarCircleLine,
  RiUserAddLine,
  RiArrowRightUpLine,
} from "@remixicon/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface DashboardStats {
  totalEvents: number;
  pendingTasks: number;
  pendingPayments: number;
  activeLeads: number;
  recentEvents: Array<{
    id: string;
    name: string;
    date: string;
    status: string;
    guestCount: number | null;
  }>;
  pendingTasksList: Array<{
    id: string;
    title: string;
    priority: string;
    dueDate: string | null;
  }>;
}

export default function DashboardPage() {
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      try {
        const res = await fetch("/api/dashboard/stats");
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (error) {
        console.error("Error loading stats:", error);
      } finally {
        setLoading(false);
      }
    }
    loadStats();
  }, []);

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
            value={loading ? "-" : stats?.totalEvents || 0}
            description={stats?.totalEvents === 0 ? "Crea tu primer evento" : "Total de eventos"}
            icon={RiCalendarEventLine}
          />
        </div>
        <div className="animate-slide-in-bottom stagger-2">
          <StatsCard
            title="Tareas Pendientes"
            value={loading ? "-" : stats?.pendingTasks || 0}
            description={stats?.pendingTasks === 0 ? "Sin tareas pendientes" : "Por completar"}
            icon={RiFileListLine}
          />
        </div>
        <div className="animate-slide-in-bottom stagger-3">
          <StatsCard
            title="Pagos Pendientes"
            value={loading ? "-" : stats?.pendingPayments || 0}
            description="Por cobrar"
            icon={RiMoneyDollarCircleLine}
          />
        </div>
        <div className="animate-slide-in-bottom stagger-4">
          <StatsCard
            title="Leads Activos"
            value={loading ? "-" : stats?.activeLeads || 0}
            description="En seguimiento"
            icon={RiUserAddLine}
          />
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-4 animate-fade-in">
        <Card 
          className="cursor-pointer transition-all hover:shadow-lg hover:border-[var(--primary)] hover:-translate-y-1 bg-[var(--primary)] text-[var(--primary-foreground)]"
          onClick={() => router.push("/dashboard/events?new=true")}
        >
          <CardContent className="p-4 flex items-center gap-3">
            <RiCalendarEventLine className="h-8 w-8" />
            <div>
              <p className="font-semibold">Nuevo Evento</p>
              <p className="text-xs opacity-80">Crear evento rápido</p>
            </div>
            <RiArrowRightUpLine className="h-5 w-5 ml-auto" />
          </CardContent>
        </Card>
        <Card 
          className="cursor-pointer transition-all hover:shadow-lg hover:border-[var(--success)] hover:-translate-y-1"
          onClick={() => router.push("/dashboard/crm?new=true")}
        >
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
        <Card 
          className="cursor-pointer transition-all hover:shadow-lg hover:border-[var(--warning)] hover:-translate-y-1"
          onClick={() => router.push("/dashboard/tasks?new=true")}
        >
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
        <Card 
          className="cursor-pointer transition-all hover:shadow-lg hover:border-[var(--info)] hover:-translate-y-1"
          onClick={() => router.push("/dashboard/payments?new=true")}
        >
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Eventos Recientes</CardTitle>
              <button 
                onClick={() => router.push("/dashboard/events")}
                className="text-sm text-[var(--primary)] hover:underline"
              >
                Ver todos →
              </button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-[var(--muted-foreground)]">Cargando...</p>
              ) : stats?.recentEvents && stats.recentEvents.length > 0 ? (
                <div className="space-y-4">
                  {stats.recentEvents.map((event) => (
                    <div 
                      key={event.id} 
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--accent)] cursor-pointer"
                      onClick={() => router.push(`/dashboard/events/${event.id}`)}
                    >
                      <div>
                        <p className="font-medium">{event.name}</p>
                        <p className="text-sm text-[var(--muted-foreground)]">
                          {event.date ? format(new Date(event.date), "d MMM yyyy", { locale: es }) : "Sin fecha"}
                        </p>
                      </div>
                      <Badge variant={event.status === "active" ? "success" : "secondary"}>
                        {event.status === "active" ? "Activo" : event.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <RiCalendarEventLine className="h-12 w-12 mx-auto text-[var(--muted-foreground)] mb-2" />
                  <p className="text-[var(--muted-foreground)]">No hay eventos aún</p>
                  <button 
                    onClick={() => router.push("/dashboard/events?new=true")}
                    className="mt-2 text-[var(--primary)] hover:underline"
                  >
                    Crear tu primer evento
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <div className="animate-slide-in-bottom stagger-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Tareas Pendientes</CardTitle>
              <button 
                onClick={() => router.push("/dashboard/tasks")}
                className="text-sm text-[var(--primary)] hover:underline"
              >
                Ver todas →
              </button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <p className="text-[var(--muted-foreground)]">Cargando...</p>
              ) : stats?.pendingTasksList && stats.pendingTasksList.length > 0 ? (
                <div className="space-y-3">
                  {stats.pendingTasksList.map((task) => (
                    <div 
                      key={task.id} 
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-[var(--accent)] cursor-pointer"
                      onClick={() => router.push(`/dashboard/tasks?id=${task.id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-2 w-2 rounded-full ${
                          task.priority === "high" ? "bg-red-500" : 
                          task.priority === "medium" ? "bg-yellow-500" : "bg-green-500"
                        }`} />
                        <p className="font-medium">{task.title}</p>
                      </div>
                      {task.dueDate && (
                        <span className="text-sm text-[var(--muted-foreground)]">
                          {format(new Date(task.dueDate), "d MMM", { locale: es })}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <RiFileListLine className="h-12 w-12 mx-auto text-[var(--muted-foreground)] mb-2" />
                  <p className="text-[var(--muted-foreground)]">No hay tareas pendientes</p>
                  <button 
                    onClick={() => router.push("/dashboard/tasks?new=true")}
                    className="mt-2 text-[var(--primary)] hover:underline"
                  >
                    Crear una tarea
                  </button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
