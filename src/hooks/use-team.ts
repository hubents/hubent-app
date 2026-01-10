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
  }) => {
    try {
      const response = await fetch("/api/team/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        fetchTeam();
        return result.data;
      }
      return null;
    } catch (err) {
      console.error("Failed to invite member:", err);
      return null;
    }
  }, [fetchTeam]);

  const removeMember = useCallback(async (memberId: string) => {
    try {
      await fetch(`/api/team/${memberId}`, { method: "DELETE" });
      fetchTeam();
    } catch (err) {
      console.error("Failed to remove member:", err);
    }
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
      console.error("Failed to cancel invitation:", err);
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
      console.error("Failed to resend invitation:", err);
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
