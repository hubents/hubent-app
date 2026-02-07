"use client";

import { useState, useEffect, use } from "react";
import { useEvent } from "@/contexts/event-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
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
import {
  RiAddLine,
  RiSearchLine,
  RiFilterLine,
  RiUserLine,
  RiMailLine,
  RiPhoneLine,
  RiCheckLine,
  RiCloseLine,
  RiTimeLine,
  RiDownloadLine,
  RiGroupLine,
  RiLayoutGridLine,
  RiRestaurantLine,
  RiUserHeartLine,
  RiParentLine,
  RiDeleteBinLine,
  RiPencilLine,
} from "@remixicon/react";
import { cn } from "@/lib/utils";
import dynamic from "next/dynamic";
import { RiListUnordered, RiLayout2Line } from "@remixicon/react";
import { CSVImportDialog } from "@/components/guests/csv-import-dialog";

const TableCanvas = dynamic(
  () => import("@/components/guests/table-canvas").then((mod) => mod.TableCanvas),
  { ssr: false, loading: () => <div className="h-[600px] flex items-center justify-center">Cargando canvas...</div> }
);

interface Companion {
  id: number;
  fullName: string;
  menuPreference: string | null;
  dietaryRestrictions: string | null;
}

interface EventTable {
  id: number;
  name: string;
  capacity: number | null;
  guestCount: number;
}

interface Guest {
  id: number;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  rsvpStatus: string | null;
  menuPreference: string | null;
  ageGroup: string | null;
  groupName: string | null;
  tableId: number | null;
  tableName: string | null;
  notes: string | null;
  companions: Companion[];
  companionCount: number;
  transport: { transportName: string | null; seats: number | null } | null;
}

interface Stats {
  total: number;
  confirmed: number;
  pending: number;
  declined: number;
  adults: number;
  children: number;
  babies: number;
  seated: number;
  totalCompanions: number;
  totalAttending: number;
}

const statusConfig: Record<string, { label: string; color: string; icon: typeof RiCheckLine }> = {
  confirmed: { label: "Confirmada", color: "bg-green-100 text-green-700", icon: RiCheckLine },
  pending: { label: "Pendiente", color: "bg-yellow-100 text-yellow-700", icon: RiTimeLine },
  declined: { label: "Cancelada", color: "bg-red-100 text-red-700", icon: RiCloseLine },
};

