import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  RiAddLine,
  RiMailLine,
  RiPhoneLine,
  RiMoreLine,
} from "@remixicon/react";

const teamMembers = [
  {
    id: "1",
    name: "María García",
    email: "maria@hubents.com",
    phone: "+34 612 345 678",
    role: "owner",
    department: "Dirección",
    status: "active",
    eventsAssigned: 8,
    tasksCompleted: 45,
  },
  {
    id: "2",
    name: "Carlos López",
    email: "carlos@hubents.com",
    phone: "+34 623 456 789",
    role: "admin",
    department: "Operaciones",
    status: "active",
    eventsAssigned: 12,
    tasksCompleted: 67,
  },
  {
    id: "3",
    name: "Ana Martínez",
    email: "ana@hubents.com",
    phone: "+34 634 567 890",
    role: "planner",
    department: "Planificación",
    status: "active",
    eventsAssigned: 6,
    tasksCompleted: 38,
  },
  {
    id: "4",
    name: "Pedro Ruiz",
    email: "pedro@hubents.com",
    phone: "+34 645 678 901",
    role: "planner",
    department: "Planificación",
    status: "active",
    eventsAssigned: 5,
    tasksCompleted: 29,
  },
  {
    id: "5",
    name: "Laura Fernández",
    email: "laura@hubents.com",
    phone: "+34 656 789 012",
    role: "assistant",
    department: "Soporte",
    status: "active",
    eventsAssigned: 3,
    tasksCompleted: 52,
  },
  {
    id: "6",
    name: "Diego Torres",
    email: "diego@hubents.com",
    phone: "+34 667 890 123",
    role: "assistant",
    department: "Soporte",
    status: "inactive",
    eventsAssigned: 0,
    tasksCompleted: 18,
  },
];

const roleConfig = {
  owner: { label: "Propietario", variant: "default" as const },
  admin: { label: "Administrador", variant: "destructive" as const },
  planner: { label: "Planificador", variant: "warning" as const },
  assistant: { label: "Asistente", variant: "secondary" as const },
};

export default function TeamPage() {
  const activeMembers = teamMembers.filter((m) => m.status === "active").length;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Equipo</h1>
          <p className="text-[var(--muted-foreground)]">
            Gestiona los miembros de tu equipo y sus roles
          </p>
        </div>
        <Button className="gap-2">
          <RiAddLine className="h-4 w-4" />
          Invitar Miembro
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-[var(--muted-foreground)]">
              Total Miembros
            </p>
            <p className="text-2xl font-bold">{teamMembers.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-[var(--muted-foreground)]">Activos</p>
            <p className="text-2xl font-bold text-[var(--success)]">
              {activeMembers}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-[var(--muted-foreground)]">
              Eventos Asignados
            </p>
            <p className="text-2xl font-bold">
              {teamMembers.reduce((sum, m) => sum + m.eventsAssigned, 0)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <p className="text-sm text-[var(--muted-foreground)]">
              Tareas Completadas
            </p>
            <p className="text-2xl font-bold">
              {teamMembers.reduce((sum, m) => sum + m.tasksCompleted, 0)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Team Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {teamMembers.map((member) => {
          const role = roleConfig[member.role as keyof typeof roleConfig];

          return (
            <Card
              key={member.id}
              className={`transition-all hover:shadow-md ${
                member.status === "inactive" ? "opacity-60" : ""
              }`}
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-4">
                    <Avatar className="h-12 w-12">
                      <AvatarFallback className="bg-[var(--primary)] text-white">
                        {member.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold">{member.name}</p>
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {member.department}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <RiMoreLine className="h-4 w-4" />
                  </Button>
                </div>

                <div className="mt-4 flex items-center gap-2">
                  <Badge variant={role.variant}>{role.label}</Badge>
                  {member.status === "inactive" && (
                    <Badge variant="secondary">Inactivo</Badge>
                  )}
                </div>

                <div className="mt-4 space-y-2">
                  <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                    <RiMailLine className="h-4 w-4" />
                    <span className="truncate">{member.email}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                    <RiPhoneLine className="h-4 w-4" />
                    <span>{member.phone}</span>
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-4">
                  <div className="text-center">
                    <p className="text-lg font-bold">{member.eventsAssigned}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Eventos
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-lg font-bold">{member.tasksCompleted}</p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Tareas
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
