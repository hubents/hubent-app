// ============================================
// HubEnts MCP Server Definition
// ============================================
// Model Context Protocol server for AI assistant integration.
// Exposes HubEnts API tools for use by Claude, GPT, and other AI models.

import { CURRENT_API_VERSION } from "./api-versioning";

export interface McpTool {
  name: string;
  description: string;
  inputSchema: {
    type: "object";
    properties: Record<string, unknown>;
    required?: string[];
  };
}

export interface McpResource {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

// ============================================
// Tool Definitions
// ============================================

export const MCP_TOOLS: McpTool[] = [
  // Events
  {
    name: "hubents_list_events",
    description: "List events for the current organization. Supports filtering by status, type, and search term.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["draft", "confirmed", "in_progress", "completed", "cancelled"], description: "Filter by event status" },
        type: { type: "string", enum: ["wedding", "pre_wedding", "post_wedding", "birthday", "corporate", "social", "other"], description: "Filter by event type" },
        search: { type: "string", description: "Search events by name" },
        limit: { type: "number", description: "Number of results (1-100, default 25)" },
      },
    },
  },
  {
    name: "hubents_get_event",
    description: "Get detailed information about a specific event by ID.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number", description: "Event ID" },
      },
      required: ["id"],
    },
  },
  {
    name: "hubents_create_event",
    description: "Create a new event. Requires at minimum a name.",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Event name" },
        description: { type: "string", description: "Event description" },
        type: { type: "string", enum: ["wedding", "pre_wedding", "post_wedding", "birthday", "corporate", "social", "other"] },
        date: { type: "string", description: "Event date in ISO 8601 format" },
        location: { type: "string", description: "Event location/venue" },
        guest_count: { type: "number", description: "Expected guest count" },
      },
      required: ["name"],
    },
  },
  {
    name: "hubents_update_event",
    description: "Update an existing event.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number", description: "Event ID" },
        name: { type: "string" },
        description: { type: "string" },
        status: { type: "string", enum: ["draft", "confirmed", "in_progress", "completed", "cancelled"] },
        date: { type: "string" },
        location: { type: "string" },
      },
      required: ["id"],
    },
  },

  // Contacts
  {
    name: "hubents_list_contacts",
    description: "List contacts (persons, companies, vendors). Supports filtering by type and search.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["person", "company"], description: "Filter by contact type" },
        search: { type: "string", description: "Search by name" },
        is_vendor: { type: "boolean", description: "Filter vendors only" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "hubents_create_contact",
    description: "Create a new contact (person or company).",
    inputSchema: {
      type: "object",
      properties: {
        name: { type: "string", description: "Contact name" },
        type: { type: "string", enum: ["person", "company"] },
        email: { type: "string" },
        phone: { type: "string" },
        notes: { type: "string" },
      },
      required: ["name"],
    },
  },

  // Tasks
  {
    name: "hubents_list_tasks",
    description: "List tasks. Supports filtering by status, priority, event, and assignee.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["pending", "in_progress", "completed", "cancelled"] },
        priority: { type: "string" },
        event_id: { type: "number", description: "Filter by event ID" },
        search: { type: "string" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "hubents_create_task",
    description: "Create a new task.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string", description: "Task title" },
        description: { type: "string" },
        status: { type: "string", enum: ["pending", "in_progress", "completed", "cancelled"] },
        priority: { type: "string" },
        due_date: { type: "string", description: "Due date in ISO 8601" },
        event_id: { type: "number" },
      },
      required: ["title"],
    },
  },
  {
    name: "hubents_update_task",
    description: "Update an existing task.",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number", description: "Task ID" },
        title: { type: "string" },
        status: { type: "string", enum: ["pending", "in_progress", "completed", "cancelled"] },
        priority: { type: "string" },
        due_date: { type: "string" },
      },
      required: ["id"],
    },
  },

  // Guests
  {
    name: "hubents_list_guests",
    description: "List guests for a specific event.",
    inputSchema: {
      type: "object",
      properties: {
        event_id: { type: "number", description: "Event ID" },
        limit: { type: "number" },
      },
      required: ["event_id"],
    },
  },
  {
    name: "hubents_add_guest",
    description: "Add a guest to an event.",
    inputSchema: {
      type: "object",
      properties: {
        event_id: { type: "number", description: "Event ID" },
        first_name: { type: "string" },
        last_name: { type: "string" },
        email: { type: "string" },
        phone: { type: "string" },
        plus_one: { type: "boolean" },
      },
      required: ["event_id", "first_name"],
    },
  },
  {
    name: "hubents_get_guest_stats",
    description: "Get guest statistics for an event including RSVP counts and check-in status.",
    inputSchema: {
      type: "object",
      properties: {
        event_id: { type: "number", description: "Event ID" },
      },
      required: ["event_id"],
    },
  },

  // CRM
  {
    name: "hubents_list_leads",
    description: "List CRM leads. Supports filtering by status and stage.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"] },
        search: { type: "string" },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "hubents_create_lead",
    description: "Create a new CRM lead.",
    inputSchema: {
      type: "object",
      properties: {
        title: { type: "string" },
        status: { type: "string" },
        value: { type: "string", description: "Monetary value" },
        contact_id: { type: "number" },
        event_type: { type: "string" },
        notes: { type: "string" },
      },
      required: ["title"],
    },
  },
  {
    name: "hubents_get_pipeline",
    description: "Get CRM pipeline overview with lead counts per stage.",
    inputSchema: { type: "object", properties: {} },
  },

  // Finance
  {
    name: "hubents_list_documents",
    description: "List financial documents (quotes, invoices, etc). Supports filtering by type and status.",
    inputSchema: {
      type: "object",
      properties: {
        type: { type: "string", enum: ["quote", "proforma", "invoice", "delivery_note", "credit_note"] },
        status: { type: "string" },
        direction: { type: "string", enum: ["incoming", "outgoing"] },
        limit: { type: "number" },
      },
    },
  },
  {
    name: "hubents_get_finance_dashboard",
    description: "Get finance dashboard with totals by document type, payment summaries, and pending invoices.",
    inputSchema: { type: "object", properties: {} },
  },

  // Forms
  {
    name: "hubents_list_forms",
    description: "List forms with optional status filter.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["draft", "active", "paused"] },
        limit: { type: "number" },
      },
    },
  },

  // Organization
  {
    name: "hubents_get_me",
    description: "Get current organization info including plan, subscription status, and API usage.",
    inputSchema: { type: "object", properties: {} },
  },
];

