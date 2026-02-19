"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useEvent } from "@/contexts/event-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  RiSaveLine,
  RiDeleteBinLine,
  RiMapPinLine,
  RiUserAddLine,
} from "@remixicon/react";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { LocationMap } from "@/components/ui/location-map";
import { CollaboratorDrawer } from "@/components/events/collaborator-drawer";
import { toast } from "sonner";

interface EventData {
  id: number;
  name: string;
  type: string;
  status: string;
  date: string | null;
  endDate: string | null;
  location: string | null;
  budget: string | null;
  description: string | null;
}

interface Collaborator {
  id: number;
  userId: string | null;
  contactId: number | null;
  vendorId: number | null;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
  contactName: string | null;
  contactEmail: string | null;
  vendorName: string | null;
  vendorCategory: string | null;
  type: string;
  role: string | null;
  permissions: Record<string, string> | null;
  invitedAt: string | null;
  acceptedAt: string | null;
}

const ROLE_LABELS: Record<string, string> = {
  client: "Cliente",
  organizer: "Organizador",
  assistant: "Asistente",
  sponsor: "Patrocinador",
  speaker: "Ponente",
  vendor: "Proveedor",
  other: "Otro",
};

function getCollabDisplayName(c: Collaborator): string {
  return c.userName || c.userEmail || c.contactName || c.vendorName || "Sin nombre";
}

function getCollabSubtext(c: Collaborator): string | null {
  if (c.userName && c.userEmail) return c.userEmail;
  if (c.contactEmail) return c.contactEmail;
  if (c.vendorCategory) return c.vendorCategory;
  return null;
}

function getCollabTypeColor(type: string): string {
  if (type === "contact") return "bg-green-100 text-green-700";
  if (type === "vendor") return "bg-orange-100 text-orange-700";
  return "bg-blue-100 text-blue-700";
}

