"use client";

import {
  RiUserLine,
  RiMailLine,
  RiPhoneLine,
  RiCalendarLine,
  RiMapPinLine,
  RiGroupLine,
  RiMoneyDollarCircleLine,
  RiChatQuoteLine,
  RiInputMethodLine,
  RiTextBlock,
  RiListCheck2,
  RiCheckboxLine,
  RiImageLine,
  RiSeparator,
  RiHeading,
  RiFileTextLine,
  RiHeartLine,
} from "@remixicon/react";

const PALETTE_SECTIONS = [
  {
    title: "Datos CRM",
    description: "Se mapean automáticamente al contacto/lead",
    fields: [
      { type: "name", label: "Nombre", icon: RiUserLine, crmMapping: "name" },
      { type: "email", label: "Email", icon: RiMailLine, crmMapping: "email" },
      { type: "phone", label: "Teléfono", icon: RiPhoneLine, crmMapping: "phone" },
      { type: "partner_name", label: "Nombre pareja", icon: RiHeartLine, crmMapping: "partnerName" },
      { type: "partner_email", label: "Email pareja", icon: RiMailLine, crmMapping: "partnerEmail" },
      { type: "event_date", label: "Fecha del evento", icon: RiCalendarLine, crmMapping: "eventDate" },
      { type: "event_venue", label: "Lugar del evento", icon: RiMapPinLine, crmMapping: "venue" },
      { type: "guest_count", label: "Nº de invitados", icon: RiGroupLine, crmMapping: "guestCount" },
      { type: "budget", label: "Presupuesto aprox.", icon: RiMoneyDollarCircleLine, crmMapping: "budget" },
      { type: "message", label: "Mensaje", icon: RiChatQuoteLine, crmMapping: "notes" },
    ],
  },
  {
    title: "Campos adicionales",
    description: "Campos personalizados",
    fields: [
      { type: "short_text", label: "Texto corto", icon: RiInputMethodLine, crmMapping: null },
      { type: "long_text", label: "Texto largo", icon: RiTextBlock, crmMapping: null },
      { type: "single_select", label: "Selección única", icon: RiListCheck2, crmMapping: null },
      { type: "multi_select", label: "Selección múltiple", icon: RiCheckboxLine, crmMapping: null },
      { type: "checkbox", label: "Casilla", icon: RiCheckboxLine, crmMapping: null },
      { type: "image_select", label: "Selector de imagen", icon: RiImageLine, crmMapping: null },
    ],
  },
  {
    title: "Diseño",
    description: "Elementos visuales",
    fields: [
      { type: "section_title", label: "Título de sección", icon: RiHeading, crmMapping: null },
      { type: "descriptive_text", label: "Texto descriptivo", icon: RiFileTextLine, crmMapping: null },
      { type: "separator", label: "Separador", icon: RiSeparator, crmMapping: null },
    ],
  },
];

interface FieldPaletteProps {
  onAddField: (type: string, label: string, crmMapping: string | null) => void;
}

export function FieldPalette({ onAddField }: FieldPaletteProps) {
  return (
    <div className="p-4 space-y-5">
      <h3 className="text-sm font-semibold text-foreground">Campos disponibles</h3>
      {PALETTE_SECTIONS.map((section) => (
        <div key={section.title} className="space-y-2">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {section.title}
            </p>
          </div>
          <div className="space-y-1">
            {section.fields.map((field) => (
              <button
                key={field.type}
                onClick={() => onAddField(field.type, field.label, field.crmMapping)}
                className="flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm text-left hover:bg-accent transition-colors group"
              >
                <field.icon className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                <span className="flex-1">{field.label}</span>
                <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100">+</span>
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
