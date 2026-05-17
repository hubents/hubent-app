"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Hook that fetches the org's default currency and region-aware Intl locale
 * from finance settings (which enriches the response with the org's timezone).
 *
 * The Intl locale (e.g. "es-ES", "en-GB", "pt-BR") is derived from the org's
 * configured timezone/region — NOT from the UI language — so that number
 * formatting matches regional conventions regardless of display language.
 *
 * Falls back to "EUR" / "es-ES" if settings cannot be loaded.
 */
export function useOrgCurrency() {
  const [currency, setCurrency] = useState("EUR");
  const [intlLocale, setIntlLocale] = useState("es-ES");
  const [enabledCurrencies, setEnabledCurrencies] = useState<string[]>([
    "EUR",
    "USD",
    "GBP",
  ]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/finance/settings")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (data?.data?.defaultCurrency) {
          setCurrency(data.data.defaultCurrency);
        }
        if (
          data?.data?.enabledCurrencies &&
          Array.isArray(data.data.enabledCurrencies)
        ) {
          setEnabledCurrencies(data.data.enabledCurrencies);
        }
        // orgIntlLocale is derived server-side from the org's timezone
        if (data?.data?.orgIntlLocale) {
          setIntlLocale(data.data.orgIntlLocale);
        }
        setLoaded(true);
      })
      .catch(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const formatCurrency = useCallback(
    (amount: number | string, overrideCurrency?: string) => {
      const cur = overrideCurrency || currency;
      const num =
        typeof amount === "string" ? parseFloat(amount || "0") : amount;
      return new Intl.NumberFormat(intlLocale, {
        style: "currency",
        currency: cur,
      }).format(num);
    },
    [currency, intlLocale],
  );

  return { currency, enabledCurrencies, formatCurrency, loaded };
}
