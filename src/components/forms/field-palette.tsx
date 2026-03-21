"use client";

import { useState } from "react";
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
  RiAddLine,
  RiPenNibLine,
  RiIdCardLine,
  RiBuilding2Line,
  RiHashtag,
  RiMapPin2Line,
  RiGlobeLine,
  RiStore2Line,
  RiGlobalLine,
  RiPriceTag3Line,
  RiContactsBookLine,
  RiQuillPenLine,
  RiPaletteLine,
  RiArrowDownSLine,
} from "@remixicon/react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { type RemixiconComponentType } from "@remixicon/react";

export const PALETTE_SECTIONS: {
  title: string;
  description: string;
  icon: RemixiconComponentType;
  defaultOpen: boolean;
  fields: { type: string; label: string; icon: RemixiconComponentType; crmMapping: string | null }[];
}[] = [
  {
    title: "Datos CRM",
    description: "Se guardan automáticamente en el CRM. Ej: leads de landing pages",
    icon: RiContactsBookLine,
    defaultOpen: true,
    fields: [
      { type: "name", label: "Nombre", icon: RiUserLine, crmMapping: "name" },
      { type: "last_name", label: "Apellido", icon: RiUserLine, crmMapping: "lastName" },
      { type: "email", label: "Email", icon: RiMailLine, crmMapping: "email" },
      { type: "phone", label: "Teléfono", icon: RiPhoneLine, crmMapping: "phone" },
      { type: "nie_cif", label: "NIF / NIE", icon: RiIdCardLine, crmMapping: "nieOrCif" },
      { type: "address", label: "Dirección", icon: RiMapPinLine, crmMapping: "address" },
      { type: "city", label: "Población", icon: RiBuilding2Line, crmMapping: "city" },
      { type: "postal_code", label: "Código postal", icon: RiHashtag, crmMapping: "postalCode" },
      { type: "state", label: "Provincia", icon: RiMapPin2Line, crmMapping: "state" },
      { type: "country", label: "País", icon: RiGlobeLine, crmMapping: "country" },
      { type: "trade_name", label: "Nombre comercial", icon: RiStore2Line, crmMapping: "tradeName" },
      { type: "website", label: "Website", icon: RiGlobalLine, crmMapping: "website" },
      { type: "category", label: "Categoría", icon: RiPriceTag3Line, crmMapping: "category" },
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
    description: "Información extra para eventos y tareas. Ej: cuestionarios, contratos",
    icon: RiQuillPenLine,
    defaultOpen: false,
    fields: [
      { type: "short_text", label: "Texto corto", icon: RiInputMethodLine, crmMapping: null },
      { type: "long_text", label: "Texto largo", icon: RiTextBlock, crmMapping: null },
      { type: "single_select", label: "Selección única", icon: RiListCheck2, crmMapping: null },
      { type: "multi_select", label: "Selección múltiple", icon: RiCheckboxLine, crmMapping: null },
      { type: "checkbox", label: "Casilla", icon: RiCheckboxLine, crmMapping: null },
      { type: "image_select", label: "Selector de imagen", icon: RiImageLine, crmMapping: null },
      { type: "signature", label: "Firma digital", icon: RiPenNibLine, crmMapping: null },
    ],
  },
  {
    title: "Diseño",
    description: "Elementos visuales para organizar el formulario",
    icon: RiPaletteLine,
    defaultOpen: false,
    fields: [
      { type: "section_title", label: "Título de sección", icon: RiHeading, crmMapping: null },
      { type: "descriptive_text", label: "Texto descriptivo", icon: RiFileTextLine, crmMapping: null },
      { type: "separator", label: "Separador", icon: RiSeparator, crmMapping: null },
    ],
  },
];

interface FieldPaletteProps {
  onAddField: (type: string, label: string, crmMapping: string | null) => void;
  onAddAllCrm?: () => void;
}

export function FieldPalette({ onAddField, onAddAllCrm }: FieldPaletteProps) {
  const [openSections, setOpenSections] = useState<Record<string, boolean>>(
    Object.fromEntries(PALETTE_SECTIONS.map((s) => [s.title, s.defaultOpen]))
  );

  const toggleSection = (title: string) => {
    setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  return (
    <div className="p-4 space-y-1">
      <h3 className="text-sm font-semibold text-foreground mb-3">Campos disponibles</h3>
      {PALETTE_SECTIONS.map((section) => (
        <Collapsible
          key={section.title}
          open={openSections[section.title]}
          onOpenChange={() => toggleSection(section.title)}
        >
          <div className="rounded-lg">
            <CollapsibleTrigger className="flex items-center gap-2 w-full rounded-lg px-2 py-2 hover:bg-accent transition-colors text-left">
              <section.icon className="h-4 w-4 text-muted-foreground shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{section.title}</span>
                  <span className="text-[10px] text-muted-foreground bg-muted rounded-full px-1.5 py-0.5">
                    {section.fields.length}
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground leading-tight mt-0.5 line-clamp-1">
                  {section.description}
                </p>
              </div>
              <RiArrowDownSLine
                className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${
                  openSections[section.title] ? "rotate-180" : ""
                }`}
              />
            </CollapsibleTrigger>

            <CollapsibleContent>
              <div className="mt-1 space-y-0.5">
                {section.title === "Datos CRM" && onAddAllCrm && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onAddAllCrm(); }}
                    className="flex items-center gap-1 w-full rounded-md px-3 py-1.5 text-xs text-primary hover:bg-primary/5 transition-colors"
                  >
                    <RiAddLine className="h-3 w-3" />
                    Agregar todos los campos CRM
                  </button>
                )}
                {section.fields.map((field) => (
                  <button
                    key={field.type}
                    onClick={() => onAddField(field.type, field.label, field.crmMapping)}
                    className="flex items-center gap-2 w-full rounded-md px-3 py-1.5 text-sm text-left hover:bg-accent transition-colors group"
                  >
                    <field.icon className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground" />
                    <span className="flex-1">{field.label}</span>
                    <span className="text-xs text-muted-foreground opacity-0 group-hover:opacity-100">+</span>
                  </button>
                ))}
              </div>
            </CollapsibleContent>
          </div>
        </Collapsible>
      ))}
    </div>
  );
}
