import { describe, it, expect } from 'vitest';

// Inline pure function — mirrors createLeadFromSubmission title/description logic
interface CrmMappedData {
  name?: string;
  email?: string;
  phone?: string;
  partnerName?: string;
  partnerEmail?: string;
  eventDate?: string;
  venue?: string;
  guestCount?: string;
  budget?: string;
  notes?: string;
}

function buildLeadTitle(crmData: CrmMappedData): string {
  const parts: string[] = [];
  if (crmData.name) parts.push(crmData.name);
  if (crmData.email) parts.push(`(${crmData.email})`);
  return parts.join(" ") || "Lead desde formulario";
}

function buildLeadDescription(crmData: CrmMappedData): string | null {
  const description = [
    crmData.phone ? `Tel: ${crmData.phone}` : null,
    crmData.partnerName ? `Pareja: ${crmData.partnerName}` : null,
    crmData.eventDate ? `Fecha evento: ${crmData.eventDate}` : null,
    crmData.venue ? `Lugar: ${crmData.venue}` : null,
    crmData.guestCount ? `Invitados: ${crmData.guestCount}` : null,
    crmData.budget ? `Presupuesto: ${crmData.budget}` : null,
    crmData.notes ? `Notas: ${crmData.notes}` : null,
  ].filter(Boolean).join("\n");
  return description || null;
}

describe('Lead Title Generation', () => {
  it('uses name and email when both present', () => {
    expect(buildLeadTitle({ name: 'Ana García', email: 'ana@test.com' }))
      .toBe('Ana García (ana@test.com)');
  });

  it('uses only name when email absent', () => {
    expect(buildLeadTitle({ name: 'Ana García' })).toBe('Ana García');
  });

  it('uses only email when name absent', () => {
    expect(buildLeadTitle({ email: 'ana@test.com' })).toBe('(ana@test.com)');
  });

  it('falls back to default when both absent', () => {
    expect(buildLeadTitle({})).toBe('Lead desde formulario');
  });

  it('falls back to default for empty strings', () => {
    expect(buildLeadTitle({ name: '', email: '' })).toBe('Lead desde formulario');
  });
});

describe('Lead Description Generation', () => {
  it('includes all CRM fields when present', () => {
    const desc = buildLeadDescription({
      phone: '+34 600 123 456',
      partnerName: 'Carlos',
      eventDate: '2026-06-15',
      venue: 'Finca La Rosa',
      guestCount: '150',
      budget: '25000',
      notes: 'Quieren boda de tarde',
    });
    expect(desc).toContain('Tel: +34 600 123 456');
    expect(desc).toContain('Pareja: Carlos');
    expect(desc).toContain('Fecha evento: 2026-06-15');
    expect(desc).toContain('Lugar: Finca La Rosa');
    expect(desc).toContain('Invitados: 150');
    expect(desc).toContain('Presupuesto: 25000');
    expect(desc).toContain('Notas: Quieren boda de tarde');
  });

  it('returns null when no CRM data', () => {
    expect(buildLeadDescription({})).toBeNull();
  });

  it('skips absent fields', () => {
    const desc = buildLeadDescription({ phone: '123', budget: '5000' });
    expect(desc).toBe('Tel: 123\nPresupuesto: 5000');
    expect(desc).not.toContain('Pareja');
    expect(desc).not.toContain('Fecha');
  });

  it('handles single field', () => {
    expect(buildLeadDescription({ notes: 'Test note' })).toBe('Notas: Test note');
  });
});
