"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  RiAddLine,
  RiDeleteBinLine,
  RiUserLine,
  RiStore2Line,
  RiContactsLine,
  RiCalendarLine,
  RiCheckLine,
} from "@remixicon/react";
import { cn } from "@/lib/utils";

interface ChecklistAssignee {
  id: number;
  participantId: number;
  type: string | null;
  name: string;
  isUser: boolean;
  isVendor: boolean;
  isContact: boolean;
  assignedAt: string | null;
}

interface TaskChecklistItem {
  id: number;
  taskId: number;
  title: string;
  isCompleted: boolean;
  dueDate: string | null;
  sortOrder: number;
  completedAt: string | null;
  completedBy: string | null;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
  assignees: ChecklistAssignee[];
}

interface TaskParticipant {
  id: number;
  taskId?: number;
  userId: string | null;
  vendorId: number | null;
  contactId?: number | null;
  userName?: string | null;
  userEmail?: string | null;
  userImage?: string | null;
  vendorName?: string | null;
  contactName?: string | null;
  name?: string | null;
  isVendor?: boolean;
  isContact?: boolean;
  type: string;
  canEdit: boolean;
  canComment: boolean;
}

interface TaskChecklistSectionProps {
  checklistItems: TaskChecklistItem[];
  participants: TaskParticipant[];
  loading: boolean;
  onAddItem: (data: { title: string; dueDate?: string; assigneeIds?: number[] }) => Promise<unknown>;
  onUpdateItem: (itemId: number, updates: { title?: string; isCompleted?: boolean; dueDate?: string | null }) => Promise<unknown>;
  onToggleItem: (itemId: number, isCompleted: boolean) => Promise<unknown>;
  onDeleteItem: (itemId: number) => Promise<boolean>;
  onAddAssignee: (itemId: number, participantId: number) => Promise<unknown>;
  onRemoveAssignee: (itemId: number, participantId: number) => Promise<boolean>;
}

