"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { CalendarItem, CalendarItemType } from "@/lib/calendar";
import { getMonthRange, groupItemsByDate } from "@/lib/calendar";

interface UseCalendarOptions {
  initialMonth?: number;
  initialYear?: number;
}

interface UseCalendarReturn {
  items: CalendarItem[];
  itemsByDate: Map<string, CalendarItem[]>;
  loading: boolean;
  error: string | null;
  month: number;
  year: number;
  filters: Record<CalendarItemType, boolean>;
  allowedTypes: CalendarItemType[];
  setMonth: (m: number) => void;
  setYear: (y: number) => void;
  goToMonth: (m: number, y: number) => void;
  goToPrevMonth: () => void;
  goToNextMonth: () => void;
  goToToday: () => void;
  toggleFilter: (type: CalendarItemType) => void;
  setFilters: (filters: Record<CalendarItemType, boolean>) => void;
  filteredItems: CalendarItem[];
  filteredItemsByDate: Map<string, CalendarItem[]>;
  refetch: () => void;
}

const ALL_TYPES: CalendarItemType[] = [
  "event",
  "task",
  "meeting",
  "payment",
  "task_payment",
  "document",
  "lead",
  "schedule",
];

function getDefaultFilters(): Record<CalendarItemType, boolean> {
  if (typeof window === "undefined") {
    return Object.fromEntries(ALL_TYPES.map((t) => [t, true])) as Record<
      CalendarItemType,
      boolean
    >;
  }
  try {
    const saved = localStorage.getItem("hubents-calendar-filters");
    if (saved) return JSON.parse(saved);
  } catch {}
  return Object.fromEntries(ALL_TYPES.map((t) => [t, true])) as Record<
    CalendarItemType,
    boolean
  >;
}

export function useCalendar(options?: UseCalendarOptions): UseCalendarReturn {
  const now = new Date();
  const [month, setMonth] = useState(options?.initialMonth ?? now.getMonth() + 1);
  const [year, setYear] = useState(options?.initialYear ?? now.getFullYear());
  const [items, setItems] = useState<CalendarItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFiltersState] = useState<Record<CalendarItemType, boolean>>(getDefaultFilters);
  const [allowedTypes, setAllowedTypes] = useState<CalendarItemType[]>(ALL_TYPES);

  const fetchItems = useCallback(async (m: number, y: number) => {
    setLoading(true);
    setError(null);
    try {
      const { from, to } = getMonthRange(y, m);
      const res = await fetch(`/api/calendar?from=${from}&to=${to}`);
      const data = await res.json();
      if (data.success) {
        setItems(data.data);
        if (Array.isArray(data.allowedTypes)) {
          setAllowedTypes(data.allowedTypes);
        }
      } else {
        setError(data.error || "Error al cargar calendario");
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems(month, year);
  }, [month, year, fetchItems]);

  const itemsByDate = useMemo(() => groupItemsByDate(items), [items]);

  const filteredItems = useMemo(
    () => items.filter((item) => filters[item.type]),
    [items, filters]
  );

  const filteredItemsByDate = useMemo(
    () => groupItemsByDate(filteredItems),
    [filteredItems]
  );

  const toggleFilter = useCallback((type: CalendarItemType) => {
    setFiltersState((prev) => {
      const next = { ...prev, [type]: !prev[type] };
      try {
        localStorage.setItem("hubents-calendar-filters", JSON.stringify(next));
      } catch {}
      return next;
    });
  }, []);

  const setFilters = useCallback((f: Record<CalendarItemType, boolean>) => {
    setFiltersState(f);
    try {
      localStorage.setItem("hubents-calendar-filters", JSON.stringify(f));
    } catch {}
  }, []);

  const goToMonth = useCallback((m: number, y: number) => {
    setMonth(m);
    setYear(y);
  }, []);

  const goToPrevMonth = useCallback(() => {
    setMonth((prev) => {
      if (prev === 1) {
        setYear((y) => y - 1);
        return 12;
      }
      return prev - 1;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setMonth((prev) => {
      if (prev === 12) {
        setYear((y) => y + 1);
        return 1;
      }
      return prev + 1;
    });
  }, []);

  const goToToday = useCallback(() => {
    const today = new Date();
    setMonth(today.getMonth() + 1);
    setYear(today.getFullYear());
  }, []);

  const refetch = useCallback(() => {
    fetchItems(month, year);
  }, [month, year, fetchItems]);

  return {
    items,
    itemsByDate,
    loading,
    error,
    month,
    year,
    filters,
    allowedTypes,
    setMonth,
    setYear,
    goToMonth,
    goToPrevMonth,
    goToNextMonth,
    goToToday,
    toggleFilter,
    setFilters,
    filteredItems,
    filteredItemsByDate,
    refetch,
  };
}
