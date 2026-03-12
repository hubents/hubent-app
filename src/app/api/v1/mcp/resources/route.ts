import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/api-wrapper";
import { MCP_RESOURCES } from "@/lib/api/mcp-server";
import { WEBHOOK_EVENT_TYPES } from "@/lib/api/api-webhooks";
import { generateOpenApiSpec } from "@/lib/api/openapi-spec";
import { ALL_SCOPES } from "@/lib/api/api-auth";
import { validationError } from "@/lib/api/api-errors";

export const GET = withApiAuth(
  async (request: NextRequest) => {
    const { searchParams } = new URL(request.url);
    const uri = searchParams.get("uri");

    if (!uri) {
      throw validationError("Missing required 'uri' query parameter.", "uri");
    }

    const resource = MCP_RESOURCES.find((r) => r.uri === uri);
    if (!resource) {
      throw validationError(`Unknown resource URI: ${uri}. Available: ${MCP_RESOURCES.map((r) => r.uri).join(", ")}`, "uri");
    }

    let content: unknown;

    switch (uri) {
      case "hubents://openapi-spec":
        content = generateOpenApiSpec();
        break;
      case "hubents://webhook-events":
        content = {
          event_types: WEBHOOK_EVENT_TYPES,
          total: WEBHOOK_EVENT_TYPES.length,
        };
        break;
      case "hubents://api-scopes":
        content = {
          scopes: ALL_SCOPES,
          total: ALL_SCOPES.length,
        };
        break;
      default:
        throw validationError(`Resource '${uri}' is defined but has no content handler.`, "uri");
    }

    return {
      data: {
        object: "mcp_resource",
        uri: resource.uri,
        name: resource.name,
        mime_type: resource.mimeType,
        content,
      },
    };
  },
  { scope: "events:read", requiredFeature: "mcp_server" }
);
