import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Mirror Zod schemas from API routes to test validation logic

const createFormSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(200),
  description: z.string().max(1000).optional(),
});

const updateFormSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullable().optional(),
  logoUrl: z.string().nullable().optional(),
  coverImage: z.string().nullable().optional(),
  primaryColor: z.string().max(20).optional(),
  submitButtonText: z.string().max(100).optional(),
  thankYouTitle: z.string().max(200).optional(),
  thankYouMessage: z.string().max(1000).optional(),
  redirectUrl: z.string().nullable().optional(),
  defaultEventType: z.string().nullable().optional(),
  notifyOnResponse: z.boolean().optional(),
  notifyEmail: z.string().email().nullable().optional(),
  gdprEnabled: z.boolean().optional(),
  gdprText: z.string().max(500).optional(),
  gdprLink: z.string().nullable().optional(),
});

const statusSchema = z.object({
  status: z.enum(["draft", "active", "paused"]),
});

const fieldSchema = z.object({
  id: z.number().optional(),
  type: z.string().min(1),
  label: z.string().min(1).max(200),
  placeholder: z.string().max(200).nullable().optional(),
  required: z.boolean().optional(),
  crmMapping: z.string().nullable().optional(),
  options: z.unknown().optional(),
  sortOrder: z.number().int().min(0),
  config: z.unknown().optional(),
});

const saveFieldsSchema = z.object({
  fields: z.array(fieldSchema).max(50, "Máximo 50 campos por formulario"),
});

const createInstanceSchema = z.object({
  type: z.enum(["landing", "task"]).default("landing"),
  taskId: z.number().int().positive().optional(),
  eventId: z.number().int().positive().optional(),
});

