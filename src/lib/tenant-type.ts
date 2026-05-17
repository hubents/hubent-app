/**
 * Tenant Type Helpers
 *
 * Utility functions to query tenant type configuration.
 * Use these instead of hardcoding orgType checks throughout the app.
 *
 * Example — BEFORE:
 *   if (org.orgType === "provider") { ... }
 *
 * Example — AFTER:
 *   if (isMarketplaceType(org.orgType)) { ... }
 *   const redirect = getPostLoginRedirect(org.orgType);
 */

import {
  TENANT_TYPES,
  DB_ORG_TYPE_TO_SLUG,
  type TenantTypeConfig,
} from "@/config/tenant-types";

/**
 * Get the full config for a tenant type by its slug ("planner", "provider").
 * Throws if the slug is unknown.
 */
export function getTenantTypeConfig(slug: string): TenantTypeConfig {
  const config = TENANT_TYPES[slug];
  if (!config) {
    throw new Error(`Unknown tenant type slug: "${slug}"`);
  }
  return config;
}

/**
 * Get the full config by the DB orgType value ("tenant", "provider").
 * Returns undefined for orgTypes that aren't tenant types (e.g. "client").
 */
export function getConfigByDbOrgType(
  dbOrgType: string
): TenantTypeConfig | undefined {
  const slug = DB_ORG_TYPE_TO_SLUG[dbOrgType];
  if (!slug) return undefined;
  return TENANT_TYPES[slug];
}

/**
 * Resolve a DB orgType to the tenant type slug.
 * "tenant" → "planner", "provider" → "provider"
 */
export function dbOrgTypeToSlug(dbOrgType: string): string | undefined {
  return DB_ORG_TYPE_TO_SLUG[dbOrgType];
}

/**
 * Whether this orgType is visible in Partners Hubents (public directory).
 * Use instead of: orgType === "provider"
 */
export function isMarketplaceType(dbOrgType: string): boolean {
  const config = getConfigByDbOrgType(dbOrgType);
  return config?.isMarketplaceVisible ?? false;
}

/**
 * Where to redirect after successful login for this orgType.
 */
export function getPostLoginRedirect(dbOrgType: string): string {
  const config = getConfigByDbOrgType(dbOrgType);
  return config?.postLoginRedirect ?? "/dashboard";
}

/**
 * Where to redirect after registration/onboarding completion.
 */
export function getPostRegisterRedirect(dbOrgType: string): string {
  const config = getConfigByDbOrgType(dbOrgType);
  return config?.postRegisterRedirect ?? "/onboarding?welcome=true";
}

/**
 * Sidebar section identifiers for this orgType.
 */
export function getSidebarSections(dbOrgType: string): string[] {
  const config = getConfigByDbOrgType(dbOrgType);
  return config?.sidebarSections ?? [];
}

/**
 * Onboarding step identifiers for this orgType.
 */
export function getOnboardingSteps(dbOrgType: string): string[] {
  const config = getConfigByDbOrgType(dbOrgType);
  return config?.onboardingSteps ?? [];
}

/**
 * Available role slugs for this orgType.
 */
export function getAvailableRoles(dbOrgType: string): string[] {
  const config = getConfigByDbOrgType(dbOrgType);
  return config?.availableRoles ?? [];
}

/**
 * The role slug assigned to the organization creator.
 */
export function getOwnerRoleSlug(dbOrgType: string): string {
  const config = getConfigByDbOrgType(dbOrgType);
  return config?.ownerRoleSlug ?? "owner";
}

/**
 * The default subscription plan slug for new orgs of this type.
 */
export function getDefaultPlanSlug(dbOrgType: string): string {
  const config = getConfigByDbOrgType(dbOrgType);
  return config?.defaultPlanSlug ?? "starter";
}

/**
 * Whether this orgType has a public-facing profile.
 */
export function hasPublicProfile(dbOrgType: string): boolean {
  const config = getConfigByDbOrgType(dbOrgType);
  return config?.hasPublicProfile ?? false;
}

/**
 * Whether this orgType has a portfolio feature.
 */
export function hasPortfolio(dbOrgType: string): boolean {
  const config = getConfigByDbOrgType(dbOrgType);
  return config?.hasPortfolio ?? false;
}

/**
 * Whether this orgType can create and own events.
 */
export function canCreateEvents(dbOrgType: string): boolean {
  const config = getConfigByDbOrgType(dbOrgType);
  return config?.canCreateEvents ?? false;
}

/**
 * Whether this orgType can be invited to participate in others' events.
 */
export function canBeInvitedToEvents(dbOrgType: string): boolean {
  const config = getConfigByDbOrgType(dbOrgType);
  return config?.canBeInvitedToEvents ?? false;
}

/**
 * Display label for this orgType (singular).
 */
export function getTenantTypeLabel(dbOrgType: string): string {
  const config = getConfigByDbOrgType(dbOrgType);
  return config?.label ?? dbOrgType;
}

/**
 * Display label for this orgType (plural).
 */
export function getTenantTypeLabelPlural(dbOrgType: string): string {
  const config = getConfigByDbOrgType(dbOrgType);
  return config?.labelPlural ?? dbOrgType;
}

/**
 * Whether this orgType can browse and search Partners.
 */
export function canBrowseMarketplace(dbOrgType: string): boolean {
  const config = getConfigByDbOrgType(dbOrgType);
  return config?.canBrowseMarketplace ?? false;
}

/**
 * Get all tenant type configs as an array.
 * Useful for rendering selectors (e.g. registration type picker).
 */
export function getAllTenantTypes(): TenantTypeConfig[] {
  return Object.values(TENANT_TYPES);
}

/**
 * Get all tenant type configs visible in Partners (public directory).
 * Currently only "provider", but extensible to venue, photographer, etc.
 */
export function getMarketplaceTypes(): TenantTypeConfig[] {
  return Object.values(TENANT_TYPES).filter((t) => t.isMarketplaceVisible);
}
