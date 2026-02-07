"use client";

import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
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
  RiStarFill,
  RiPhoneLine,
  RiMailLine,
  RiMapPinLine,
  RiStore2Line,
} from "@remixicon/react";
import { useVendors } from "@/hooks/use-vendors";
import { useState } from "react";

const categories = [
  "Todos",
  "Catering",
  "Fotografía",
  "Floristería",
  "Música",
  "Pastelería",
  "Decoración",
  "Venue",
  "Transporte",
  "Otro",
];

export default function VendorsPage() {
  const { vendors, stats, loading, createVendor } = useVendors();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [newVendor, setNewVendor] = useState({
    name: "",
    category: "",
    email: "",
    phone: "",
    address: "",
    website: "",
    notes: "",
  });

  const handleCreateVendor = async () => {
    if (!newVendor.name) return;
    
    await createVendor(newVendor);
    setNewVendor({
      name: "",
      category: "",
      email: "",
      phone: "",
      address: "",
      website: "",
      notes: "",
    });
    setIsDrawerOpen(false);
  };

  const filteredVendors = vendors.filter((vendor) => {
    const matchesSearch = vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "Todos" || vendor.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Proveedores</h1>
          <p className="text-[var(--muted-foreground)]">
            Directorio de vendors y proveedores de servicios
          </p>
        </div>
        <Button className="gap-2" onClick={() => setIsDrawerOpen(true)}>
          <RiAddLine className="h-4 w-4" />
          Nuevo Proveedor
        </Button>
        <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
          <SheetContent className="sm:max-w-[500px] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Nuevo Proveedor</SheetTitle>
              <SheetDescription>
                Agrega un nuevo proveedor a tu directorio
              </SheetDescription>
            </SheetHeader>
            <div className="grid gap-4 px-4 pb-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre *</label>
                <Input
                  placeholder="Nombre del proveedor"
                  value={newVendor.name}
                  onChange={(e) => setNewVendor({ ...newVendor, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Categoría</label>
                <Select
                  value={newVendor.category}
                  onValueChange={(value) => setNewVendor({ ...newVendor, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar categoría" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.slice(1).map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Email</label>
                  <Input
                    type="email"
                    placeholder="email@ejemplo.com"
                    value={newVendor.email}
                    onChange={(e) => setNewVendor({ ...newVendor, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Teléfono</label>
                  <Input
                    placeholder="+34 612 345 678"
                    value={newVendor.phone}
                    onChange={(e) => setNewVendor({ ...newVendor, phone: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Dirección</label>
                <Input
                  placeholder="Dirección del proveedor"
                  value={newVendor.address}
                  onChange={(e) => setNewVendor({ ...newVendor, address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Sitio Web</label>
                <Input
                  placeholder="https://ejemplo.com"
                  value={newVendor.website}
                  onChange={(e) => setNewVendor({ ...newVendor, website: e.target.value })}
                />
              </div>
            </div>
            <SheetFooter className="px-4">
              <Button variant="outline" onClick={() => setIsDrawerOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateVendor} disabled={!newVendor.name}>
                Crear Proveedor
              </Button>
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <RiSearchLine className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input 
            placeholder="Buscar proveedores..." 
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {categories.map((category) => (
            <Button
              key={category}
              variant={selectedCategory === category ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Vendors Grid */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-20 mb-4" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-3/4" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredVendors.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredVendors.map((vendor) => (
            <Card
              key={vendor.id}
              className="transition-all hover:shadow-lg hover:border-[var(--primary)] hover:-translate-y-1 cursor-pointer animate-fade-in"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-lg">{vendor.name}</h3>
                    {vendor.category && (
                      <Badge variant="secondary" className="mt-1">
                        {vendor.category}
                      </Badge>
                    )}
                  </div>
                  <Badge
                    variant={vendor.status === "active" ? "success" : "warning"}
                  >
                    {vendor.status === "active" ? "Activo" : "Pendiente"}
                  </Badge>
                </div>

                {vendor.rating && (
                  <div className="mt-4 flex items-center gap-1">
                    {[...Array(5)].map((_, i) => (
                      <RiStarFill
                        key={i}
                        className={`h-4 w-4 ${
                          i < Math.floor(vendor.rating || 0)
                            ? "text-yellow-400"
                            : "text-gray-200"
                        }`}
                      />
                    ))}
                    <span className="ml-2 text-sm font-medium">{vendor.rating}</span>
                  </div>
                )}

                <div className="mt-4 space-y-2">
                  {vendor.email && (
                    <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                      <RiMailLine className="h-4 w-4" />
                      <span className="truncate">{vendor.email}</span>
                    </div>
                  )}
                  {vendor.phone && (
                    <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                      <RiPhoneLine className="h-4 w-4" />
                      <span>{vendor.phone}</span>
                    </div>
                  )}
                  {vendor.address && (
                    <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                      <RiMapPinLine className="h-4 w-4" />
                      <span>{vendor.address}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12">
            <div className="text-center">
              <RiStore2Line className="h-16 w-16 mx-auto text-[var(--muted-foreground)] mb-4" />
              <h3 className="text-lg font-semibold mb-2">No hay proveedores</h3>
              <p className="text-[var(--muted-foreground)] mb-4">
                Agrega tu primer proveedor para comenzar
              </p>
              <Button onClick={() => setIsDrawerOpen(true)}>
                <RiAddLine className="h-4 w-4 mr-2" />
                Agregar Proveedor
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
