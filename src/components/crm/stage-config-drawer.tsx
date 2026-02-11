"use client";

import * as React from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface Stage {
  id: number;
  name: string;
  color: string | null;
  sortOrder: number | null;
  isDefault?: boolean | null;
  isWon: boolean | null;
  isLost: boolean | null;
}

interface StageConfigDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stage?: Stage | null;
  onStageCreated?: () => void;
  onStageUpdated?: () => void;
  onStageDeleted?: () => void;
  nextSortOrder?: number;
}

const PRESET_COLORS = [
  "#6366f1", // Indigo
  "#8b5cf6", // Violet
  "#ec4899", // Pink
  "#f59e0b", // Amber
  "#10b981", // Emerald
  "#22c55e", // Green
  "#ef4444", // Red
  "#3b82f6", // Blue
  "#06b6d4", // Cyan
  "#84cc16", // Lime
];

export function StageConfigDrawer({
  open,
  onOpenChange,
  stage,
  onStageCreated,
  onStageUpdated,
  onStageDeleted,
  nextSortOrder = 0,
}: StageConfigDrawerProps) {
  const [loading, setLoading] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [name, setName] = React.useState("");
  const [color, setColor] = React.useState("#6366f1");
  const [isDefault, setIsDefault] = React.useState(false);
  const [isWon, setIsWon] = React.useState(false);
  const [isLost, setIsLost] = React.useState(false);

  const isEditing = !!stage;

  React.useEffect(() => {
    if (stage) {
      setName(stage.name);
      setColor(stage.color || "#6366f1");
      setIsDefault(stage.isDefault || false);
      setIsWon(stage.isWon || false);
      setIsLost(stage.isLost || false);
    } else {
      setName("");
      setColor("#6366f1");
      setIsDefault(false);
      setIsWon(false);
      setIsLost(false);
    }
  }, [stage, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    setLoading(true);
    try {
      if (isEditing && stage) {
        // Update existing stage
        const response = await fetch(`/api/crm/stages/${stage.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, color, isDefault, isWon, isLost }),
        });

        const result = await response.json();
        if (result.success) {
          toast.success("Etapa actualizada");
          onStageUpdated?.();
          onOpenChange(false);
        } else {
          toast.error(result.error?.message || "Error al actualizar");
        }
      } else {
        // Create new stage
        const response = await fetch("/api/crm/stages", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            name, 
            color, 
            sortOrder: nextSortOrder,
            isDefault, 
            isWon, 
            isLost 
          }),
        });

        const result = await response.json();
        if (result.success) {
          toast.success("Etapa creada");
          onStageCreated?.();
          onOpenChange(false);
        } else {
          toast.error(result.error?.message || "Error al crear");
        }
      }
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!stage) return;
    
    if (!confirm("¿Estás seguro de eliminar esta etapa? Esta acción no se puede deshacer.")) {
      return;
    }

    setDeleting(true);
    try {
      const response = await fetch(`/api/crm/stages/${stage.id}`, {
        method: "DELETE",
      });

      const result = await response.json();
      if (result.success) {
        toast.success("Etapa eliminada");
        onStageDeleted?.();
        onOpenChange(false);
      } else {
        toast.error(result.error?.message || "Error al eliminar");
      }
    } catch (error) {
      toast.error("Error de conexión");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? "Editar Etapa" : "Nueva Etapa"}
          </SheetTitle>
          <SheetDescription>
            {isEditing 
              ? "Modifica los detalles de la etapa del pipeline"
              : "Crea una nueva etapa para tu pipeline de ventas"
            }
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4 px-4 pb-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej: Propuesta Enviada"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>Color</Label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((presetColor) => (
                <button
                  key={presetColor}
                  type="button"
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    color === presetColor 
                      ? "border-foreground scale-110" 
                      : "border-transparent hover:scale-105"
                  }`}
                  style={{ backgroundColor: presetColor }}
                  onClick={() => setColor(presetColor)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-4 pt-2">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isDefault">Etapa por defecto</Label>
                <p className="text-xs text-muted-foreground">
                  Los nuevos leads se crearán en esta etapa
                </p>
              </div>
              <Switch
                id="isDefault"
                checked={isDefault}
                onCheckedChange={setIsDefault}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isWon">Etapa de "Ganado"</Label>
                <p className="text-xs text-muted-foreground">
                  Marca leads como ganados al llegar aquí
                </p>
              </div>
              <Switch
                id="isWon"
                checked={isWon}
                onCheckedChange={(checked) => {
                  setIsWon(checked);
                  if (checked) setIsLost(false);
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="isLost">Etapa de "Perdido"</Label>
                <p className="text-xs text-muted-foreground">
                  Marca leads como perdidos al llegar aquí
                </p>
              </div>
              <Switch
                id="isLost"
                checked={isLost}
                onCheckedChange={(checked) => {
                  setIsLost(checked);
                  if (checked) setIsWon(false);
                }}
              />
            </div>
          </div>

          <SheetFooter className="gap-2 sm:gap-0">
            {isEditing && (
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting || loading}
                className="mr-auto"
              >
                {deleting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                <span className="ml-2">Eliminar</span>
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading || deleting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || deleting}>
              {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {isEditing ? "Guardar" : "Crear"}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
