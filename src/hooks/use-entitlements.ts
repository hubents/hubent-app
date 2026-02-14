"use client";

import { useState, useEffect, useCallback } from "react";
import type { PlanLimits, UsageInfo } from "@/types";

interface EntitlementData {
  plan: {
    id: number;
    slug: string;
    name: string;
  } | null;
  features: string[];
  limits: PlanLimits;
  usage: UsageInfo;
}

export function useEntitlements() {
  const [data, setData] = useState<EntitlementData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntitlements = useCallback(async () => {
    try {
      const response = await fetch("/api/entitlements");
      const result = await response.json();

      if (result.success) {
        setData(result.data);
      } else {
        setError(result.error?.message ?? "Failed to fetch entitlements");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEntitlements();
  }, [fetchEntitlements]);

  const hasFeature = useCallback(
    (feature: string): boolean => {
      if (!data) return false;
      return data.features.includes(feature);
    },
    [data]
  );

  const isAtLimit = useCallback(
    (resource: "users" | "events" | "storage"): boolean => {
      if (!data) return false;
      const limitKey = `max${resource.charAt(0).toUpperCase() + resource.slice(1)}` as keyof PlanLimits;
      const max = data.limits[limitKey];
      if (max === -1) return false; // Unlimited
      return data.usage[resource] >= max;
    },
    [data]
  );

  const getRemaining = useCallback(
    (resource: "users" | "events" | "storage"): number => {
      if (!data) return 0;
      const limitKey = `max${resource.charAt(0).toUpperCase() + resource.slice(1)}` as keyof PlanLimits;
      const max = data.limits[limitKey];
      if (max === -1) return Infinity;
      return Math.max(0, max - data.usage[resource]);
    },
    [data]
  );

  return {
    plan: data?.plan ?? null,
    features: data?.features ?? [],
    limits: data?.limits ?? { maxUsers: 1, maxEvents: 1, maxStorage: 100 },
    usage: data?.usage ?? { users: 0, events: 0, storage: 0 },
    loading,
    error,
    hasFeature,
    isAtLimit,
    getRemaining,
    refetch: fetchEntitlements,
  };
}
