import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  RiAddLine,
  RiSearchLine,
  RiStarFill,
  RiPhoneLine,
  RiMailLine,
  RiMapPinLine,
} from "@remixicon/react";

const vendors = [
  {
    id: "1",
    name: "Catering Deluxe",
    category: "Catering",
    rating: 4.8,
    reviews: 45,
    contact: "info@cateringdeluxe.com",
    phone: "+34 612 345 678",
    location: "Madrid",
    priceRange: "$$$",
    status: "active",
    eventsCompleted: 28,
  },
  {
    id: "2",
    name: "Foto & Video Pro",
    category: "Fotografía",
    rating: 4.9,
    reviews: 67,
    contact: "contacto@fotovideopro.com",
    phone: "+34 623 456 789",
    location: "Barcelona",
    priceRange: "$$$$",
    status: "active",
    eventsCompleted: 52,
  },
  {
    id: "3",
    name: "Flores del Valle",
    category: "Floristería",
    rating: 4.7,
    reviews: 32,
    contact: "pedidos@floresdelvalle.com",
    phone: "+34 634 567 890",
    location: "Valencia",
    priceRange: "$$",
    status: "active",
    eventsCompleted: 41,
  },
  {
    id: "4",
    name: "DJ Sounds",
    category: "Música",
    rating: 4.6,
    reviews: 28,
    contact: "booking@djsounds.com",
    phone: "+34 645 678 901",
    location: "Sevilla",
    priceRange: "$$",
    status: "active",
    eventsCompleted: 35,
  },
  {
    id: "5",
    name: "Dulces Momentos",
    category: "Pastelería",
    rating: 4.9,
    reviews: 54,
    contact: "info@dulcesmomentos.com",
    phone: "+34 656 789 012",
    location: "Madrid",
    priceRange: "$$$",
    status: "active",
    eventsCompleted: 63,
  },
  {
    id: "6",
    name: "Elegance Decor",
    category: "Decoración",
    rating: 4.5,
    reviews: 19,
    contact: "hola@elegancedecor.com",
    phone: "+34 667 890 123",
    location: "Málaga",
    priceRange: "$$$",
    status: "pending",
    eventsCompleted: 12,
  },
];

const categories = [
  "Todos",
  "Catering",
  "Fotografía",
  "Floristería",
  "Música",
  "Pastelería",
  "Decoración",
];

export default function VendorsPage() {
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
        <Button className="gap-2">
          <RiAddLine className="h-4 w-4" />
          Nuevo Proveedor
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <RiSearchLine className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]" />
          <Input placeholder="Buscar proveedores..." className="pl-10" />
        </div>
        <div className="flex gap-2">
          {categories.map((category) => (
            <Button
              key={category}
              variant={category === "Todos" ? "default" : "outline"}
              size="sm"
            >
              {category}
            </Button>
          ))}
        </div>
      </div>

      {/* Vendors Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {vendors.map((vendor) => (
          <Card
            key={vendor.id}
            className="transition-all hover:shadow-lg hover:border-[var(--primary)] hover:-translate-y-1 cursor-pointer animate-fade-in"
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-lg">{vendor.name}</h3>
                  <Badge variant="secondary" className="mt-1">
                    {vendor.category}
                  </Badge>
                </div>
                <Badge
                  variant={vendor.status === "active" ? "success" : "warning"}
                >
                  {vendor.status === "active" ? "Activo" : "Pendiente"}
                </Badge>
              </div>

              <div className="mt-4 flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <RiStarFill
                    key={i}
                    className={`h-4 w-4 ${
                      i < Math.floor(vendor.rating)
                        ? "text-yellow-400"
                        : "text-gray-200"
                    }`}
                  />
                ))}
                <span className="ml-2 text-sm font-medium">{vendor.rating}</span>
                <span className="text-sm text-[var(--muted-foreground)]">
                  ({vendor.reviews} reseñas)
                </span>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                  <RiMailLine className="h-4 w-4" />
                  <span className="truncate">{vendor.contact}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                  <RiPhoneLine className="h-4 w-4" />
                  <span>{vendor.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                  <RiMapPinLine className="h-4 w-4" />
                  <span>{vendor.location}</span>
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between border-t border-[var(--border)] pt-4">
                <div>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Eventos completados
                  </p>
                  <p className="font-semibold">{vendor.eventsCompleted}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Rango de precio
                  </p>
                  <p className="font-semibold text-[var(--primary)]">
                    {vendor.priceRange}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
