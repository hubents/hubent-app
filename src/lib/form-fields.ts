import { db } from "@/db";
import { formFields, type FormField, type NewFormField } from "@/db/schema";
import { eq, and } from "drizzle-orm";

export const FIELD_TYPES = {
  // CRM fields (auto-map to contact/lead)
  name: { label: "Nombre", category: "crm", crmMapping: "name" },
  email: { label: "Email", category: "crm", crmMapping: "email" },
  phone: { label: "Teléfono", category: "crm", crmMapping: "phone" },
  partner_name: { label: "Nombre pareja", category: "crm", crmMapping: "partnerName" },
  partner_email: { label: "Email pareja", category: "crm", crmMapping: "partnerEmail" },
  event_date: { label: "Fecha del evento", category: "crm", crmMapping: "eventDate" },
  event_venue: { label: "Lugar del evento", category: "crm", crmMapping: "venue" },
  guest_count: { label: "Nº de invitados", category: "crm", crmMapping: "guestCount" },
  budget: { label: "Presupuesto aprox.", category: "crm", crmMapping: "budget" },
  message: { label: "Mensaje / comentario", category: "crm", crmMapping: "notes" },

  // Additional fields
  short_text: { label: "Texto libre", category: "extra", crmMapping: null },
  long_text: { label: "Bloque de texto", category: "extra", crmMapping: null },
  single_select: { label: "Selección única", category: "extra", crmMapping: null },
  multi_select: { label: "Selección múltiple", category: "extra", crmMapping: null },
  checkbox: { label: "Casilla", category: "extra", crmMapping: null },
  image_select: { label: "Selector de imagen", category: "extra", crmMapping: null },

  // Layout fields
  section_title: { label: "Título de sección", category: "layout", crmMapping: null },
  descriptive_text: { label: "Texto descriptivo", category: "layout", crmMapping: null },
  separator: { label: "Separador", category: "layout", crmMapping: null },
} as const;

export type FieldType = keyof typeof FIELD_TYPES;

export interface FieldInput {
  id?: number;
  type: string;
  label: string;
  placeholder?: string | null;
  required?: boolean;
  crmMapping?: string | null;
  options?: unknown;
  sortOrder: number;
  config?: unknown;
}

export async function getFormFields(formId: number): Promise<FormField[]> {
  return db
    .select()
    .from(formFields)
    .where(eq(formFields.formId, formId))
    .orderBy(formFields.sortOrder);
}

export async function saveFormFields(
  formId: number,
  fields: FieldInput[]
): Promise<FormField[]> {
  // Delete all existing fields and re-insert (simpler than individual upserts)
  await db.delete(formFields).where(eq(formFields.formId, formId));

  if (fields.length === 0) return [];

  const values = fields.map((f, idx) => ({
    formId,
    type: f.type,
    label: f.label,
    placeholder: f.placeholder || null,
    required: f.required ?? false,
    crmMapping: f.crmMapping || null,
    options: f.options ?? null,
    sortOrder: f.sortOrder ?? idx,
    config: f.config ?? {},
  }));

  const inserted = await db.insert(formFields).values(values).returning();
  return inserted;
}

export function getFieldCategory(type: string): "crm" | "extra" | "layout" | "unknown" {
  const fieldDef = FIELD_TYPES[type as FieldType];
  return fieldDef?.category ?? "unknown";
}

export function getCrmMapping(type: string): string | null {
  const fieldDef = FIELD_TYPES[type as FieldType];
  return fieldDef?.crmMapping ?? null;
}
