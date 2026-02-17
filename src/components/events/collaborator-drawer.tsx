"use client";

import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { RiUserAddLine } from "@remixicon/react";
import { toast } from "sonner";

interface TeamMember {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  role: string;
}

interface CollaboratorDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventId: number;
  onSuccess: () => void;
  editingParticipant?: {
    id: number;
    userId: string | null;
    userName: string | null;
    userEmail: string | null;
    permissions: Record<string, string> | null;
  } | null;
}

const SECTIONS = [
  { key: "general", label: "General", levels: ["none", "view", "edit"] },
  { key: "tasks", label: "Tareas", levels: ["none", "view", "edit"] },
  { key: "guests", label: "Lista de Invitados", levels: ["none", "view", "edit"] },
  { key: "rsvp", label: "RSVP", levels: ["none", "view", "edit"] },
  { key: "vendors", label: "Proveedores", levels: ["none", "view"] },
  { key: "finances", label: "Finanzas", levels: ["none", "view"] },
] as const;

const LEVEL_LABELS: Record<string, string> = {
  none: "Sin acceso",
  view: "Ver",
  edit: "Editar",
};

const PRESETS = [
  { label: "Acceso completo", value: { general: "edit", tasks: "edit", guests: "edit", rsvp: "edit", vendors: "view", finances: "view", settings: "none" } },
  { label: "Solo lectura", value: { general: "view", tasks: "view", guests: "view", rsvp: "view", vendors: "view", finances: "view", settings: "none" } },
  { label: "Solo RSVP e Invitados", value: { general: "view", tasks: "none", guests: "view", rsvp: "view", vendors: "none", finances: "none", settings: "none" } },
];

const DEFAULT_PERMISSIONS: Record<string, string> = {
  general: "view",
  tasks: "view",
  guests: "view",
  rsvp: "view",
  vendors: "none",
  finances: "none",
  settings: "none",
};

export function CollaboratorDrawer({
  open,
  onOpenChange,
  eventId,
  onSuccess,
  editingParticipant,
}: CollaboratorDrawerProps) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [permissions, setPermissions] = useState<Record<string, string>>(DEFAULT_PERMISSIONS);
  const [saving, setSaving] = useState(false);

  const isEditing = !!editingParticipant;

  const fetchMembers = useCallback(async () => {
    setLoadingMembers(true);
    try {
      const res = await fetch("/api/team");
      const data = await res.json();
      if (data.success) {
        setMembers(data.data?.members || []);
      }
    } catch {
      console.error("Error fetching team members");
    } finally {
      setLoadingMembers(false);
    }
  }, []);

  useEffect(() => {
    if (open && !isEditing) {
      fetchMembers();
    }
  }, [open, isEditing, fetchMembers]);

  useEffect(() => {
    if (editingParticipant) {
      setPermissions(editingParticipant.permissions || DEFAULT_PERMISSIONS);
    } else {
      setSelectedUserId("");
      setPermissions(DEFAULT_PERMISSIONS);
    }
  }, [editingParticipant, open]);

  function setSectionLevel(section: string, level: string) {
    setPermissions((prev) => ({ ...prev, [section]: level }));
  }

  function applyPreset(preset: Record<string, string>) {
    setPermissions(preset);
  }

  async function handleSave() {
    if (!isEditing && !selectedUserId) {
      toast.error("Selecciona un miembro del equipo");
      return;
    }

    setSaving(true);
    try {
      if (isEditing && editingParticipant) {
        const res = await fetch(`/api/events/${eventId}/collaborators/${editingParticipant.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ permissions }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success("Permisos actualizados");
          onOpenChange(false);
          onSuccess();
        } else {
          toast.error(data.error?.message || "Error al actualizar");
        }
      } else {
        const res = await fetch(`/api/events/${eventId}/collaborators`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: selectedUserId,
            type: "planner",
            permissions,
          }),
        });
        const data = await res.json();
        if (data.success) {
          toast.success("Colaborador agregado");
          onOpenChange(false);
          onSuccess();
        } else {
          toast.error(data.error?.message || "Error al agregar");
        }
      }
    } catch {
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <RiUserAddLine className="h-5 w-5" />
            {isEditing ? "Editar permisos" : "Agregar colaborador"}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? `Editando permisos de ${editingParticipant?.userName || editingParticipant?.userEmail}`
              : "Selecciona un miembro del equipo y configura sus permisos en este evento"}
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 py-4 space-y-6">
          {/* Member selector (only for new) */}
          {!isEditing && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Miembro del equipo</label>
              {loadingMembers ? (
                <Skeleton className="h-10 w-full" />
              ) : (
                <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar miembro..." />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        <div className="flex items-center gap-2">
                          <span>{m.name || m.email}</span>
                          <span className="text-xs text-muted-foreground">({m.role})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          )}

          {/* Presets */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Presets rápidos</label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset(preset.value)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Permission matrix */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Permisos por sección</label>
            <div className="border rounded-lg divide-y">
              {SECTIONS.map(({ key, label, levels }) => (
                <div key={key} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">
                      {LEVEL_LABELS[permissions[key] || "none"]}
                    </p>
                  </div>
                  <Select
                    value={permissions[key] || "none"}
                    onValueChange={(val) => setSectionLevel(key, val)}
                  >
                    <SelectTrigger className="w-[130px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {levels.map((level) => (
                        <SelectItem key={level} value={level}>
                          {LEVEL_LABELS[level]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>

          {/* Summary */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Resumen de acceso</label>
            <div className="flex flex-wrap gap-1.5">
              {SECTIONS.filter(({ key }) => permissions[key] !== "none").map(({ key, label }) => (
                <Badge key={key} variant={permissions[key] === "edit" ? "default" : "secondary"}>
                  {label} ({permissions[key] === "edit" ? "editar" : "ver"})
                </Badge>
              ))}
              {SECTIONS.every(({ key }) => permissions[key] === "none") && (
                <p className="text-sm text-muted-foreground">Sin acceso a ninguna sección</p>
              )}
            </div>
          </div>
        </div>

        <SheetFooter className="px-4">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={saving || (!isEditing && !selectedUserId)}>
            {saving ? "Guardando..." : isEditing ? "Guardar cambios" : "Agregar colaborador"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