describe('Create Form Schema', () => {
  it('accepts valid form with name only', () => {
    const result = createFormSchema.safeParse({ name: "Mi formulario" });
    expect(result.success).toBe(true);
  });

  it('accepts valid form with name and description', () => {
    const result = createFormSchema.safeParse({ name: "Test", description: "Desc" });
    expect(result.success).toBe(true);
  });

  it('rejects empty name', () => {
    const result = createFormSchema.safeParse({ name: "" });
    expect(result.success).toBe(false);
  });

  it('rejects missing name', () => {
    const result = createFormSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it('rejects name over 200 chars', () => {
    const result = createFormSchema.safeParse({ name: "A".repeat(201) });
    expect(result.success).toBe(false);
  });

  it('rejects description over 1000 chars', () => {
    const result = createFormSchema.safeParse({ name: "Test", description: "A".repeat(1001) });
    expect(result.success).toBe(false);
  });
});

describe('Update Form Schema', () => {
  it('accepts partial update with name only', () => {
    const result = updateFormSchema.safeParse({ name: "Updated" });
    expect(result.success).toBe(true);
  });

  it('accepts empty object (no changes)', () => {
    const result = updateFormSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it('accepts null description', () => {
    const result = updateFormSchema.safeParse({ description: null });
    expect(result.success).toBe(true);
  });

  it('accepts GDPR fields', () => {
    const result = updateFormSchema.safeParse({
      gdprEnabled: true,
      gdprText: "Acepto la política",
      gdprLink: "https://example.com/privacy",
    });
    expect(result.success).toBe(true);
  });

  it('rejects invalid email', () => {
    const result = updateFormSchema.safeParse({ notifyEmail: "not-an-email" });
    expect(result.success).toBe(false);
  });

  it('accepts null notifyEmail', () => {
    const result = updateFormSchema.safeParse({ notifyEmail: null });
    expect(result.success).toBe(true);
  });

  it('rejects gdprText over 500 chars', () => {
    const result = updateFormSchema.safeParse({ gdprText: "A".repeat(501) });
    expect(result.success).toBe(false);
  });

  it('accepts coverImage URL', () => {
    const result = updateFormSchema.safeParse({ coverImage: "https://cdn.example.com/cover.jpg" });
    expect(result.success).toBe(true);
  });

  it('accepts null coverImage (remove)', () => {
    const result = updateFormSchema.safeParse({ coverImage: null });
    expect(result.success).toBe(true);
  });

  it('accepts logoUrl', () => {
    const result = updateFormSchema.safeParse({ logoUrl: "https://cdn.example.com/logo.png" });
    expect(result.success).toBe(true);
  });

  it('accepts null logoUrl (remove)', () => {
    const result = updateFormSchema.safeParse({ logoUrl: null });
    expect(result.success).toBe(true);
  });

  it('accepts full design update with cover + logo + color', () => {
    const result = updateFormSchema.safeParse({
      coverImage: "https://cdn.example.com/cover.jpg",
      logoUrl: "https://cdn.example.com/logo.png",
      primaryColor: "#FF5733",
      submitButtonText: "Enviar ahora",
    });
    expect(result.success).toBe(true);
  });
});

describe('Status Schema', () => {
  it('accepts "draft"', () => {
    expect(statusSchema.safeParse({ status: "draft" }).success).toBe(true);
  });

  it('accepts "active"', () => {
    expect(statusSchema.safeParse({ status: "active" }).success).toBe(true);
  });

  it('accepts "paused"', () => {
    expect(statusSchema.safeParse({ status: "paused" }).success).toBe(true);
  });

  it('rejects invalid status', () => {
    expect(statusSchema.safeParse({ status: "deleted" }).success).toBe(false);
  });

  it('rejects empty status', () => {
    expect(statusSchema.safeParse({ status: "" }).success).toBe(false);
  });

  it('rejects missing status', () => {
    expect(statusSchema.safeParse({}).success).toBe(false);
  });
});

describe('Save Fields Schema — max 50 validation', () => {
  it('accepts 0 fields', () => {
    const result = saveFieldsSchema.safeParse({ fields: [] });
    expect(result.success).toBe(true);
  });

  it('accepts 50 fields', () => {
    const fields = Array.from({ length: 50 }, (_, i) => ({
      type: "short_text",
      label: `Field ${i}`,
      sortOrder: i,
    }));
    const result = saveFieldsSchema.safeParse({ fields });
    expect(result.success).toBe(true);
  });

  it('rejects 51 fields', () => {
    const fields = Array.from({ length: 51 }, (_, i) => ({
      type: "short_text",
      label: `Field ${i}`,
      sortOrder: i,
    }));
    const result = saveFieldsSchema.safeParse({ fields });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain("50");
    }
  });

  it('rejects field with empty type', () => {
    const result = saveFieldsSchema.safeParse({
      fields: [{ type: "", label: "Test", sortOrder: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects field with empty label', () => {
    const result = saveFieldsSchema.safeParse({
      fields: [{ type: "short_text", label: "", sortOrder: 0 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative sortOrder', () => {
    const result = saveFieldsSchema.safeParse({
      fields: [{ type: "short_text", label: "Test", sortOrder: -1 }],
    });
    expect(result.success).toBe(false);
  });

  it('rejects float sortOrder', () => {
    const result = saveFieldsSchema.safeParse({
      fields: [{ type: "short_text", label: "Test", sortOrder: 1.5 }],
    });
    expect(result.success).toBe(false);
  });
});

describe('Create Instance Schema', () => {
  it('defaults type to landing when not specified', () => {
    const result = createInstanceSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe("landing");
    }
  });

  it('accepts landing type', () => {
    const result = createInstanceSchema.safeParse({ type: "landing" });
    expect(result.success).toBe(true);
  });

  it('accepts task type with taskId', () => {
    const result = createInstanceSchema.safeParse({ type: "task", taskId: 123 });
    expect(result.success).toBe(true);
  });

  it('accepts eventId', () => {
    const result = createInstanceSchema.safeParse({ type: "landing", eventId: 5 });
    expect(result.success).toBe(true);
  });

  it('rejects invalid type', () => {
    const result = createInstanceSchema.safeParse({ type: "unknown" });
    expect(result.success).toBe(false);
  });

  it('rejects negative taskId', () => {
    const result = createInstanceSchema.safeParse({ type: "task", taskId: -1 });
    expect(result.success).toBe(false);
  });

  it('rejects zero taskId', () => {
    const result = createInstanceSchema.safeParse({ type: "task", taskId: 0 });
    expect(result.success).toBe(false);
  });
});