export default function EventGuestsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const eventId = parseInt(id, 10);
  const { setActiveEvent } = useEvent();

  const [guests, setGuests] = useState<Guest[]>([]);
  const [tables, setTables] = useState<EventTable[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("grupos");
  const [viewMode, setViewMode] = useState<"list" | "floor">("list");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [newGuest, setNewGuest] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    menuPreference: "",
    ageGroup: "adult",
    groupName: "",
  });
  const [newGroup, setNewGroup] = useState({ name: "", notes: "" });
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    async function fetchEvent() {
      try {
        const res = await fetch(`/api/events/${eventId}`);
        const data = await res.json();
        if (data.success) {
          setActiveEvent(data.data);
        }
      } catch (error) {
        console.error("Failed to fetch event:", error);
      }
    }
    fetchEvent();
  }, [eventId, setActiveEvent]);

  const fetchGuests = async () => {
    try {
      const [guestsRes, tablesRes] = await Promise.all([
        fetch(`/api/events/${eventId}/guests`),
        fetch(`/api/events/${eventId}/tables`),
      ]);
      const guestsData = await guestsRes.json();
      const tablesData = await tablesRes.json();
      
      if (guestsData.success) {
        setGuests(guestsData.data || []);
        if (guestsData.stats) {
          setStats(guestsData.stats);
        }
      }
      if (tablesData.success) {
        setTables(tablesData.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch guests:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGuests();
  }, [eventId]);

  const handleAddGuest = async () => {
    if (!newGuest.firstName) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/events/${eventId}/guests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newGuest),
      });
      const data = await res.json();
      if (data.success) {
        setNewGuest({ firstName: "", lastName: "", email: "", phone: "", menuPreference: "", ageGroup: "adult", groupName: "" });
        setShowAddDialog(false);
        fetchGuests();
      }
    } finally {
      setAdding(false);
    }
  };

  const handleStatusChange = async (guestId: number, newStatus: string) => {
    try {
      await fetch(`/api/events/${eventId}/guests/${guestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      fetchGuests();
    } catch (error) {
      console.error("Failed to update guest:", error);
    }
  };

  const filteredGuests = guests.filter((guest) => {
    const matchesSearch =
      guest.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (guest.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false) ||
      (guest.email?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    const matchesStatus = statusFilter === "all" || guest.rsvpStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Group guests by groupName
  const groupedGuests = filteredGuests.reduce((acc, guest) => {
    const group = guest.groupName || "Sin grupo";
    if (!acc[group]) acc[group] = [];
    acc[group].push(guest);
    return acc;
  }, {} as Record<string, Guest[]>);

  // Group guests by table
  const guestsByTable = filteredGuests.reduce((acc, guest) => {
    const table = guest.tableName || "Sin mesa";
    if (!acc[table]) acc[table] = [];
    acc[table].push(guest);
    return acc;
  }, {} as Record<string, Guest[]>);

  // Group guests by menu
  const guestsByMenu = filteredGuests.reduce((acc, guest) => {
    const menu = guest.menuPreference || "Sin especificar";
    if (!acc[menu]) acc[menu] = [];
    acc[menu].push(guest);
    return acc;
  }, {} as Record<string, Guest[]>);

  // Handle menu change
  const handleMenuChange = async (guestId: number, menuPreference: string) => {
    try {
      await fetch(`/api/events/${eventId}/guests/${guestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ menuPreference }),
      });
      fetchGuests();
    } catch (error) {
      console.error("Failed to update menu:", error);
    }
  };

  // Handle table change
  const handleTableChange = async (guestId: number, tableId: string) => {
    try {
      const tableIdNum = tableId === "none" ? null : parseInt(tableId, 10);
      await fetch(`/api/events/${eventId}/guests/${guestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tableId: tableIdNum }),
      });
      fetchGuests();
    } catch (error) {
      console.error("Failed to update table:", error);
    }
  };

  // Handle name change
  const handleNameChange = async (guestId: number, firstName: string, lastName: string) => {
    try {
      await fetch(`/api/events/${eventId}/guests/${guestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstName, lastName }),
      });
      fetchGuests();
    } catch (error) {
      console.error("Failed to update name:", error);
    }
  };

  // Handle delete guest
  const handleDeleteGuest = async (guestId: number) => {
    if (!confirm("¿Estás seguro de eliminar este invitado?")) return;
    try {
      await fetch(`/api/events/${eventId}/guests/${guestId}`, {
        method: "DELETE",
      });
      fetchGuests();
    } catch (error) {
      console.error("Failed to delete guest:", error);
    }
  };

  // Handle add group
  const handleAddGroup = async () => {
    if (!newGroup.name) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/events/${eventId}/guests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "group", ...newGroup }),
      });
      const data = await res.json();
      if (data.success) {
        setNewGroup({ name: "", notes: "" });
        setShowGroupDialog(false);
        fetchGuests();
      }
    } finally {
      setAdding(false);
    }
  };

  // Fallback stats if API doesn't return them
  const displayStats = stats || {
    total: guests.length,
    confirmed: guests.filter((g) => g.rsvpStatus === "confirmed").length,
    pending: guests.filter((g) => g.rsvpStatus === "pending" || !g.rsvpStatus).length,
    declined: guests.filter((g) => g.rsvpStatus === "declined").length,
    adults: guests.filter((g) => g.ageGroup === "adult" || !g.ageGroup).length,
    children: guests.filter((g) => g.ageGroup === "child").length,
    babies: guests.filter((g) => g.ageGroup === "baby").length,
    seated: guests.filter((g) => g.tableId).length,
    totalCompanions: guests.reduce((sum, g) => sum + (g.companionCount || 0), 0),
    totalAttending: guests.filter((g) => g.rsvpStatus === "confirmed").length,
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
        <Skeleton className="h-96" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Lista de Invitados</h1>
          <p className="text-muted-foreground">
            Gestiona los invitados de tu evento
          </p>
        </div>
        <div className="flex gap-2">
          <CSVImportDialog eventId={eventId} onSuccess={fetchGuests} />
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => window.open(`/api/events/${eventId}/guests/export`, '_blank')}
          >
            <RiDownloadLine className="h-4 w-4" />
            Exportar CSV
          </Button>
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={() => setShowGroupDialog(true)}
          >
            <RiGroupLine className="h-4 w-4" />
            + Grupo
          </Button>
          <Button className="gap-2" onClick={() => setShowAddDialog(true)}>
            <RiAddLine className="h-4 w-4" />
            Añadir Invitado
          </Button>
          <Sheet open={showAddDialog} onOpenChange={setShowAddDialog}>
          <SheetContent className="sm:max-w-md overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Añadir Invitado</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 px-4 pb-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nombre *</Label>
                  <Input
                    placeholder="Nombre"
                    value={newGuest.firstName}
                    onChange={(e) => setNewGuest({ ...newGuest, firstName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Apellido</Label>
                  <Input
                    placeholder="Apellido"
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
                    placeholder="email@ejemplo.com"
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
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Menú</Label>
                  <Select
                    value={newGuest.menuPreference}
                    onValueChange={(value) => setNewGuest({ ...newGuest, menuPreference: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="regular">Regular</SelectItem>
                      <SelectItem value="vegetariano">Vegetariano</SelectItem>
                      <SelectItem value="vegano">Vegano</SelectItem>
                      <SelectItem value="celiaco">Celíaco</SelectItem>
                      <SelectItem value="infantil">Infantil</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Grupo/Mesa</Label>
                  <Input
                    placeholder="Ej: Familia novia"
                    value={newGuest.groupName}
                    onChange={(e) => setNewGuest({ ...newGuest, groupName: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancelar
                </Button>
                <Button onClick={handleAddGuest} disabled={adding || !newGuest.firstName}>
                  {adding ? "Guardando..." : "Añadir"}
                </Button>
              </div>
            </div>
          </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{displayStats.total}</p>
            <p className="text-sm text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-700">{displayStats.confirmed}</p>
            <p className="text-sm text-green-600">Confirmados</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-700">{displayStats.pending}</p>
            <p className="text-sm text-yellow-600">Pendientes</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-700">{displayStats.declined}</p>
            <p className="text-sm text-red-600">Cancelados</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar invitados..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <RiFilterLine className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="confirmed">Confirmados</SelectItem>
            <SelectItem value="pending">Pendientes</SelectItem>
            <SelectItem value="declined">Cancelados</SelectItem>
          </SelectContent>
        </Select>
        {/* View Toggle */}
        <div className="flex gap-2">
          <Button
            variant={viewMode === "list" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("list")}
            className="gap-2"
          >
            <RiListUnordered className="h-4 w-4" />
            Lista
          </Button>
          <Button
            variant={viewMode === "floor" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("floor")}
            className="gap-2"
          >
            <RiLayout2Line className="h-4 w-4" />
            Plano
          </Button>
        </div>
      </div>

      {/* Floor Plan View */}
      {viewMode === "floor" ? (
        <TableCanvas
          eventId={eventId}
          tables={tables as any}
          guests={guests}
          onRefresh={fetchGuests}
        />
      ) : (
      <>
      {/* Guest List with Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="mb-4">
          <TabsTrigger value="grupos" className="gap-2">
            <RiGroupLine className="h-4 w-4" />
            Grupos
          </TabsTrigger>
          <TabsTrigger value="asistencia" className="gap-2">
            <RiCheckLine className="h-4 w-4" />
            Asistencia
          </TabsTrigger>
          <TabsTrigger value="mesas" className="gap-2">
            <RiLayoutGridLine className="h-4 w-4" />
            Mesas
          </TabsTrigger>
          <TabsTrigger value="menus" className="gap-2">
            <RiRestaurantLine className="h-4 w-4" />
            Menús
          </TabsTrigger>
        </TabsList>

        {/* Tab: Grupos */}
        <TabsContent value="grupos">
          <Card>
            <CardContent className="p-0">
              {Object.keys(groupedGuests).length > 0 ? (
                Object.entries(groupedGuests).map(([group, groupGuests]) => (
                  <div key={group}>
                    <div className="px-4 py-2 bg-muted font-medium text-sm flex items-center justify-between">
                      <span>{group} ({groupGuests.length})</span>
                    </div>
                    <div className="divide-y">
                      {groupGuests.map((guest) => (
                        <GuestRow 
                          key={guest.id} 
                          guest={guest} 
                          tables={tables}
                          onStatusChange={handleStatusChange}
                          onMenuChange={handleMenuChange}
                          onTableChange={handleTableChange}
                          onNameChange={handleNameChange}
                          onDelete={handleDeleteGuest}
                        />
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  {searchTerm || statusFilter !== "all"
                    ? "No hay invitados que coincidan con los filtros"
                    : "No hay invitados registrados"}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Asistencia */}
        <TabsContent value="asistencia">
          <Card>
            <CardContent className="p-0 divide-y">
              {filteredGuests.length > 0 ? (
                filteredGuests.map((guest) => (
                  <GuestRow 
                    key={guest.id} 
                    guest={guest} 
                    tables={tables}
                    onStatusChange={handleStatusChange}
                    onMenuChange={handleMenuChange}
                    onTableChange={handleTableChange}
                    onNameChange={handleNameChange}
                    onDelete={handleDeleteGuest}
                  />
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No hay invitados
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Mesas */}
        <TabsContent value="mesas">
          <Card>
            <CardContent className="p-0">
              {Object.keys(guestsByTable).length > 0 ? (
                Object.entries(guestsByTable).map(([table, tableGuests]) => (
                  <div key={table}>
                    <div className="px-4 py-2 bg-muted font-medium text-sm flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <RiLayoutGridLine className="h-4 w-4" />
                        {table} ({tableGuests.length})
                      </span>
                    </div>
                    <div className="divide-y">
                      {tableGuests.map((guest) => (
                        <GuestRow 
                          key={guest.id} 
                          guest={guest} 
                          tables={tables}
                          onStatusChange={handleStatusChange}
                          onMenuChange={handleMenuChange}
                          onTableChange={handleTableChange}
                          onNameChange={handleNameChange}
                          onDelete={handleDeleteGuest}
                        />
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No hay invitados asignados a mesas
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab: Menús */}
        <TabsContent value="menus">
          <Card>
            <CardContent className="p-0">
              {Object.keys(guestsByMenu).length > 0 ? (
                Object.entries(guestsByMenu).map(([menu, menuGuests]) => (
                  <div key={menu}>
                    <div className="px-4 py-2 bg-muted font-medium text-sm flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <RiRestaurantLine className="h-4 w-4" />
                        {menu} ({menuGuests.length})
                      </span>
                    </div>
                    <div className="divide-y">
                      {menuGuests.map((guest) => (
                        <GuestRow 
                          key={guest.id} 
                          guest={guest} 
                          tables={tables}
                          onStatusChange={handleStatusChange}
                          onMenuChange={handleMenuChange}
                          onTableChange={handleTableChange}
                          onNameChange={handleNameChange}
                          onDelete={handleDeleteGuest}
                        />
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No hay invitados con menú asignado
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
      </>
      )}

      {/* Dialog: Add Group */}
      <Sheet open={showGroupDialog} onOpenChange={setShowGroupDialog}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Crear Grupo</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 px-4 pb-4">
            <div className="space-y-2">
              <Label>Nombre del grupo *</Label>
              <Input
                placeholder="Ej: Familia novia"
                value={newGroup.name}
                onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Input
                placeholder="Notas opcionales..."
                value={newGroup.notes}
                onChange={(e) => setNewGroup({ ...newGroup, notes: e.target.value })}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowGroupDialog(false)}>
                Cancelar
              </Button>
              <Button onClick={handleAddGroup} disabled={adding || !newGroup.name}>
                {adding ? "Guardando..." : "Crear Grupo"}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

// Guest Row Component
function GuestRow({ 
  guest, 
  tables,
  onStatusChange, 
  onMenuChange,
  onTableChange,
  onNameChange,
  onDelete,
}: { 
  guest: Guest; 
  tables: EventTable[];
  onStatusChange: (guestId: number, status: string) => void;
  onMenuChange: (guestId: number, menu: string) => void;
  onTableChange: (guestId: number, tableId: string) => void;
  onNameChange: (guestId: number, firstName: string, lastName: string) => void;
  onDelete: (guestId: number) => void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editFirstName, setEditFirstName] = useState(guest.firstName);
  const [editLastName, setEditLastName] = useState(guest.lastName || "");
  
  const status = statusConfig[guest.rsvpStatus || "pending"] || statusConfig.pending;

  const handleSaveName = () => {
    if (editFirstName.trim()) {
      onNameChange(guest.id, editFirstName.trim(), editLastName.trim());
      setIsEditing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSaveName();
    } else if (e.key === "Escape") {
      setEditFirstName(guest.firstName);
      setEditLastName(guest.lastName || "");
      setIsEditing(false);
    }
  };
  
  return (
    <div className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors group">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="font-medium text-primary">
            {guest.firstName.charAt(0)}{guest.lastName?.charAt(0) || ""}
          </span>
        </div>
        <div>
          <div className="flex items-center gap-2">
            {isEditing ? (
              <div className="flex items-center gap-1">
                <Input
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleSaveName}
                  className="h-7 w-24 text-sm"
                  placeholder="Nombre"
                  autoFocus
                />
                <Input
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  onKeyDown={handleKeyDown}
                  onBlur={handleSaveName}
                  className="h-7 w-24 text-sm"
                  placeholder="Apellido"
                />
              </div>
            ) : (
              <p 
                className="font-medium cursor-pointer hover:text-primary flex items-center gap-1"
                onClick={() => setIsEditing(true)}
              >
                {guest.firstName} {guest.lastName}
                <RiPencilLine className="h-3 w-3 opacity-0 group-hover:opacity-50" />
              </p>
            )}
            {guest.ageGroup === "child" && (
              <Badge variant="secondary" className="text-xs">
                <RiParentLine className="h-3 w-3 mr-1" />
                Niño
              </Badge>
            )}
            {guest.ageGroup === "baby" && (
              <Badge variant="secondary" className="text-xs">
                <RiUserHeartLine className="h-3 w-3 mr-1" />
                Bebé
              </Badge>
            )}
            {guest.companionCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                +{guest.companionCount}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            {guest.email && (
              <span className="flex items-center gap-1">
                <RiMailLine className="h-3 w-3" />
                {guest.email}
              </span>
            )}
            {guest.tableName && (
              <span className="flex items-center gap-1">
                <RiLayoutGridLine className="h-3 w-3" />
                {guest.tableName}
              </span>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {/* Menu Select */}
        <Select
          value={guest.menuPreference || ""}
          onValueChange={(value) => onMenuChange(guest.id, value)}
        >
          <SelectTrigger className="w-28 h-8">
            <SelectValue placeholder="Menú" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="regular">Regular</SelectItem>
            <SelectItem value="vegetariano">Vegetariano</SelectItem>
            <SelectItem value="vegano">Vegano</SelectItem>
            <SelectItem value="celiaco">Celíaco</SelectItem>
            <SelectItem value="infantil">Infantil</SelectItem>
          </SelectContent>
        </Select>

        {/* Table Select */}
        <Select
          value={guest.tableId?.toString() || "none"}
          onValueChange={(value) => onTableChange(guest.id, value)}
        >
          <SelectTrigger className="w-32 h-8">
            <SelectValue placeholder="Mesa" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sin mesa</SelectItem>
            {tables.map((t) => (
              <SelectItem key={t.id} value={t.id.toString()}>
                {t.name} ({t.guestCount}/{t.capacity})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Status Select */}
        <Select
          value={guest.rsvpStatus || "pending"}
          onValueChange={(value) => onStatusChange(guest.id, value)}
        >
          <SelectTrigger className={cn("w-32 h-8", status.color)}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="confirmed">Confirmada</SelectItem>
            <SelectItem value="pending">Pendiente</SelectItem>
            <SelectItem value="declined">Cancelada</SelectItem>
          </SelectContent>
        </Select>

        {/* Delete Button */}
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => onDelete(guest.id)}
        >
          <RiDeleteBinLine className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
