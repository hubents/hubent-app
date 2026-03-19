"use client";

/**
 * Hook for auto-refreshing task lists when:
 * 1. A Pusher notification arrives (task:updated, task:assigned)
 * 2. The browser tab becomes visible again (visibilitychange)
 *
 * Usage:
 *   useTaskRefresh(fetchTasks);
 */

import { useEffect, useCallback, useRef } from "react";
import { useUserNotifications } from "@/hooks/use-pusher";

interface TaskNotification {
  type?: string;
  eventType?: string;
  taskId?: number;
}

export function useTaskRefresh(onRefresh: () => void) {
  const refreshRef = useRef(onRefresh);
  refreshRef.current = onRefresh;

  // Debounce: avoid multiple rapid refreshes
  const lastRefreshRef = useRef(0);
  const debounceMs = 2000;

  const debouncedRefresh = useCallback(() => {
    const now = Date.now();
    if (now - lastRefreshRef.current < debounceMs) return;
    lastRefreshRef.current = now;
    refreshRef.current();
  }, []);

  // 1. Listen to Pusher user notifications for task events
  const handleNotification = useCallback((data: unknown) => {
    const n = data as TaskNotification;
    const eventType = n.eventType || n.type || "";

    if (
      eventType === "updated" ||
      eventType === "assigned" ||
      eventType === "task_status_changed" ||
      eventType === "task_assigned"
    ) {
      debouncedRefresh();
    }
  }, [debouncedRefresh]);

  useUserNotifications(handleNotification);

  // 2. Refetch when tab becomes visible (covers cases without Pusher)
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        debouncedRefresh();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [debouncedRefresh]);
}
