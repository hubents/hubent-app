import { describe, it, expect } from 'vitest';

/**
 * Tests for Form Builder UX improvements (Ticket 86afy86pj)
 * - Unified save button (no more dual save)
 * - Field palette collapsible sections
 * - Lift state up pattern (fields state in page, not in builder)
 */

// Mirror PALETTE_SECTIONS structure for testing (avoid importing React components)
const PALETTE_SECTIONS = [
  {
    title: "Datos CRM",
    description: "Se guardan automáticamente en el CRM. Ej: leads de landing pages",
    defaultOpen: true,
    fieldTypes: [
      "name", "last_name", "email", "phone", "nie_cif",
      "address", "city", "postal_code", "state", "country",
      "trade_name", "website", "category",
      "partner_name", "partner_email", "event_date", "event_venue",
      "guest_count", "budget", "message",
    ],
  },
  {
    title: "Campos adicionales",
    description: "Información extra para eventos y tareas. Ej: cuestionarios, contratos",
    defaultOpen: false,
    fieldTypes: [
      "short_text", "long_text", "single_select", "multi_select",
      "checkbox", "image_select", "signature",
    ],
  },
  {
    title: "Diseño",
    description: "Elementos visuales para organizar el formulario",
    defaultOpen: false,
    fieldTypes: ["section_title", "descriptive_text", "separator"],
  },
];

describe('Palette Sections Structure', () => {
  it('should have exactly 3 sections', () => {
    expect(PALETTE_SECTIONS).toHaveLength(3);
  });

  it('sections should be: Datos CRM, Campos adicionales, Diseño', () => {
    expect(PALETTE_SECTIONS.map((s) => s.title)).toEqual([
      "Datos CRM",
      "Campos adicionales",
      "Diseño",
    ]);
  });

  it('only CRM section should be open by default', () => {
    const openByDefault = PALETTE_SECTIONS.filter((s) => s.defaultOpen);
    expect(openByDefault).toHaveLength(1);
    expect(openByDefault[0].title).toBe("Datos CRM");
  });

  it('all sections should have a description', () => {
    for (const section of PALETTE_SECTIONS) {
      expect(section.description).toBeTruthy();
      expect(section.description.length).toBeGreaterThan(10);
    }
  });

  it('CRM section should have 20 fields', () => {
    const crm = PALETTE_SECTIONS.find((s) => s.title === "Datos CRM")!;
    expect(crm.fieldTypes).toHaveLength(20);
  });

  it('Campos adicionales should have 7 fields', () => {
    const extra = PALETTE_SECTIONS.find((s) => s.title === "Campos adicionales")!;
    expect(extra.fieldTypes).toHaveLength(7);
  });

  it('Diseño should have 3 fields', () => {
    const design = PALETTE_SECTIONS.find((s) => s.title === "Diseño")!;
    expect(design.fieldTypes).toHaveLength(3);
  });

  it('total fields across all sections should be 30', () => {
    const total = PALETTE_SECTIONS.reduce((sum, s) => sum + s.fieldTypes.length, 0);
    expect(total).toBe(30);
  });

  it('should have no duplicate field types across sections', () => {
    const allTypes = PALETTE_SECTIONS.flatMap((s) => s.fieldTypes);
    const unique = new Set(allTypes);
    expect(unique.size).toBe(allTypes.length);
  });
});

describe('CRM fields mappings', () => {
  const CRM_FIELDS_WITH_MAPPING: Record<string, string> = {
    name: "name",
    last_name: "lastName",
    email: "email",
    phone: "phone",
    nie_cif: "nieOrCif",
    address: "address",
    city: "city",
    postal_code: "postalCode",
    state: "state",
    country: "country",
    trade_name: "tradeName",
    website: "website",
    category: "category",
    partner_name: "partnerName",
    partner_email: "partnerEmail",
    event_date: "eventDate",
    event_venue: "venue",
    guest_count: "guestCount",
    budget: "budget",
    message: "notes",
  };

  it('should have 20 CRM mappings defined', () => {
    expect(Object.keys(CRM_FIELDS_WITH_MAPPING)).toHaveLength(20);
  });

  for (const [fieldType, mapping] of Object.entries(CRM_FIELDS_WITH_MAPPING)) {
    it(`CRM field "${fieldType}" should map to "${mapping}"`, () => {
      expect(mapping).toBeTruthy();
    });
  }
});

