"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RiCalendarEventLine,
  RiFileListLine,
  RiCheckLine,
  RiUserLine,
  RiBuilding2Line,
} from "@remixicon/react";

interface Contact {
  id: number;
  type: "person" | "company";
  name: string;
  email: string | null;
}

interface Event {
  id: number;
  name: string;
  date: string | null;
  status: string;
}

interface Task {
  id: number;
  title: string;
  status: string;
  eventId: number;
}

interface LinkContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact: Contact | null;
  onLinkComplete?: () => void;
}

export function LinkContactDialog({
  open,
  onOpenChange,
  contact,
  onLinkComplete,
}: LinkContactDialogProps) {
  const [activeTab, setActiveTab] = useState<"event" | "task">("event");
  const [events, setEvents] = useState<Event[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [role, setRole] = useState("");
  const [loading, setLoading] = useState(false);
  const [linking, setLinking] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (open) {
      loadData();
      setSuccess(false);
      setSelectedEventId("");
      setSelectedTaskId("");
      setRole("");
    }
  }, [open]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [eventsRes, tasksRes] = await Promise.all([
        fetch("/api/events"),
        fetch("/api/tasks"),
      ]);

      if (eventsRes.ok) {
        const eventsData = await eventsRes.json();
        setEvents(eventsData.data || []);
      }

      if (tasksRes.ok) {
        const tasksData = await tasksRes.json();
        setTasks(tasksData.data || []);
      }
    } catch (error) {
      console.error("Failed to load data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLinkToEvent = async () => {
    if (!contact || !selectedEventId) return;

    setLinking(true);
    try {
      const res = await fetch(`/api/contacts/${contact.id}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "event_linked",
          title: `Vinculado al evento`,
          description: `Contacto vinculado al evento ID ${selectedEventId}${role ? ` como ${role}` : ""}`,
          metadata: {
            eventId: parseInt(selectedEventId),
            role: role || null,
          },
        }),
      });

      if (res.ok) {
        setSuccess(true);
        onLinkComplete?.();
        setTimeout(() => {
          onOpenChange(false);
        }, 1500);
      }
    } catch (error) {
      console.error("Failed to link contact to event:", error);
    } finally {
      setLinking(false);
    }
  };

  const handleLinkToTask = async () => {
    if (!contact || !selectedTaskId) return;

    setLinking(true);
    try {
      const res = await fetch(`/api/contacts/${contact.id}/activities`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "task_created",
          title: `Vinculado a tarea`,
          description: `Contacto vinculado a la tarea ID ${selectedTaskId}${role ? ` como ${role}` : ""}`,
          metadata: {
            taskId: parseInt(selectedTaskId),
            role: role || null,
          },
        }),
      });

      if (res.ok) {
        setSuccess(true);
        onLinkComplete?.();
        setTimeout(() => {
          onOpenChange(false);
        }, 1500);
      }
    } catch (error) {
      console.error("Failed to link contact to task:", error);
    } finally {
      setLinking(false);
    }
  };

  if (!contact) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Vincular Contacto</DialogTitle>
          <DialogDescription>
            Vincula este contacto a un evento o tarea
          </DialogDescription>
        </DialogHeader>

        {success ? (
          <div className="py-8 text-center">
            <RiCheckLine className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <h3 className="font-medium">¡Vinculación exitosa!</h3>
          </div>
        ) : (
          <>
            {/* Contact Info */}
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <div className={`p-2 rounded-full ${contact.type === "company" ? "bg-purple-100" : "bg-blue-100"}`}>
                {contact.type === "company" ? (
                  <RiBuilding2Line className="h-5 w-5 text-purple-600" />
                ) : (
                  <RiUserLine className="h-5 w-5 text-blue-600" />
                )}
              </div>
              <div>
                <p className="font-medium">{contact.name}</p>
                {contact.email && (
                  <p className="text-sm text-muted-foreground">{contact.email}</p>
                )}
              </div>
              <Badge variant="outline" className="ml-auto">
                {contact.type === "company" ? "Empresa" : "Persona"}
              </Badge>
            </div>

            <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "event" | "task")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="event" className="gap-2">
                  <RiCalendarEventLine className="h-4 w-4" />
                  Evento
                </TabsTrigger>
                <TabsTrigger value="task" className="gap-2">
                  <RiFileListLine className="h-4 w-4" />
                  Tarea
                </TabsTrigger>
              </TabsList>

              <TabsContent value="event" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Seleccionar Evento</label>
                  <Select value={selectedEventId} onValueChange={setSelectedEventId}>
                    <SelectTrigger>
                      <SelectValue placeholder={loading ? "Cargando..." : "Elegir evento"} />
                    </SelectTrigger>
                    <SelectContent>
                      {events.length === 0 ? (
                        <SelectItem value="__none__" disabled>No hay eventos</SelectItem>
                      ) : (
                        events.map((event) => (
                          <SelectItem key={event.id} value={event.id.toString()}>
                            {event.name}
                            {event.date && (
                              <span className="text-muted-foreground ml-2">
                                ({new Date(event.date).toLocaleDateString()})
                              </span>
                            )}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Rol (opcional)</label>
                  <Input
                    placeholder="Ej: Cliente, Proveedor, Invitado..."
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  />
                </div>
              </TabsContent>

              <TabsContent value="task" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Seleccionar Tarea</label>
                  <Select value={selectedTaskId} onValueChange={setSelectedTaskId}>
                    <SelectTrigger>
                      <SelectValue placeholder={loading ? "Cargando..." : "Elegir tarea"} />
                    </SelectTrigger>
                    <SelectContent>
                      {tasks.length === 0 ? (
                        <SelectItem value="__none__" disabled>No hay tareas</SelectItem>
                      ) : (
                        tasks.map((task) => (
                          <SelectItem key={task.id} value={task.id.toString()}>
                            {task.title}
                            <Badge variant="outline" className="ml-2 text-xs">
                              {task.status}
                            </Badge>
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Rol (opcional)</label>
                  <Input
                    placeholder="Ej: Responsable, Colaborador..."
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}

        <DialogFooter>
          {!success && (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                onClick={activeTab === "event" ? handleLinkToEvent : handleLinkToTask}
                disabled={linking || (activeTab === "event" ? !selectedEventId : !selectedTaskId)}
              >
                {linking ? "Vinculando..." : "Vincular"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
