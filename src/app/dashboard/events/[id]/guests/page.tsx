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
  RiMailLine,
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
  RiFileListLine,
} from "@remixicon/react";
import { cn } from "@/lib/utils";
import { NumericPagination } from "@/components/ui/numeric-pagination";
import dynamic from "next/dynamic";
import { RiListUnordered, RiLayout2Line } from "@remixicon/react";
import { CSVImportDrawer } from "@/components/guests/csv-import-drawer";
import { useUserSessionContext } from "@/contexts/user-session-context";
import { useEventPermissions } from "@/hooks/use-event-permissions";
import { EventSectionGuard } from "@/components/events/event-section-guard";
import { downloadPDFFromHTML } from "@/lib/pdf-download";

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

interface GuestGroup {
  id: number;
  name: string;
  tableNumber: number | null;
  notes: string | null;
  guestCount?: number;
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
  groupId: number | null;
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
  const { eventScoped } = useUserSessionContext();
  const { canEdit } = useEventPermissions(eventId, eventScoped);
  const canEditGuests = canEdit("guests");

  const [guests, setGuests] = useState<Guest[]>([]);
  const [groups, setGroups] = useState<GuestGroup[]>([]);
  const [tables, setTables] = useState<EventTable[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({ page: 1, limit: 100, total: 0, totalPages: 0 });
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [groupFilter, setGroupFilter] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("grupos");
  const [viewMode, setViewMode] = useState<"list" | "floor">("list");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showGroupDialog, setShowGroupDialog] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GuestGroup | null>(null);
  const [editGroupName, setEditGroupName] = useState("");
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [newGuest, setNewGuest] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    menuPreference: "",
    ageGroup: "adult",
    groupId: "none",
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

