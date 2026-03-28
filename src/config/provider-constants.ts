/**
 * Provider Constants — Legacy → New Nomenclature Mapping
 *
 * This file provides named constants for the transition from "vendor" to "provider".
 * Use these constants throughout the codebase instead of raw strings.
 *
 * Once FASE 6 cleanup is complete and all "vendor" references are gone,
 * this file can be simplified to just the canonical values.
 */

// ─── Entity / Participant Types ───────────────────────────────────────────────

/** Canonical entity type for providers. Replaces "vendor" in EntityType unions. */
export const ENTITY_TYPE_PROVIDER = "provider" as const;

/** Canonical participant type for providers in events/tasks. Replaces "vendor" in participantTypeEnum. */
export const PARTICIPANT_TYPE_PROVIDER = "provider" as const;

/** Legacy participant type — use only for reading old data during migration. */
export const PARTICIPANT_TYPE_VENDOR_LEGACY = "vendor" as const;

// ─── Permission Slugs ─────────────────────────────────────────────────────────

/** Read/list providers in marketplace. Replaces "vendors:read". */
export const PERMISSION_PROVIDERS_READ = "providers:read" as const;

/** View provider details. Replaces "vendors:view". */
export const PERMISSION_PROVIDERS_VIEW = "providers:view" as const;

/** Manage (create/edit/delete) providers. New permission. */
export const PERMISSION_PROVIDERS_MANAGE = "providers:manage" as const;

/** Read own public profile. */
export const PERMISSION_PROVIDER_PROFILE_READ = "provider_profile:read" as const;

/** Update own public profile. */
export const PERMISSION_PROVIDER_PROFILE_UPDATE = "provider_profile:update" as const;

/** Read own portfolio. */
export const PERMISSION_PROVIDER_PORTFOLIO_READ = "provider_portfolio:read" as const;

/** Update own portfolio (add/edit/delete items). */
export const PERMISSION_PROVIDER_PORTFOLIO_UPDATE = "provider_portfolio:update" as const;

/** Read verification status. */
export const PERMISSION_PROVIDER_VERIFICATION_READ = "provider_verification:read" as const;

// ─── DB orgType Values ────────────────────────────────────────────────────────

/** DB orgType for planner organizations. */
export const ORG_TYPE_PLANNER = "tenant" as const;

/** DB orgType for provider organizations. */
export const ORG_TYPE_PROVIDER = "provider" as const;

/** DB orgType for client organizations (event attendees). */
export const ORG_TYPE_CLIENT = "client" as const;

// ─── Plan Slugs ───────────────────────────────────────────────────────────────

export const PLAN_PROVIDER_FREE = "provider-free" as const;
export const PLAN_PROVIDER_PRO = "provider-pro" as const;

// ─── Provider Categories ──────────────────────────────────────────────────────

export const PROVIDER_CATEGORIES = [
  "Catering",
  "Decoración",
  "Fotografía",
  "Video",
  "Música / DJ",
  "Entretenimiento",
  "Florería",
  "Venue / Salón",
  "Wedding Planner",
  "Iluminación",
  "Mobiliario",
  "Sonido",
  "Transporte",
  "Pastelería",
  "Invitaciones",
  "Maquillaje / Peinado",
  "Seguridad",
  "Limpieza",
  "Otro",
] as const;

export type ProviderCategory = (typeof PROVIDER_CATEGORIES)[number];

// ─── Planner Categories ──────────────────────────────────────────────────────

export const PLANNER_CATEGORIES = [
  "Wedding Planner",
  "Event Planner",
  "Organizador Corporativo",
  "Organizador Social",
  "Organizador Deportivo",
  "Productor de Eventos",
  "Coordinador de Bodas",
  "Agencia de Eventos",
  "Otro",
] as const;

export type PlannerCategory = (typeof PLANNER_CATEGORIES)[number];

/** Returns the correct category list based on orgType */
export function getCategoriesForOrgType(orgType: string | null | undefined): readonly string[] {
  return orgType === "provider" ? PROVIDER_CATEGORIES : PLANNER_CATEGORIES;
}

/** Returns display label for an orgType */
export function getOrgTypeLabel(orgType: string | null | undefined): string {
  if (orgType === "provider") return "Proveedor";
  if (orgType === "tenant") return "Planificador";
  return "Organización";
}

/** Returns badge color class for an orgType */
export function getOrgTypeBadgeVariant(orgType: string | null | undefined): "default" | "secondary" {
  return orgType === "provider" ? "default" : "secondary";
}

// ─── Price Ranges ─────────────────────────────────────────────────────────────

export const PRICE_RANGES = ["$", "$$", "$$$", "$$$$"] as const;
export type PriceRange = (typeof PRICE_RANGES)[number];

// ─── Verification Statuses ────────────────────────────────────────────────────

export const VERIFICATION_STATUSES = [
  "unverified",
  "pending",
  "verified",
  "rejected",
] as const;
export type VerificationStatus = (typeof VERIFICATION_STATUSES)[number];

// ─── Profile Completeness Weights ─────────────────────────────────────────────

/** Weights for calculating provider profile completeness percentage. */
export const PROFILE_COMPLETENESS_WEIGHTS: Record<string, number> = {
  logo: 15,
  description: 15,
  tagline: 10,
  providerCategory: 10,
  city: 10,
  coverImage: 10,
  instagramHandle: 5,
  phone: 5,
  websiteUrl: 5,
  services: 10,
  portfolio: 5, // at least 1 item
};

/**
 * Calculate profile completeness (0-100) for a provider organization.
 */
export function calculateProfileCompleteness(org: {
  logo?: string | null;
  description?: string | null;
  tagline?: string | null;
  providerCategory?: string | null;
  city?: string | null;
  coverImage?: string | null;
  instagramHandle?: string | null;
  phone?: string | null;
  websiteUrl?: string | null;
  services?: string[] | null;
  portfolioCount?: number;
}): number {
  let score = 0;
  if (org.logo) score += PROFILE_COMPLETENESS_WEIGHTS.logo;
  if (org.description) score += PROFILE_COMPLETENESS_WEIGHTS.description;
  if (org.tagline) score += PROFILE_COMPLETENESS_WEIGHTS.tagline;
  if (org.providerCategory) score += PROFILE_COMPLETENESS_WEIGHTS.providerCategory;
  if (org.city) score += PROFILE_COMPLETENESS_WEIGHTS.city;
  if (org.coverImage) score += PROFILE_COMPLETENESS_WEIGHTS.coverImage;
  if (org.instagramHandle) score += PROFILE_COMPLETENESS_WEIGHTS.instagramHandle;
  if (org.phone) score += PROFILE_COMPLETENESS_WEIGHTS.phone;
  if (org.websiteUrl) score += PROFILE_COMPLETENESS_WEIGHTS.websiteUrl;
  if (org.services && org.services.length > 0) score += PROFILE_COMPLETENESS_WEIGHTS.services;
  if (org.portfolioCount && org.portfolioCount > 0) score += PROFILE_COMPLETENESS_WEIGHTS.portfolio;
  return Math.min(score, 100);
}
