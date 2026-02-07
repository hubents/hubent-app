"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RiAddLine } from "@remixicon/react";
import { useLeadsKanban, type Lead, type Stage } from "@/hooks/use-leads";
import { LeadKanban } from "@/components/crm/lead-kanban";
import { CreateLeadDrawer } from "@/components/crm/create-lead-drawer";
import { LeadDetailDrawer } from "@/components/crm/lead-detail-drawer";
import { LeadDrawer } from "@/components/crm/lead-drawer";
import { StageConfigDrawer } from "@/components/crm/stage-config-drawer";
import { CRMStats } from "@/components/crm/crm-stats";
import { useState } from "react";

// Types are inferred from the hook and components

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
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<number | null>(null);
  const [isStageDialogOpen, setIsStageDialogOpen] = useState(false);
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [selectedStage, setSelectedStage] = useState<Stage | null>(null);
  const [createStageId, setCreateStageId] = useState<number | undefined>(undefined);

  // Use API data if available, otherwise show empty state
  const displayStages = stages.length > 0 ? stages : [];

  const handleLeadClick = (lead: Lead) => {
    setSelectedLeadId(lead.id);
    setIsDrawerOpen(true);
  };

  const handleEditLead = (lead: Lead) => {
    setSelectedLeadId(lead.id);
    setIsDrawerOpen(true);
  };

  const handleAddLead = (stageId: number) => {
    setCreateStageId(stageId);
    setIsCreateDialogOpen(true);
  };

  const handleAddStage = () => {
    setSelectedStage(null);
    setIsStageDialogOpen(true);
  };

  const handleEditStage = (stage: { id: number; name: string; color: string | null; sortOrder: number | null; isDefault?: boolean | null; isWon: boolean | null; isLost: boolean | null }) => {
    // Convert StageConfig to Stage for the dialog
    setSelectedStage(stage as Stage);
    setIsStageDialogOpen(true);
  };

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
      <CRMStats stages={displayStages} loading={loading} />

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
          onLeadClick={handleLeadClick}
          onEditLead={handleEditLead}
          onAddLead={handleAddLead}
          onAddStage={handleAddStage}
          onEditStage={handleEditStage}
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

      <CreateLeadDrawer
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onLeadCreated={refetch}
        stageId={createStageId}
      />

      <LeadDetailDrawer
        open={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
        lead={selectedLead}
        stages={displayStages.map(s => ({ id: s.id, name: s.name, color: s.color }))}
        onLeadUpdated={refetch}
        onLeadDeleted={refetch}
      />

      <LeadDrawer
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        leadId={selectedLeadId}
        stages={displayStages.map(s => ({ id: s.id, name: s.name, color: s.color }))}
        onLeadUpdated={refetch}
        onLeadDeleted={refetch}
      />

      <StageConfigDrawer
        open={isStageDialogOpen}
        onOpenChange={setIsStageDialogOpen}
        stage={selectedStage}
        onStageCreated={refetch}
        onStageUpdated={refetch}
        onStageDeleted={refetch}
        nextSortOrder={displayStages.length}
      />
    </div>
  );
}
