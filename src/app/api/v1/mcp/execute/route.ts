import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/api-wrapper";
import { MCP_TOOL_MAPPINGS, MCP_TOOLS } from "@/lib/api/mcp-server";
import { validationError } from "@/lib/api/api-errors";
import { z } from "zod";

const executeSchema = z.object({
  tool: z.string().min(1),
  params: z.record(z.unknown()).optional(),
});

export const POST = withApiAuth(
  async (request: NextRequest, { session }) => {
    const body = await request.json();
    const parsed = executeSchema.safeParse(body);
    if (!parsed.success) throw validationError(parsed.error.issues[0].message, parsed.error.issues[0].path.join("."));

    const { tool, params = {} } = parsed.data;

    // Validate tool exists
    const toolDef = MCP_TOOLS.find((t) => t.name === tool);
    if (!toolDef) {
      throw validationError(`Unknown tool: ${tool}. Use GET /api/v1/mcp to see available tools.`, "tool");
    }

    const mapping = MCP_TOOL_MAPPINGS[tool];
    if (!mapping) {
      throw validationError(`Tool '${tool}' has no API mapping configured.`, "tool");
    }

    // Build internal API call
    const path = typeof mapping.path === "function" ? mapping.path(params) : mapping.path;
    const url = new URL(path, request.nextUrl.origin);

    // Add query params
    if (mapping.queryParams) {
      for (const param of mapping.queryParams) {
        if (params[param] !== undefined && params[param] !== null) {
          url.searchParams.set(param, String(params[param]));
        }
      }
    }

    // Build body
    let fetchBody: string | undefined;
    if (mapping.bodyParams && (mapping.method === "POST" || mapping.method === "PATCH")) {
      const bodyObj: Record<string, unknown> = {};
      for (const param of mapping.bodyParams) {
        if (params[param] !== undefined) {
          bodyObj[param] = params[param];
        }
      }
      fetchBody = JSON.stringify(bodyObj);
    }

    // Proxy fetch to internal API with the same auth
    const authHeader = request.headers.get("authorization") || "";
    const response = await fetch(url.toString(), {
      method: mapping.method,
      headers: {
        "Authorization": authHeader,
        "Content-Type": "application/json",
        "X-HubEnts-Version": "2025-01-01",
      },
      body: fetchBody,
    });

    const result = await response.json().catch(() => null);

    return {
      status: response.status,
      data: {
        object: "mcp_result",
        tool,
        success: response.ok,
        result,
      },
    };
  },
  { scope: "events:read", requiredFeature: "mcp_server", idempotent: true }
);
