import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/api-wrapper";
import { getMcpServerManifest } from "@/lib/api/mcp-server";

export const GET = withApiAuth(
  async () => {
    const manifest = getMcpServerManifest();
    return { data: manifest };
  },
  { scope: "events:read", requiredFeature: "mcp_server" }
);
