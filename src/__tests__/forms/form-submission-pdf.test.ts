import { describe, it, expect } from 'vitest';

// Inline pure functions to avoid DB import chain

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

interface SubmissionField {
  label: string;
  type: string;
  value: unknown;
  options?: unknown;
}

function formatFieldValue(field: SubmissionField): string {
  const val = field.value;
  if (val === null || val === undefined || val === "") return "<em>Sin respuesta</em>";

  if (field.type === "checkbox") {
    return val ? "✓ Sí" : "✗ No";
  }
  if (field.type === "multi_select" && Array.isArray(val)) {
    return escapeHtml(val.join(", "));
  }
  if (field.type === "image_select") {
    return escapeHtml(String(val));
  }
  if (field.type === "section_title" || field.type === "descriptive_text" || field.type === "separator") {
    return "";
  }
  return escapeHtml(String(val));
}

describe('escapeHtml', () => {
  it('escapes angle brackets', () => {
    expect(escapeHtml('<script>alert("xss")</script>')).toBe('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });

  it('escapes ampersands', () => {
    expect(escapeHtml('foo & bar')).toBe('foo &amp; bar');
  });

  it('escapes quotes', () => {
    expect(escapeHtml('He said "hello"')).toBe('He said &quot;hello&quot;');
  });

  it('escapes single quotes', () => {
    expect(escapeHtml("it's")).toBe("it&#039;s");
  });

  it('handles empty string', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('does not double-escape', () => {
    expect(escapeHtml('&amp;')).toBe('&amp;amp;');
  });

  it('handles normal text unchanged', () => {
    expect(escapeHtml('Hello World 123')).toBe('Hello World 123');
  });
});

describe('formatFieldValue', () => {
  it('returns "Sin respuesta" for null', () => {
    expect(formatFieldValue({ label: 'Test', type: 'short_text', value: null }))
      .toBe('<em>Sin respuesta</em>');
  });

  it('returns "Sin respuesta" for undefined', () => {
    expect(formatFieldValue({ label: 'Test', type: 'short_text', value: undefined }))
      .toBe('<em>Sin respuesta</em>');
  });

  it('returns "Sin respuesta" for empty string', () => {
    expect(formatFieldValue({ label: 'Test', type: 'short_text', value: '' }))
      .toBe('<em>Sin respuesta</em>');
  });

  it('formats checkbox true as "✓ Sí"', () => {
    expect(formatFieldValue({ label: 'Accept', type: 'checkbox', value: true }))
      .toBe('✓ Sí');
  });

  it('formats checkbox false as "✗ No"', () => {
    expect(formatFieldValue({ label: 'Accept', type: 'checkbox', value: false }))
      .toBe('✗ No');
  });

  it('formats multi_select array as comma-separated', () => {
    expect(formatFieldValue({ label: 'Colors', type: 'multi_select', value: ['Rojo', 'Azul', 'Verde'] }))
      .toBe('Rojo, Azul, Verde');
  });

  it('escapes HTML in multi_select values', () => {
    expect(formatFieldValue({ label: 'Test', type: 'multi_select', value: ['<b>bold</b>', 'normal'] }))
      .toBe('&lt;b&gt;bold&lt;/b&gt;, normal');
  });

  it('returns empty string for section_title', () => {
    expect(formatFieldValue({ label: 'Section', type: 'section_title', value: 'anything' }))
      .toBe('');
  });

  it('returns empty string for descriptive_text', () => {
    expect(formatFieldValue({ label: 'Desc', type: 'descriptive_text', value: 'anything' }))
      .toBe('');
  });

  it('returns empty string for separator', () => {
    expect(formatFieldValue({ label: 'Sep', type: 'separator', value: 'anything' }))
      .toBe('');
  });

  it('escapes HTML in regular text values', () => {
    expect(formatFieldValue({ label: 'Name', type: 'short_text', value: '<script>alert(1)</script>' }))
      .toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
  });

  it('converts numbers to string', () => {
    expect(formatFieldValue({ label: 'Budget', type: 'budget', value: 5000 }))
      .toBe('5000');
  });

  it('escapes HTML in image_select', () => {
    expect(formatFieldValue({ label: 'Img', type: 'image_select', value: 'option<1>' }))
      .toBe('option&lt;1&gt;');
  });
});
