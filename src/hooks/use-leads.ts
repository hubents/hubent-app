"use client";

import { useState, useEffect, useCallback } from "react";

interface Lead {
  id: number;
  title: string;
  description: string | null;
  value: string | null;
  currency: string | null;
  stageId: number | null;
  status: string | null;
  probability: number | null;
  expectedCloseDate: Date | null;
  assignedTo: string | null;
  createdAt: Date | null;
  assignedUserName: string | null;
  assignedUserImage: string | null;
}

interface Stage {
  id: number;
  name: string;
  color: string | null;
  sortOrder: number | null;
  isWon: boolean | null;
  isLost: boolean | null;
  leads: Lead[];
  totalValue: number;
}

export function useLeadsKanban() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initializeStages = useCallback(async () => {
    try {
      await fetch("/api/crm/stages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initializeDefaults: true }),
      });
    } catch (err) {
      console.error("Failed to initialize stages:", err);
    }
  }, []);

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/crm/leads?view=kanban");
      const result = await response.json();

      if (result.success) {
        // If no stages, try to initialize them
        if (result.data.length === 0) {
          await initializeStages();
          // Retry fetch after initialization
          const retryResponse = await fetch("/api/crm/leads?view=kanban");
          const retryResult = await retryResponse.json();
          if (retryResult.success) {
            setStages(retryResult.data);
            return;
          }
        }
        setStages(result.data);
      } else {
        setError(result.error?.message ?? "Failed to fetch leads");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, [initializeStages]);

  useEffect(() => {
    fetchLeads();
  }, [fetchLeads]);

  const moveLead = useCallback(async (leadId: number, newStageId: number) => {
    try {
      const response = await fetch(`/api/crm/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId: newStageId }),
      });

      if (response.ok) {
        // Optimistic update
        setStages(prev => {
          const newStages = prev.map(stage => ({
            ...stage,
            leads: stage.leads.filter(l => l.id !== leadId),
          }));

          const leadToMove = prev
            .flatMap(s => s.leads)
            .find(l => l.id === leadId);

          if (leadToMove) {
            const targetStage = newStages.find(s => s.id === newStageId);
            if (targetStage) {
              targetStage.leads.push({ ...leadToMove, stageId: newStageId });
            }
          }

          return newStages;
        });
      }
    } catch (err) {
      console.error("Failed to move lead:", err);
      fetchLeads(); // Refetch on error
    }
  }, [fetchLeads]);

  const createLead = useCallback(async (data: {
    title: string;
    description?: string;
    value?: number;
    stageId?: number;
    assignedTo?: string;
  }) => {
    try {
      const response = await fetch("/api/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        fetchLeads();
        return result.data;
      }
      return null;
    } catch (err) {
      console.error("Failed to create lead:", err);
      return null;
    }
  }, [fetchLeads]);

  const deleteLead = useCallback(async (leadId: number) => {
    try {
      await fetch(`/api/crm/leads/${leadId}`, { method: "DELETE" });
      fetchLeads();
    } catch (err) {
      console.error("Failed to delete lead:", err);
    }
  }, [fetchLeads]);

  return {
    stages,
    loading,
    error,
    refetch: fetchLeads,
    moveLead,
    createLead,
    deleteLead,
  };
}
