"use client";

import { useState, useEffect, useCallback } from "react";
import type { Lead, Stage } from "@/types";

export type { Lead, Stage };

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
    // Optimistic update: move the lead and reset stageChangedAt to now
    const now = new Date();
    setStages(prev => {
      const leadToMove = prev.flatMap(s => s.leads).find(l => l.id === leadId);
      if (!leadToMove) return prev;
      return prev.map(stage => {
        if (stage.leads.some(l => l.id === leadId)) {
          // Remove from current stage
          return { ...stage, leads: stage.leads.filter(l => l.id !== leadId) };
        }
        if (stage.id === newStageId) {
          // Add to target stage with reset stageChangedAt
          return {
            ...stage,
            leads: [...stage.leads, { ...leadToMove, stageId: newStageId, stageChangedAt: now }],
          };
        }
        return stage;
      });
    });

    try {
      await fetch(`/api/crm/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stageId: newStageId }),
      });
      // Refetch to sync server state (stageChangedAt, totals, etc.)
      fetchLeads();
    } catch (err) {
      console.error("Failed to move lead:", err);
      fetchLeads(); // Rollback via refetch
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
