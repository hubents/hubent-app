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
  RiContactsLine,
} from "@remixicon/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TaskDrawer } from "@/components/tasks/task-drawer";
import { EditEventDrawer } from "@/components/events/edit-event-drawer";
import { DuplicateEventDrawer } from "@/components/events/duplicate-event-drawer";
import { SaveAsTemplateDrawer } from "@/components/events/save-as-template-drawer";
import { useEvent } from "@/contexts/event-context";
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
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileUploader } from "@/components/ui/file-uploader";

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
  const [event, setEvent] = useState<Event | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditEventOpen, setIsEditEventOpen] = useState(false);
  const [isDuplicateOpen, setIsDuplicateOpen] = useState(false);
  const [isSaveTemplateOpen, setIsSaveTemplateOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerMode, setDrawerMode] = useState<"view" | "create">("view");
  const [vendors, setVendors] = useState<Array<{ id: number; vendorId: number; vendorName: string; service: string }>>([])
  const [allVendors, setAllVendors] = useState<Array<{ id: number; name: string; category: string | null }>>([])
  const [showAddVendorDialog, setShowAddVendorDialog] = useState(false)
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null)
  const [vendorService, setVendorService] = useState("")
  const [addingVendor, setAddingVendor] = useState(false);
  const [documents, setDocuments] = useState<Array<{ id: number; name: string; url: string }>>([]);
  const [guests, setGuests] = useState<Array<{ id: number; firstName: string; lastName: string }>>([]);
  const [showAddGuestDialog, setShowAddGuestDialog] = useState(false);
  const [showAddDocDialog, setShowAddDocDialog] = useState(false);
  const [newGuest, setNewGuest] = useState({ firstName: "", lastName: "", email: "", phone: "" });
  const [newDoc, setNewDoc] = useState({ name: "", url: "" });
  const [addingGuest, setAddingGuest] = useState(false);
  const [addingDoc, setAddingDoc] = useState(false);
  const [linkedContacts, setLinkedContacts] = useState<Array<{
    id: number;
    contactId: number;
    role: string | null;
    contactName: string;
    contactEmail: string | null;
    contactType: string;
  }>>([]);
  const [allContacts, setAllContacts] = useState<Array<{ id: number; name: string; type: string; email: string | null }>>([]);
  const [showAddContactDialog, setShowAddContactDialog] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [contactRole, setContactRole] = useState("");
  const [addingContact, setAddingContact] = useState(false);

  // Set active event when loaded
  useEffect(() => {
    if (event) {
      setActiveEvent(event);
    }
  }, [event, setActiveEvent]);

  const fetchAllVendors = async () => {
    try {
      const res = await fetch("/api/vendors");
      const data = await res.json();
      if (data.success) {
        setAllVendors(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch all vendors:", error);
    }
  };

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

  const fetchVendors = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/vendors`);
      const data = await res.json();
      if (data.success) {
        setVendors(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch vendors:", error);
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

  const fetchLinkedContacts = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/contacts`);
      const data = await res.json();
      if (data.success) {
        setLinkedContacts(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch linked contacts:", error);
    }
  };

  const fetchAllContacts = async () => {
    try {
      const res = await fetch("/api/contacts?limit=100");
      const data = await res.json();
      if (data.success) {
        setAllContacts(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch all contacts:", error);
    }
  };

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      await Promise.all([fetchEvent(), fetchTasks(), fetchVendors(), fetchDocuments(), fetchGuests(), fetchAllVendors(), fetchLinkedContacts(), fetchAllContacts()]);
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

  const handleAddVendorToEvent = async () => {
    if (!selectedVendorId) return;
    setAddingVendor(true);
    try {
      const res = await fetch(`/api/events/${eventId}/vendors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: selectedVendorId,
          service: vendorService,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedVendorId(null);
        setVendorService("");
        setShowAddVendorDialog(false);
        fetchVendors();
      }
    } finally {
      setAddingVendor(false);
    }
  };

  const handleRemoveVendor = async (eventVendorId: number) => {
    try {
      await fetch(`/api/events/${eventId}/vendors?id=${eventVendorId}`, {
        method: "DELETE",
      });
      fetchVendors();
    } catch (error) {
      console.error("Failed to remove vendor:", error);
    }
  };

  // Filter out vendors already assigned to this event
  const availableVendors = allVendors.filter(
    (v) => !vendors.some((ev) => ev.vendorId === v.id)
  );

  // Filter out contacts already linked to this event
  const availableContacts = allContacts.filter(
    (c) => !linkedContacts.some((lc) => lc.contactId === c.id)
  );

  const handleAddContactToEvent = async () => {
    if (!selectedContactId) return;
    setAddingContact(true);
    try {
      const res = await fetch(`/api/events/${eventId}/contacts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: selectedContactId,
          role: contactRole || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedContactId(null);
        setContactRole("");
        setShowAddContactDialog(false);
        fetchLinkedContacts();
      }
    } finally {
      setAddingContact(false);
    }
  };

  const handleRemoveContact = async (contactId: number) => {
    try {
      await fetch(`/api/events/${eventId}/contacts?contactId=${contactId}`, {
        method: "DELETE",
      });
      fetchLinkedContacts();
    } catch (error) {
      console.error("Failed to remove contact:", error);
    }
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
          <Button className="gap-2" onClick={() => setIsEditEventOpen(true)}>
            <RiEditLine className="h-4 w-4" />
            Editar Evento
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <RiMoreLine className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsDuplicateOpen(true)}>
                <RiFileCopyLine className="h-4 w-4 mr-2" />
                Duplicar Evento
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setIsSaveTemplateOpen(true)}>
                <RiFileList3Line className="h-4 w-4 mr-2" />
                Guardar como Template
              </DropdownMenuItem>
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
              <p className="font-semibold">{event.guestCount} personas</p>
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
                {event.budget ? `$${parseFloat(event.budget).toLocaleString()}` : "Sin definir"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Progress Section */}
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

      {/* Content Grid */}
      <div className="grid gap-[var(--gap-cards-lg)] lg:grid-cols-2">
        {/* Linked Contacts */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <RiContactsLine className="h-5 w-5" />
              Contactos ({linkedContacts.length})
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowAddContactDialog(true)}>
                <RiAddLine className="h-4 w-4" />
                Vincular
              </Button>
              <Sheet open={showAddContactDialog} onOpenChange={setShowAddContactDialog}>
                <SheetContent className="sm:max-w-2xl overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Vincular Contacto al Evento</SheetTitle>
                  </SheetHeader>
                  <div className="space-y-4 px-4 py-4">
                    <div className="space-y-2">
                      <Label>Seleccionar Contacto</Label>
                      {availableContacts.length > 0 ? (
                        <Select
                          value={selectedContactId?.toString() || ""}
                          onValueChange={(value) => setSelectedContactId(parseInt(value, 10))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Elegir contacto..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableContacts.map((c) => (
                              <SelectItem key={c.id} value={c.id.toString()}>
                                {c.name} {c.email && `(${c.email})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No hay contactos disponibles.{" "}
                          <Link href="/dashboard/contacts" className="text-primary underline">
                            Crear nuevo contacto
                          </Link>
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Rol (opcional)</Label>
                      <Select
                        value={contactRole}
                        onValueChange={setContactRole}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar rol..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="client">Cliente</SelectItem>
                          <SelectItem value="organizer">Organizador</SelectItem>
                          <SelectItem value="sponsor">Patrocinador</SelectItem>
                          <SelectItem value="speaker">Ponente</SelectItem>
                          <SelectItem value="other">Otro</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowAddContactDialog(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleAddContactToEvent} disabled={addingContact || !selectedContactId}>
                        {addingContact ? "Vinculando..." : "Vincular Contacto"}
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
              <Link href="/dashboard/contacts">
                <Button variant="ghost" size="sm">
                  + Nuevo
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {linkedContacts.length > 0 ? (
              <div className="space-y-2">
                {linkedContacts.map((contact) => (
                  <div key={contact.id} className="flex items-center justify-between p-2 rounded border group">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center text-sm font-medium text-green-700">
                        {contact.contactName.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-medium">{contact.contactName}</span>
                        {contact.role && (
                          <Badge variant="outline" className="ml-2 text-xs">
                            {contact.role === "client" ? "Cliente" : 
                             contact.role === "organizer" ? "Organizador" :
                             contact.role === "sponsor" ? "Patrocinador" :
                             contact.role === "speaker" ? "Ponente" : contact.role}
                          </Badge>
                        )}
                        {contact.contactEmail && (
                          <p className="text-xs text-muted-foreground">{contact.contactEmail}</p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive"
                      onClick={() => handleRemoveContact(contact.contactId)}
                    >
                      <RiDeleteBinLine className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No hay contactos vinculados
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tasks */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <RiFileListLine className="h-5 w-5" />
              Tareas ({tasks.length})
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="gap-1"
                onClick={openCreateDrawer}
              >
                <RiAddLine className="h-4 w-4" />
                Nueva
              </Button>
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
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1"
                  onClick={openCreateDrawer}
                >
                  <RiAddLine className="h-4 w-4" />
                  Crear primera tarea
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Vendors */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <RiStore2Line className="h-5 w-5" />
              Proveedores ({vendors.length})
            </CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowAddVendorDialog(true)}>
                <RiAddLine className="h-4 w-4" />
                Asignar
              </Button>
              <Sheet open={showAddVendorDialog} onOpenChange={setShowAddVendorDialog}>
                <SheetContent className="sm:max-w-2xl overflow-y-auto">
                  <SheetHeader>
                    <SheetTitle>Asignar Proveedor al Evento</SheetTitle>
                  </SheetHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label>Seleccionar Proveedor</Label>
                      {availableVendors.length > 0 ? (
                        <Select
                          value={selectedVendorId?.toString() || ""}
                          onValueChange={(value) => setSelectedVendorId(parseInt(value, 10))}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Elegir proveedor..." />
                          </SelectTrigger>
                          <SelectContent>
                            {availableVendors.map((v) => (
                              <SelectItem key={v.id} value={v.id.toString()}>
                                {v.name} {v.category && `(${v.category})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          No hay proveedores disponibles.{" "}
                          <Link href="/dashboard/contacts?segment=vendors" className="text-primary underline">
                            Crear nuevo proveedor
                          </Link>
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label>Servicio a prestar</Label>
                      <Input
                        placeholder="Ej: Catering para 100 personas"
                        value={vendorService}
                        onChange={(e) => setVendorService(e.target.value)}
                      />
                    </div>
                    <div className="flex justify-end gap-2">
                      <Button variant="outline" onClick={() => setShowAddVendorDialog(false)}>
                        Cancelar
                      </Button>
                      <Button onClick={handleAddVendorToEvent} disabled={addingVendor || !selectedVendorId}>
                        {addingVendor ? "Asignando..." : "Asignar Proveedor"}
                      </Button>
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
              <Link href="/dashboard/contacts?segment=vendors">
                <Button variant="ghost" size="sm">
                  + Nuevo
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            {vendors.length > 0 ? (
              <div className="space-y-2">
                {vendors.map((vendor) => (
                  <div key={vendor.id} className="flex items-center justify-between p-2 rounded border group">
                    <div>
                      <span className="font-medium">{vendor.vendorName}</span>
                      {vendor.service && (
                        <span className="text-sm text-muted-foreground ml-2">- {vendor.service}</span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive"
                      onClick={() => handleRemoveVendor(vendor.id)}
                    >
                      <RiDeleteBinLine className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No hay proveedores asignados
              </div>
            )}
          </CardContent>
        </Card>

        {/* Guests / Invitados */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <RiGroupLine className="h-5 w-5" />
              Lista de Invitados ({guests.length})
            </CardTitle>
            <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowAddGuestDialog(true)}>
              <RiUserAddLine className="h-4 w-4" />
              Añadir
            </Button>
            <Sheet open={showAddGuestDialog} onOpenChange={setShowAddGuestDialog}>
              <SheetContent className="sm:max-w-2xl overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>Añadir Invitado</SheetTitle>
                </SheetHeader>
                <div className="space-y-4 py-4">
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
        </Card>

        {/* Documents */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <RiFileTextLine className="h-5 w-5" />
              Documentos ({documents.length})
            </CardTitle>
            <Button variant="outline" size="sm" className="gap-1" onClick={() => setShowAddDocDialog(true)}>
              <RiUploadLine className="h-4 w-4" />
              Subir
            </Button>
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
                {documents.map((doc) => (
                  <a
                    key={doc.id}
                    href={doc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 p-2 rounded border hover:bg-muted transition-colors"
                  >
                    <RiFileTextLine className="h-4 w-4 text-primary" />
                    <span className="font-medium">{doc.name}</span>
                  </a>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No hay documentos
              </div>
            )}
          </CardContent>
        </Card>

        {/* Timeline Preview */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <RiCalendarLine className="h-5 w-5" />
              Cronograma
            </CardTitle>
            <Button variant="outline" size="sm">
              Ver completo
            </Button>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              No hay items en el cronograma
            </div>
          </CardContent>
        </Card>
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
    </div>
  );
}
