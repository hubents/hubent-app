"use client";

import { useMemo } from "react";
import { useEntitlements } from "./use-entitlements";
import { useUserSession } from "./use-user-session";

export function usePermissions() {
  const { hasFeature, plan, loading: entLoading } = useEntitlements();
  const { role, permissions, can, canAny, loading: sessionLoading } = useUserSession();

  const loading = entLoading || sessionLoading;

  return {
    can,
    canAny,
    hasFeature,
    role,
    plan,
    loading,
    isOwner: role === "owner",
    isAdmin: role === "admin" || role === "owner",
  };
}
