"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  RiArrowLeftLine,
  RiCalendarLine,
  RiMapPinLine,
  RiGroupLine,
  RiMoneyDollarCircleLine,
  RiFileListLine,
  RiStore2Line,
  RiFileTextLine,
  RiEditLine,
  RiAddLine,
  RiUserAddLine,
  RiUploadLine,
  RiDeleteBinLine,
  RiMoreLine,
  RiFileCopyLine,
  RiFileList3Line,
  RiEyeLine,
  RiDownloadLine,
  RiTeamLine,
} from "@remixicon/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TaskDrawer } from "@/components/tasks/task-drawer";
import { EditEventDrawer } from "@/components/events/edit-event-drawer";
import { DuplicateEventDrawer } from "@/components/events/duplicate-event-drawer";
import { SaveAsTemplateDrawer } from "@/components/events/save-as-template-drawer";
import { CollaboratorDrawer } from "@/components/events/collaborator-drawer";
import { useEvent } from "@/contexts/event-context";
import { useUserSessionContext } from "@/contexts/user-session-context";
import { useEventPermissions } from "@/hooks/use-event-permissions";
import { downloadFile } from "@/lib/file-download";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
} from "@/components/ui/select";
import { FileUploader } from "@/components/ui/file-uploader";
import { FilePreviewDialog } from "@/components/ui/file-preview-dialog";

interface Event {
  id: number;
  name: string;
  type: string;
  status: string;
  date: string | null;
  location: string | null;
  guestCount: number;
  budget: string | null;
  description: string | null;
  isCollaborator?: boolean;
}

interface Task {
  id: number;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  eventId: number;
}

const statusMap: Record<string, { label: string; variant: "secondary" | "warning" | "success" | "destructive" }> = {
  draft: { label: "Borrador", variant: "secondary" },
  confirmed: { label: "Confirmado", variant: "success" },
  in_progress: { label: "En progreso", variant: "warning" },
  completed: { label: "Completado", variant: "success" },
  cancelled: { label: "Cancelado", variant: "destructive" },
};

interface EventDetailClientProps {
  eventId: number;
}

