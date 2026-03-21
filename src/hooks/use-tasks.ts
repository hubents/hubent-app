"use client";

import { useState, useEffect, useCallback } from "react";

interface Task {
  id: number;
  title: string;
  description: string | null;
  status: string | null;
  priority: string | null;
  dueDate: Date | null;
  eventId: number | null;
  assignedTo: string | null;
  sortOrder: number | null;
  createdAt: Date | null;
  eventName?: string | null;
  assignedUserName?: string | null;
}

interface TaskStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  completionRate: number;
}

export type TaskScope = "standalone" | "event" | "all";

export function useTasks(eventId?: number, scope?: TaskScope) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [stats, setStats] = useState<TaskStats>({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    completionRate: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (eventId) {
        params.set("eventId", eventId.toString());
      } else if (scope && scope !== "all") {
        params.set("scope", scope);
      }
      const qs = params.toString();
      const url = qs ? `/api/tasks?${qs}` : "/api/tasks";

      const response = await fetch(url);
      const result = await response.json();

      if (result.success) {
        const taskList = result.data || [];
        setTasks(taskList);

        // Calculate stats
        const total = taskList.length;
        const completed = taskList.filter(
          (t: Task) => t.status === "completed",
        ).length;
        const inProgress = taskList.filter(
          (t: Task) => t.status === "in_progress",
        ).length;
        const pending = taskList.filter(
          (t: Task) => t.status === "pending",
        ).length;

        setStats({
          total,
          pending,
          inProgress,
          completed,
          completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        });
      } else {
        setError(result.error?.message ?? "Failed to fetch tasks");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to fetch");
    } finally {
      setLoading(false);
    }
  }, [eventId, scope]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const updateTaskStatus = useCallback(
    async (taskId: number, status: string) => {
      try {
        const response = await fetch(`/api/tasks/${taskId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status }),
        });

        if (response.ok) {
          // Optimistic update
          setTasks((prev) =>
            prev.map((t) => (t.id === taskId ? { ...t, status } : t)),
          );
          fetchTasks(); // Refetch for accurate stats
        }
      } catch (err) {
        console.error("Failed to update task:", err);
      }
    },
    [fetchTasks],
  );

  const createTask = useCallback(
    async (data: {
      title: string;
      description?: string;
      priority?: string;
      dueDate?: Date;
      eventId?: number;
      assignedTo?: string;
    }) => {
      try {
        const response = await fetch("/api/tasks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        });

        const result = await response.json();

        if (result.success) {
          fetchTasks();
          return result.data;
        }
        return null;
      } catch (err) {
        console.error("Failed to create task:", err);
        return null;
      }
    },
    [fetchTasks],
  );

  const deleteTask = useCallback(
    async (taskId: number) => {
      try {
        await fetch(`/api/tasks/${taskId}`, { method: "DELETE" });
        fetchTasks();
      } catch (err) {
        console.error("Failed to delete task:", err);
      }
    },
    [fetchTasks],
  );

  return {
    tasks,
    stats,
    loading,
    error,
    refetch: fetchTasks,
    updateTaskStatus,
    createTask,
    deleteTask,
  };
}
