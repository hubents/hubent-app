"use client";

import { use, useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RiListOrdered2,
  RiFileDownloadLine,
  RiMapPinLine,
  RiTimeLine,
  RiCalendarLine,
  RiInformationLine,
} from "@remixicon/react";
import { useEvent } from "@/contexts/event-context";
import { downloadPDFFromHTML } from "@/lib/pdf-download";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface ScheduleItem {
  id: number;
  title: string;
  description: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  notes: string | null;
  source: "event" | "task";
  taskTitle: string | null;
  taskId: number | null;
}

export default function RunSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const eventId = parseInt(id, 10);
  const { activeEvent } = useEvent();

  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/schedule`);
      const data = await res.json();
      if (data.success) setItems(data.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [eventId]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleDownloadPdf = async (taskId?: number) => {
    setDownloading(true);
    try {
      const url = taskId
        ? `/api/events/${eventId}/run-sheet/pdf?taskId=${taskId}`
        : `/api/events/${eventId}/run-sheet/pdf`;
      const eventName = activeEvent?.name || "evento";
      const suffix = taskId ? `-tarea-${taskId}` : "";
      const filename = `orden-del-dia-${eventName.replace(/\s+/g, "-").toLowerCase()}${suffix}`;
      await downloadPDFFromHTML(url, filename);
    } finally {
      setDownloading(false);
    }
  };

  // Group items by date for timeline display
  const itemsByDate = items.reduce<Record<string, ScheduleItem[]>>((acc, item) => {
    const dateKey = new Date(item.date).toISOString().split("T")[0];
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(item);
    return acc;
  }, {});

  // Sort items within each date by startTime
  Object.values(itemsByDate).forEach((dateItems) => {
    dateItems.sort((a, b) => {
      const aTime = a.startTime || "99:99";
      const bTime = b.startTime || "99:99";
      return aTime.localeCompare(bTime);
    });
  });

  // Sort dates
  const sortedDates = Object.keys(itemsByDate).sort();

  // Get unique tasks for "download by task" options
  const uniqueTasks = items
    .filter((i) => i.source === "task" && i.taskId)
    .reduce<{ id: number; title: string }[]>((acc, item) => {
      if (!acc.find((t) => t.id === item.taskId)) {
        acc.push({ id: item.taskId!, title: item.taskTitle || `Tarea #${item.taskId}` });
      }
      return acc;
    }, []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <RiListOrdered2 className="h-6 w-6" />
            Orden del día
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Timeline consolidada del evento
          </p>
        </div>
        <div className="flex items-center gap-2">
          {uniqueTasks.length > 0 && (
            <div className="relative group">
              <Button variant="outline" size="sm" disabled={downloading || items.length === 0}>
                <RiFileDownloadLine className="h-4 w-4 mr-1" />
                PDF por tarea
              </Button>
              <div className="absolute right-0 top-full pt-1 hidden group-hover:block z-10 min-w-[200px]">
              <div className="bg-popover border rounded-md shadow-md p-1">
                {uniqueTasks.map((task) => (
                  <button
                    key={task.id}
                    onClick={() => handleDownloadPdf(task.id)}
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-muted rounded-sm transition-colors"
                  >
                    {task.title}
                  </button>
                ))}
              </div>
              </div>
            </div>
          )}
          <Button
            size="sm"
            onClick={() => handleDownloadPdf()}
            disabled={downloading || items.length === 0}
          >
            <RiFileDownloadLine className="h-4 w-4 mr-1" />
            {downloading ? "Generando..." : "Descargar PDF"}
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-sm text-muted-foreground">Total items</p>
            <p className="text-2xl font-bold">{items.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-sm text-muted-foreground">Del evento</p>
            <p className="text-2xl font-bold">{items.filter((i) => i.source === "event").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-sm text-muted-foreground">De tareas</p>
            <p className="text-2xl font-bold">{items.filter((i) => i.source === "task").length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 px-4">
            <p className="text-sm text-muted-foreground">Días</p>
            <p className="text-2xl font-bold">{sortedDates.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Timeline */}
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <RiListOrdered2 className="h-12 w-12 mx-auto text-muted-foreground/30 mb-3" />
            <p className="text-muted-foreground">No hay items en la orden del día</p>
            <p className="text-xs text-muted-foreground mt-1">
              Agregá items desde el Cronograma o desde la pestaña &quot;Orden del día&quot; de cada tarea
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedDates.map((dateKey) => {
            const dateItems = itemsByDate[dateKey];
            const dateObj = new Date(dateKey + "T12:00:00");

            return (
              <div key={dateKey}>
                {/* Date header */}
                <div className="flex items-center gap-2 mb-3">
                  <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                    <RiCalendarLine className="h-4 w-4 text-primary-foreground" />
                  </div>
                  <h2 className="text-lg font-semibold">
                    {format(dateObj, "EEEE d 'de' MMMM, yyyy", { locale: es })}
                  </h2>
                  <Badge variant="secondary" className="ml-auto">
                    {dateItems.length} {dateItems.length === 1 ? "item" : "items"}
                  </Badge>
                </div>

                {/* Timeline items */}
                <div className="relative ml-4 border-l-2 border-border pl-6 space-y-1">
                  {dateItems.map((item, idx) => (
                    <div
                      key={`${item.source}-${item.id}`}
                      className="relative group"
                    >
                      {/* Timeline dot */}
                      <div
                        className="absolute -left-[31px] top-3 h-3 w-3 rounded-full border-2 border-background"
                        style={{
                          backgroundColor: item.source === "event" ? "#6366f1" : "#f59e0b",
                        }}
                      />

                      <Card className="transition-colors hover:bg-muted/30">
                        <CardContent className="py-3 px-4">
                          <div className="flex items-start gap-3">
                            {/* Time column */}
                            <div className="w-24 shrink-0 text-right">
                              {item.startTime ? (
                                <div>
                                  <span className="text-sm font-semibold">{item.startTime}</span>
                                  {item.endTime && (
                                    <span className="text-xs text-muted-foreground block">
                                      → {item.endTime}
                                    </span>
                                  )}
                                </div>
                              ) : (
                                <span className="text-xs text-muted-foreground">Sin hora</span>
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-medium text-sm">{item.title}</h3>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] shrink-0"
                                  style={{
                                    borderColor: item.source === "event" ? "#6366f1" : "#f59e0b",
                                    color: item.source === "event" ? "#6366f1" : "#f59e0b",
                                  }}
                                >
                                  {item.source === "event" ? "General" : item.taskTitle || "Tarea"}
                                </Badge>
                              </div>

                              {item.description && (
                                <p className="text-xs text-muted-foreground mt-1">
                                  {item.description}
                                </p>
                              )}

                              <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                                {item.location && (
                                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <RiMapPinLine className="h-3 w-3" />
                                    {item.location}
                                  </span>
                                )}
                                {item.notes && (
                                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                    <RiInformationLine className="h-3 w-3" />
                                    {item.notes}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
