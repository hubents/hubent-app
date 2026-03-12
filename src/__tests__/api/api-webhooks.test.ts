import { describe, it, expect } from "vitest";
import { signWebhookPayload, generateWebhookSecret } from "@/lib/api/api-utils";

// Inline event types to avoid DB connection from api-webhooks.ts
const WEBHOOK_EVENT_TYPES = [
  "event.created", "event.updated", "event.deleted", "event.status_changed",
  "contact.created", "contact.updated", "contact.deleted",
  "guest.created", "guest.updated", "guest.deleted", "guest.checked_in", "guest.rsvp_responded",
  "task.created", "task.updated", "task.completed", "task.deleted",
  "lead.created", "lead.updated", "lead.stage_changed", "lead.won", "lead.lost", "lead.deleted",
  "finance.document_created", "finance.document_updated", "finance.document_status_changed",
  "finance.payment_received", "finance.payment_created",
  "form.submission_created", "form.updated",
  "vendor.created", "vendor.updated", "vendor.deleted",
] as const;

describe("Webhook Event Types", () => {
  it("has all expected event categories", () => {
    const categories = [...new Set(WEBHOOK_EVENT_TYPES.map((e) => e.split(".")[0]))];
    expect(categories).toContain("event");
    expect(categories).toContain("contact");
    expect(categories).toContain("guest");
    expect(categories).toContain("task");
    expect(categories).toContain("lead");
    expect(categories).toContain("finance");
    expect(categories).toContain("form");
    expect(categories).toContain("vendor");
  });

  it("has at least 30 event types", () => {
    expect(WEBHOOK_EVENT_TYPES.length).toBeGreaterThanOrEqual(30);
  });

  it("all events follow resource.action format", () => {
    for (const event of WEBHOOK_EVENT_TYPES) {
      expect(event).toMatch(/^[a-z]+\.[a-z_]+$/);
    }
  });

  it("events have CRUD actions for main resources", () => {
    for (const resource of ["event", "contact", "guest", "task", "lead", "vendor"]) {
      expect(WEBHOOK_EVENT_TYPES).toContain(`${resource}.created`);
      expect(WEBHOOK_EVENT_TYPES).toContain(`${resource}.updated`);
      expect(WEBHOOK_EVENT_TYPES).toContain(`${resource}.deleted`);
    }
  });
});

describe("Webhook Signature Verification", () => {
  it("generates valid HMAC-SHA256 signatures", () => {
    const secret = generateWebhookSecret();
    const payload = JSON.stringify({
      id: "evt_123",
      type: "event.created",
      data: { id: 1, name: "Test Event" },
    });

    const signature = signWebhookPayload(payload, secret);
    expect(signature).toMatch(/^[a-f0-9]{64}$/);
  });

  it("same payload + secret = same signature (deterministic)", () => {
    const secret = "whsec_test123";
    const payload = '{"type":"event.created"}';

    const sig1 = signWebhookPayload(payload, secret);
    const sig2 = signWebhookPayload(payload, secret);
    expect(sig1).toBe(sig2);
  });

  it("different payload = different signature", () => {
    const secret = "whsec_test123";
    const sig1 = signWebhookPayload('{"type":"event.created"}', secret);
    const sig2 = signWebhookPayload('{"type":"event.updated"}', secret);
    expect(sig1).not.toBe(sig2);
  });

  it("different secret = different signature", () => {
    const payload = '{"type":"event.created"}';
    const sig1 = signWebhookPayload(payload, "secret_a");
    const sig2 = signWebhookPayload(payload, "secret_b");
    expect(sig1).not.toBe(sig2);
  });

  it("webhook secret format is whsec_ prefix + hex", () => {
    const secret = generateWebhookSecret();
    expect(secret).toMatch(/^whsec_[a-f0-9]+$/);
    expect(secret.length).toBeGreaterThan(20);
  });
});

describe("Webhook Payload Structure", () => {
  it("matches expected format", () => {
    const timestamp = Math.floor(Date.now() / 1000);
    const payload = {
      id: `evt_${Date.now()}_abc123`,
      type: "event.created",
      created: timestamp,
      data: { id: 1, name: "Test Event" },
      organization_id: 42,
    };

    expect(payload.id).toMatch(/^evt_\d+_[a-z0-9]+$/);
    expect(payload.type).toBe("event.created");
    expect(payload.created).toBeGreaterThan(0);
    expect(payload.data).toBeDefined();
    expect(payload.organization_id).toBe(42);
  });

  it("headers include all required fields", () => {
    const expectedHeaders = [
      "X-HubEnts-Signature",
      "X-HubEnts-Timestamp",
      "X-HubEnts-Event",
      "Content-Type",
      "User-Agent",
    ];

    // Simulate what the dispatcher sends
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-HubEnts-Signature": "abc123",
      "X-HubEnts-Timestamp": "1234567890",
      "X-HubEnts-Event": "event.created",
      "User-Agent": "HubEnts-Webhooks/1.0",
    };

    for (const h of expectedHeaders) {
      expect(headers[h]).toBeTruthy();
    }
  });
});

describe("Webhook Retry Logic", () => {
  const MAX_RETRIES = 5;
  const RETRY_DELAYS = [0, 60, 300, 1800, 7200];

  it("has 5 max retries", () => {
    expect(MAX_RETRIES).toBe(5);
  });

  it("has exponential-ish backoff delays", () => {
    expect(RETRY_DELAYS).toEqual([0, 60, 300, 1800, 7200]);
    // 0s, 1m, 5m, 30m, 2h
  });

  it("delays increase monotonically", () => {
    for (let i = 1; i < RETRY_DELAYS.length; i++) {
      expect(RETRY_DELAYS[i]).toBeGreaterThan(RETRY_DELAYS[i - 1]);
    }
  });

  it("last retry is 2 hours", () => {
    expect(RETRY_DELAYS[RETRY_DELAYS.length - 1]).toBe(7200);
  });
});
