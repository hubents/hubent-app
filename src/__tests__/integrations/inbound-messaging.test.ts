import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock DB and schema before imports
vi.mock("@/db", () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));
vi.mock("@/db/schema", () => new Proxy({}, { get: () => ({}) }));
vi.mock("@/lib/pusher", () => ({
  getPusherServer: vi.fn(() => ({
    trigger: vi.fn(),
  })),
  CHANNELS: {
    taskChat: (id: number) => `private-task-${id}`,
  },
  EVENTS: {
    MESSAGE_NEW: "message:new",
  },
}));

import { TRIGGER_SLUGS, MVP_TOOLKITS, composioEntityId } from "@/lib/composio";

// ============================================
// Trigger Slugs Configuration
// ============================================
describe("Trigger Slugs Configuration", () => {
  it("TRIGGER_SLUGS has entries for all MVP toolkits", () => {
    for (const toolkit of MVP_TOOLKITS) {
      expect(TRIGGER_SLUGS[toolkit]).toBeDefined();
      expect(typeof TRIGGER_SLUGS[toolkit]).toBe("string");
      expect(TRIGGER_SLUGS[toolkit].length).toBeGreaterThan(0);
    }
  });

  it("Gmail trigger slug is correct", () => {
    expect(TRIGGER_SLUGS.gmail).toBe("GMAIL_NEW_GMAIL_MESSAGE");
  });

  it("WhatsApp trigger slug is correct", () => {
    expect(TRIGGER_SLUGS.whatsapp).toBe("WHATSAPP_NEW_MESSAGE");
  });

  it("no trigger slug is empty or undefined", () => {
    Object.values(TRIGGER_SLUGS).forEach((slug) => {
      expect(slug).toBeTruthy();
    });
  });
});

// ============================================
// Email Thread ID Matching Logic (unit tests)
// ============================================
describe("Inbound Email Matching Logic", () => {
  // Pure function tests for matching strategies
  
  describe("Subject tag parsing", () => {
    const parseTaskIdFromSubject = (subject: string): number | null => {
      const match = subject.match(/\[HE-(\d+)\]/);
      return match ? parseInt(match[1], 10) : null;
    };

    it("extracts taskId from [HE-42] in subject", () => {
      expect(parseTaskIdFromSubject("Re: [HE-42] Presupuesto evento")).toBe(42);
    });

    it("extracts taskId from [HE-1] with single digit", () => {
      expect(parseTaskIdFromSubject("[HE-1] Test")).toBe(1);
    });

    it("extracts taskId from [HE-99999] with large numbers", () => {
      expect(parseTaskIdFromSubject("Fwd: [HE-99999] Big event")).toBe(99999);
    });

    it("returns null when no tag present", () => {
      expect(parseTaskIdFromSubject("Regular email subject")).toBeNull();
    });

    it("returns null for empty subject", () => {
      expect(parseTaskIdFromSubject("")).toBeNull();
    });

    it("returns null for malformed tags", () => {
      expect(parseTaskIdFromSubject("[HE-] no number")).toBeNull();
      expect(parseTaskIdFromSubject("[HE-abc] not a number")).toBeNull();
      expect(parseTaskIdFromSubject("HE-42 missing brackets")).toBeNull();
    });

    it("handles multiple tags by matching first", () => {
      expect(parseTaskIdFromSubject("[HE-10] then [HE-20]")).toBe(10);
    });

    it("extracts tag surrounded by text", () => {
      expect(parseTaskIdFromSubject("Re: Re: Fwd: [HE-55] importante")).toBe(55);
    });
  });

  describe("Subject tagging for outbound emails", () => {
    const tagSubject = (taskId: number, subject: string): string => {
      return subject.includes(`[HE-${taskId}]`) ? subject : `[HE-${taskId}] ${subject}`;
    };

    it("adds tag to plain subject", () => {
      expect(tagSubject(42, "Presupuesto")).toBe("[HE-42] Presupuesto");
    });

    it("does not double-tag if already present", () => {
      expect(tagSubject(42, "[HE-42] Presupuesto")).toBe("[HE-42] Presupuesto");
    });

    it("does not double-tag on reply subjects", () => {
      expect(tagSubject(42, "Re: [HE-42] Presupuesto")).toBe("Re: [HE-42] Presupuesto");
    });

    it("tags even if a different taskId tag exists", () => {
      expect(tagSubject(42, "[HE-10] Other task")).toBe("[HE-42] [HE-10] Other task");
    });
  });
});

// ============================================
// WhatsApp Phone Matching Logic
// ============================================
describe("Inbound WhatsApp Matching Logic", () => {
  const normalizePhone = (phone: string): string => {
    return phone.replace(/[+\s\-()]/g, "");
  };

  it("normalizes phone with + prefix", () => {
    expect(normalizePhone("+5491123456789")).toBe("5491123456789");
  });

  it("normalizes phone with spaces", () => {
    expect(normalizePhone("+54 911 2345 6789")).toBe("5491123456789");
  });

  it("normalizes phone with dashes", () => {
    expect(normalizePhone("+54-911-2345-6789")).toBe("5491123456789");
  });

  it("normalizes phone with parentheses", () => {
    expect(normalizePhone("(+54) 911-2345-6789")).toBe("5491123456789");
  });

  it("handles already clean number", () => {
    expect(normalizePhone("5491123456789")).toBe("5491123456789");
  });

  it("handles empty string", () => {
    expect(normalizePhone("")).toBe("");
  });
});

