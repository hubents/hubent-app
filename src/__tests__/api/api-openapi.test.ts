import { describe, it, expect } from "vitest";
import { generateOpenApiSpec } from "@/lib/api/openapi-spec";
import {
  CURRENT_API_VERSION,
  SUPPORTED_VERSIONS,
  resolveApiVersion,
  isVersionSupported,
} from "@/lib/api/api-versioning";

describe("OpenAPI Spec", () => {
  const spec = generateOpenApiSpec();

  it("is a valid OpenAPI 3.1 document", () => {
    expect(spec.openapi).toBe("3.1.0");
    expect(spec.info).toBeDefined();
    expect(spec.info.title).toBe("HubEnts Public API");
    expect(spec.info.version).toBe("2025-03-14");
  });

  it("has servers defined", () => {
    expect(spec.servers).toHaveLength(2);
    expect(spec.servers[0].url).toContain("app.hubents.com");
    expect(spec.servers[1].url).toContain("localhost");
  });

  it("has Bearer auth security scheme", () => {
    expect(spec.components.securitySchemes.BearerAuth).toBeDefined();
    expect(spec.components.securitySchemes.BearerAuth.type).toBe("http");
    expect(spec.components.securitySchemes.BearerAuth.scheme).toBe("bearer");
  });

  it("has global security requirement", () => {
    expect(spec.security).toEqual([{ BearerAuth: [] }]);
  });

  it("has all resource schemas", () => {
    const schemas = Object.keys(spec.components.schemas);
    expect(schemas).toContain("Error");
    expect(schemas).toContain("PaginatedList");
    expect(schemas).toContain("Event");
    expect(schemas).toContain("Contact");
    expect(schemas).toContain("Task");
    expect(schemas).toContain("Lead");
    expect(schemas).toContain("FinancialDocument");
    expect(schemas).toContain("Guest");
    expect(schemas).toContain("Form");
    expect(schemas).toContain("Vendor");
  });

  it("has all expected paths", () => {
    const paths = Object.keys(spec.paths);
    expect(paths).toContain("/me");
    expect(paths).toContain("/events");
    expect(paths).toContain("/events/{id}");
    expect(paths).toContain("/events/{id}/guests");
    expect(paths).toContain("/contacts");
    expect(paths).toContain("/contacts/{id}");
    expect(paths).toContain("/tasks");
    expect(paths).toContain("/tasks/{id}");
    expect(paths).toContain("/crm/leads");
    expect(paths).toContain("/crm/leads/{id}");
    expect(paths).toContain("/crm/pipeline");
    expect(paths).toContain("/finance/documents");
    expect(paths).toContain("/finance/payments");
    expect(paths).toContain("/finance/dashboard");
    expect(paths).toContain("/forms");
    expect(paths).toContain("/forms/{id}");
    expect(paths).toContain("/vendors");
    expect(paths).toContain("/vendors/{id}");
    expect(paths).toContain("/templates");
  });

  it("has pagination parameters defined", () => {
    expect(spec.components.parameters.Limit).toBeDefined();
    expect(spec.components.parameters.StartingAfter).toBeDefined();
    expect(spec.components.parameters.IdempotencyKey).toBeDefined();
    expect(spec.components.parameters.ApiVersion).toBeDefined();
  });

  it("has tags for all resource groups", () => {
    const tagNames = spec.tags.map((t: { name: string }) => t.name);
    expect(tagNames).toContain("Organization");
    expect(tagNames).toContain("Events");
    expect(tagNames).toContain("Guests");
    expect(tagNames).toContain("Contacts");
    expect(tagNames).toContain("Tasks");
    expect(tagNames).toContain("CRM");
    expect(tagNames).toContain("Finance");
    expect(tagNames).toContain("Forms");
    expect(tagNames).toContain("Vendors");
    expect(tagNames).toContain("Templates");
  });

  it("all paths have operationIds", () => {
    for (const [path, methods] of Object.entries(spec.paths)) {
      for (const [method, operation] of Object.entries(methods as Record<string, { operationId?: string }>)) {
        expect(operation.operationId, `${method.toUpperCase()} ${path}`).toBeTruthy();
      }
    }
  });
});

describe("API Versioning", () => {
  it("has current version set", () => {
    expect(CURRENT_API_VERSION).toBe("2025-03-14");
  });

  it("has at least one supported version", () => {
    expect(SUPPORTED_VERSIONS.length).toBeGreaterThan(0);
    expect(SUPPORTED_VERSIONS).toContain("2025-01-01");
  });

  it("resolves null/undefined to current version", () => {
    expect(resolveApiVersion(null)).toBe(CURRENT_API_VERSION);
    expect(resolveApiVersion(undefined)).toBe(CURRENT_API_VERSION);
    expect(resolveApiVersion("")).toBe(CURRENT_API_VERSION);
  });

  it("resolves valid version", () => {
    expect(resolveApiVersion("2025-01-01")).toBe("2025-01-01");
    expect(resolveApiVersion("2025-03-14")).toBe("2025-03-14");
  });

  it("resolves unknown version to current", () => {
    expect(resolveApiVersion("2099-01-01")).toBe(CURRENT_API_VERSION);
  });

  it("checks version support", () => {
    expect(isVersionSupported("2025-01-01")).toBe(true);
    expect(isVersionSupported("2099-01-01")).toBe(false);
  });
});
