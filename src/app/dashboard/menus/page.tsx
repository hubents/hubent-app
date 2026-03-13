"use client";

import { ComingSoonPage } from "@/components/ui/coming-soon-page";
import { EventScopedGuard } from "@/components/layout/event-scoped-guard";
import { RiRestaurantLine } from "@remixicon/react";

export default function MenusPage() {
  return (
    <EventScopedGuard>
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
    </EventScopedGuard>
  );
}
