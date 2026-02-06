import { ComingSoonPage } from "@/components/ui/coming-soon-page";
import { RiRestaurantLine } from "@remixicon/react";

export default function MenusPage() {
  return (
    <ComingSoonPage
      icon={<RiRestaurantLine className="h-16 w-16" />}
      title="Menús"
      description="Gestiona los menús de tus eventos de forma centralizada y multitenant."
      features={[
        "Crear menús personalizados por evento",
        "Gestionar opciones dietéticas y alérgenos",
        "Vincular menús con invitados y proveedores de catering",
        "Plantillas de menú reutilizables",
      ]}
    />
  );
}