  const fetchGroups = async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/guests?type=groups`);
      const data = await res.json();
      if (data.success) {
        setGroups(data.data || []);
      }
    } catch (error) {
      console.error("Failed to fetch groups:", error);
    }
  };

  const fetchGuests = async (p = page, status = statusFilter, gFilter = groupFilter) => {
    try {
      const params = new URLSearchParams({ page: p.toString() });
      if (status && status !== "all") {
        params.set("rsvpStatus", status);
      }
      if (gFilter && gFilter !== "all") {
        params.set("groupId", gFilter);
      }
      const [guestsRes, tablesRes] = await Promise.all([
        fetch(`/api/events/${eventId}/guests?${params}`),
        fetch(`/api/events/${eventId}/tables`),
      ]);
      const guestsData = await guestsRes.json();
      const tablesData = await tablesRes.json();
      
      if (guestsData.success) {
        setGuests(guestsData.data || []);
        if (guestsData.stats) {
          setStats(guestsData.stats);
        }
        if (guestsData.meta) {
          setMeta(guestsData.meta);
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
    fetchGroups();
  }, [eventId]);

  useEffect(() => {
    setPage(1);
    fetchGuests(1, statusFilter, groupFilter);
  }, [eventId, statusFilter, groupFilter]);

  useEffect(() => {
    if (page !== 1) {
      fetchGuests(page, statusFilter, groupFilter);
    }
  }, [page]);

  const handleAddGuest = async () => {
    if (!newGuest.firstName) return;
    setAdding(true);
    try {
      const payload: Record<string, unknown> = {
        firstName: newGuest.firstName,
        lastName: newGuest.lastName,
        email: newGuest.email,
        phone: newGuest.phone,
        menuPreference: newGuest.menuPreference || undefined,
        ageGroup: newGuest.ageGroup,
      };
      if (newGuest.groupId && newGuest.groupId !== "none") {
        payload.groupId = parseInt(newGuest.groupId, 10);
      }
      const res = await fetch(`/api/events/${eventId}/guests`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (data.success) {
        setNewGuest({ firstName: "", lastName: "", email: "", phone: "", menuPreference: "", ageGroup: "adult", groupId: "" });
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
    const guestStatus = guest.rsvpStatus || "pending";
    const matchesStatus = statusFilter === "all" || guestStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Group guests by groupName, including empty groups from the full group list
  const groupedGuests = (() => {
    const map: Record<string, { groupId: number | null; guests: Guest[] }> = {};
    for (const g of groups) {
      map[g.name] = { groupId: g.id, guests: [] };
    }
    for (const guest of filteredGuests) {
      const key = guest.groupName || "Sin grupo";
      if (!map[key]) map[key] = { groupId: null, guests: [] };
      map[key].guests.push(guest);
    }
    return map;
  })();

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

  // Handle group change
  const handleGroupChange = async (guestId: number, groupId: string) => {
    try {
      const groupIdNum = groupId === "none" ? null : parseInt(groupId, 10);
      await fetch(`/api/events/${eventId}/guests/${guestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: groupIdNum }),
      });
      fetchGroups();
      fetchGuests();
    } catch (error) {
      console.error("Failed to update group:", error);
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
        fetchGroups();
        fetchGuests();
      }
    } finally {
      setAdding(false);
    }
  };

  const handleEditGroup = async (groupId: number, name: string) => {
    try {
      const res = await fetch(`/api/events/${eventId}/guests/groups/${groupId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (data.success) {
        setEditingGroup(null);
        setEditGroupName("");
        fetchGroups();
        fetchGuests();
      }
    } catch (error) {
      console.error("Failed to update group:", error);
    }
  };

  const handleDeleteGroup = async (groupId: number) => {
    if (!confirm("¿Eliminar este grupo? Los invitados se moverán a 'Sin grupo'.")) return;
    try {
      const res = await fetch(`/api/events/${eventId}/guests/groups/${groupId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data.success) {
        fetchGroups();
        fetchGuests();
      }
    } catch (error) {
      console.error("Failed to delete group:", error);
    }
  };

  const handleDownloadPDF = async () => {
    setDownloadingPdf(true);
    try {
      await downloadPDFFromHTML(
        `/api/events/${eventId}/guests/pdf`,
        `invitados-evento-${eventId}`
      );
    } finally {
      setDownloadingPdf(false);
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
    <EventSectionGuard eventId={eventId} section="guests">
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
          {canEditGuests && <CSVImportDrawer eventId={eventId} onSuccess={fetchGuests} />}
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
            onClick={handleDownloadPDF}
            disabled={downloadingPdf}
          >
            <RiFileListLine className="h-4 w-4" />
            {downloadingPdf ? "Generando..." : "Descargar PDF"}
          </Button>
          {canEditGuests && (
            <Button 
              variant="outline" 
              className="gap-2"
              onClick={() => setShowGroupDialog(true)}
            >
              <RiGroupLine className="h-4 w-4" />
              + Grupo
            </Button>
          )}
          {canEditGuests && (
            <Button className="gap-2" onClick={() => setShowAddDialog(true)}>
              <RiAddLine className="h-4 w-4" />
              Añadir Invitado
            </Button>
          )}
          <Sheet open={showAddDialog} onOpenChange={setShowAddDialog}>
          <SheetContent className="sm:max-w-2xl overflow-y-auto">
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
                  <Label>Grupo</Label>
                  <Select
                    value={newGuest.groupId}
                    onValueChange={(value) => setNewGuest({ ...newGuest, groupId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Sin grupo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sin grupo</SelectItem>
                      {groups.map((g) => (
                        <SelectItem key={g.id} value={g.id.toString()}>
                          {g.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

      {/* Secondary Stats */}
      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <span>Adultos: <strong className="text-foreground">{displayStats.adults}</strong></span>
        <span>Niños: <strong className="text-foreground">{displayStats.children}</strong></span>
        <span>Bebés: <strong className="text-foreground">{displayStats.babies}</strong></span>
        <span className="border-l pl-4">Sentados: <strong className="text-foreground">{displayStats.seated}</strong></span>
        <span>Acompañantes: <strong className="text-foreground">{displayStats.totalCompanions}</strong></span>
        <span className="border-l pl-4">Total asistentes: <strong className="text-foreground">{displayStats.totalAttending}</strong></span>
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
        {groups.length > 0 && (
          <Select value={groupFilter} onValueChange={setGroupFilter}>
            <SelectTrigger className="w-full sm:w-48">
              <RiGroupLine className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Filtrar por grupo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los grupos</SelectItem>
              {groups.map((g) => (
                <SelectItem key={g.id} value={g.id.toString()}>
                  {g.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
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
                Object.entries(groupedGuests).map(([groupName, { groupId, guests: groupGuests }]) => (
                  <div key={groupName}>
                    <div className="px-4 py-2 bg-muted font-medium text-sm flex items-center justify-between">
                      {editingGroup && editingGroup.name === groupName ? (
                        <div className="flex items-center gap-2">
                          <Input
                            value={editGroupName}
                            onChange={(e) => setEditGroupName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" && editGroupName.trim()) {
                                handleEditGroup(editingGroup.id, editGroupName.trim());
                              } else if (e.key === "Escape") {
                                setEditingGroup(null);
                              }
                            }}
                            className="h-7 w-48 text-sm"
                            autoFocus
                          />
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            onClick={() => {
                              if (editGroupName.trim()) {
                                handleEditGroup(editingGroup.id, editGroupName.trim());
                              }
                            }}
                          >
                            <RiCheckLine className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 px-2"
                            onClick={() => setEditingGroup(null)}
                          >
                            <RiCloseLine className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        <span className="flex items-center gap-2">
                          <RiGroupLine className="h-4 w-4" />
                          {groupName} ({(() => {
                            const serverGroup = groups.find(g => g.name === groupName);
                            const serverCount = serverGroup?.guestCount;
                            if (serverCount != null && serverCount !== groupGuests.length) {
                              return `${serverCount} total`;
                            }
                            return groupGuests.length;
                          })()})
                        </span>
                      )}
                      {canEditGuests && groupId && !editingGroup && (
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-muted-foreground hover:text-foreground"
                            onClick={() => {
                              setEditingGroup({ id: groupId, name: groupName, tableNumber: null, notes: null });
                              setEditGroupName(groupName);
                            }}
                          >
                            <RiPencilLine className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-muted-foreground hover:text-destructive"
                            onClick={() => handleDeleteGroup(groupId)}
                          >
                            <RiDeleteBinLine className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </div>
                    {groupGuests.length > 0 ? (
                      <div className="divide-y">
                        {groupGuests.map((guest) => (
                          <GuestRow 
                            key={guest.id} 
                            guest={guest} 
                            tables={tables}
                            groups={groups}
                            onStatusChange={handleStatusChange}
                            onMenuChange={handleMenuChange}
                            onTableChange={handleTableChange}
                            onGroupChange={handleGroupChange}
                            onNameChange={handleNameChange}
                            onDelete={handleDeleteGuest}
                            readOnly={!canEditGuests}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="px-4 py-3 text-sm text-muted-foreground italic">
                        Sin invitados en este grupo
                      </div>
                    )}
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
                    groups={groups}
                    onStatusChange={handleStatusChange}
                    onMenuChange={handleMenuChange}
                    onTableChange={handleTableChange}
                    onGroupChange={handleGroupChange}
                    onNameChange={handleNameChange}
                    onDelete={handleDeleteGuest}
                    readOnly={!canEditGuests}
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
                          groups={groups}
                          onStatusChange={handleStatusChange}
                          onMenuChange={handleMenuChange}
                          onTableChange={handleTableChange}
                          onGroupChange={handleGroupChange}
                          onNameChange={handleNameChange}
                          onDelete={handleDeleteGuest}
                          readOnly={!canEditGuests}
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
                          groups={groups}
                          onStatusChange={handleStatusChange}
                          onMenuChange={handleMenuChange}
                          onTableChange={handleTableChange}
                          onGroupChange={handleGroupChange}
                          onNameChange={handleNameChange}
                          onDelete={handleDeleteGuest}
                          readOnly={!canEditGuests}
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

      {meta.totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-muted-foreground">
            Página {meta.page} de {meta.totalPages}
            {" · "}
            {((meta.page - 1) * meta.limit) + 1}–{Math.min(meta.page * meta.limit, meta.total)} de {meta.total} invitados
          </p>
          <NumericPagination
            currentPage={meta.page}
            totalPages={meta.totalPages}
            onPageChange={setPage}
          />
        </div>
      )}
      </>
      )}

      {/* Drawer: Add Group */}
      <Sheet open={showGroupDialog} onOpenChange={setShowGroupDialog}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
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
    </EventSectionGuard>
  );
}

// Guest Row Component
function GuestRow({ 
  guest, 
  tables,
  groups,
  onStatusChange, 
  onMenuChange,
  onTableChange,
  onGroupChange,
  onNameChange,
  onDelete,
  readOnly = false,
}: { 
  guest: Guest; 
  tables: EventTable[];
  groups: GuestGroup[];
  onStatusChange: (guestId: number, status: string) => void;
  onMenuChange: (guestId: number, menu: string) => void;
  onTableChange: (guestId: number, tableId: string) => void;
  onGroupChange: (guestId: number, groupId: string) => void;
  onNameChange: (guestId: number, firstName: string, lastName: string) => void;
  onDelete: (guestId: number) => void;
  readOnly?: boolean;
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
            {isEditing && !readOnly ? (
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
                className={cn("font-medium flex items-center gap-1", !readOnly && "cursor-pointer hover:text-primary")}
                onClick={() => !readOnly && setIsEditing(true)}
              >
                {guest.firstName} {guest.lastName}
                {!readOnly && <RiPencilLine className="h-3 w-3 opacity-0 group-hover:opacity-50" />}
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
        {/* Group Select */}
        <Select
          value={guest.groupId?.toString() || "none"}
          onValueChange={(value) => onGroupChange(guest.id, value)}
          disabled={readOnly}
        >
          <SelectTrigger className="w-32 h-8">
            <SelectValue placeholder="Grupo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Sin grupo</SelectItem>
            {groups.map((g) => (
              <SelectItem key={g.id} value={g.id.toString()}>
                {g.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Menu Select */}
        <Select
          value={guest.menuPreference || ""}
          onValueChange={(value) => onMenuChange(guest.id, value)}
          disabled={readOnly}
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
          disabled={readOnly || guest.rsvpStatus === "declined"}
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
          disabled={readOnly}
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
        {!readOnly && (
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => onDelete(guest.id)}
        >
          <RiDeleteBinLine className="h-4 w-4" />
        </Button>
        )}
      </div>
    </div>
  );
}