export default function EventSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const eventId = parseInt(id, 10);
  const { setActiveEvent } = useEvent();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [taskCount, setTaskCount] = useState(0);
  const [event, setEvent] = useState<EventData | null>(null);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingParticipant, setEditingParticipant] = useState<Collaborator | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    status: "",
    date: "",
    endDate: "",
    location: "",
    budget: "",
    description: "",
  });

  useEffect(() => {
    async function fetchEvent() {
      try {
        const res = await fetch(`/api/events/${eventId}`);
        const data = await res.json();
        if (data.success) {
          setEvent(data.data);
          setActiveEvent(data.data);
          setTaskCount(data.data.taskCount || 0);
          setFormData({
            name: data.data.name || "",
            type: data.data.type || "",
            status: data.data.status || "",
            date: data.data.date ? data.data.date.split("T")[0] : "",
            endDate: data.data.endDate ? data.data.endDate.split("T")[0] : "",
            location: data.data.location || "",
            budget: data.data.budget || "",
            description: data.data.description || "",
          });
        }
      } catch (error) {
        console.error("Failed to fetch event:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchEvent();
  }, [eventId, setActiveEvent]);

  const fetchCollaborators = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/collaborators`);
      const data = await res.json();
      if (data.success) {
        setCollaborators(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch collaborators:", error);
    }
  }, [eventId]);

  useEffect(() => {
    fetchCollaborators();
  }, [fetchCollaborators]);

  async function handleRemoveCollaborator(participantId: number) {
    try {
      const res = await fetch(`/api/events/${eventId}/collaborators/${participantId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Colaborador eliminado");
        fetchCollaborators();
      } else {
        toast.error(data.error?.message || "Error al eliminar");
      }
    } catch {
      toast.error("Error de conexión");
    }
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (data.success) {
        setEvent(data.data);
        setActiveEvent(data.data);
      }
    } catch (error) {
      console.error("Failed to save event:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = await res.json();
      if (data.success) {
        setEvent(data.data);
        setActiveEvent(data.data);
        setFormData((prev) => ({ ...prev, status: "cancelled" }));
        // Show success message with cancelled tasks count
        const cancelledTasks = data.meta?.cancelledTasks || 0;
        if (cancelledTasks > 0) {
          alert(`Evento cancelado. ${cancelledTasks} tarea(s) también fueron canceladas.`);
        }
      }
    } catch (error) {
      console.error("Failed to cancel event:", error);
    } finally {
      setCancelling(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        setActiveEvent(null);
        router.push("/dashboard/events");
      }
    } catch (error) {
      console.error("Failed to delete event:", error);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64" />
        <Skeleton className="h-48" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Configuración</h1>
          <p className="text-[var(--muted-foreground)]">
            Ajustes generales del evento
          </p>
        </div>
        <div className="flex gap-2">
          {formData.status !== "cancelled" && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="outline" className="gap-2 text-amber-600 border-amber-300 hover:bg-amber-50">
                  Cancelar evento
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>¿Cancelar este evento?</AlertDialogTitle>
                  <AlertDialogDescription>
                    {taskCount > 0 ? (
                      <>
                        El evento y sus <strong>{taskCount} tarea(s)</strong> serán marcados como cancelados.
                        Podrás restaurarlos más tarde cambiando el estado.
                      </>
                    ) : (
                      "El evento será marcado como cancelado. Podrás restaurarlo más tarde cambiando el estado."
                    )}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Volver</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleCancel}
                    disabled={cancelling}
                    className="bg-amber-600 hover:bg-amber-700"
                  >
                    {cancelling ? "Cancelando..." : "Cancelar Evento"}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="gap-2">
                <RiDeleteBinLine className="h-4 w-4" />
                Eliminar evento
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>¿Eliminar este evento permanentemente?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta acción no se puede deshacer. Se eliminará el evento y todos sus datos asociados
                  (invitados, cronograma, documentos del evento, etc.).
                  {taskCount > 0 && (
                    <> Las <strong>{taskCount} tarea(s)</strong> vinculadas serán desvinculadas pero no eliminadas.</>
                  )}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Volver</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDelete}
                  disabled={deleting}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {deleting ? "Eliminando..." : "Eliminar Permanentemente"}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Información General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Nombre del evento *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Boda de Juan y María"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo de evento</Label>
              <Select
                value={formData.type}
                onValueChange={(value) => setFormData({ ...formData, type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="wedding">Boda</SelectItem>
                  <SelectItem value="corporate">Corporativo</SelectItem>
                  <SelectItem value="birthday">Cumpleaños</SelectItem>
                  <SelectItem value="social">Social</SelectItem>
                  <SelectItem value="other">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Fecha de inicio</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Fecha de finalización</Label>
              <Input
                type="date"
                value={formData.endDate}
                onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label>Estado</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Borrador</SelectItem>
                  <SelectItem value="confirmed">Confirmado</SelectItem>
                  <SelectItem value="in_progress">En progreso</SelectItem>
                  <SelectItem value="completed">Completado</SelectItem>
                  <SelectItem value="cancelled">Cancelado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Presupuesto</Label>
              <Input
                type="number"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descripción</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Descripción del evento..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {/* Location */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RiMapPinLine className="h-5 w-5" />
            Ubicación
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Dirección</Label>
            <Input
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Ej: Calle Falsa 123, Ciudad"
            />
          </div>
          <LocationMap address={formData.location} className="h-48" />
        </CardContent>
      </Card>

      {/* Collaborators */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <RiUserAddLine className="h-5 w-5" />
            Colaboradores
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => { setEditingParticipant(null); setDrawerOpen(true); }}>
            Agregar colaborador
          </Button>
        </CardHeader>
        <CardContent>
          {collaborators.length > 0 ? (
            <div className="space-y-2">
              {collaborators.map((collab) => (
                <div
                  key={collab.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => { setEditingParticipant(collab); setDrawerOpen(true); }}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${getCollabTypeColor(collab.type)}`}>
                      {getCollabDisplayName(collab).charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{getCollabDisplayName(collab)}</p>
                        {collab.role && (
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {ROLE_LABELS[collab.role] || collab.role}
                          </Badge>
                        )}
                      </div>
                      {getCollabSubtext(collab) && (
                        <p className="text-xs text-muted-foreground truncate">{getCollabSubtext(collab)}</p>
                      )}
                      {collab.permissions && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {Object.entries(collab.permissions)
                            .filter(([, level]) => level !== "none")
                            .map(([section, level]) => (
                              <Badge key={section} variant={level === "edit" ? "default" : "secondary"} className="text-[10px]">
                                {section}
                              </Badge>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive shrink-0"
                    onClick={(e) => { e.stopPropagation(); handleRemoveCollaborator(collab.id); }}
                  >
                    <RiDeleteBinLine className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center py-8 text-[var(--muted-foreground)]">
              No hay colaboradores asignados
            </p>
          )}
        </CardContent>
      </Card>

      <CollaboratorDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        eventId={eventId}
        onSuccess={fetchCollaborators}
        existingParticipants={collaborators}
        editingParticipant={editingParticipant}
      />

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <RiSaveLine className="h-4 w-4" />
          {saving ? "Guardando..." : "Guardar cambios"}
        </Button>
      </div>
    </div>
  );
}
