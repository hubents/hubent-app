// ============================================
// API Feature Flags (Developer API only)
// ============================================
// Controls which DEVELOPER API features are available per plan.
//
// THIS IS INTENTIONALLY SEPARATE from the DB-based feature_flags table.
// - DB feature_flags + requireFeature() = product features (RSVP, guest lists, etc.)
// - This file + isFeatureAvailable() = developer/API features (webhooks, MCP, rate limits)
//
// If you add a new plan slug via admin, you MUST add it to PLAN_HIERARCHY below
// or the API will default to level 0 for that plan.

export interface ApiFeatureFlag {
  key: string;
  name: string;
  description: string;
  requiredPlan: "starter" | "standard" | "agency" | "provider-free" | "provider-pro";
}

export const API_FEATURE_FLAGS: ApiFeatureFlag[] = [
  {
    key: "api_access",
    name: "API Access",
    description: "Access to the public REST API",
    requiredPlan: "starter",
  },
  {
    key: "webhooks",
    name: "Webhooks",
    description: "Webhook event subscriptions and delivery",
    requiredPlan: "standard",
  },
  {
    key: "mcp_server",
    name: "MCP Server",
    description: "AI assistant integration via Model Context Protocol",
    requiredPlan: "standard",
  },
  {
    key: "custom_rate_limit",
    name: "Custom Rate Limits",
    description: "Configure custom rate limits per API key (above default 100/min)",
    requiredPlan: "agency",
  },
  {
    key: "multiple_api_keys",
    name: "Multiple API Keys",
    description: "Create more than 2 API keys",
    requiredPlan: "standard",
  },
  {
    key: "api_logs_export",
    name: "API Logs Export",
    description: "Export API request logs",
    requiredPlan: "agency",
  },
  {
    key: "provider_api",
    name: "Provider API",
    description: "Provider-specific API endpoints for vendor integrations",
    requiredPlan: "provider-pro",
  },
];

const PLAN_HIERARCHY: Record<string, number> = {
  "provider-free": 0,
  starter: 1,
  "provider-pro": 2,
  standard: 2,
  agency: 3,
};

export function isFeatureAvailable(planSlug: string, featureKey: string): boolean {
  const flag = API_FEATURE_FLAGS.find((f) => f.key === featureKey);
  if (!flag) return false;

  const currentLevel = PLAN_HIERARCHY[planSlug] ?? 0;
  const requiredLevel = PLAN_HIERARCHY[flag.requiredPlan] ?? 0;

  return currentLevel >= requiredLevel;
}

export function getAvailableFeatures(planSlug: string): string[] {
  return API_FEATURE_FLAGS
    .filter((f) => isFeatureAvailable(planSlug, f.key))
    .map((f) => f.key);
}

export function getApiKeyLimit(planSlug: string): number {
  switch (planSlug) {
    case "agency": return 20;
    case "standard": return 5;
    case "provider-pro": return 5;
    case "starter": return 2;
    case "provider-free": return 1;
    default: return 2;
  }
}

export function getDefaultRateLimit(planSlug: string): number {
  switch (planSlug) {
    case "agency": return 500;
    case "standard": return 200;
    case "provider-pro": return 200;
    case "starter": return 100;
    case "provider-free": return 50;
    default: return 100;
  }
}
