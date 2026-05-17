/**
 * Shared number / currency formatters (es-ES locale).
 * Single source of truth — import from here instead of redefining per file.
 */

/** EUR sin decimales: "1.234 €"  */
export const fmtEur = (n: number | string | null | undefined, currency = "EUR"): string => {
  if (n == null || n === "") return "—";
  return new Intl.NumberFormat("es-ES", {
    style: "currency", currency, maximumFractionDigits: 0,
  }).format(Number(n));
};

/** EUR con 2 decimales: "1.234,56 €" */
export const fmtEurDecimals = (n: number | string | null | undefined, currency = "EUR"): string => {
  if (n == null || n === "") return "—";
  return new Intl.NumberFormat("es-ES", {
    style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: 2,
  }).format(Number(n));
};

/** Auto-decimales (los muestra solo si son necesarios): "1.234 €" / "1.234,50 €" */
export const fmtMoney = (n: number | string | null | undefined, currency = "EUR"): string => {
  if (n == null || n === "") return "—";
  return new Intl.NumberFormat("es-ES", { style: "currency", currency }).format(Number(n));
};

/** Compacto: "1,2k €" / "1,5M €" */
export const fmtMoneyShort = (n: number, currency = "EUR"): string => {
  const sym = currency === "EUR" ? "€" : currency;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(".", ",")}M ${sym}`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)}K ${sym}`;
  return fmtEur(n, currency);
};
