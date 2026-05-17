// ============================================
// OpenAPI 3.1 Specification for Hubents Public API
// ============================================

export function generateOpenApiSpec() {
  return {
    openapi: "3.1.0",
    info: {
      title: "Hubents Public API",
      version: "2026-03-14",
      description: "API pública de Hubents para gestión de eventos, contactos, finanzas, CRM, formularios y más. Compatible con CLI, MCP y AI integrations.",
      contact: {
        name: "Hubents Developer Support",
        email: "api@hubents.com",
        url: "https://developers.hubents.com",
      },
      license: {
        name: "Proprietary",
      },
    },
    servers: [
      {
        url: "https://app.hubents.com/api/v1",
        description: "Production",
      },
      {
        url: "http://localhost:3000/api/v1",
        description: "Local Development",
      },
    ],
    security: [{ BearerAuth: [] }],
    components: {
      securitySchemes: {
        BearerAuth: {
          type: "http",
          scheme: "bearer",
          description: "API Key authentication. Use your API key as Bearer token: `Authorization: Bearer hb_live_...`",
        },
      },
      schemas: {
        Error: {
          type: "object",
          properties: {
            error: {
              type: "object",
              properties: {
                type: { type: "string", enum: ["authentication_error", "authorization_error", "invalid_request_error", "rate_limit_error", "not_found_error", "conflict_error", "validation_error", "internal_error"] },
                code: { type: "string" },
                message: { type: "string" },
                param: { type: "string" },
                request_id: { type: "string" },
              },
              required: ["type", "code", "message", "request_id"],
            },
          },
        },
        PaginatedList: {
          type: "object",
          properties: {
            object: { type: "string", enum: ["list"] },
            data: { type: "array", items: {} },
            has_more: { type: "boolean" },
            total_count: { type: "integer" },
            url: { type: "string" },
          },
        },
        Event: {
          type: "object",
          properties: {
            object: { type: "string", enum: ["event"] },
            id: { type: "integer" },
            name: { type: "string" },
            description: { type: "string", nullable: true },
            type: { type: "string", enum: ["wedding", "pre_wedding", "post_wedding", "birthday", "corporate", "social", "other"] },
            status: { type: "string", enum: ["draft", "confirmed", "in_progress", "completed", "cancelled"] },
            date: { type: "string", format: "date-time", nullable: true },
            end_date: { type: "string", format: "date-time", nullable: true },
            location: { type: "string", nullable: true },
            budget: { type: "string", nullable: true },
            guest_count: { type: "integer", nullable: true },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
          },
        },
        Contact: {
          type: "object",
          properties: {
            object: { type: "string", enum: ["contact"] },
            id: { type: "integer" },
            name: { type: "string" },
            type: { type: "string", enum: ["person", "company"] },
            email: { type: "string", nullable: true },
            phone: { type: "string", nullable: true },
            is_vendor: { type: "boolean" },
            is_lead: { type: "boolean" },
            created_at: { type: "string", format: "date-time" },
          },
        },
        Task: {
          type: "object",
          properties: {
            object: { type: "string", enum: ["task"] },
            id: { type: "integer" },
            title: { type: "string" },
            description: { type: "string", nullable: true },
            status: { type: "string", enum: ["pending", "in_progress", "completed", "cancelled"] },
            priority: { type: "string" },
            due_date: { type: "string", format: "date-time", nullable: true },
            event_id: { type: "integer", nullable: true },
            assigned_to: { type: "string", nullable: true },
            created_at: { type: "string", format: "date-time" },
          },
        },
        Lead: {
          type: "object",
          properties: {
            object: { type: "string", enum: ["lead"] },
            id: { type: "integer" },
            title: { type: "string" },
            status: { type: "string", enum: ["new", "contacted", "qualified", "proposal", "negotiation", "won", "lost"] },
            value: { type: "string", nullable: true },
            contact_id: { type: "integer", nullable: true },
            stage_id: { type: "integer", nullable: true },
            created_at: { type: "string", format: "date-time" },
          },
        },
        FinancialDocument: {
          type: "object",
          properties: {
            object: { type: "string", enum: ["financial_document"] },
            id: { type: "integer" },
            type: { type: "string", enum: ["quote", "proforma", "invoice", "delivery_note", "credit_note"] },
            number: { type: "string" },
            status: { type: "string" },
            total: { type: "string", nullable: true },
            currency: { type: "string" },
            created_at: { type: "string", format: "date-time" },
          },
        },
        Guest: {
          type: "object",
          properties: {
            object: { type: "string", enum: ["guest"] },
            id: { type: "integer" },
            first_name: { type: "string" },
            last_name: { type: "string", nullable: true },
            email: { type: "string", nullable: true },
            phone: { type: "string", nullable: true },
            age_group: { type: "string" },
            plus_one: { type: "boolean" },
            created_at: { type: "string", format: "date-time" },
          },
        },
        Form: {
          type: "object",
          properties: {
            object: { type: "string", enum: ["form"] },
            id: { type: "integer" },
            name: { type: "string" },
            status: { type: "string" },
            created_at: { type: "string", format: "date-time" },
          },
        },
        Vendor: {
          type: "object",
          properties: {
            object: { type: "string", enum: ["vendor"] },
            id: { type: "integer" },
            name: { type: "string" },
            category: { type: "string", nullable: true },
            email: { type: "string", nullable: true },
            created_at: { type: "string", format: "date-time" },
          },
        },
        Webhook: {
          type: "object",
          properties: {
            object: { type: "string", enum: ["webhook"] },
            id: { type: "integer" },
            url: { type: "string", format: "uri" },
            events: { type: "array", items: { type: "string" } },
            is_active: { type: "boolean" },
            description: { type: "string", nullable: true },
            created_at: { type: "string", format: "date-time" },
            updated_at: { type: "string", format: "date-time" },
          },
        },
        ApiKey: {
          type: "object",
          properties: {
            object: { type: "string", enum: ["api_key"] },
            id: { type: "integer" },
            name: { type: "string" },
            key_prefix: { type: "string" },
            scopes: { type: "array", items: { type: "string" } },
            environment: { type: "string", enum: ["live", "test"] },
            rate_limit: { type: "integer", nullable: true },
            is_active: { type: "boolean" },
            expires_at: { type: "string", format: "date-time", nullable: true },
            last_used_at: { type: "string", format: "date-time", nullable: true },
            created_at: { type: "string", format: "date-time" },
          },
        },
        WebhookLog: {
          type: "object",
          properties: {
            id: { type: "integer" },
            event_type: { type: "string" },
            status: { type: "string", enum: ["delivered", "failed", "pending"] },
            response_code: { type: "integer" },
            attempt: { type: "integer" },
            created_at: { type: "string", format: "date-time" },
          },
        },
      },
      parameters: {
        Limit: { name: "limit", in: "query", schema: { type: "integer", minimum: 1, maximum: 100, default: 25 }, description: "Number of items to return (1-100)" },
        StartingAfter: { name: "starting_after", in: "query", schema: { type: "integer" }, description: "Cursor for pagination: return items after this ID" },
        IdempotencyKey: { name: "Idempotency-Key", in: "header", schema: { type: "string" }, description: "Unique key for idempotent requests (24h TTL)" },
        ApiVersion: { name: "X-Hubents-Version", in: "header", schema: { type: "string", default: "2025-01-01" }, description: "API version to use" },
      },
    },
    paths: {
      "/me": {
        get: { operationId: "getMe", summary: "Get current organization", tags: ["Organization"], responses: { "200": { description: "Organization details with plan and usage info" } } },
      },
      "/events": {
        get: { operationId: "listEvents", summary: "List events", tags: ["Events"], parameters: [{ $ref: "#/components/parameters/Limit" }, { $ref: "#/components/parameters/StartingAfter" }, { name: "status", in: "query", schema: { type: "string" } }, { name: "type", in: "query", schema: { type: "string" } }, { name: "search", in: "query", schema: { type: "string" } }], responses: { "200": { description: "Paginated list of events" } } },
        post: { operationId: "createEvent", summary: "Create an event", tags: ["Events"], requestBody: { content: { "application/json": { schema: { $ref: "#/components/schemas/Event" } } } }, responses: { "201": { description: "Event created" } } },
      },
      "/events/{id}": {
        get: { operationId: "getEvent", summary: "Get an event", tags: ["Events"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "Event details" } } },
        patch: { operationId: "updateEvent", summary: "Update an event", tags: ["Events"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "Event updated" } } },
        delete: { operationId: "deleteEvent", summary: "Cancel an event", tags: ["Events"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "Event cancelled" } } },
      },
      "/events/{id}/guests": {
        get: { operationId: "listGuests", summary: "List guests for an event", tags: ["Guests"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }, { $ref: "#/components/parameters/Limit" }], responses: { "200": { description: "Paginated list of guests" } } },
        post: { operationId: "createGuest", summary: "Add a guest to an event", tags: ["Guests"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "201": { description: "Guest created" } } },
      },
      "/events/{id}/guests/stats": {
        get: { operationId: "getGuestStats", summary: "Get guest statistics", tags: ["Guests"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "Guest stats including RSVP counts" } } },
      },
      "/events/{id}/schedule": {
        get: { operationId: "listScheduleItems", summary: "List event schedule", tags: ["Events"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "Schedule items" } } },
        post: { operationId: "createScheduleItem", summary: "Add schedule item", tags: ["Events"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "201": { description: "Schedule item created" } } },
      },
      "/contacts": {
        get: { operationId: "listContacts", summary: "List contacts", tags: ["Contacts"], parameters: [{ $ref: "#/components/parameters/Limit" }, { name: "type", in: "query", schema: { type: "string" } }, { name: "search", in: "query", schema: { type: "string" } }], responses: { "200": { description: "Paginated list of contacts" } } },
        post: { operationId: "createContact", summary: "Create a contact", tags: ["Contacts"], responses: { "201": { description: "Contact created" } } },
      },
      "/contacts/{id}": {
        get: { operationId: "getContact", summary: "Get a contact", tags: ["Contacts"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "Contact details" } } },
        patch: { operationId: "updateContact", summary: "Update a contact", tags: ["Contacts"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "Contact updated" } } },
        delete: { operationId: "deleteContact", summary: "Soft-delete a contact", tags: ["Contacts"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "Contact deleted" } } },
      },
      "/tasks": {
        get: { operationId: "listTasks", summary: "List tasks", tags: ["Tasks"], parameters: [{ $ref: "#/components/parameters/Limit" }, { name: "status", in: "query", schema: { type: "string" } }, { name: "event_id", in: "query", schema: { type: "integer" } }], responses: { "200": { description: "Paginated list of tasks" } } },
        post: { operationId: "createTask", summary: "Create a task", tags: ["Tasks"], responses: { "201": { description: "Task created" } } },
      },
      "/tasks/{id}": {
        get: { operationId: "getTask", summary: "Get a task", tags: ["Tasks"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "Task details" } } },
        patch: { operationId: "updateTask", summary: "Update a task", tags: ["Tasks"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "Task updated" } } },
        delete: { operationId: "deleteTask", summary: "Cancel a task", tags: ["Tasks"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "Task cancelled" } } },
      },
      "/crm/leads": {
        get: { operationId: "listLeads", summary: "List CRM leads", tags: ["CRM"], parameters: [{ $ref: "#/components/parameters/Limit" }, { name: "status", in: "query", schema: { type: "string" } }], responses: { "200": { description: "Paginated list of leads" } } },
        post: { operationId: "createLead", summary: "Create a lead", tags: ["CRM"], responses: { "201": { description: "Lead created" } } },
      },
      "/crm/leads/{id}": {
        get: { operationId: "getLead", summary: "Get a lead", tags: ["CRM"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "Lead details" } } },
        patch: { operationId: "updateLead", summary: "Update a lead", tags: ["CRM"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "Lead updated" } } },
        delete: { operationId: "deleteLead", summary: "Delete a lead", tags: ["CRM"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "Lead deleted" } } },
      },
      "/crm/leads/{id}/move": {
        post: { operationId: "moveLead", summary: "Move lead to a different stage", tags: ["CRM"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "Lead moved" } } },
      },
      "/crm/stages": {
        get: { operationId: "listStages", summary: "List CRM pipeline stages", tags: ["CRM"], responses: { "200": { description: "List of stages" } } },
      },
      "/crm/pipeline": {
        get: { operationId: "getPipeline", summary: "Get pipeline overview with lead counts", tags: ["CRM"], responses: { "200": { description: "Pipeline overview" } } },
      },
      "/finance/documents": {
        get: { operationId: "listDocuments", summary: "List financial documents", tags: ["Finance"], parameters: [{ $ref: "#/components/parameters/Limit" }, { name: "type", in: "query", schema: { type: "string" } }, { name: "status", in: "query", schema: { type: "string" } }], responses: { "200": { description: "Paginated list of documents" } } },
        post: { operationId: "createDocument", summary: "Create a financial document", tags: ["Finance"], responses: { "201": { description: "Document created" } } },
      },
      "/finance/documents/{id}": {
        get: { operationId: "getDocument", summary: "Get a financial document with items", tags: ["Finance"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "Document with line items" } } },
        patch: { operationId: "updateDocument", summary: "Update a financial document", tags: ["Finance"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "Document updated" } } },
      },
      "/finance/payments": {
        get: { operationId: "listPayments", summary: "List payments", tags: ["Finance"], responses: { "200": { description: "Paginated list of payments" } } },
        post: { operationId: "createPayment", summary: "Record a payment", tags: ["Finance"], responses: { "201": { description: "Payment created" } } },
      },
      "/finance/dashboard": {
        get: { operationId: "getFinanceDashboard", summary: "Get finance dashboard stats", tags: ["Finance"], responses: { "200": { description: "Finance overview" } } },
      },
      "/finance/bank-accounts": {
        get: { operationId: "listBankAccounts", summary: "List bank accounts", tags: ["Finance"], responses: { "200": { description: "List of bank accounts" } } },
      },
      "/finance/products": {
        get: { operationId: "listProducts", summary: "List product catalog", tags: ["Finance"], responses: { "200": { description: "Product catalog" } } },
      },
      "/forms": {
        get: { operationId: "listForms", summary: "List forms", description: "Returns all forms including CRM config fields (crm_create_contact, crm_create_lead).", tags: ["Forms"], parameters: [{ $ref: "#/components/parameters/Limit" }, { name: "status", in: "query", schema: { type: "string" } }], responses: { "200": { description: "Paginated list of forms" } } },
        post: { operationId: "createForm", summary: "Create a form", description: "Accepts optional crm_create_contact and crm_create_lead booleans (default true).", tags: ["Forms"], responses: { "201": { description: "Form created" } } },
      },
      "/forms/{id}": {
        get: { operationId: "getForm", summary: "Get a form", tags: ["Forms"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "Form details including CRM config" } } },
        patch: { operationId: "updateForm", summary: "Update a form", description: "Supports crm_create_contact and crm_create_lead boolean fields to control CRM behavior on submission.", tags: ["Forms"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "Form updated" } } },
      },
      "/forms/{id}/fields": {
        get: { operationId: "listFormFields", summary: "List form fields", tags: ["Forms"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "Form fields" } } },
        put: { operationId: "replaceFormFields", summary: "Replace all form fields", description: "Only allowed when form status is 'draft'. Returns 422 if form is active or paused.", tags: ["Forms"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "Fields replaced" }, "422": { description: "Form is not in draft status" } } },
      },
      "/forms/{id}/submissions": {
        get: { operationId: "listFormSubmissions", summary: "List form submissions", tags: ["Forms"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }, { $ref: "#/components/parameters/Limit" }], responses: { "200": { description: "Paginated submissions" } } },
      },
      "/vendors": {
        get: { operationId: "listVendors", summary: "List vendors", tags: ["Vendors"], parameters: [{ $ref: "#/components/parameters/Limit" }, { name: "category", in: "query", schema: { type: "string" } }], responses: { "200": { description: "Paginated list of vendors" } } },
        post: { operationId: "createVendor", summary: "Create a vendor", tags: ["Vendors"], responses: { "201": { description: "Vendor created" } } },
      },
      "/vendors/{id}": {
        get: { operationId: "getVendor", summary: "Get a vendor", tags: ["Vendors"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "Vendor details" } } },
        patch: { operationId: "updateVendor", summary: "Update a vendor", tags: ["Vendors"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "Vendor updated" } } },
        delete: { operationId: "deleteVendor", summary: "Delete a vendor", tags: ["Vendors"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "Vendor deleted" } } },
      },
      "/templates": {
        get: { operationId: "listTemplates", summary: "List event templates", tags: ["Templates"], responses: { "200": { description: "List of templates" } } },
      },
      "/webhooks": {
        get: { operationId: "listWebhooks", summary: "List webhooks", tags: ["Webhooks"], responses: { "200": { description: "List of webhooks with available event types" } } },
        post: { operationId: "createWebhook", summary: "Create a webhook", tags: ["Webhooks"], requestBody: { content: { "application/json": { schema: { type: "object", properties: { url: { type: "string", format: "uri" }, events: { type: "array", items: { type: "string" } }, description: { type: "string" } }, required: ["url", "events"] } } } }, responses: { "201": { description: "Webhook created with secret" } } },
      },
      "/webhooks/{id}": {
        get: { operationId: "getWebhook", summary: "Get webhook with delivery stats", tags: ["Webhooks"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "Webhook details with delivery stats and recent logs" } } },
        patch: { operationId: "updateWebhook", summary: "Update a webhook", tags: ["Webhooks"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "Webhook updated" } } },
        delete: { operationId: "deleteWebhook", summary: "Delete a webhook", tags: ["Webhooks"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "Webhook deleted" } } },
      },
      "/webhooks/{id}/rotate-secret": {
        post: { operationId: "rotateWebhookSecret", summary: "Rotate webhook signing secret", tags: ["Webhooks"], parameters: [{ name: "id", in: "path", required: true, schema: { type: "integer" } }], responses: { "200": { description: "New secret generated" } } },
      },
      "/api-keys": {
        get: { operationId: "listApiKeys", summary: "List API keys for current organization", tags: ["API Keys"], responses: { "200": { description: "List of API keys (without secrets)" } } },
      },
      "/health": {
        get: { operationId: "healthCheck", summary: "API health check", tags: ["System"], security: [], responses: { "200": { description: "API is healthy" } } },
      },
      "/mcp": {
        get: { operationId: "getMcpManifest", summary: "Get MCP server manifest", tags: ["MCP"], description: "Returns the Model Context Protocol server manifest with available tools and resources for AI assistant integration.", responses: { "200": { description: "MCP manifest" } } },
      },
      "/mcp/execute": {
        post: { operationId: "executeMcpTool", summary: "Execute an MCP tool", tags: ["MCP"], requestBody: { content: { "application/json": { schema: { type: "object", properties: { tool: { type: "string" }, params: { type: "object" } }, required: ["tool"] } } } }, responses: { "200": { description: "Tool execution result" } } },
      },
      "/mcp/resources": {
        get: { operationId: "getMcpResource", summary: "Get an MCP resource by URI", tags: ["MCP"], parameters: [{ name: "uri", in: "query", required: true, schema: { type: "string" }, description: "Resource URI (e.g. hubents://openapi-spec)" }], responses: { "200": { description: "Resource content" } } },
      },
    },
    tags: [
      { name: "Organization", description: "Current organization info" },
      { name: "Events", description: "Event management" },
      { name: "Guests", description: "Guest and RSVP management" },
      { name: "Contacts", description: "Contact management (persons, companies, vendors)" },
      { name: "Tasks", description: "Task and checklist management" },
      { name: "CRM", description: "Lead pipeline and CRM" },
      { name: "Finance", description: "Financial documents, payments, and reporting" },
      { name: "Forms", description: "Form builder, fields, and submissions" },
      { name: "Vendors", description: "Vendor management" },
      { name: "Templates", description: "Event templates" },
      { name: "Webhooks", description: "Webhook management and event delivery" },
      { name: "API Keys", description: "API key introspection" },
      { name: "MCP", description: "AI assistant integration via Model Context Protocol" },
      { name: "System", description: "Health checks and diagnostics" },
    ],
  };
}