export function EventDetailClient({ eventId }: EventDetailClientProps) {
  const router = useRouter();
  const { setActiveEvent } = useEvent();
  const { eventScoped, can } = useUserSessionContext();
  const [event, setEvent] = useState<Event | null>(null);
  const { canView, canEdit } = useEventPermissions(eventId, eventScoped, event?.isCollaborator);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditEventOpen, setIsEditEventOpen] = useState(false);
  const [isDuplicateOpen, setIsDuplicateOpen] = useState(false);
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"view" | "create">("view");
  const [documents, setDocuments] = useState<Array<{ id: number; name: string; url: string; type?: string; mimeType?: string | null }>>([]);
  const [guests, setGuests] = useState<Array<{ id: number; firstName: string; lastName: string }>>([]);
  const [showAddGuestDialog, setShowAddGuestDialog] = useState(false);
  const [showAddDocDialog, setShowAddDocDialog] = useState(false);
  const [newGuest, setNewGuest] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [newDoc, setNewDoc] = useState({ name: "", url: "" });
  const [addingGuest, setAddingGuest] = useState(false);
  const [addingDoc, setAddingDoc] = useState(false);
  const [collaborators, setCollaborators] = useState<Array<{
    id: number;
    userId: string | null;
    contactId: number | null;
    vendorId: number | null;
    userName: string | null;
    userEmail: string | null;
    contactName: string | null;
    contactEmail: string | null;
    vendorName: string | null;
    vendorCategory: string | null;
    providerOrgId: number | null;
    type: string;
    role: string | null;
    permissions: Record<string, string> | null;
  }>>([]);
  const [partners, setPartners] = useState<Array<{
    id: number;
    guestOrgId: number | null;
    guestName: string | null;
    guestSlug: string | null;
    guestOrgType: string | null;
    guestCategory: string | null;
    status: string;
    invitedAt: string | null;
    acceptedAt: string | null;
  }>>([]);
  const [collabDrawerOpen, setCollabDrawerOpen] = useState(false);
  const [eventForms, setEventForms] = useState<Array<{ id: number; formId: number; formName?: string; type: string; slug: string | null; submissionCount: number }>>([]);
  const [docPreviewOpen, setDocPreviewOpen] = useState(false);
  const [docPreviewIndex, setDocPreviewIndex] = useState(0);
  const [deletingDocId, setDeletingDocId] = useState<number | null>(null);

  // Set active event when loaded
  useEffect(() => {
    if (event) {
      setActiveEvent(event);
    }
  }, [event, setActiveEvent]);


  const fetchEvent = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}`);
      const data = await res.json();
      if (data.success) {
        setEvent(data.data);
      }
    } catch (error) {
      console.error("Failed to fetch event:", error);
    }
  };

  const fetchTasks = async () => {
    try {
      const res = await fetch(`/api/tasks?eventId=${eventId}`);
      const data = await res.json();
      if (data.success) {
        setTasks(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch tasks:", error);
    }
  };

  const fetchPartners = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/partners`);
      const data = await res.json();
      if (data.success) {
        setPartners(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch partners:", error);
    }
  };

  const fetchDocuments = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/documents`);
      const data = await res.json();
      if (data.success) {
        setDocuments(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch documents:", error);
    }
  };

  const fetchGuests = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/guests`);
      const data = await res.json();
      if (data.success) {
        setGuests(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch guests:", error);
    }
  };

  const fetchCollaborators = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/collaborators`);
      const data = await res.json();
      if (data.success) {
        setCollaborators(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch collaborators:", error);
    }
  };

  const fetchEventForms = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/forms`);
      const data = await res.json();
      if (data.success) {
        setEventForms(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch event forms:", error);
    }
  };

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      await Promise.all([fetchEvent(), fetchTasks(), fetchPartners(), fetchDocuments(), fetchGuests(), fetchCollaborators(), fetchEventForms()]);
      setLoading(false);
    }
    loadData();
  }, [eventId]);

  const handleTaskClick = (task: Task) => {
    setSelectedTaskId(task.id);
    setDrawerMode("view");
    setIsDrawerOpen(true);
  };

  const openCreateDrawer = () => {
    setSelectedTaskId(null);
    setDrawerMode("create");
    setIsDrawerOpen(true);
  };

  const handleTaskCreated = (newTaskId: number) => {
    setSelectedTaskId(newTaskId);
    setDrawerMode("view");
    fetchTasks();
  };

  const handleAddGuest = async () => {
    if (!newGuest.firstName) return;
    setAddingGuest(true);
    try {
      const res = await fetch(`/api/events/${eventId}/guests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newGuest),
      });
      const data = await res.json();
      if (data.success) {
        setNewGuest({ firstName: "", lastName: "", email: "", phone: "" });
        setShowAddGuestDialog(false);
        fetchGuests();
        fetchEvent(); // Update guest count
      }
    } finally {
      setAddingGuest(false);
    }
  };

  const handleAddDocument = async (doc?: { name: string; url: string }) => {
    const docToAdd = doc || newDoc;
    if (!docToAdd.name || !docToAdd.url) return;
    setAddingDoc(true);
    try {
      const res = await fetch(`/api/events/${eventId}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(docToAdd),
      });
      const data = await res.json();
      if (data.success) {
        setNewDoc({ name: "", url: "" });
        fetchDocuments();
      }
    } finally {
      setAddingDoc(false);
    }
  };

  const handleDeleteDocument = async (docId: number) => {
    if (!confirm("¿Eliminar este documento?")) return;
    setDeletingDocId(docId);
    try {
      const res = await fetch(`/api/events/${eventId}/documents?id=${docId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        fetchDocuments();
      }
    } finally {
      setDeletingDocId(null);
    }
  };

  const docPreviewFiles = documents.map((d) => ({
    id: d.id,
    name: d.name,
    url: d.url,
    type: d.type || "file",
    mimeType: d.mimeType ?? null,
  }));

  if (loading) {
    return (
      <div className="space-y-[var(--gap-cards-lg)]">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-16 w-full" />
        <div className="grid gap-[var(--gap-cards)] md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">Evento no encontrado</p>
        <Link href="/dashboard/events">
          <Button variant="outline" className="mt-4">
            Volver a eventos
          </Button>
        </Link>
      </div>
    );
  }

  const status = statusMap[event.status] || statusMap.draft;
  const completedTasks = tasks.filter((t) => t.status === "completed").length;
  const completionRate = tasks.length > 0 ? Math.round((completedTasks / tasks.length) * 100) : 0;

  return (
    <div className="space-y-[var(--gap-cards-lg)]">
      {/* Collaboration banner */}
      {event.isCollaborator && (
        <div className="flex items-center gap-2 px-4 py-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg text-sm text-blue-700 dark:text-blue-300">
          <RiTeamLine className="h-4 w-4 shrink-0" />
          <span>Estas colaborando en este evento</span>
        </div>
      )}
      {/* Back Button */}
      <Link href="/dashboard/events">
        <Button variant="ghost" className="gap-2">
          <RiArrowLeftLine className="h-4 w-4" />
          Volver a eventos
        </Button>
      </Link>

      {/* Event Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">{event.name}</h1>
            <Badge variant={status.variant}>{status.label}</Badge>
          </div>
          {event.description && (
            <p className="text-lg text-muted-foreground">{event.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          {canEdit("general") && (
            <Button className="gap-2" onClick={() => setIsEditEventOpen(true)}>
              <RiEditLine className="h-4 w-4" />
              Editar Evento
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <RiMoreLine className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {can("events:create") && (
                <DropdownMenuItem onClick={() => setIsDuplicateOpen(true)}>
                  <RiFileCopyLine className="h-4 w-4 mr-2" />
                  Duplicar Evento
                </DropdownMenuItem>
              )}
              {can("events:create") && (
                <DropdownMenuItem onClick={() => setIsSaveTemplateOpen(true)}>
                  <RiFileList3Line className="h-4 w-4 mr-2" />
                  Guardar como Template
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href={`/dashboard/events/${eventId}/tasks`}>
                  <RiFileListLine className="h-4 w-4 mr-2" />
                  Ver todas las tareas
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid gap-[var(--gap-cards)] md:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-primary/10 p-3">
              <RiCalendarLine className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Fecha</p>
              <p className="font-semibold">
                {event.date
                  ? new Date(event.date).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })
                  : "Sin fecha"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-success/10 p-3">
              <RiMapPinLine className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Lugar</p>
              <p className="font-semibold">{event.location || "Sin definir"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-warning/10 p-3">
              <RiGroupLine className="h-5 w-5 text-warning" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Invitados</p>
              <p className="font-semibold">{canView("guests") ? `${event.guestCount} personas` : "—"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4 p-4">
            <div className="rounded-lg bg-accent/10 p-3">
              <RiMoneyDollarCircleLine className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Presupuesto</p>
              <p className="font-semibold">
                {canView("finances")
                  ? (event.budget ? `$${parseFloat(event.budget).toLocaleString()}` : "Sin definir")
                  : "—"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Section */}
      {canView("tasks") && (
      <Card>
        <CardHeader>
          <CardTitle>Progreso General</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">
              Tareas completadas: {completedTasks} de {tasks.length}
            </span>
            <span className="text-muted-foreground">{completionRate}%</span>
          </div>
          <Progress value={completionRate} className="h-3" />
        </CardContent>
      </Card>
      )}

      {/* Content Grid */}
      <div className="grid gap-[var(--gap-cards-lg)] lg:grid-cols-2">
        {/* Equipo del Evento */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <RiUserAddLine className="h-5 w-5" />
              Equipo ({collaborators.filter(c => !(c.type === "vendor" && c.providerOrgId)).length})
            </CardTitle>
            <div className="flex gap-2">
              {canEdit("settings") && (
                <Button variant="outline" size="sm" className="gap-1" onClick={() => setCollabDrawerOpen(true)}>
                  <RiAddLine className="h-4 w-4" />
                  Agregar
                </Button>
              )}
              <Link href={`/dashboard/events/${eventId}/settings`}>
                <Button variant="ghost" size="sm">
                  Ver todos
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {collaborators.filter(c => !(c.type === "vendor" && c.providerOrgId)).length > 0 ? (
              <div className="space-y-2">
                {collaborators.filter(c => !(c.type === "vendor" && c.providerOrgId)).slice(0, 6).map((collab) => {
                  const name = collab.userName || collab.userEmail || collab.contactName || collab.vendorName || "Sin nombre";
                  const subtext = (collab.userName && collab.userEmail) ? collab.userEmail : collab.contactEmail || collab.vendorCategory || null;
                  const colorClass = collab.type === "contact" ? "bg-green-100 text-green-700" : collab.type === "vendor" ? "bg-orange-100 text-orange-700" : "bg-blue-100 text-blue-700";
                  const typeLabel: Record<string, string> = { planner: "Miembro", contact: "Contacto", vendor: "Partner", partner: "Partner", client: "Cliente", assistant: "Asistente", guest: "Invitado" };
                  return (
                    <div key={collab.id} className="flex items-center gap-3 p-2 rounded border">
                      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-medium shrink-0 ${colorClass}`}>
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-sm truncate">{name}</span>
                          <Badge variant="outline" className="text-[10px] shrink-0">
                            {typeLabel[collab.type] || collab.type}
                          </Badge>
                        </div>
                        {subtext && (
                          <p className="text-xs text-muted-foreground truncate">{subtext}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
                {collaborators.length > 6 && (
                  <p className="text-xs text-muted-foreground text-center">
                    +{collaborators.length - 6} más
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No hay colaboradores asignados
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tasks */}
        {canView("tasks") && <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <RiFileListLine className="h-5 w-5" />
              Tareas ({tasks.length})
            </CardTitle>
            <div className="flex gap-2">
              {canEdit("tasks") && (
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={openCreateDrawer}
                >
                  <RiAddLine className="h-4 w-4" />
                  Nueva
                </Button>
              )}
              <Link href={`/dashboard/tasks?eventId=${eventId}`}>
                <Button variant="outline" size="sm">
                  Ver todas
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {tasks.length > 0 ? (
              <div className="space-y-3">
                {tasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between rounded-lg border border-border p-3 cursor-pointer hover:bg-muted transition-colors"
                    onClick={() => handleTaskClick(task)}
                  >
                    <div>
                      <p className={`font-medium ${task.status === "completed" ? "line-through text-muted-foreground" : ""}`}>
                        {task.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {task.dueDate
                          ? `Vence: ${new Date(task.dueDate).toLocaleDateString("es-ES")}`
                          : "Sin fecha"}
                      </p>
                    </div>
                    <Badge
                      variant={
                        task.priority === "high"
                          ? "destructive"
                          : task.priority === "medium"
                          ? "warning"
                          : "secondary"
                      }
                    >
                      {task.priority === "high"
                        ? "Alta"
                        : task.priority === "medium"
                        ? "Media"
                        : "Baja"}
                    </Badge>
                  </div>
                ))}
                {tasks.length > 5 && (
                  <p className="text-center text-sm text-muted-foreground">
                    +{tasks.length - 5} tareas más
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No hay tareas asignadas</p>
                {canEdit("tasks") && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={openCreateDrawer}
                  >
                    <RiAddLine className="h-4 w-4" />
                    Crear primera tarea
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>}

        {/* Partners (bilateral collaborations) */}
        {canView("partners") && <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <RiStore2Line className="h-5 w-5" />
              Partners ({partners.length})
            </CardTitle>
            <div className="flex gap-2">
              <Link href={`/dashboard/events/${eventId}/partners`}>
                <Button variant="outline" size="sm" className="gap-1">
                  <RiAddLine className="h-4 w-4" />
                  Asignar
                </Button>
              </Link>
              <Link href={`/dashboard/events/${eventId}/partners`}>
                <Button variant="ghost" size="sm">
                  Ver todos
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {partners.length > 0 ? (
              <div className="space-y-2">
                {partners.map((partner) => (
                  <div key={partner.id} className="flex items-center justify-between p-2 rounded border">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{partner.guestName || partner.guestSlug || "Partner"}</span>
                      {partner.guestCategory && (
                        <span className="text-sm text-muted-foreground">- {partner.guestCategory}</span>
                      )}
                    </div>
                    <Badge
                      className={`text-[10px] shrink-0 ${
                        partner.status === "active"
                          ? "bg-green-100 text-green-700 hover:bg-green-100"
                          : partner.status === "pending"
                          ? "bg-amber-100 text-amber-700 hover:bg-amber-100"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-100"
                      }`}
                    >
                      {partner.status === "active" ? "Activo" : partner.status === "pending" ? "Pendiente" : partner.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No hay partners asignados
              </div>
            )}
          </CardContent>
        </Card>}

        {/* Guests / Invitados */}
        {canView("guests") && <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <RiGroupLine className="h-5 w-5" />
              Lista de Invitados ({guests.length})
            </CardTitle>
            {canEdit("guests") && (
              <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowAddGuestDialog(true)}>
                <RiUserAddLine className="h-4 w-4" />
                Añadir
              </Button>
            )}
            <Sheet open={showAddGuestDialog} onOpenChange={setShowAddGuestDialog}>
              <SheetContent className="sm:max-w-2xl overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Añadir Invitado</SheetTitle>
                </SheetHeader>
                <div className="space-y-4 px-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nombre *</Label>
                      <Input
                        placeholder="Ej: Juan"
                        value={newGuest.firstName}
                        onChange={(e) => setNewGuest({ ...newGuest, firstName: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Apellido</Label>
                      <Input
                        placeholder="Ej: Pérez"
                        value={newGuest.lastName}
                        onChange={(e) => setNewGuest({ ...newGuest, lastName: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Email</Label>
                      <Input
                        type="email"
                        placeholder="juan@ejemplo.com"
                        value={newGuest.email}
                        onChange={(e) => setNewGuest({ ...newGuest, email: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Teléfono</Label>
                      <Input
                        placeholder="+54 9 11 1234-5678"
                        value={newGuest.phone}
                        onChange={(e) => setNewGuest({ ...newGuest, phone: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowAddGuestDialog(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={handleAddGuest} disabled={addingGuest || !newGuest.firstName}>
                      {addingGuest ? "Guardando..." : "Añadir Invitado"}
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </CardHeader>
          <CardContent>
            {guests.length > 0 ? (
              <div className="space-y-2">
                {guests.slice(0, 5).map((guest) => (
                  <div key={guest.id} className="flex items-center gap-2 p-2 rounded border">
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                      {guest.firstName.charAt(0)}{guest.lastName?.charAt(0) || ""}
                    </div>
                    <span>{guest.firstName} {guest.lastName}</span>
                  </div>
                ))}
                {guests.length > 5 && (
                  <p className="text-center text-sm text-muted-foreground">
                    +{guests.length - 5} invitados más
                  </p>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No hay invitados registrados
              </div>
            )}
          </CardContent>
        </Card>}

        {/* Documents */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <RiFileTextLine className="h-5 w-5" />
              Documentos ({documents.length})
            </CardTitle>
            {canEdit("general") && (
              <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowAddDocDialog(true)}>
                <RiUploadLine className="h-4 w-4" />
                Subir
              </Button>
            )}
            <Sheet open={showAddDocDialog} onOpenChange={setShowAddDocDialog}>
              <SheetContent className="sm:max-w-2xl overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Subir Documento</SheetTitle>
                </SheetHeader>
                <div className="space-y-4 px-4 py-4">
                  <FileUploader
                    folder="event-documents"
                    onUpload={async (result) => {
                      await handleAddDocument({ name: result.name, url: result.url });
                      setShowAddDocDialog(false);
                    }}
                  />
                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-background px-2 text-muted-foreground">o pega un enlace</span>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Nombre del documento</Label>
                    <Input
                      placeholder="Ej: Contrato de servicios"
                      value={newDoc.name}
                      onChange={(e) => setNewDoc({ ...newDoc, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>URL del documento</Label>
                    <Input
                      placeholder="https://..."
                      value={newDoc.url}
                      onChange={(e) => setNewDoc({ ...newDoc, url: e.target.value })}
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowAddDocDialog(false)}>
                      Cancelar
                    </Button>
                    <Button onClick={() => handleAddDocument()} disabled={addingDoc || !newDoc.name || !newDoc.url}>
                      {addingDoc ? "Guardando..." : "Guardar enlace"}
                    </Button>
                  </div>
                </div>
              </SheetContent>
            </Sheet>
          </CardHeader>
          <CardContent>
            {documents.length > 0 ? (
              <div className="space-y-2">
                {documents.map((doc, idx) => (
                  <div
                    key={doc.id}
                    className="flex items-center gap-2 p-2 rounded border hover:bg-muted/50 transition-colors"
                  >
                    <RiFileTextLine className="h-4 w-4 text-primary shrink-0" />
                    <span className="font-medium flex-1 min-w-0 truncate">{doc.name}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => { setDocPreviewIndex(idx); setDocPreviewOpen(true); }}
                        title="Vista previa"
                      >
                        <RiEyeLine className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => downloadFile(doc.url, doc.name)}
                        title="Descargar"
                      >
                        <RiDownloadLine className="h-3.5 w-3.5" />
                      </Button>
                      {canEdit("general") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive"
                          onClick={() => handleDeleteDocument(doc.id)}
                          disabled={deletingDocId === doc.id}
                          title="Eliminar"
                        >
                          <RiDeleteBinLine className="h-3.5 w-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No hay documentos
              </div>
            )}
          </CardContent>
        </Card>

        <FilePreviewDialog
          open={docPreviewOpen}
          onOpenChange={setDocPreviewOpen}
          files={docPreviewFiles}
          currentIndex={docPreviewIndex}
          onIndexChange={setDocPreviewIndex}
        />

        {/* Formularios */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <RiFileListLine className="h-5 w-5" />
              Formularios ({eventForms.length})
            </CardTitle>
            {can("forms:read") && (
              <Link href="/dashboard/forms">
                <Button variant="outline" size="sm">
                  Ver todos
                </Button>
              </Link>
            )}
          </CardHeader>
          <CardContent>
            {eventForms.length > 0 ? (
              <div className="space-y-2">
                {eventForms.map((fi) => {
                  const canEditForms = can("forms:update");
                  const href = canEditForms
                    ? `/dashboard/forms/${fi.formId}`
                    : fi.slug
                      ? `/f/${fi.slug}`
                      : `#`;
                  return (
                    <Link
                      key={fi.id}
                      href={href}
                      target={!canEditForms && fi.slug ? "_blank" : undefined}
                      className="flex items-center justify-between p-2 rounded border hover:bg-muted transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Badge variant="outline" className="text-xs shrink-0">
                          {fi.type === "landing" ? "Landing" : "Tarea"}
                        </Badge>
                        <span className="font-medium text-sm truncate">{fi.formName || `Form #${fi.formId}`}</span>
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {fi.submissionCount} resp.
                      </span>
                    </Link>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No hay formularios vinculados
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline Preview */}
        {canView("calendar") && <SchedulePreview eventId={eventId} />}
      </div>

      {/* Task Drawer - for both view and create */}
      <TaskDrawer
        taskId={selectedTaskId}
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        onTaskDeleted={() => fetchTasks()}
        onTaskUpdated={() => fetchTasks()}
        onTaskCreated={handleTaskCreated}
        mode={drawerMode}
        readOnly={!canEdit("tasks")}
        initialData={{ eventId }}
      />

      {/* Edit Event Drawer */}
      <EditEventDrawer
        open={isEditEventOpen}
        onOpenChange={setIsEditEventOpen}
        event={event}
        onEventUpdated={fetchEvent}
      />

      {/* Duplicate Event Drawer */}
      <DuplicateEventDrawer
        open={isDuplicateOpen}
        onOpenChange={setIsDuplicateOpen}
        eventId={eventId}
        eventName={event.name}
        onDuplicated={(newEventId) => router.push(`/dashboard/events/${newEventId}`)}
      />

      {/* Save as Template Drawer */}
      <SaveAsTemplateDrawer
        open={isSaveTemplateOpen}
        onOpenChange={setIsSaveTemplateOpen}
        eventId={eventId}
        eventName={event.name}
      />

      {/* Collaborator Drawer */}
      <CollaboratorDrawer
        open={collabDrawerOpen}
        onOpenChange={setCollabDrawerOpen}
        eventId={eventId}
        onSuccess={fetchCollaborators}
        existingParticipants={collaborators}
      />
    </div>
  );
}

function SchedulePreview({ eventId }: { eventId: number }) {
  const [items, setItems] = useState<Array<{ id: number; title: string; date: string; startTime: string | null; endTime: string | null; source: string; taskTitle: string | null }>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/events/${eventId}/schedule?limit=5`);
        const data = await res.json();
        if (data.success) setItems(data.data);
      } catch { /* ignore */ }
      finally { setLoading(false); }
    }
    load();
  }, [eventId]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <RiCalendarLine className="h-5 w-5" />
          Cronograma
        </CardTitle>
        <Link href={`/dashboard/events/${eventId}/schedule`}>
          <Button variant="outline" size="sm">
            Ver completo
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-10 bg-muted animate-pulse rounded" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No hay items en el cronograma
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div key={`${item.source}-${item.id}`} className="flex items-center gap-3 p-2 rounded-lg border text-sm">
                <div className="w-14 text-center shrink-0">
                  <span className="text-xs font-medium">{item.startTime || "--:--"}</span>
                </div>
                <div
                  className="w-1 h-6 rounded-full shrink-0"
                  style={{ backgroundColor: item.source === "task" ? "#f59e0b" : "#3b82f6" }}
                />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(item.date).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}
                    {item.source === "task" && item.taskTitle && ` · ${item.taskTitle}`}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