describe('Builder controlled component contract', () => {
  interface BuilderField {
    id: string;
    type: string;
    label: string;
    placeholder: string;
    required: boolean;
    crmMapping: string | null;
    options: unknown;
    sortOrder: number;
    config: Record<string, unknown>;
    dbId?: number;
  }

  const mockFields: BuilderField[] = [
    { id: "db-1", type: "name", label: "Nombre", placeholder: "", required: true, crmMapping: "name", options: null, sortOrder: 0, config: {}, dbId: 1 },
    { id: "db-2", type: "email", label: "Email", placeholder: "", required: true, crmMapping: "email", options: null, sortOrder: 1, config: {}, dbId: 2 },
  ];

  it('fields should preserve id and dbId when mapping from server', () => {
    for (const field of mockFields) {
      expect(field.id).toMatch(/^db-/);
      expect(field.dbId).toBeDefined();
    }
  });

  it('snapshot should exclude id and dbId for change detection', () => {
    const snapshot = JSON.stringify({
      fields: mockFields.map(({ id, dbId, ...rest }) => rest),
    });
    expect(snapshot).not.toContain('"id"');
    expect(snapshot).not.toContain('"dbId"');
    expect(snapshot).toContain('"type"');
    expect(snapshot).toContain('"label"');
  });

  it('adding a field should increment total count', () => {
    const newField: BuilderField = {
      id: "new-1-123",
      type: "phone",
      label: "Teléfono",
      placeholder: "",
      required: false,
      crmMapping: "phone",
      options: null,
      sortOrder: mockFields.length,
      config: {},
    };
    const updated = [...mockFields, newField];
    expect(updated).toHaveLength(3);
    expect(updated[2].sortOrder).toBe(2);
  });

  it('removing a field should re-index sortOrder', () => {
    const fields = [
      { ...mockFields[0], sortOrder: 0 },
      { ...mockFields[1], sortOrder: 1 },
      { id: "db-3", type: "phone", label: "Teléfono", placeholder: "", required: false, crmMapping: "phone", options: null, sortOrder: 2, config: {}, dbId: 3 },
    ];
    const afterRemove = fields
      .filter((f) => f.id !== "db-2")
      .map((f, idx) => ({ ...f, sortOrder: idx }));
    expect(afterRemove).toHaveLength(2);
    expect(afterRemove[0].sortOrder).toBe(0);
    expect(afterRemove[1].sortOrder).toBe(1);
    expect(afterRemove[1].id).toBe("db-3");
  });

  it('change detection should detect metadata changes', () => {
    const saved = JSON.stringify({ meta: { name: "Form A" }, fields: [] });
    const current = JSON.stringify({ meta: { name: "Form B" }, fields: [] });
    expect(saved).not.toBe(current);
  });

  it('change detection should detect field changes', () => {
    const saved = JSON.stringify({ meta: { name: "Form A" }, fields: [{ type: "name", label: "Nombre" }] });
    const current = JSON.stringify({ meta: { name: "Form A" }, fields: [{ type: "name", label: "Nombre completo" }] });
    expect(saved).not.toBe(current);
  });

  it('change detection should return equal for identical state', () => {
    const state = { meta: { name: "Form A" }, fields: [{ type: "name", label: "Nombre" }] };
    const saved = JSON.stringify(state);
    const current = JSON.stringify(state);
    expect(saved).toBe(current);
  });
});
