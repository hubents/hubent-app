/**
 * Shared UI helper utilities.
 * Single source of truth — import from here instead of redefining per file.
 */

// ── Initials ──────────────────────────────────────────────────────────────────

/**
 * Returns up to 2 uppercase initials from a name.
 * Falls back to `fallback` (default "?") when name is empty.
 */
export function getInitials(
  name: string | null | undefined,
  fallback = "?",
): string {
  const n = (name ?? "").trim();
  if (!n) return fallback;
  return (
    n.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || fallback
  );
}

// ── Avatar color ──────────────────────────────────────────────────────────────

export const AV_COLORS = [
  "#5B8FE8",
  "#00B66D",
  "#E85D4E",
  "#F4B942",
  "#9B7EDB",
  "#3DB6A8",
  "#E89C6B",
  "#7FA890",
] as const;

/**
 * Returns a deterministic background color for an avatar
 * based on a string or numeric seed (e.g. user id or name).
 */
export function avColor(seed: string | number): string {
  let h = 0;
  const s = String(seed);
  for (const c of s) h = c.charCodeAt(0) + ((h << 5) - h);
  return AV_COLORS[Math.abs(h) % AV_COLORS.length];
}
