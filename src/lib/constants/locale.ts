// Shared locale constants for timezone, currency, language, and date format selectors.
// Used across tenant settings, vendor settings, and admin pages.

export const TIMEZONES = [
  { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires", offset: "GMT-3" },
  { value: "America/Sao_Paulo", label: "São Paulo", offset: "GMT-3" },
  { value: "America/Santiago", label: "Santiago", offset: "GMT-4" },
  { value: "America/Lima", label: "Lima", offset: "GMT-5" },
  { value: "America/Bogota", label: "Bogotá", offset: "GMT-5" },
  { value: "America/Mexico_City", label: "Ciudad de México", offset: "GMT-6" },
  { value: "America/New_York", label: "Nueva York", offset: "GMT-5" },
  { value: "America/Chicago", label: "Chicago", offset: "GMT-6" },
  { value: "America/Denver", label: "Denver", offset: "GMT-7" },
  { value: "America/Los_Angeles", label: "Los Ángeles", offset: "GMT-8" },
  { value: "Europe/London", label: "Londres", offset: "GMT+0" },
  { value: "Europe/Madrid", label: "Madrid", offset: "GMT+1" },
  { value: "Europe/Paris", label: "París", offset: "GMT+1" },
  { value: "Europe/Berlin", label: "Berlín", offset: "GMT+1" },
  { value: "Europe/Rome", label: "Roma", offset: "GMT+1" },
  { value: "Europe/Lisbon", label: "Lisboa", offset: "GMT+0" },
  { value: "UTC", label: "UTC", offset: "GMT+0" },
] as const;

export const CURRENCIES = [
  { value: "EUR", label: "EUR", name: "Euro" },
  { value: "USD", label: "USD", name: "Dólar estadounidense" },
  { value: "ARS", label: "ARS", name: "Peso argentino" },
  { value: "MXN", label: "MXN", name: "Peso mexicano" },
  { value: "COP", label: "COP", name: "Peso colombiano" },
  { value: "CLP", label: "CLP", name: "Peso chileno" },
  { value: "BRL", label: "BRL", name: "Real brasileño" },
  { value: "GBP", label: "GBP", name: "Libra esterlina" },
  { value: "PEN", label: "PEN", name: "Sol peruano" },
] as const;

export const LANGUAGES = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
  { value: "pt", label: "Português" },
] as const;

export const DATE_FORMATS = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY", example: "15/03/2026" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY", example: "03/15/2026" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD", example: "2026-03-15" },
] as const;

export type TimezoneValue = (typeof TIMEZONES)[number]["value"];
export type CurrencyValue = (typeof CURRENCIES)[number]["value"];
export type LanguageValue = (typeof LANGUAGES)[number]["value"];
export type DateFormatValue = (typeof DATE_FORMATS)[number]["value"];

export interface OrgLocaleSettings {
  timezone?: string;
  currency?: string;
  language?: string;
  dateFormat?: string;
}

export const DEFAULT_LOCALE_SETTINGS: Required<OrgLocaleSettings> = {
  timezone: "America/Argentina/Buenos_Aires",
  currency: "EUR",
  language: "es",
  dateFormat: "DD/MM/YYYY",
};
