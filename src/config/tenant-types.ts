/**
 * Tenant Type Configuration
 *
 * Central config for all organization types in HubEnts.
 * Designed to be extensible: add new types (venue, photographer, etc.)
 * without changing application code — just add a new entry here.
 *
 * IMPORTANT: "vendor" is LEGACY nomenclature. Always use "provider".
 * The DB stores orgType as "tenant" (planners) and "provider" (providers).
 */

export interface TenantTypeConfig {
  /** Unique slug used in code and URLs (e.g. "planner", "provider") */
  slug: string;
  /** Value stored in organizations.orgType column */
  dbOrgType: string;
  /** Display label (singular) */
  label: string;
  /** Display label (plural) */
  labelPlural: string;
  /** Tailwind color class (without prefix) */
  color: string;
  /** Remix icon name */
  icon: string;

  // --- Routing ---
  /** Where to redirect after login */
  postLoginRedirect: string;
  /** Where to redirect after registration/onboarding */
  postRegisterRedirect: string;

  // --- Marketplace ---
  /** Whether this type appears in the HubEnts Marketplace */
  isMarketplaceVisible: boolean;
  /** Whether this type can browse and interact with the Marketplace */
  canBrowseMarketplace: boolean;

  // --- Billing ---
  /** Default plan slug assigned on registration */
  defaultPlanSlug: string;

  // --- Roles ---
  /** Role slug assigned to the org creator */
  ownerRoleSlug: string;
  /** All available roles for this type */
  availableRoles: string[];

  // --- Capabilities ---
  // DEPRECATED: These are now driven by plan feature flags (public_profile, portfolio).
  // Event creation is gated by requireLimit("events") which checks plan limits.
  // Kept here for backward compat during transition. All default to true.
  /** @deprecated Use plan feature flag "public_profile" */
  hasPublicProfile: boolean;
  /** @deprecated Use plan feature flag "portfolio" */
  hasPortfolio: boolean;
  /** @deprecated Event creation is gated by plan limits via requireLimit("events") */
  canCreateEvents: boolean;
  /** Can be invited to participate in others' events */
  canBeInvitedToEvents: boolean;

  // --- Onboarding ---
  /** Step identifiers shown during onboarding */
  onboardingSteps: string[];

  // --- Sidebar ---
  /** Section identifiers rendered in the main sidebar */
  sidebarSections: string[];
}

export const TENANT_TYPES: Record<string, TenantTypeConfig> = {
  planner: {
    slug: "planner",
    dbOrgType: "tenant",
    label: "Planificador",
    labelPlural: "Planificadores",
    color: "blue-500",
    icon: "RiCalendarEventLine",

    postLoginRedirect: "/dashboard",
    postRegisterRedirect: "/onboarding?welcome=true",

    isMarketplaceVisible: true,
    canBrowseMarketplace: true,

    defaultPlanSlug: "starter",
    ownerRoleSlug: "owner",
    availableRoles: ["owner", "admin", "manager", "accountant", "staff", "viewer", "client"],

    hasPublicProfile: true,
    hasPortfolio: false,
    canCreateEvents: true,
    canBeInvitedToEvents: true,

    onboardingSteps: ["profile", "company", "first-event", "team"],

    sidebarSections: [
      "dashboard",
      "marketplace",
      "public-profile",
      "contacts",
      "events",
      "crm",
      "finance",
      "productivity",
      "team",
      "ai",
    ],
  },

  provider: {
    slug: "provider",
    dbOrgType: "provider",
    label: "Proveedor",
    labelPlural: "Proveedores",
    color: "purple-500",
    icon: "RiStore2Line",

    postLoginRedirect: "/dashboard",
    postRegisterRedirect: "/onboarding?welcome=true",

    isMarketplaceVisible: true,
    canBrowseMarketplace: true,

    defaultPlanSlug: "provider-free",
    ownerRoleSlug: "owner",
    availableRoles: ["owner", "admin", "manager", "accountant", "staff", "viewer", "client"],

    hasPublicProfile: true,
    hasPortfolio: true,
    canCreateEvents: true,
    canBeInvitedToEvents: true,

    onboardingSteps: ["profile", "company-public-profile", "profile-preview", "team"],

    sidebarSections: [
      "dashboard",
      "marketplace",
      "public-profile",
      "contacts",
      "events",
      "crm",
      "finance",
      "productivity",
      "team",
      "ai",
    ],
  },
} as const;

/**
 * Map from DB orgType values to tenant type slugs.
 * "client" orgType is not a tenant type — it's used for client organizations only.
 */
export const DB_ORG_TYPE_TO_SLUG: Record<string, string> = {
  tenant: "planner",
  provider: "provider",
};
