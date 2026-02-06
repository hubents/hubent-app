import { ComingSoonPage } from "@/components/ui/coming-soon-page";
import { RiFolder3Line } from "@remixicon/react";

export default function DocumentsPage() {
  return (
    <ComingSoonPage
      icon={<RiFolder3Line className="h-16 w-16" />}
      title="Gestión de Documentos"
      description="Próximamente podrás gestionar todos los documentos de tus eventos en un solo lugar."
      features={[
        "Subir y organizar documentos por evento",
        "Compartir documentos con clientes y proveedores",
        "Control de versiones y historial",
        "Firmas digitales integradas",
      ]}
    />
  );
}
