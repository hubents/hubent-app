"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { AIChatBase } from "./ai-chat-base";
import { usePathname } from "next/navigation";
import { Sparkles } from "lucide-react";

interface AIGlobalDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function getPageContext(pathname: string): { context: string; title: string; suggestions: string[] } {
  // Most specific paths first to avoid false matches

  // Settings sub-pages (before generic /settings)
  if (pathname.includes("/settings/billing")) {
    return {
      context: "billing",
      title: "Asistente de Facturación",
      suggestions: [
        "¿Cuáles son los planes disponibles?",
        "¿Cómo cambio mi plan?",
        "¿Cómo funciona el período de prueba?",
      ],
    };
  }
  if (pathname.includes("/settings/roles")) {
    return {
      context: "team",
      title: "Asistente de Roles",
      suggestions: [
        "¿Qué roles hay en el sistema?",
        "¿Cómo creo un rol personalizado?",
        "¿Qué permisos puedo asignar?",
      ],
    };
  }
  if (pathname.includes("/settings")) {
    return {
      context: "dashboard",
      title: "Asistente de Configuración",
      suggestions: [
        "¿Cómo configuro mis datos fiscales?",
        "¿Cómo cambio el idioma?",
        "¿Cómo gestiono las API keys?",
      ],
    };
  }

  // Event-specific (with ID)
  const eventMatch = pathname.match(/\/events\/(\d+)/);
  if (eventMatch) {
    const eventId = eventMatch[1];
    return {
      context: `event:${eventId}`,
      title: "Asistente de Eventos",
      suggestions: [
        "¿Qué tareas tiene este evento?",
        "Resume los proveedores",
        "¿Cuántos invitados confirmaron?",
      ],
    };
  }
  if (pathname.includes("/events/")) {
    return {
      context: "event-page",
      title: "Asistente de Eventos",
      suggestions: [
        "¿Qué tareas tiene este evento?",
        "Resume los proveedores",
        "¿Cuántos invitados confirmaron?",
      ],
    };
  }
  if (pathname.includes("/events")) {
    return {
      context: "events-list",
      title: "Asistente de Eventos",
      suggestions: [
        "¿Cuáles son mis próximos eventos?",
        "Eventos de esta semana",
        "¿Qué evento tiene más tareas pendientes?",
      ],
    };
  }

  // Module pages
  if (pathname.includes("/tasks")) {
    return {
      context: "tasks",
      title: "Asistente de Tareas",
      suggestions: [
        "¿Cuáles son mis tareas pendientes?",
        "Tareas vencidas",
        "¿Qué tareas tengo para hoy?",
      ],
    };
  }
  if (pathname.includes("/crm")) {
    return {
      context: "crm",
      title: "Asistente CRM",
      suggestions: [
        "¿Cuántos leads tengo en negociación?",
        "Leads por cerrar esta semana",
        "¿Cuál es el valor del pipeline?",
      ],
    };
  }
  if (pathname.includes("/contacts")) {
    return {
      context: "contacts",
      title: "Asistente de Contactos",
      suggestions: [
        "¿Cuántos contactos tengo?",
        "Contactos sin email",
        "Últimos contactos agregados",
      ],
    };
  }
  if (pathname.includes("/vendors")) {
    return {
      context: "vendors",
      title: "Asistente de Proveedores",
      suggestions: [
        "Lista mis proveedores",
        "Proveedores más usados",
        "¿Qué proveedores tengo por categoría?",
      ],
    };
  }
  if (pathname.includes("/finance")) {
    return {
      context: "finance",
      title: "Asistente de Finanzas",
      suggestions: [
        "¿Cómo creo un presupuesto?",
        "¿Cuánto falta por cobrar?",
        "¿Cómo exporto datos contables?",
      ],
    };
  }
  if (pathname.includes("/forms")) {
    return {
      context: "forms",
      title: "Asistente de Formularios",
      suggestions: [
        "¿Cómo creo un formulario?",
        "¿Qué tipos de campos puedo usar?",
        "¿Cómo vinculo un form a un evento?",
      ],
    };
  }
  if (pathname.includes("/team")) {
    return {
      context: "team",
      title: "Asistente de Equipo",
      suggestions: [
        "¿Cómo invito un miembro?",
        "¿Qué roles hay disponibles?",
        "¿Qué significa eventScoped?",
      ],
    };
  }
  if (pathname.includes("/calendar")) {
    return {
      context: "calendar",
      title: "Asistente de Calendario",
      suggestions: [
        "¿Qué significan los colores?",
        "¿Cómo veo las tareas de un día?",
        "¿Cuáles son mis próximos eventos?",
      ],
    };
  }

  return {
    context: "dashboard",
    title: "Asistente General",
    suggestions: [
      "¿Cuáles son mis próximos eventos?",
      "¿Tengo tareas pendientes?",
      "Dame un resumen del día",
    ],
  };
}

export function AIGlobalDrawer({ open, onOpenChange }: AIGlobalDrawerProps) {
  const pathname = usePathname();
  const { context, title, suggestions } = getPageContext(pathname);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b border-[var(--border)] flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[var(--ai-accent)] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <SheetTitle className="text-left">HubIA</SheetTitle>
              <p className="text-xs text-[var(--muted-foreground)]">{title}</p>
            </div>
          </div>
        </SheetHeader>
        
        <div className="flex-1 overflow-hidden">
          <AIChatBase
            context={context}
            suggestions={suggestions}
            showHeader={false}
            className="h-full"
          />
        </div>
      </SheetContent>
    </Sheet>
  );
}
