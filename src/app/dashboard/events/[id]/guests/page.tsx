"use client";

import { useState, useEffect, use } from "react";
import { useEvent } from "@/contexts/event-context";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
} from "@remixicon/react";
import { cn } from "@/lib/utils";

interface Guest {
  id: number;
  firstName: string;
  lastName: string | null;
  email: string | null;
  phone: string | null;
  status: string;
  menuPreference: string | null;
  groupName: string | null;
  notes: string | null;
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
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [newGuest, setNewGuest] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    menuPreference: "",
    groupName: "",
  });
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
      const res = await fetch(`/api/events/${eventId}/guests`);
      const data = await res.json();
      if (data.success) {
        setGuests(data.data || []);
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
        setNewGuest({ firstName: "", lastName: "", email: "", phone: "", menuPreference: "", groupName: "" });
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
    const matchesStatus = statusFilter === "all" || guest.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Group guests by groupName
  const groupedGuests = filteredGuests.reduce((acc, guest) => {
    const group = guest.groupName || "Sin grupo";
    if (!acc[group]) acc[group] = [];
    acc[group].push(guest);
    return acc;
  }, {} as Record<string, Guest[]>);

  const stats = {
    total: guests.length,
    confirmed: guests.filter((g) => g.status === "confirmed").length,
    pending: guests.filter((g) => g.status === "pending").length,
    declined: guests.filter((g) => g.status === "declined").length,
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
          <p className="text-[var(--muted-foreground)]">
            Gestiona los invitados de tu evento
          </p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <RiAddLine className="h-4 w-4" />
              Añadir Invitado
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Añadir Invitado</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
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
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold">{stats.total}</p>
            <p className="text-sm text-[var(--muted-foreground)]">Total</p>
          </CardContent>
        </Card>
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-green-700">{stats.confirmed}</p>
            <p className="text-sm text-green-600">Confirmados</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-yellow-700">{stats.pending}</p>
            <p className="text-sm text-yellow-600">Pendientes</p>
          </CardContent>
        </Card>
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-4 text-center">
            <p className="text-2xl font-bold text-red-700">{stats.declined}</p>
            <p className="text-sm text-red-600">Cancelados</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
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
      </div>

      {/* Guest List */}
      <Card>
        <CardContent className="p-0">
          {Object.keys(groupedGuests).length > 0 ? (
            Object.entries(groupedGuests).map(([group, groupGuests]) => (
              <div key={group}>
                <div className="px-4 py-2 bg-[var(--muted)] font-medium text-sm">
                  {group} ({groupGuests.length})
                </div>
                <div className="divide-y">
                  {groupGuests.map((guest) => {
                    const status = statusConfig[guest.status] || statusConfig.pending;
                    return (
                      <div
                        key={guest.id}
                        className="flex items-center justify-between p-4 hover:bg-[var(--muted)]/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
                            <span className="font-medium text-[var(--primary)]">
                              {guest.firstName.charAt(0)}{guest.lastName?.charAt(0) || ""}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">
                              {guest.firstName} {guest.lastName}
                            </p>
                            <div className="flex items-center gap-3 text-sm text-[var(--muted-foreground)]">
                              {guest.email && (
                                <span className="flex items-center gap-1">
                                  <RiMailLine className="h-3 w-3" />
                                  {guest.email}
                                </span>
                              )}
                              {guest.phone && (
                                <span className="flex items-center gap-1">
                                  <RiPhoneLine className="h-3 w-3" />
                                  {guest.phone}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          {guest.menuPreference && (
                            <Badge variant="outline">{guest.menuPreference}</Badge>
                          )}
                          <Select
                            value={guest.status}
                            onValueChange={(value) => handleStatusChange(guest.id, value)}
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
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 text-[var(--muted-foreground)]">
              {searchTerm || statusFilter !== "all"
                ? "No hay invitados que coincidan con los filtros"
                : "No hay invitados registrados"}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
