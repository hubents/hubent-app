import { NextRequest } from "next/server";
import { withApiAuth } from "@/lib/api/api-wrapper";
import { listApiKeys, getApiUsageStats } from "@/lib/api/api-keys";

export const GET = withApiAuth(
  async (_request: NextRequest, { session }) => {
    const keys = await listApiKeys(session.organizationId);
    const stats = await getApiUsageStats(session.organizationId);

    return {
      data: {
        object: "list",
        data: keys.map((k) => ({ object: "api_key", ...k })),
        stats,
        url: "/api/v1/api-keys",
      },
    };
  },
  { scope: "organization:read" }
);
