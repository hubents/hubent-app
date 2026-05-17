"use client";

import { useState, useEffect, useCallback } from "react";
import type { Event } from "@/types";

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async (filters?: { status?: string; type?: string }) => {
    setLoading(true);
    try {
      const params = new URLSearchParams(Object.entries(filters ?? {}).filter(([, v]) => v != null) as [string, string][]);
      const url = params.size ? `/api/events?${params}` : "/api/events";

      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        setEvents(result.data || []);
      } else {
        setError(result.error?.message ?? "Failed to fetch events");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const createEvent = useCallback(async (data: {
    name: string;
    type?: string;
    date?: Date;
    location?: string;
    guestCount?: number;
    budget?: number;
    description?: string;
    clientId?: number;
    templateId?: number;
  }) => {
    try {
      const response = await fetch("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        fetchEvents();
        return result.data;
      }
      return null;
    } catch (err) {
      throw err;
    }
  }, [fetchEvents]);

  const updateEvent = useCallback(async (eventId: number, data: Partial<Event>) => {
    try {
      const response = await fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        fetchEvents();
        return result.data;
      }
      return null;
    } catch (err) {
      console.error("Failed to update event:", err);
      return null;
    }
  }, [fetchEvents]);

  const deleteEvent = useCallback(async (eventId: number) => {
    try {
      await fetch(`/api/events/${eventId}`, { method: "DELETE" });
      fetchEvents();
    } catch (err) {
      console.error("Failed to delete event:", err);
    }
  }, [fetchEvents]);

  // Stats
  const stats = {
    total: events.length,
    active: events.filter(e => e.status === "active" || e.status === "planning").length,
    upcoming: events.filter(e => e.date && new Date(e.date) > new Date()).length,
    completed: events.filter(e => e.status === "completed").length,
  };

  return {
    events,
    stats,
    loading,
    error,
    refetch: fetchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
  };
}
