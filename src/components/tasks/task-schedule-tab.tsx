"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
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
  RiFileDownloadLine,
  RiUser3Line,
  RiEditLine,
  RiCloseLine,
  RiCheckLine,
} from "@remixicon/react";
import { downloadPDFFromHTML } from "@/lib/pdf-download";
import { appConfirm } from "@/lib/confirm";

interface TaskScheduleItem {
  id: number;
  taskId: number;
  vendorId: number | null;
  title: string;
  description: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  notes: string | null;
  sortOrder: number;
  vendorName: string | null;
}

interface VendorOption {
  id: number;
  name: string;
}

interface TaskScheduleTabProps {
  taskId: number;
  scheduleItems: TaskScheduleItem[];
  loading: boolean;
  readOnly?: boolean;
  onAddScheduleItem: (data: {
    title: string;
    date: string;
    startTime?: string;
    endTime?: string;
    description?: string;
    location?: string;
    vendorId?: number;
  }) => Promise<unknown>;
  onUpdateScheduleItem: (
    scheduleItemId: number,
    updates: Partial<TaskScheduleItem>
  ) => Promise<unknown>;
  onDeleteScheduleItem: (scheduleItemId: number) => Promise<boolean>;
}

export function TaskScheduleTab({
  taskId,
  scheduleItems,
  loading,
  onAddScheduleItem,
  onUpdateScheduleItem,
  onDeleteScheduleItem,
  readOnly = false,
}: TaskScheduleTabProps) {
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [vendorOptions, setVendorOptions] = useState<VendorOption[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFields, setEditFields] = useState({
    title: "",
    date: "",
    startTime: "",
    endTime: "",
    description: "",
    location: "",
    vendorId: "" as string,
  });
  const [saving, setSaving] = useState(false);

  const fetchVendors = useCallback(async () => {
    try {
      const res = await fetch("/api/vendors");
      const data = await res.json();
      if (data.success) {
        setVendorOptions(data.data?.map((v: any) => ({ id: v.id, name: v.name })) || []);
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchVendors();
  }, [fetchVendors]);

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      await downloadPDFFromHTML(
        `/api/tasks/${taskId}/schedule/pdf`,
        `orden-del-dia-tarea-${taskId}`
      );
    } finally {
      setDownloadingPdf(false);
    }
  };
  const [showAddForm, setShowAddForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState({
    title: "",
    date: "",
    startTime: "",
    endTime: "",
    description: "",
    location: "",
    vendorId: "" as string,
  });

  const startEdit = (item: TaskScheduleItem) => {
    setEditingId(item.id);
    setEditFields({
      title: item.title,
      date: typeof item.date === "string" && item.date.includes("T")
        ? item.date.split("T")[0]
        : item.date,
      startTime: item.startTime || "",
      endTime: item.endTime || "",
      description: item.description || "",
      location: item.location || "",
      vendorId: item.vendorId?.toString() || "",
    });
  };

  const handleSaveEdit = async (item: TaskScheduleItem) => {
    if (!editFields.title.trim() || !editFields.date) return;
    setSaving(true);
    try {
      await onUpdateScheduleItem(item.id, {
        title: editFields.title.trim(),
        date: editFields.date,
        startTime: editFields.startTime || null,
        endTime: editFields.endTime || null,
        description: editFields.description.trim() || null,
        location: editFields.location.trim() || null,
        vendorId: editFields.vendorId ? parseInt(editFields.vendorId, 10) : null,
      });
      setEditingId(null);
    } finally {
      setSaving(false);
    }
  };

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
        location: newItem.location.trim() || undefined,
        vendorId: newItem.vendorId ? parseInt(newItem.vendorId, 10) : undefined,
      });
      setNewItem({
        title: "",
        date: "",
        startTime: "",
        endTime: "",
        description: "",
        location: "",
        vendorId: "",
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
        <div className="flex items-center gap-2">
          {scheduleItems.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              className="gap-1"
              onClick={handleDownloadPdf}
              disabled={downloadingPdf}
            >
              <RiFileDownloadLine className="h-4 w-4" />
              {downloadingPdf ? "Generando..." : "PDF"}
            </Button>
          )}
          {!readOnly && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => setShowAddForm(!showAddForm)}
          >
            <RiAddLine className="h-4 w-4" />
            Agregar
          </Button>
          )}
        </div>
      </div>

      {/* Add Form */}
      {showAddForm && (
        <div className="p-4 rounded-lg border border-border bg-muted/50 space-y-3">
          <div className="grid grid-cols-4 gap-3">
            <Input
              placeholder="Título *"
              value={newItem.title}
              onChange={(e) => setNewItem({ ...newItem, title: e.target.value })}
            />
            <Input
              type="date"
              value={newItem.date}
              onChange={(e) => setNewItem({ ...newItem, date: e.target.value })}
            />
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
          <div className="grid grid-cols-2 gap-3">
            <select
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={newItem.vendorId}
              onChange={(e) => setNewItem({ ...newItem, vendorId: e.target.value })}
            >
              <option value="">Proveedor (opcional)</option>
              {vendorOptions.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
            <Input
              placeholder="Ubicación (opcional)"
              value={newItem.location}
              onChange={(e) => setNewItem({ ...newItem, location: e.target.value })}
            />
          </div>
          <Textarea
            placeholder="Notas (opcional)"
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
          {scheduleItems.map((item) => {
            const isEditing = editingId === item.id;

            if (isEditing && !readOnly) {
              return (
                <div key={item.id} className="rounded-lg border border-primary overflow-hidden">
                  <div className="p-4 bg-muted/50 space-y-3">
                    <div className="grid grid-cols-4 gap-3">
                      <Input
                        placeholder="Título *"
                        value={editFields.title}
                        onChange={(e) => setEditFields({ ...editFields, title: e.target.value })}
                      />
                      <Input
                        type="date"
                        value={editFields.date}
                        onChange={(e) => setEditFields({ ...editFields, date: e.target.value })}
                      />
                      <Input
                        type="time"
                        value={editFields.startTime}
                        onChange={(e) => setEditFields({ ...editFields, startTime: e.target.value })}
                      />
                      <Input
                        type="time"
                        value={editFields.endTime}
                        onChange={(e) => setEditFields({ ...editFields, endTime: e.target.value })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <select
                        className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                        value={editFields.vendorId}
                        onChange={(e) => setEditFields({ ...editFields, vendorId: e.target.value })}
                      >
                        <option value="">Sin proveedor</option>
                        {vendorOptions.map((v) => (
                          <option key={v.id} value={v.id}>{v.name}</option>
                        ))}
                      </select>
                      <Input
                        placeholder="Ubicación (opcional)"
                        value={editFields.location}
                        onChange={(e) => setEditFields({ ...editFields, location: e.target.value })}
                      />
                    </div>
                    <Textarea
                      placeholder="Notas (opcional)"
                      value={editFields.description}
                      onChange={(e) => setEditFields({ ...editFields, description: e.target.value })}
                      rows={2}
                    />
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>
                        <RiCloseLine className="h-4 w-4 mr-1" />Cancelar
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleSaveEdit(item)}
                        disabled={saving || !editFields.title.trim() || !editFields.date}
                      >
                        <RiCheckLine className="h-4 w-4 mr-1" />{saving ? "Guardando..." : "Guardar"}
                      </Button>
                    </div>
                  </div>
                </div>
              );
            }

            return (
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
                        <p className="text-xs text-muted-foreground mb-1">Título</p>
                        <p className="font-medium">{item.title}</p>
                        {item.vendorName && (
                          <Badge variant="outline" className="mt-1 text-[10px] gap-1">
                            <RiUser3Line className="h-2.5 w-2.5" />
                            {item.vendorName}
                          </Badge>
                        )}
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
                    {!readOnly && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => startEdit(item)}
                        >
                          <RiEditLine className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive"
                          onClick={() => onDeleteScheduleItem(item.id)}
                        >
                          <RiDeleteBinLine className="h-4 w-4" />
                        </Button>
                      </>
                    )}
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
            );
          })}
        </div>
      )}

      {/* Footer Actions */}
      {!readOnly && scheduleItems.length > 0 && (
        <div className="flex justify-between pt-4 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive"
            onClick={async () => {
              if (await appConfirm({ title: "Eliminar orden del día", description: "Se eliminarán todos los ítems. Esta acción no se puede deshacer.", variant: "destructive", confirmLabel: "Eliminar todo" })) {
                scheduleItems.forEach((item) => onDeleteScheduleItem(item.id));
              }
            }}
          >
            Eliminar todo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowAddForm(true)}
          >
            Agregar
          </Button>
        </div>
      )}
    </div>
  );
}
