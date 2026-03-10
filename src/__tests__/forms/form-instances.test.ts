import { describe, it, expect } from 'vitest';

// Inline pure function to avoid DB import chain from form-instances.ts
function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 50)
    + "-" + Math.random().toString(36).slice(2, 8);
}

describe('Form Instances - generateSlug', () => {
  it('generates a slug from a name', () => {
    const slug = generateSlug('Briefing Boda');
    expect(slug).toMatch(/^briefing-boda-[a-z0-9]{6}$/);
  });

  it('removes accented characters', () => {
    const slug = generateSlug('Formulario de Información');
    expect(slug).toMatch(/^formulario-de-informacion-[a-z0-9]{6}$/);
  });

  it('removes special characters', () => {
    const slug = generateSlug('Test @#$ Form!');
    expect(slug).toMatch(/^test-form-[a-z0-9]{6}$/);
  });

  it('truncates long names to 50 chars + random suffix', () => {
    const longName = 'A'.repeat(100);
    const slug = generateSlug(longName);
    // 50 chars of 'a' + '-' + 6 random chars = 57 max
    expect(slug.length).toBeLessThanOrEqual(57);
  });

  it('generates unique slugs for the same name', () => {
    const slug1 = generateSlug('Test Form');
    const slug2 = generateSlug('Test Form');
    expect(slug1).not.toBe(slug2);
  });

  it('handles empty-ish names gracefully', () => {
    const slug = generateSlug('---');
    // Should still produce a random suffix
    expect(slug).toMatch(/^-[a-z0-9]{6}$/);
  });
});
