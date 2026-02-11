"use client";

import { useState, useEffect, use } from "react";
import { useEvent } from "@/contexts/event-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
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
  RiStore2Line,
  RiDeleteBinLine,
  RiPhoneLine,
  RiMailLine,
} from "@remixicon/react";
import Link from "next/link";

interface EventVendor {
  id: number;
  vendorId: number;
  vendorName: string;
  service: string;
  category: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
}

interface Vendor {
  id: number;
  name: string;
  category: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
}

export default function EventVendorsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const eventId = parseInt(id, 10);
  const { setActiveEvent } = useEvent();

  const [vendors, setVendors] = useState<EventVendor[]>([]);
  const [allVendors, setAllVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<number | null>(null);
  const [vendorService, setVendorService] = useState("");
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

  useEffect(() => {
    Promise.all([fetchVendors(), fetchAllVendors()]).finally(() => setLoading(false));
  }, [eventId]);

  const handleAddVendor = async () => {
    if (!selectedVendorId) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/events/${eventId}/vendors`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendorId: selectedVendorId, service: vendorService }),
      });
      const data = await res.json();
      if (data.success) {
        setSelectedVendorId(null);
        setVendorService("");
        setShowAddDialog(false);
        fetchVendors();
      }
    } finally {
      setAdding(false);
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

  const availableVendors = allVendors.filter(
    (v) => !vendors.some((ev) => ev.vendorId === v.id)
  );

  const filteredVendors = vendors.filter((v) =>
    v.vendorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (v.service?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false)
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-40" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Proveedores</h1>
          <p className="text-[var(--muted-foreground)]">
            {vendors.length} proveedores asignados
          </p>
        </div>
        <div className="flex gap-2">
          <Button className="gap-2" onClick={() => setShowAddDialog(true)}>
            <RiAddLine className="h-4 w-4" />
            Asignar Proveedor
          </Button>
          <Sheet open={showAddDialog} onOpenChange={setShowAddDialog}>
            <SheetContent className="sm:max-w-2xl overflow-y-auto">
              <SheetHeader>
                <SheetTitle>Asignar Proveedor al Evento</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 px-4 pb-4">
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
                    <p className="text-sm text-[var(--muted-foreground)]">
                      No hay proveedores disponibles.{" "}
                      <Link href="/dashboard/contacts?segment=vendors" className="text-[var(--primary)] underline">
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
                  <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                    Cancelar
                  </Button>
                  <Button onClick={handleAddVendor} disabled={adding || !selectedVendorId}>
                    {adding ? "Asignando..." : "Asignar"}
                  </Button>
                </div>
              </div>
            </SheetContent>
          </Sheet>
          <Link href="/dashboard/contacts?segment=vendors">
            <Button variant="outline">Ver todos</Button>
          </Link>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--muted-foreground)]" />
        <Input
          placeholder="Buscar proveedores..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Vendors Grid */}
      {filteredVendors.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredVendors.map((vendor) => (
            <Card key={vendor.id} className="group">
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                      <RiStore2Line className="h-5 w-5 text-[var(--primary)]" />
                    </div>
                    <div>
                      <h3 className="font-semibold">{vendor.vendorName}</h3>
                      {vendor.category && (
                        <Badge variant="secondary" className="mt-1">
                          {vendor.category}
                        </Badge>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 opacity-0 group-hover:opacity-100 text-[var(--destructive)]"
                    onClick={() => handleRemoveVendor(vendor.id)}
                  >
                    <RiDeleteBinLine className="h-4 w-4" />
                  </Button>
                </div>

                {vendor.service && (
                  <p className="mt-3 text-sm text-[var(--muted-foreground)]">
                    {vendor.service}
                  </p>
                )}

                <div className="mt-3 pt-3 border-t space-y-1 text-sm">
                  {vendor.contactEmail && (
                    <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                      <RiMailLine className="h-4 w-4" />
                      <span>{vendor.contactEmail}</span>
                    </div>
                  )}
                  {vendor.contactPhone && (
                    <div className="flex items-center gap-2 text-[var(--muted-foreground)]">
                      <RiPhoneLine className="h-4 w-4" />
                      <span>{vendor.contactPhone}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <RiStore2Line className="h-12 w-12 mx-auto text-[var(--muted-foreground)] mb-4" />
            <h3 className="font-semibold mb-2">No hay proveedores asignados</h3>
            <p className="text-[var(--muted-foreground)] mb-4">
              Asigna proveedores a este evento para gestionar sus servicios
            </p>
            <Button onClick={() => setShowAddDialog(true)}>
              <RiAddLine className="h-4 w-4 mr-2" />
              Asignar primer proveedor
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