// ============================================
// Resource Definitions
// ============================================

export const MCP_RESOURCES: McpResource[] = [
  {
    uri: "hubents://openapi-spec",
    name: "HubEnts OpenAPI Spec",
    description: "Complete OpenAPI 3.1 specification for the HubEnts Public API",
    mimeType: "application/json",
  },
  {
    uri: "hubents://webhook-events",
    name: "Webhook Event Types",
    description: "List of all supported webhook event types",
    mimeType: "application/json",
  },
  {
    uri: "hubents://api-scopes",
    name: "API Scopes",
    description: "List of all available API scopes and their descriptions",
    mimeType: "application/json",
  },
];

// ============================================
// Tool → API Endpoint Mapping
// ============================================

export interface McpToolMapping {
  method: "GET" | "POST" | "PATCH" | "DELETE";
  path: string | ((params: Record<string, unknown>) => string);
  bodyParams?: string[];
  queryParams?: string[];
}

export const MCP_TOOL_MAPPINGS: Record<string, McpToolMapping> = {
  hubents_list_events: { method: "GET", path: "/api/v1/events", queryParams: ["status", "type", "search", "limit"] },
  hubents_get_event: { method: "GET", path: (p) => `/api/v1/events/${p.id}` },
  hubents_create_event: { method: "POST", path: "/api/v1/events", bodyParams: ["name", "description", "type", "date", "location", "guest_count"] },
  hubents_update_event: { method: "PATCH", path: (p) => `/api/v1/events/${p.id}`, bodyParams: ["name", "description", "status", "date", "location"] },
  hubents_list_contacts: { method: "GET", path: "/api/v1/contacts", queryParams: ["type", "search", "is_vendor", "limit"] },
  hubents_create_contact: { method: "POST", path: "/api/v1/contacts", bodyParams: ["name", "type", "email", "phone", "notes"] },
  hubents_list_tasks: { method: "GET", path: "/api/v1/tasks", queryParams: ["status", "priority", "event_id", "search", "limit"] },
  hubents_create_task: { method: "POST", path: "/api/v1/tasks", bodyParams: ["title", "description", "status", "priority", "due_date", "event_id"] },
  hubents_update_task: { method: "PATCH", path: (p) => `/api/v1/tasks/${p.id}`, bodyParams: ["title", "status", "priority", "due_date"] },
  hubents_list_guests: { method: "GET", path: (p) => `/api/v1/events/${p.event_id}/guests`, queryParams: ["limit"] },
  hubents_add_guest: { method: "POST", path: (p) => `/api/v1/events/${p.event_id}/guests`, bodyParams: ["first_name", "last_name", "email", "phone", "plus_one"] },
  hubents_get_guest_stats: { method: "GET", path: (p) => `/api/v1/events/${p.event_id}/guests/stats` },
  hubents_list_leads: { method: "GET", path: "/api/v1/crm/leads", queryParams: ["status", "search", "limit"] },
  hubents_create_lead: { method: "POST", path: "/api/v1/crm/leads", bodyParams: ["title", "status", "value", "contact_id", "event_type", "notes"] },
  hubents_get_pipeline: { method: "GET", path: "/api/v1/crm/pipeline" },
  hubents_list_documents: { method: "GET", path: "/api/v1/finance/documents", queryParams: ["type", "status", "direction", "limit"] },
  hubents_get_finance_dashboard: { method: "GET", path: "/api/v1/finance/dashboard" },
  hubents_list_forms: { method: "GET", path: "/api/v1/forms", queryParams: ["status", "limit"] },
  hubents_get_me: { method: "GET", path: "/api/v1/me" },
};

