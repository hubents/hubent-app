"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { EventSectionPermissions, EventSectionLevel } from "@/types";

interface EventPermissionsData {
  permissions: EventSectionPermissions | null;
  isParticipant: boolean;
  participantType: string | null;
  role: string | null;
}

interface UseEventPermissionsReturn {
  loading: boolean;
  permissions: EventSectionPermissions | null;
  isParticipant: boolean;
  canView: (section: keyof EventSectionPermissions) => boolean;
  canEdit: (section: keyof EventSectionPermissions) => boolean;
  sectionLevel: (section: keyof EventSectionPermissions) => EventSectionLevel;
  refetch: () => Promise<void>;
}

export function useEventPermissions(
  eventId: number | string | undefined,
  eventScoped: boolean,
  isCollaborator?: boolean
): UseEventPermissionsReturn {
  const [data, setData] = useState<EventPermissionsData | null>(null);
  const [loading, setLoading] = useState(false);
  const shouldFetch = eventScoped || !!isCollaborator;

  const fetchPermissions = useCallback(async () => {
    if (!eventId || !shouldFetch) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/events/${eventId}/collaborators/me`);
      const result = await res.json();
      if (result.success && result.data) {
        setData({
          permissions: result.data.permissions || null,
          isParticipant: true,
          participantType: result.data.type || null,
          role: result.data.role || null,
        });
      } else {
        setData({ permissions: null, isParticipant: false, participantType: null, role: null });
      }
    } catch {
      setData({ permissions: null, isParticipant: false, participantType: null, role: null });
    } finally {
      setLoading(false);
    }
  }, [eventId, shouldFetch]);

  useEffect(() => {
    fetchPermissions();
  }, [fetchPermissions]);

  const canView = useMemo(() => {
    return (section: keyof EventSectionPermissions): boolean => {
      if (!eventScoped && !isCollaborator) return true;
      if (!data?.permissions) return false;
      const level = data.permissions[section] || "none";
      return level !== "none";
    };
  }, [data, eventScoped, isCollaborator]);

  const canEdit = useMemo(() => {
    return (section: keyof EventSectionPermissions): boolean => {
      if (!eventScoped && !isCollaborator) return true;
      if (!data?.permissions) return false;
      const level = data.permissions[section] || "none";
      return level === "edit";
    };
  }, [data, eventScoped, isCollaborator]);

  const sectionLevel = useMemo(() => {
    return (section: keyof EventSectionPermissions): EventSectionLevel => {
      if (!eventScoped && !isCollaborator) return "edit";
      if (!data?.permissions) return "none";
      return data.permissions[section] || "none";
    };
  }, [data, eventScoped, isCollaborator]);

  return {
    loading,
    permissions: data?.permissions || null,
    isParticipant: data?.isParticipant || false,
    canView,
    canEdit,
    sectionLevel,
    refetch: fetchPermissions,
  };
}
