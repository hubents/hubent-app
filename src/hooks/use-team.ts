"use client";

import { useState, useEffect, useCallback } from "react";

interface TeamMember {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string | null;
  createdAt: Date | null;
}

interface Invitation {
  id: number;
  email: string;
  role: string | null;
  status: string;
  expiresAt: Date | null;
  createdAt: Date | null;
}

export function useTeam() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTeam = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/team");
      const result = await response.json();

      if (result.success) {
        setMembers(result.data?.members || []);
        setInvitations(result.data?.invitations || []);
      } else {
        setError(result.error?.message ?? "Failed to fetch team");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTeam();
  }, [fetchTeam]);

  const inviteMember = useCallback(async (data: {
    email: string;
    role?: string;
  }): Promise<{ success: boolean; error?: string; data?: unknown }> => {
    try {
      const response = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        fetchTeam();
        return { success: true, data: result };
      }
      return { success: false, error: result.error || "Error al enviar invitación" };
    } catch (err) {
      return { success: false, error: "Error de conexión" };
    }
  }, [fetchTeam]);

  const removeMember = useCallback(async (memberId: string) => {
    await fetch(`/api/team/${memberId}`, { method: "DELETE" });
    fetchTeam();
  }, [fetchTeam]);

  const cancelInvitation = useCallback(async (invitationId: number) => {
    try {
      const response = await fetch(`/api/invitations?id=${invitationId}`, { method: "DELETE" });
      const result = await response.json();
      if (result.success) {
        fetchTeam();
        return { success: true };
      }
      return { success: false, error: result.error?.message || "Failed to cancel" };
    } catch (err) {
      return { success: false, error: "Failed to cancel invitation" };
    }
  }, [fetchTeam]);

  const resendInvitation = useCallback(async (invitationId: number) => {
    try {
      const response = await fetch(`/api/invitations?id=${invitationId}`, { method: "PUT" });
      const result = await response.json();
      if (result.success) {
        fetchTeam();
        return { success: true };
      }
      return { success: false, error: result.error?.message || "Failed to resend" };
    } catch (err) {
      return { success: false, error: "Failed to resend invitation" };
    }
  }, [fetchTeam]);

  return {
    members,
    invitations,
    loading,
    error,
    refetch: fetchTeam,
    inviteMember,
    removeMember,
    cancelInvitation,
    resendInvitation,
  };
}