// ============================================
// MCP Request Handler
// ============================================

export function buildMcpToolCall(
  toolName: string,
  params: Record<string, unknown>,
  baseUrl: string,
  apiKey: string
): { url: string; method: string; headers: Record<string, string>; body?: string } | null {
  const mapping = MCP_TOOL_MAPPINGS[toolName];
  if (!mapping) return null;

  const path = typeof mapping.path === "function" ? mapping.path(params) : mapping.path;
  const url = new URL(path, baseUrl);

  // Add query params
  if (mapping.queryParams) {
    for (const param of mapping.queryParams) {
      if (params[param] !== undefined && params[param] !== null) {
        url.searchParams.set(param, String(params[param]));
      }
    }
  }

  // Build body
  let body: string | undefined;
  if (mapping.bodyParams && (mapping.method === "POST" || mapping.method === "PATCH")) {
    const bodyObj: Record<string, unknown> = {};
    for (const param of mapping.bodyParams) {
      if (params[param] !== undefined) {
        bodyObj[param] = params[param];
      }
    }
    body = JSON.stringify(bodyObj);
  }

  return {
    url: url.toString(),
    method: mapping.method,
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-HubEnts-Version": CURRENT_API_VERSION,
    },
    body,
  };
}

// ============================================
// MCP Server Manifest
// ============================================

export function getMcpServerManifest() {
  return {
    name: "hubents",
    version: "1.0.0",
    description: "HubEnts event management platform - manage events, contacts, tasks, guests, CRM, finance, and forms.",
    tools: MCP_TOOLS,
    resources: MCP_RESOURCES,
  };
}
