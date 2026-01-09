"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RiHistoryLine,
  RiAddLine,
  RiPhoneLine,
  RiMailLine,
  RiCalendarLine,
  RiFileTextLine,
  RiCheckLine,
} from "@remixicon/react";

interface ContactActivity {
  id: number;
  type: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string | null;
  createdByName: string | null;
}

interface ContactActivityTabProps {
  activities: ContactActivity[];
  loading: boolean;
  onAddActivity: (data: { type: string; title: string; description?: string }) => Promise<unknown>;
}

const activityTypes = [
  { id: "note", label: "Nota", icon: RiFileTextLine, color: "bg-gray-500" },
  { id: "call", label: "Llamada", icon: RiPhoneLine, color: "bg-blue-500" },
  { id: "email", label: "Email", icon: RiMailLine, color: "bg-green-500" },
  { id: "meeting", label: "Reunión", icon: RiCalendarLine, color: "bg-purple-500" },
  { id: "other", label: "Otro", icon: RiCheckLine, color: "bg-orange-500" },
];

function getActivityConfig(type: string) {
  return activityTypes.find((t) => t.id === type) || activityTypes[0];
}

export function ContactActivityTab({
  activities,
  loading,
  onAddActivity,
}: ContactActivityTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    type: "note",
    title: "",
    description: "",
  });

  const handleSubmit = async () => {
    if (!formData.title) return;

    setSaving(true);
    try {
      await onAddActivity({
        type: formData.type,
        title: formData.title,
        description: formData.description || undefined,
      });
      setFormData({ type: "note", title: "", description: "" });
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <RiHistoryLine className="h-5 w-5" />
          <h3 className="text-sm font-medium">Historial de Actividades</h3>
          <span className="text-xs">({activities.length})</span>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowForm(!showForm)}
          className="gap-2"
        >
          <RiAddLine className="h-4 w-4" />
          Agregar actividad
        </Button>
      </div>

      {showForm && (
        <div className="border rounded-lg p-4 space-y-4 bg-muted/30">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo</label>
              <Select
                value={formData.type}
                onValueChange={(v) => setFormData({ ...formData, type: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {activityTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      <div className="flex items-center gap-2">
                        <type.icon className="h-4 w-4" />
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Título *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Título de la actividad"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Descripción</label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detalles de la actividad..."
              rows={3}
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={saving || !formData.title}>
              {saving ? "Guardando..." : "Guardar"}
            </Button>
          </div>
        </div>
      )}

      {activities.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed rounded-lg">
          <RiHistoryLine className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="font-medium mb-2">Sin actividades</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Registra la primera actividad con este contacto
          </p>
          <Button variant="outline" onClick={() => setShowForm(true)}>
            <RiAddLine className="h-4 w-4 mr-2" />
            Agregar actividad
          </Button>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-border" />

          <div className="space-y-4">
            {activities.map((activity) => {
              const config = getActivityConfig(activity.type);
              const Icon = config.icon;
              return (
                <div key={activity.id} className="relative pl-10">
                  {/* Timeline dot */}
                  <div className={`absolute left-2 top-1 w-5 h-5 rounded-full ${config.color} flex items-center justify-center`}>
                    <Icon className="h-3 w-3 text-white" />
                  </div>

                  <div className="border rounded-lg p-3 bg-card">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{activity.title}</p>
                          <Badge variant="outline" className="text-xs">
                            {config.label}
                          </Badge>
                        </div>
                        {activity.description && (
                          <p className="text-sm text-muted-foreground mt-1">
                            {activity.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      {activity.createdAt && (
                        <span>
                          {new Date(activity.createdAt).toLocaleDateString("es-ES", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                      {activity.createdByName && (
                        <>
                          <span>•</span>
                          <span>{activity.createdByName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