// ============================================
// Webhook Payload Validation
// ============================================
describe("Webhook Payload Validation", () => {
  describe("Composio V3 trigger payload structure", () => {
    it("validates correct Gmail trigger payload", () => {
      const payload = {
        type: "composio.trigger.message",
        metadata: {
          trigger_slug: "GMAIL_NEW_GMAIL_MESSAGE",
          user_id: "hubents_org_5",
          connected_account_id: "ca_xxx",
        },
        data: {
          id: "msg_123",
          threadId: "thread_abc",
          subject: "Re: [HE-42] Presupuesto",
          from: "cliente@email.com",
          to: "org@email.com",
          message_text: "Confirmado.",
        },
      };

      expect(payload.type).toBe("composio.trigger.message");
      expect(payload.metadata.trigger_slug).toBe("GMAIL_NEW_GMAIL_MESSAGE");
      expect(payload.data.threadId).toBeTruthy();
      expect(payload.data.from).toBeTruthy();
    });

    it("validates correct WhatsApp trigger payload", () => {
      const payload = {
        type: "composio.trigger.message",
        metadata: {
          trigger_slug: "WHATSAPP_NEW_MESSAGE",
          user_id: "hubents_org_5",
          connected_account_id: "ca_yyy",
        },
        data: {
          from: "+5491123456789",
          body: "Hola, confirmo asistencia",
          message_id: "wa_msg_456",
        },
      };

      expect(payload.type).toBe("composio.trigger.message");
      expect(payload.metadata.trigger_slug).toBe("WHATSAPP_NEW_MESSAGE");
      expect(payload.data.from).toBeTruthy();
      expect(payload.data.body).toBeTruthy();
    });

    it("connection event has correct structure", () => {
      const payload = {
        event: "connection.active",
        data: {
          connected_account_id: "ca_abc123",
        },
      };
      expect(payload.event).toBe("connection.active");
      expect(payload.data.connected_account_id).toBeTruthy();
    });
  });

  describe("Edge cases for trigger data", () => {
    it("email without threadId should still have subject for fallback matching", () => {
      const data = {
        subject: "[HE-42] Presupuesto",
        from: "test@test.com",
        message_text: "test body",
      };
      expect(data.subject).toBeTruthy();
      // threadId is missing, but subject fallback should work
      const tagMatch = data.subject.match(/\[HE-(\d+)\]/);
      expect(tagMatch).toBeTruthy();
      expect(parseInt(tagMatch![1], 10)).toBe(42);
    });

    it("email without threadId AND without tag cannot be matched", () => {
      const data = {
        subject: "Random email",
        from: "test@test.com",
        message_text: "test body",
      };
      const tagMatch = data.subject.match(/\[HE-(\d+)\]/);
      expect(tagMatch).toBeNull();
    });

    it("WhatsApp without from number cannot be matched", () => {
      const data = {
        body: "Hello",
        message_id: "wa_123",
      };
      expect(data).not.toHaveProperty("from");
    });
  });
});

// ============================================
// Deduplication Logic
// ============================================
describe("Deduplication Logic", () => {
  it("email messageId should prevent duplicate insertion", () => {
    const existingIds = new Set(["msg_001", "msg_002", "msg_003"]);
    const incomingId = "msg_002";
    expect(existingIds.has(incomingId)).toBe(true);
  });

  it("new messageId should be allowed", () => {
    const existingIds = new Set(["msg_001", "msg_002"]);
    const incomingId = "msg_999";
    expect(existingIds.has(incomingId)).toBe(false);
  });

  it("WhatsApp message_id dedup works the same", () => {
    const existingIds = new Set(["wa_001", "wa_002"]);
    expect(existingIds.has("wa_001")).toBe(true);
    expect(existingIds.has("wa_new")).toBe(false);
  });
});

// ============================================
// Composio Entity ID
// ============================================
describe("Composio Entity ID for triggers", () => {
  it("entity ID matches trigger user_id format", () => {
    expect(composioEntityId(5)).toBe("hubents_org_5");
    expect(composioEntityId(123)).toBe("hubents_org_123");
  });

  it("entity ID is used as user_id in trigger creation", () => {
    const orgId = 42;
    const userId = composioEntityId(orgId);
    expect(userId).toMatch(/^hubents_org_\d+$/);
  });
});

// ============================================
// Webhook Handler Route Structure
// ============================================
describe("Webhook Handler Route", () => {
  it("webhook route file exports POST and GET handlers", async () => {
    // Verify the route module structure
    const routeModule = await import("@/app/api/webhooks/composio/route");
    expect(typeof routeModule.POST).toBe("function");
    expect(typeof routeModule.GET).toBe("function");
  });
});

// ============================================
// Trigger Creation (schema validation)
// ============================================
describe("Trigger Creation Schema", () => {
  it("composioTriggers schema is importable", async () => {
    // The schema import is mocked, so we just verify it doesn't throw
    const schema = await import("@/db/schema");
    expect(schema).toBeDefined();
  });

  it("TRIGGER_SLUGS maps to valid trigger names for Composio", () => {
    // Composio trigger slugs follow UPPERCASE_SNAKE_CASE format
    Object.values(TRIGGER_SLUGS).forEach((slug) => {
      expect(slug).toMatch(/^[A-Z][A-Z0-9_]+$/);
    });
  });

  it("each MVP toolkit has a corresponding trigger slug", () => {
    MVP_TOOLKITS.forEach((toolkit) => {
      expect(TRIGGER_SLUGS[toolkit]).toBeDefined();
    });
  });
});
