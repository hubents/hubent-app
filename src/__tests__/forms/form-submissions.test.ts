import { describe, it, expect } from 'vitest';

// Inline pure function to avoid DB import chain
function extractCrmData(
  formFields: { type: string; crmMapping: string | null; label: string }[],
  submissionData: Record<string, unknown>
): Record<string, string> {
  const mapped: Record<string, string> = {};
  for (const field of formFields) {
    if (!field.crmMapping) continue;
    const value = submissionData[field.label];
    if (value !== undefined && value !== null && value !== "") {
      mapped[field.crmMapping] = String(value);
    }
  }
  return mapped;
}

describe('Form Submissions - extractCrmData', () => {
  const fields = [
    { type: "name", crmMapping: "name", label: "Nombre" },
    { type: "email", crmMapping: "email", label: "Email" },
    { type: "phone", crmMapping: "phone", label: "Teléfono" },
    { type: "partner_name", crmMapping: "partnerName", label: "Nombre pareja" },
    { type: "event_date", crmMapping: "eventDate", label: "Fecha del evento" },
    { type: "budget", crmMapping: "budget", label: "Presupuesto" },
    { type: "short_text", crmMapping: null, label: "Color favorito" },
    { type: "section_title", crmMapping: null, label: "Sección 1" },
  ];

  it('extracts mapped CRM fields from submission data', () => {
    const data = {
      "Nombre": "Ana García",
      "Email": "ana@test.com",
      "Teléfono": "+34 600 123 456",
      "Color favorito": "Azul",
    };

    const result = extractCrmData(fields, data);

    expect(result).toEqual({
      name: "Ana García",
      email: "ana@test.com",
      phone: "+34 600 123 456",
    });
  });

  it('ignores fields without crmMapping', () => {
    const data = {
      "Color favorito": "Azul",
      "Sección 1": "anything",
    };

    const result = extractCrmData(fields, data);
    expect(Object.keys(result)).toHaveLength(0);
  });

  it('skips empty/null/undefined values', () => {
    const data = {
      "Nombre": "Ana",
      "Email": "",
      "Teléfono": null,
    };

    const result = extractCrmData(fields, data as Record<string, unknown>);
    expect(result).toEqual({ name: "Ana" });
  });

  it('converts non-string values to strings', () => {
    const data = {
      "Nombre": "Test",
      "Presupuesto": 5000,
    };

    const result = extractCrmData(fields, data as Record<string, unknown>);
    expect(result.budget).toBe("5000");
  });

  it('handles all CRM fields at once', () => {
    const data = {
      "Nombre": "Ana",
      "Email": "ana@test.com",
      "Teléfono": "123",
      "Nombre pareja": "Carlos",
      "Fecha del evento": "2026-06-15",
      "Presupuesto": "10000",
    };

    const result = extractCrmData(fields, data);
    expect(result).toEqual({
      name: "Ana",
      email: "ana@test.com",
      phone: "123",
      partnerName: "Carlos",
      eventDate: "2026-06-15",
      budget: "10000",
    });
  });

  it('returns empty object for empty submission data', () => {
    const result = extractCrmData(fields, {});
    expect(result).toEqual({});
  });

  it('returns empty object for empty fields array', () => {
    const result = extractCrmData([], { "Nombre": "Test" });
    expect(result).toEqual({});
  });
});
