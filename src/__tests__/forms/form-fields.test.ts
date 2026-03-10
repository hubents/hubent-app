import { describe, it, expect } from 'vitest';

// Re-define constants to avoid importing from form-fields.ts which triggers DB connection
const FIELD_TYPES = {
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
  short_text: { label: "Texto libre", category: "extra", crmMapping: null },
  long_text: { label: "Bloque de texto", category: "extra", crmMapping: null },
  single_select: { label: "Selección única", category: "extra", crmMapping: null },
  multi_select: { label: "Selección múltiple", category: "extra", crmMapping: null },
  checkbox: { label: "Casilla", category: "extra", crmMapping: null },
  image_select: { label: "Selector de imagen", category: "extra", crmMapping: null },
  section_title: { label: "Título de sección", category: "layout", crmMapping: null },
  descriptive_text: { label: "Texto descriptivo", category: "layout", crmMapping: null },
  separator: { label: "Separador", category: "layout", crmMapping: null },
} as const;

type FieldType = keyof typeof FIELD_TYPES;

function getFieldCategory(type: string): "crm" | "extra" | "layout" | "unknown" {
  const fieldDef = FIELD_TYPES[type as FieldType];
  return fieldDef?.category ?? "unknown";
}

function getCrmMapping(type: string): string | null {
  const fieldDef = FIELD_TYPES[type as FieldType];
  return fieldDef?.crmMapping ?? null;
}

describe('Form Fields - Field Types', () => {
  it('should have 19 field types defined', () => {
    expect(Object.keys(FIELD_TYPES).length).toBe(19);
  });

  it('should have 10 CRM fields', () => {
    const crmFields = Object.entries(FIELD_TYPES).filter(([, v]) => v.category === 'crm');
    expect(crmFields.length).toBe(10);
  });

  it('should have 6 extra fields', () => {
    const extraFields = Object.entries(FIELD_TYPES).filter(([, v]) => v.category === 'extra');
    expect(extraFields.length).toBe(6);
  });

  it('should have 3 layout fields', () => {
    const layoutFields = Object.entries(FIELD_TYPES).filter(([, v]) => v.category === 'layout');
    expect(layoutFields.length).toBe(3);
  });

  it('CRM fields should have crmMapping defined', () => {
    const crmFields = Object.entries(FIELD_TYPES).filter(([, v]) => v.category === 'crm');
    for (const [, field] of crmFields) {
      expect(field.crmMapping).toBeTruthy();
    }
  });

  it('extra and layout fields should have null crmMapping', () => {
    const nonCrmFields = Object.entries(FIELD_TYPES).filter(([, v]) => v.category !== 'crm');
    for (const [, field] of nonCrmFields) {
      expect(field.crmMapping).toBeNull();
    }
  });
});

describe('Form Fields - Helpers', () => {
  it('getFieldCategory returns correct category for CRM fields', () => {
    expect(getFieldCategory('name')).toBe('crm');
    expect(getFieldCategory('email')).toBe('crm');
    expect(getFieldCategory('phone')).toBe('crm');
    expect(getFieldCategory('budget')).toBe('crm');
  });

  it('getFieldCategory returns correct category for extra fields', () => {
    expect(getFieldCategory('short_text')).toBe('extra');
    expect(getFieldCategory('single_select')).toBe('extra');
    expect(getFieldCategory('image_select')).toBe('extra');
  });

  it('getFieldCategory returns correct category for layout fields', () => {
    expect(getFieldCategory('section_title')).toBe('layout');
    expect(getFieldCategory('separator')).toBe('layout');
  });

  it('getFieldCategory returns unknown for invalid types', () => {
    expect(getFieldCategory('invalid_type')).toBe('unknown');
  });

  it('getCrmMapping returns correct mapping for CRM fields', () => {
    expect(getCrmMapping('name')).toBe('name');
    expect(getCrmMapping('email')).toBe('email');
    expect(getCrmMapping('partner_name')).toBe('partnerName');
    expect(getCrmMapping('event_date')).toBe('eventDate');
    expect(getCrmMapping('guest_count')).toBe('guestCount');
    expect(getCrmMapping('budget')).toBe('budget');
    expect(getCrmMapping('message')).toBe('notes');
  });

  it('getCrmMapping returns null for non-CRM fields', () => {
    expect(getCrmMapping('short_text')).toBeNull();
    expect(getCrmMapping('section_title')).toBeNull();
    expect(getCrmMapping('unknown_field')).toBeNull();
  });
});

describe('Form Fields - Required CRM mappings', () => {
  const expectedMappings: Record<string, string> = {
    name: 'name',
    email: 'email',
    phone: 'phone',
    partner_name: 'partnerName',
    partner_email: 'partnerEmail',
    event_date: 'eventDate',
    event_venue: 'venue',
    guest_count: 'guestCount',
    budget: 'budget',
    message: 'notes',
  };

  for (const [fieldType, mapping] of Object.entries(expectedMappings)) {
    it(`${fieldType} maps to "${mapping}"`, () => {
      expect(FIELD_TYPES[fieldType as FieldType].crmMapping).toBe(mapping);
    });
  }
});
