// ============================================
// API Versioning
// ============================================

export const CURRENT_API_VERSION = "2025-03-14";

export const SUPPORTED_VERSIONS = [
  "2025-03-14",
  "2025-01-01",
] as const;

export type ApiVersion = (typeof SUPPORTED_VERSIONS)[number];

export function resolveApiVersion(requestedVersion?: string | null): ApiVersion {
  if (!requestedVersion) return CURRENT_API_VERSION;
  if (SUPPORTED_VERSIONS.includes(requestedVersion as ApiVersion)) {
    return requestedVersion as ApiVersion;
  }
  return CURRENT_API_VERSION;
}

export function isVersionSupported(version: string): boolean {
  return SUPPORTED_VERSIONS.includes(version as ApiVersion);
}
