"use client";

import { useState, useEffect, useCallback } from "react";

interface Role {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  isSystem: boolean | null;
  organizationId: number | null;
  permissionCount: number;
  memberCount: number;
}

interface Permission {
  id: number;
  name: string;
  slug: string;
  resource: string;
  action: string;
  description: string | null;
}

export function useRoles() {
  const [systemRoles, setSystemRoles] = useState<Role[]>([]);
  const [customRoles, setCustomRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRoles = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/roles");
      const result = await response.json();

      if (result.success) {
        setSystemRoles(result.data.systemRoles);
        setCustomRoles(result.data.customRoles);
      } else {
        setError(result.error?.message ?? "Failed to fetch roles");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRoles();
  }, [fetchRoles]);

  const createRole = useCallback(async (data: {
    name: string;
    description?: string;
    permissionIds?: number[];
  }) => {
    const response = await fetch("/api/roles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error?.message ?? "Failed to create role");
    }

    await fetchRoles();
    return result.data;
  }, [fetchRoles]);

  const updateRole = useCallback(async (id: number, data: {
    name?: string;
    description?: string;
    permissionIds?: number[];
  }) => {
    const response = await fetch(`/api/roles/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error?.message ?? "Failed to update role");
    }

    await fetchRoles();
    return result.data;
  }, [fetchRoles]);

  const deleteRole = useCallback(async (id: number) => {
    const response = await fetch(`/api/roles/${id}`, {
      method: "DELETE",
    });
    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error?.message ?? "Failed to delete role");
    }

    await fetchRoles();
  }, [fetchRoles]);

  const allRoles = [...systemRoles, ...customRoles];

  return {
    systemRoles,
    customRoles,
    allRoles,
    loading,
    error,
    createRole,
    updateRole,
    deleteRole,
    refetch: fetchRoles,
  };
}
