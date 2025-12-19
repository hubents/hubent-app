"use client";

import { useState, useEffect, useCallback } from "react";

interface Event {
  id: number;
  name: string;
  type: string | null;
  status: string | null;
  date: Date | null;
  endDate: Date | null;
  location: string | null;
  guestCount: number | null;
  budget: string | null;
  description: string | null;
  clientId: number | null;
  createdAt: Date | null;
  clientName: string | null;
}

export function useEvents() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async (params?: { status?: string; type?: string }) => {
    setLoading(true);
    try {
      let url = "/api/events";
      if (params) {
        const searchParams = new URLSearchParams();
        if (params.status) searchParams.set("status", params.status);
        if (params.type) searchParams.set("type", params.type);
        if (searchParams.toString()) url += `?${searchParams.toString()}`;
      }

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
      console.error("Failed to create event:", err);
      return null;
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