export function TaskChecklistSection({
  checklistItems,
  participants,
  loading,
  onAddItem,
  onUpdateItem,
  onToggleItem,
  onDeleteItem,
  onAddAssignee,
  onRemoveAssignee,
}: TaskChecklistSectionProps) {
  const [newItemTitle, setNewItemTitle] = useState("");
  const [adding, setAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const completedCount = checklistItems.filter(item => item.isCompleted).length;
  const totalCount = checklistItems.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleAddItem = async () => {
    if (!newItemTitle.trim() || adding) return;
    
    setAdding(true);
    try {
      await onAddItem({ title: newItemTitle.trim() });
      setNewItemTitle("");
      inputRef.current?.focus();
    } finally {
      setAdding(false);
    }
  };

  const handleToggle = async (item: TaskChecklistItem) => {
    await onToggleItem(item.id, !item.isCompleted);
  };

  const handleDelete = async (itemId: number) => {
    await onDeleteItem(itemId);
  };

  const startEditing = (item: TaskChecklistItem) => {
    setEditingId(item.id);
    setEditingTitle(item.title);
  };

  const saveEdit = async () => {
    if (!editingId || !editingTitle.trim()) {
      setEditingId(null);
      return;
    }
    
    await onUpdateItem(editingId, { title: editingTitle.trim() });
    setEditingId(null);
    setEditingTitle("");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingTitle("");
  };

  const getParticipantName = (p: TaskParticipant): string => {
    return p.userName || p.vendorName || p.contactName || p.name || "Sin nombre";
  };

  const getParticipantIcon = (p: TaskParticipant) => {
    if (p.vendorId || p.isVendor) return <RiStore2Line className="h-3 w-3" />;
    if (p.contactId || p.isContact) return <RiContactsLine className="h-3 w-3" />;
    return <RiUserLine className="h-3 w-3" />;
  };

  const getAssigneeIcon = (a: ChecklistAssignee) => {
    if (a.isVendor) return <RiStore2Line className="h-3 w-3" />;
    if (a.isContact) return <RiContactsLine className="h-3 w-3" />;
    return <RiUserLine className="h-3 w-3" />;
  };

  const getAssigneeBadgeColor = (a: ChecklistAssignee) => {
    if (a.isVendor) return "bg-blue-100 text-blue-700 border-blue-200";
    if (a.isContact) return "bg-green-100 text-green-700 border-green-200";
    return "bg-gray-100 text-gray-700 border-gray-200";
  };

  // Get available participants (not already assigned to this item)
  const getAvailableParticipants = (item: TaskChecklistItem) => {
    const assignedIds = new Set(item.assignees.map(a => a.participantId));
    return participants.filter(p => !assignedIds.has(p.id));
  };

  if (loading) {
    return (
      <div className="space-y-3">
        <div className="h-4 bg-muted rounded animate-pulse w-32" />
        <div className="h-10 bg-muted rounded animate-pulse" />
        <div className="h-10 bg-muted rounded animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <RiCheckLine className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-medium">To-Do List</h3>
          {totalCount > 0 && (
            <span className="text-sm text-muted-foreground">
              ({completedCount}/{totalCount})
            </span>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {totalCount > 0 && (
        <Progress value={progressPercent} className="h-2" />
      )}

      {/* Checklist items */}
      <div className="space-y-2">
        {checklistItems.map((item) => (
          <div
            key={item.id}
            className={cn(
              "flex items-start gap-3 p-3 rounded-lg border bg-card transition-colors",
              item.isCompleted && "bg-muted/50"
            )}
          >
            {/* Checkbox */}
            <Checkbox
              checked={item.isCompleted}
              onCheckedChange={() => handleToggle(item)}
              className="mt-0.5"
            />

            {/* Content */}
            <div className="flex-1 min-w-0">
              {editingId === item.id ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") saveEdit();
                      if (e.key === "Escape") cancelEdit();
                    }}
                    className="h-8"
                    autoFocus
                  />
                  <Button size="sm" variant="ghost" onClick={saveEdit}>
                    <RiCheckLine className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div
                  className={cn(
                    "font-medium cursor-pointer hover:text-primary transition-colors",
                    item.isCompleted && "line-through text-muted-foreground"
                  )}
                  onClick={() => startEditing(item)}
                >
                  {item.title}
                </div>
              )}

              {/* Assignees */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {item.assignees.map((assignee) => (
                  <Badge
                    key={assignee.id}
                    variant="outline"
                    className={cn("text-xs gap-1 pr-1", getAssigneeBadgeColor(assignee))}
                  >
                    {getAssigneeIcon(assignee)}
                    <span className="max-w-[100px] truncate">{assignee.name}</span>
                    <button
                      onClick={() => onRemoveAssignee(item.id, assignee.participantId)}
                      className="ml-1 hover:text-destructive"
                    >
                      ×
                    </button>
                  </Badge>
                ))}

                {/* Add assignee button */}
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
                    >
                      <RiAddLine className="h-3 w-3 mr-1" />
                      Asignar
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-56 p-2" align="start">
                    <div className="text-xs font-medium text-muted-foreground mb-2">
                      Asignar a participante
                    </div>
                    {getAvailableParticipants(item).length === 0 ? (
                      <div className="text-xs text-muted-foreground py-2 text-center">
                        {participants.length === 0 
                          ? "No hay participantes en esta tarea"
                          : "Todos los participantes ya están asignados"
                        }
                      </div>
                    ) : (
                      <div className="space-y-1 max-h-48 overflow-y-auto">
                        {getAvailableParticipants(item).map((p) => (
                          <button
                            key={p.id}
                            onClick={() => onAddAssignee(item.id, p.id)}
                            className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted transition-colors text-left"
                          >
                            <span className="flex-shrink-0">
                              {getParticipantIcon(p)}
                            </span>
                            <span className="truncate">{getParticipantName(p)}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </PopoverContent>
                </Popover>

                {/* Due date indicator */}
                {item.dueDate && (
                  <Badge variant="outline" className="text-xs gap-1">
                    <RiCalendarLine className="h-3 w-3" />
                    {new Date(item.dueDate).toLocaleDateString("es-AR", {
                      day: "numeric",
                      month: "short",
                    })}
                  </Badge>
                )}
              </div>
            </div>

            {/* Delete button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-muted-foreground hover:text-destructive flex-shrink-0"
              onClick={() => handleDelete(item.id)}
            >
              <RiDeleteBinLine className="h-4 w-4" />
            </Button>
          </div>
        ))}
      </div>

      {/* Add new item */}
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          value={newItemTitle}
          onChange={(e) => setNewItemTitle(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleAddItem();
          }}
          placeholder="Agregar nuevo ítem..."
          className="flex-1"
          disabled={adding}
        />
        <Button
          onClick={handleAddItem}
          disabled={!newItemTitle.trim() || adding}
          size="sm"
        >
          <RiAddLine className="h-4 w-4 mr-1" />
          Agregar
        </Button>
      </div>

      {/* Empty state */}
      {checklistItems.length === 0 && (
        <div className="text-center py-6 text-muted-foreground text-sm">
          No hay ítems en el checklist. Agrega el primero arriba.
        </div>
      )}
    </div>
  );
}
