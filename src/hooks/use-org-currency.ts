"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Hook that fetches the org's default currency from finance settings.
 * Returns the currency code, a formatter function, and enabled currencies.
 *
 * Falls back to "EUR" if settings cannot be loaded (e.g. no permission).
 * Caches the fetch per mount — safe to call from multiple components.
 */
export function useOrgCurrency() {
  const [currency, setCurrency] = useState("EUR");
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
      return new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: cur,
      }).format(num);
    },
    [currency],
  );

  return { currency, enabledCurrencies, formatCurrency, loaded };
}
