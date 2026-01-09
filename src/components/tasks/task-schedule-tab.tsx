"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  RiAddLine,
  RiDeleteBinLine,
  RiArrowDownSLine,
  RiTimeLine,
  RiCalendarLine,
} from "@remixicon/react";

interface TaskScheduleItem {
  id: number;
  taskId: number;
  title: string;
  description: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  notes: string | null;
  sortOrder: number;
}

interface TaskScheduleTabProps {
  scheduleItems: TaskScheduleItem[];
  loading: boolean;
  onAddScheduleItem: (data: {
    title: string;
    date: string;
    startTime?: string;
    endTime?: string;
    description?: string;
    location?: string;
  }) => Promise<unknown>;
  onUpdateScheduleItem: (
    scheduleItemId: number,
    updates: Partial<TaskScheduleItem>
  ) => Promise<unknown>;
  onDeleteScheduleItem: (scheduleItemId: number) => Promise<boolean>;
}

export function TaskScheduleTab({
  scheduleItems,
  loading,
  onAddScheduleItem,
  onUpdateScheduleItem,
  onDeleteScheduleItem,
}: TaskScheduleTabProps) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [showAddForm, setShowAddForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState({
    title: "",
    date: "",
    startTime: "",
    endTime: "",
    description: "",
  });

  const toggleExpanded = (id: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedItems(newExpanded);
  };

  const handleAddItem = async () => {
    if (!newItem.title.trim() || !newItem.date) return;
    setAdding(true);
    try {
      await onAddScheduleItem({
        title: newItem.title.trim(),
        date: newItem.date,
        startTime: newItem.startTime || undefined,
        endTime: newItem.endTime || undefined,
        description: newItem.description.trim() || undefined,
      });
      setNewItem({
        title: "",
        date: "",
        startTime: "",
        endTime: "",
        description: "",
      });
      setShowAddForm(false);
    } finally {
      setAdding(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="font-medium">Orden del día</h3>
        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={() => setShowAddForm(!showAddForm)}
        >
          <RiAddLine className="h-4 w-4" />
          Add Order
        </Button>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="p-4 rounded-lg border border-border bg-muted/50 space-y-3">
          <div className="grid grid-cols-3 gap-3">
            <Input
              placeholder="Descripción *"
              value={newItem.title}
              onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
            />
            <Input
              type="date"
              value={newItem.date}
              onChange={(e) => setNewItem({ ...newItem, date: e.target.value })}
            />
            <div className="flex gap-2">
              <Input
                type="time"
                placeholder="Inicio"
                value={newItem.startTime}
                onChange={(e) => setNewItem({ ...newItem, startTime: e.target.value })}
              />
              <Input
                type="time"
                placeholder="Fin"
                value={newItem.endTime}
                onChange={(e) => setNewItem({ ...newItem, endTime: e.target.value })}
              />
            </div>
          </div>
          <Textarea
            placeholder="Más detalles (opcional)"
            value={newItem.description}
            onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
            rows={2}
          />
          <div className="flex justify-end gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowAddForm(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleAddItem}
              disabled={adding || !newItem.title.trim() || !newItem.date}
            >
              {adding ? "Añadiendo..." : "Añadir"}
            </Button>
          </div>
        </div>
      )}

      {/* Schedule Items */}
      {scheduleItems.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          No hay items en el orden del día
        </div>
      ) : (
        <div className="space-y-2">
          {scheduleItems.map((item) => (
            <Collapsible
              key={item.id}
              open={expandedItems.has(item.id)}
              onOpenChange={() => toggleExpanded(item.id)}
            >
              <div className="rounded-lg border border-border overflow-hidden">
                {/* Item Header */}
                <div className="flex items-center gap-4 p-4 bg-background">
                  <div className="flex-1 min-w-0">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground mb-1">Descripción</p>
                        <p className="font-medium">{item.title}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          <RiCalendarLine className="h-3 w-3" />
                          Fecha
                        </p>
                        <p className="font-medium">{formatDate(item.date)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground mb-1 flex items-center gap-1">
                          <RiTimeLine className="h-3 w-3" />
                          Hora
                        </p>
                        <p className="font-medium">
                          {item.startTime || "--:--"}
                          {item.endTime && ` - ${item.endTime}`}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <CollapsibleTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-xs">
                        {expandedItems.has(item.id) ? "Cerrar detalles" : "Más detalles"}
                        <RiArrowDownSLine
                          className={`h-4 w-4 ml-1 transition-transform ${
                            expandedItems.has(item.id) ? "rotate-180" : ""
                          }`}
                        />
                      </Button>
                    </CollapsibleTrigger>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => onDeleteScheduleItem(item.id)}
                    >
                      <RiDeleteBinLine className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Expanded Content */}
                <CollapsibleContent>
                  <div className="p-4 border-t border-border bg-muted/30">
                    {item.description ? (
                      <p className="text-sm whitespace-pre-wrap">{item.description}</p>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        Sin descripción adicional
                      </p>
                    )}
                    {item.location && (
                      <p className="text-sm mt-2">
                        <span className="text-muted-foreground">Ubicación:</span> {item.location}
                      </p>
                    )}
                    {item.notes && (
                      <p className="text-sm mt-2">
                        <span className="text-muted-foreground">Notas:</span> {item.notes}
                      </p>
                    )}
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          ))}
        </div>
      )}

      {/* Footer Actions */}
      {scheduleItems.length > 0 && (
        <div className="flex justify-between pt-4 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={() => {
              if (confirm("¿Eliminar todos los items del orden del día?")) {
                scheduleItems.forEach((item) => onDeleteScheduleItem(item.id));
              }
            }}
          >
            Remove Order
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddForm(true)}
          >
            Add Order
          </Button>
        </div>
      )}
    </div>
  );
}
