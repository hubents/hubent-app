"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RiAddLine,
  RiMoreLine,
} from "@remixicon/react";
import { useLeadsKanban } from "@/hooks/use-leads";
import { LeadKanban } from "@/components/crm/lead-kanban";
import { CreateLeadDialog } from "@/components/crm/create-lead-dialog";
import { useState } from "react";

const fallbackStages = [
  {
    id: "lead",
    name: "Leads",
    color: "bg-blue-500",
    contacts: [
      {
        id: "1",
        name: "María González",
        email: "maria@email.com",
        phone: "+34 612 345 678",
        eventDate: "2025-06-15",
        budget: 30000,
        source: "Instagram",
      },
      {
        id: "2",
        name: "Carlos Ruiz",
        email: "carlos@email.com",
        phone: "+34 623 456 789",
        eventDate: "2025-08-20",
        budget: 45000,
        source: "Referido",
      },
    ],
  },
  {
    id: "contacted",
    name: "Contactados",
    color: "bg-yellow-500",
    contacts: [
      {
        id: "3",
        name: "Ana Martínez",
        email: "ana@email.com",
        phone: "+34 634 567 890",
        eventDate: "2025-05-10",
        budget: 25000,
        source: "Web",
      },
    ],
  },
  {
    id: "proposal",
    name: "Propuesta Enviada",
    color: "bg-purple-500",
    contacts: [
      {
        id: "4",
        name: "Laura Fernández",
        email: "laura@email.com",
        phone: "+34 645 678 901",
        eventDate: "2025-04-22",
        budget: 35000,
        source: "Feria Bodas",
      },
      {
        id: "5",
        name: "Pedro Sánchez",
        email: "pedro@email.com",
        phone: "+34 656 789 012",
        eventDate: "2025-07-18",
        budget: 28000,
        source: "Google",
      },
    ],
  },
  {
    id: "negotiation",
    name: "Negociación",
    color: "bg-orange-500",
    contacts: [
      {
        id: "6",
        name: "Elena Torres",
        email: "elena@email.com",
        phone: "+34 667 890 123",
        eventDate: "2025-03-28",
        budget: 40000,
        source: "Referido",
      },
    ],
  },
  {
    id: "won",
    name: "Ganados",
    color: "bg-green-500",
    contacts: [
      {
        id: "7",
        name: "Diego López",
        email: "diego@email.com",
        phone: "+34 678 901 234",
        eventDate: "2025-03-15",
        budget: 32000,
        source: "Instagram",
      },
    ],
  },
];

export default function CRMPage() {
  const { stages, loading, error, moveLead, deleteLead, refetch } = useLeadsKanban();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // Use API data if available, otherwise show empty state
  const displayStages = stages.length > 0 ? stages : [];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">CRM - Pipeline de Ventas</h1>
          <p className="text-[var(--muted-foreground)]">
            Gestiona tus leads y clientes potenciales
          </p>
        </div>
        <Button className="gap-2" onClick={() => setIsCreateDialogOpen(true)}>
          <RiAddLine className="h-4 w-4" />
          Nuevo Lead
        </Button>
      </div>

      {/* Pipeline Stats */}
      <div className="grid gap-4 md:grid-cols-5">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-12 mb-1" />
                <Skeleton className="h-3 w-16" />
              </CardContent>
            </Card>
          ))
        ) : displayStages.length > 0 ? (
          displayStages.map((stage) => (
            <Card key={stage.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <div 
                    className="h-3 w-3 rounded-full" 
                    style={{ backgroundColor: stage.color || "#6366f1" }}
                  />
                  <span className="text-sm font-medium">{stage.name}</span>
                </div>
                <p className="mt-2 text-2xl font-bold">{stage.leads.length}</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  €{stage.totalValue.toLocaleString()}
                </p>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="md:col-span-5">
            <CardContent className="p-8 text-center">
              <p className="text-[var(--muted-foreground)]">
                No hay etapas configuradas. Ejecuta las migraciones y el seed para comenzar.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Kanban Board */}
      {loading ? (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="min-w-[300px] flex-shrink-0 space-y-3">
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          ))}
        </div>
      ) : displayStages.length > 0 ? (
        <LeadKanban
          stages={displayStages}
          onLeadMove={moveLead}
          onDeleteLead={deleteLead}
          onAddLead={(stageId) => setIsCreateDialogOpen(true)}
        />
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <h3 className="text-lg font-semibold mb-2">Configura tu Pipeline</h3>
            <p className="text-[var(--muted-foreground)] mb-4">
              Para comenzar a usar el CRM, necesitas ejecutar las migraciones de base de datos.
            </p>
            <code className="bg-muted px-3 py-2 rounded text-sm">
              npx drizzle-kit push
            </code>
          </CardContent>
        </Card>
      )}

      <CreateLeadDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onLeadCreated={refetch}
      />
    </div>
  );
}
