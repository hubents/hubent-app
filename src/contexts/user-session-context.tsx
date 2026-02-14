"use client";

import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from "react";

interface UserSessionData {
  userId: string;
  role: string;
  permissions: string[];
  organizationId: number;
  isImpersonating: boolean;
}

interface UserSessionContextValue {
  data: UserSessionData | null;
  loading: boolean;
  role: string;
  permissions: string[];
  can: (permission: string) => boolean;
  canAny: (perms: string[]) => boolean;
  isOwner: boolean;
  isAdmin: boolean;
  refetch: () => Promise<void>;
}

const UserSessionContext = createContext<UserSessionContextValue | null>(null);

export function UserSessionProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<UserSessionData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSession = useCallback(async () => {
    try {
      const res = await fetch("/api/user/me");
      const result = await res.json();
      if (result.success) {
        setData(result.data);
      }
    } catch {
      // Silently fail - user may not be authenticated
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSession();
  }, [fetchSession]);

  const can = useMemo(() => {
    return (permission: string): boolean => {
      if (!data) return false;
      const { role, permissions } = data;

      if (role === "owner" || role === "admin" ||
          role === "provider_owner") {
        return true;
      }

      if (data.isImpersonating) return true;

      if (permissions.includes(permission)) return true;

      const [resource] = permission.split(":");
      if (permissions.includes(`${resource}:*`)) return true;

      return false;
    };
  }, [data]);

  const canAny = useMemo(() => {
    return (perms: string[]): boolean => perms.some((p) => can(p));
  }, [can]);

  const value = useMemo<UserSessionContextValue>(() => ({
    data,
    loading,
    role: data?.role ?? "",
    permissions: data?.permissions ?? [],
    can,
    canAny,
    isOwner: data?.role === "owner",
    isAdmin: data?.role === "admin" || data?.role === "owner",
    refetch: fetchSession,
  }), [data, loading, can, canAny, fetchSession]);

  return (
    <UserSessionContext.Provider value={value}>
      {children}
    </UserSessionContext.Provider>
  );
}

export function useUserSessionContext(): UserSessionContextValue {
  const ctx = useContext(UserSessionContext);
  if (!ctx) {
    throw new Error("useUserSessionContext must be used within UserSessionProvider");
  }
  return ctx;
}
