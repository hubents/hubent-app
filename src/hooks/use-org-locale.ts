"use client";

import { useState, useEffect } from "react";
import { TIMEZONE_DEFAULTS } from "@/lib/constants/locale";
import type { TimezoneDefaults } from "@/lib/constants/locale";

export interface OrgLocale extends TimezoneDefaults {
  timezone: string;
}

const DEFAULT_ORG_LOCALE: OrgLocale = {
  timezone: "UTC",
  currency: "EUR",
  intlLocale: "es-ES",
  language: "es",
  phonePrefix: "+34",
  countryCode: "ES",
  countryName: "España",
};

// Module-level cache — avoids re-fetching across component mounts in the same session
let _cache: OrgLocale | null = null;
const _listeners: Array<(v: OrgLocale) => void> = [];

function notifyListeners(v: OrgLocale) {
  _listeners.forEach(fn => fn(v));
}

function fetchAndCache() {
  fetch("/api/user/preferences")
    .then(r => (r.ok ? r.json() : null))
    .then(d => {
      if (!d?.success) return;
      const prefs = d.data?.locale;
      const tz: string = prefs?.timezone ?? "";
      const tzDef = TIMEZONE_DEFAULTS[tz];
      if (!tzDef) return;

      const result: OrgLocale = {
        timezone: tz,
        // Respect manually saved values for currency and language
        currency: prefs?.currency ?? tzDef.currency,
        language: prefs?.language ?? tzDef.language,
        // Always derive these from timezone/region (not from language override)
        intlLocale: tzDef.intlLocale,
        phonePrefix: tzDef.phonePrefix,
        countryCode: tzDef.countryCode,
        countryName: tzDef.countryName,
      };
      _cache = result;
      notifyListeners(result);
    })
    .catch(() => {});
}

/**
 * Returns all region-predictable values derived from the org's configured timezone.
 *
 * - `phonePrefix`  — default country phone code  (+54, +34, +1…)
 * - `countryCode`  — ISO 3166-1 alpha-2  (AR, ES, US…)
 * - `countryName`  — country name in Spanish
 * - `intlLocale`   — Intl.NumberFormat locale derived from region
 * - `currency`     — org currency (saved or derived from timezone)
 * - `language`     — org UI language (saved or derived from timezone)
 *
 * Use this hook anywhere a field needs a smart regional default.
 */
export function useOrgLocale(): OrgLocale {
  const [locale, setLocale] = useState<OrgLocale>(_cache ?? DEFAULT_ORG_LOCALE);

  useEffect(() => {
    _listeners.push(setLocale);
    if (_cache) {
      setLocale(_cache);
    } else {
      fetchAndCache();
    }
    return () => {
      const idx = _listeners.indexOf(setLocale);
      if (idx !== -1) _listeners.splice(idx, 1);
    };
  }, []);

  return locale;
}

/** Call this after saving new locale settings to bust the cache */
export function invalidateOrgLocaleCache() {
  _cache = null;
}
