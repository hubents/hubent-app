import { ComingSoonPage } from "@/components/ui/coming-soon-page";
import { RiSurveyLine } from "@remixicon/react";

export default function FormsPage() {
  return (
    <ComingSoonPage
      icon={<RiSurveyLine className="h-16 w-16" />}
      title="Formularios"
      description="Crea formularios personalizados tipo Google Forms para recopilar información de tus clientes y eventos."
      features={[
        "Crear formularios de onboarding para eventos",
        "Recopilar preferencias de invitados",
        "Encuestas de satisfacción post-evento",
        "Integración automática con contactos y eventos",
      ]}
    />
  );
}
