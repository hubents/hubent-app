"use client";

import { useState, useEffect, useCallback } from "react";

interface DashboardStats {
  totalEvents: number;
  activeEvents: number;
  pendingTasks: number;
  completedTasks: number;
  pendingPayments: number;
  activeLeads: number;
  totalRevenue: number;
  upcomingEvent: {
    id: number;
    name: string;
    date: Date;
    progress: number;
    guestCount: number;
    vendorCount: number;
  } | null;
  recentActivity: Array<{
    id: string;
    type: "lead" | "payment" | "task" | "event";
    message: string;
    time: string;
  }>;
}

export function useDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalEvents: 0,
    activeEvents: 0,
    pendingTasks: 0,
    completedTasks: 0,
    pendingPayments: 0,
    activeLeads: 0,
    totalRevenue: 0,
    upcomingEvent: null,
    recentActivity: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch all data in parallel
      const [eventsRes, leadsRes] = await Promise.all([
        fetch("/api/events"),
        fetch("/api/crm/leads"),
      ]);

      const [eventsData, leadsData] = await Promise.all([
        eventsRes.json(),
        leadsRes.json(),
      ]);

      // Calculate stats
      const events = eventsData.data || [];
      const leads = leadsData.data || [];

      // Find upcoming event
      const upcomingEvents = events
        .filter((e: any) => e.date && new Date(e.date) > new Date())
        .sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());

      const upcomingEvent = upcomingEvents[0] ? {
        id: upcomingEvents[0].id,
        name: upcomingEvents[0].name,
        date: upcomingEvents[0].date,
        progress: 78, // TODO: Calculate from tasks
        guestCount: upcomingEvents[0].guestCount || 0,
        vendorCount: 12, // TODO: Get from event participants
      } : null;

      setStats({
        totalEvents: events.length,
        activeEvents: events.filter((e: any) => e.status === "active" || e.status === "planning").length,
        pendingTasks: 0, // TODO: Fetch from tasks API
        completedTasks: 0,
        pendingPayments: 0, // TODO: Fetch from payments API
        activeLeads: leads.filter((l: any) => l.status !== "won" && l.status !== "lost").length,
        totalRevenue: 24500, // TODO: Calculate from payments
        upcomingEvent,
        recentActivity: [
          { id: "1", type: "lead", message: "Nuevo lead: María González", time: "2m" },
          { id: "2", type: "payment", message: "Pago recibido: $2,500", time: "15m" },
          { id: "3", type: "task", message: "Tarea completada: Confirmar DJ", time: "1h" },
          { id: "4", type: "event", message: "Evento creado: Cumpleaños Ana", time: "2h" },
        ],
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch dashboard");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return {
    stats,
    loading,
    error,
    refetch: fetchDashboard,
  };
}
