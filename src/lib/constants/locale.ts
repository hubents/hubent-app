// Shared locale constants for timezone, currency, language, and date format selectors.
// Used across tenant settings, vendor settings, and admin pages.

/**
 * Each entry represents a country (or a distinct timezone zone within a large country).
 * `label`  — country name in Spanish, used for search
 * `flag`   — emoji flag for visual recognition
 * `offset` — UTC offset string shown as hint
 * `zone`   — only for large countries with multiple timezone zones (e.g. EE. UU. — Este)
 */
export const TIMEZONES: Array<{
  value: string;
  label: string;
  flag: string;
  offset: string;
  zone?: string;
}> = [
  // ── Sudamérica ──────────────────────────────────────────────────────────────
  { value: "America/Argentina/Buenos_Aires", label: "Argentina",          flag: "🇦🇷", offset: "UTC-3" },
  { value: "America/La_Paz",                 label: "Bolivia",            flag: "🇧🇴", offset: "UTC-4" },
  { value: "America/Sao_Paulo",              label: "Brasil",             flag: "🇧🇷", offset: "UTC-3", zone: "Este" },
  { value: "America/Manaus",                 label: "Brasil",             flag: "🇧🇷", offset: "UTC-4", zone: "Oeste" },
  { value: "America/Santiago",               label: "Chile",              flag: "🇨🇱", offset: "UTC-4" },
  { value: "America/Bogota",                 label: "Colombia",           flag: "🇨🇴", offset: "UTC-5" },
  { value: "America/Guayaquil",              label: "Ecuador",            flag: "🇪🇨", offset: "UTC-5" },
  { value: "America/Lima",                   label: "Perú",               flag: "🇵🇪", offset: "UTC-5" },
  { value: "America/Asuncion",               label: "Paraguay",           flag: "🇵🇾", offset: "UTC-4" },
  { value: "America/Montevideo",             label: "Uruguay",            flag: "🇺🇾", offset: "UTC-3" },
  { value: "America/Caracas",                label: "Venezuela",          flag: "🇻🇪", offset: "UTC-4" },
  // ── México ──────────────────────────────────────────────────────────────────
  { value: "America/Mexico_City",            label: "México",             flag: "🇲🇽", offset: "UTC-6", zone: "Centro" },
  { value: "America/Tijuana",                label: "México",             flag: "🇲🇽", offset: "UTC-8", zone: "Pacífico" },
  // ── Centroamérica ───────────────────────────────────────────────────────────
  { value: "America/Costa_Rica",             label: "Costa Rica",         flag: "🇨🇷", offset: "UTC-6" },
  { value: "America/El_Salvador",            label: "El Salvador",        flag: "🇸🇻", offset: "UTC-6" },
  { value: "America/Guatemala",              label: "Guatemala",          flag: "🇬🇹", offset: "UTC-6" },
  { value: "America/Tegucigalpa",            label: "Honduras",           flag: "🇭🇳", offset: "UTC-6" },
  { value: "America/Managua",                label: "Nicaragua",          flag: "🇳🇮", offset: "UTC-6" },
  { value: "America/Panama",                 label: "Panamá",             flag: "🇵🇦", offset: "UTC-5" },
  // ── Caribe ──────────────────────────────────────────────────────────────────
  { value: "America/Havana",                 label: "Cuba",               flag: "🇨🇺", offset: "UTC-5" },
  { value: "America/Santo_Domingo",          label: "República Dominicana", flag: "🇩🇴", offset: "UTC-4" },
  { value: "America/Puerto_Rico",            label: "Puerto Rico",        flag: "🇵🇷", offset: "UTC-4" },
  // ── Norteamérica ────────────────────────────────────────────────────────────
  { value: "America/New_York",               label: "Estados Unidos",     flag: "🇺🇸", offset: "UTC-5", zone: "Este" },
  { value: "America/Chicago",                label: "Estados Unidos",     flag: "🇺🇸", offset: "UTC-6", zone: "Centro" },
  { value: "America/Denver",                 label: "Estados Unidos",     flag: "🇺🇸", offset: "UTC-7", zone: "Montaña" },
  { value: "America/Los_Angeles",            label: "Estados Unidos",     flag: "🇺🇸", offset: "UTC-8", zone: "Pacífico" },
  { value: "America/Toronto",                label: "Canadá",             flag: "🇨🇦", offset: "UTC-5", zone: "Este" },
  { value: "America/Vancouver",              label: "Canadá",             flag: "🇨🇦", offset: "UTC-8", zone: "Oeste" },
  // ── Europa ──────────────────────────────────────────────────────────────────
  { value: "Europe/Madrid",                  label: "España",             flag: "🇪🇸", offset: "UTC+1" },
  { value: "Europe/London",                  label: "Reino Unido",        flag: "🇬🇧", offset: "UTC+0" },
  { value: "Europe/Lisbon",                  label: "Portugal",           flag: "🇵🇹", offset: "UTC+0" },
  { value: "Europe/Paris",                   label: "Francia",            flag: "🇫🇷", offset: "UTC+1" },
  { value: "Europe/Berlin",                  label: "Alemania",           flag: "🇩🇪", offset: "UTC+1" },
  { value: "Europe/Rome",                    label: "Italia",             flag: "🇮🇹", offset: "UTC+1" },
  { value: "Europe/Amsterdam",               label: "Países Bajos",       flag: "🇳🇱", offset: "UTC+1" },
  { value: "Europe/Zurich",                  label: "Suiza",              flag: "🇨🇭", offset: "UTC+1" },
  // ── Resto del mundo ─────────────────────────────────────────────────────────
  { value: "UTC",                            label: "UTC",                flag: "🌍", offset: "UTC+0" },
];

export const CURRENCIES = [
  // ── Europa ──────────────────────────────────────────────────────────────────
  { value: "EUR", label: "EUR", name: "Euro" },
  { value: "GBP", label: "GBP", name: "Libra esterlina" },
  { value: "CHF", label: "CHF", name: "Franco suizo" },
  // ── Norteamérica ────────────────────────────────────────────────────────────
  { value: "USD", label: "USD", name: "Dólar estadounidense" },
  { value: "CAD", label: "CAD", name: "Dólar canadiense" },
  { value: "MXN", label: "MXN", name: "Peso mexicano" },
  // ── Sudamérica ──────────────────────────────────────────────────────────────
  { value: "ARS", label: "ARS", name: "Peso argentino" },
  { value: "BRL", label: "BRL", name: "Real brasileño" },
  { value: "CLP", label: "CLP", name: "Peso chileno" },
  { value: "COP", label: "COP", name: "Peso colombiano" },
  { value: "PEN", label: "PEN", name: "Sol peruano" },
  { value: "UYU", label: "UYU", name: "Peso uruguayo" },
  { value: "PYG", label: "PYG", name: "Guaraní paraguayo" },
  { value: "BOB", label: "BOB", name: "Boliviano" },
  { value: "VES", label: "VES", name: "Bolívar venezolano" },
  // ── Centroamérica y Caribe ──────────────────────────────────────────────────
  { value: "GTQ", label: "GTQ", name: "Quetzal guatemalteco" },
  { value: "HNL", label: "HNL", name: "Lempira hondureño" },
  { value: "NIO", label: "NIO", name: "Córdoba nicaragüense" },
  { value: "CRC", label: "CRC", name: "Colón costarricense" },
  { value: "DOP", label: "DOP", name: "Peso dominicano" },
  { value: "CUP", label: "CUP", name: "Peso cubano" },
  { value: "PAB", label: "PAB", name: "Balboa panameño" },
] as const;

export const LANGUAGES = [
  { value: "es", label: "Español" },
  { value: "en", label: "English" },
  { value: "pt", label: "Português" },
  { value: "fr", label: "Français" },
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

export interface TimezoneDefaults {
  currency: string;
  intlLocale: string;
  language: string;
  phonePrefix: string;
  countryCode: string;   // ISO 3166-1 alpha-2
  countryName: string;   // en español
}

/**
 * Defaults derived from a timezone selection.
 * Single source of truth for all region-predictable values.
 * Used app-wide: settings, contacts, onboarding, fiscal data.
 */
export const TIMEZONE_DEFAULTS: Record<string, TimezoneDefaults> = {
  // ── Argentina ────────────────────────────────────────────────────────────────
  "America/Argentina/Buenos_Aires": { currency: "ARS", intlLocale: "es-AR", language: "es", phonePrefix: "+54",  countryCode: "AR", countryName: "Argentina" },
  "America/Argentina/Cordoba":      { currency: "ARS", intlLocale: "es-AR", language: "es", phonePrefix: "+54",  countryCode: "AR", countryName: "Argentina" },
  "America/Argentina/Mendoza":      { currency: "ARS", intlLocale: "es-AR", language: "es", phonePrefix: "+54",  countryCode: "AR", countryName: "Argentina" },
  // ── Brasil ───────────────────────────────────────────────────────────────────
  "America/Sao_Paulo":              { currency: "BRL", intlLocale: "pt-BR", language: "pt", phonePrefix: "+55",  countryCode: "BR", countryName: "Brasil" },
  "America/Manaus":                 { currency: "BRL", intlLocale: "pt-BR", language: "pt", phonePrefix: "+55",  countryCode: "BR", countryName: "Brasil" },
  "America/Belem":                  { currency: "BRL", intlLocale: "pt-BR", language: "pt", phonePrefix: "+55",  countryCode: "BR", countryName: "Brasil" },
  // ── Sudamérica ────────────────────────────────────────────────────────────────
  "America/Santiago":               { currency: "CLP", intlLocale: "es-CL", language: "es", phonePrefix: "+56",  countryCode: "CL", countryName: "Chile" },
  "America/Lima":                   { currency: "PEN", intlLocale: "es-PE", language: "es", phonePrefix: "+51",  countryCode: "PE", countryName: "Perú" },
  "America/Bogota":                 { currency: "COP", intlLocale: "es-CO", language: "es", phonePrefix: "+57",  countryCode: "CO", countryName: "Colombia" },
  "America/Caracas":                { currency: "VES", intlLocale: "es-VE", language: "es", phonePrefix: "+58",  countryCode: "VE", countryName: "Venezuela" },
  "America/La_Paz":                 { currency: "BOB", intlLocale: "es-BO", language: "es", phonePrefix: "+591", countryCode: "BO", countryName: "Bolivia" },
  "America/Asuncion":               { currency: "PYG", intlLocale: "es-PY", language: "es", phonePrefix: "+595", countryCode: "PY", countryName: "Paraguay" },
  "America/Montevideo":             { currency: "UYU", intlLocale: "es-UY", language: "es", phonePrefix: "+598", countryCode: "UY", countryName: "Uruguay" },
  "America/Guayaquil":              { currency: "USD", intlLocale: "es-EC", language: "es", phonePrefix: "+593", countryCode: "EC", countryName: "Ecuador" },
  // ── México ───────────────────────────────────────────────────────────────────
  "America/Mexico_City":            { currency: "MXN", intlLocale: "es-MX", language: "es", phonePrefix: "+52",  countryCode: "MX", countryName: "México" },
  "America/Monterrey":              { currency: "MXN", intlLocale: "es-MX", language: "es", phonePrefix: "+52",  countryCode: "MX", countryName: "México" },
  "America/Tijuana":                { currency: "MXN", intlLocale: "es-MX", language: "es", phonePrefix: "+52",  countryCode: "MX", countryName: "México" },
  // ── Centroamérica ─────────────────────────────────────────────────────────────
  "America/Guatemala":              { currency: "GTQ", intlLocale: "es-GT", language: "es", phonePrefix: "+502", countryCode: "GT", countryName: "Guatemala" },
  "America/El_Salvador":            { currency: "USD", intlLocale: "es-SV", language: "es", phonePrefix: "+503", countryCode: "SV", countryName: "El Salvador" },
  "America/Tegucigalpa":            { currency: "HNL", intlLocale: "es-HN", language: "es", phonePrefix: "+504", countryCode: "HN", countryName: "Honduras" },
  "America/Managua":                { currency: "NIO", intlLocale: "es-NI", language: "es", phonePrefix: "+505", countryCode: "NI", countryName: "Nicaragua" },
  "America/Costa_Rica":             { currency: "CRC", intlLocale: "es-CR", language: "es", phonePrefix: "+506", countryCode: "CR", countryName: "Costa Rica" },
  "America/Panama":                 { currency: "PAB", intlLocale: "es-PA", language: "es", phonePrefix: "+507", countryCode: "PA", countryName: "Panamá" },
  // ── Caribe ────────────────────────────────────────────────────────────────────
  "America/Santo_Domingo":          { currency: "DOP", intlLocale: "es-DO", language: "es", phonePrefix: "+1",   countryCode: "DO", countryName: "República Dominicana" },
  "America/Havana":                 { currency: "CUP", intlLocale: "es-CU", language: "es", phonePrefix: "+53",  countryCode: "CU", countryName: "Cuba" },
  "America/Puerto_Rico":            { currency: "USD", intlLocale: "es-PR", language: "es", phonePrefix: "+1",   countryCode: "PR", countryName: "Puerto Rico" },
  // ── Norteamérica ─────────────────────────────────────────────────────────────
  "America/New_York":               { currency: "USD", intlLocale: "en-US", language: "en", phonePrefix: "+1",   countryCode: "US", countryName: "Estados Unidos" },
  "America/Chicago":                { currency: "USD", intlLocale: "en-US", language: "en", phonePrefix: "+1",   countryCode: "US", countryName: "Estados Unidos" },
  "America/Denver":                 { currency: "USD", intlLocale: "en-US", language: "en", phonePrefix: "+1",   countryCode: "US", countryName: "Estados Unidos" },
  "America/Los_Angeles":            { currency: "USD", intlLocale: "en-US", language: "en", phonePrefix: "+1",   countryCode: "US", countryName: "Estados Unidos" },
  "America/Toronto":                { currency: "CAD", intlLocale: "en-CA", language: "en", phonePrefix: "+1",   countryCode: "CA", countryName: "Canadá" },
  "America/Vancouver":              { currency: "CAD", intlLocale: "en-CA", language: "en", phonePrefix: "+1",   countryCode: "CA", countryName: "Canadá" },
  // ── Europa ────────────────────────────────────────────────────────────────────
  "Europe/Madrid":                  { currency: "EUR", intlLocale: "es-ES", language: "es", phonePrefix: "+34",  countryCode: "ES", countryName: "España" },
  "Europe/London":                  { currency: "GBP", intlLocale: "en-GB", language: "en", phonePrefix: "+44",  countryCode: "GB", countryName: "Reino Unido" },
  "Europe/Lisbon":                  { currency: "EUR", intlLocale: "pt-PT", language: "pt", phonePrefix: "+351", countryCode: "PT", countryName: "Portugal" },
  "Europe/Paris":                   { currency: "EUR", intlLocale: "fr-FR", language: "fr", phonePrefix: "+33",  countryCode: "FR", countryName: "Francia" },
  "Europe/Berlin":                  { currency: "EUR", intlLocale: "de-DE", language: "en", phonePrefix: "+49",  countryCode: "DE", countryName: "Alemania" },
  "Europe/Rome":                    { currency: "EUR", intlLocale: "it-IT", language: "en", phonePrefix: "+39",  countryCode: "IT", countryName: "Italia" },
  "Europe/Amsterdam":               { currency: "EUR", intlLocale: "nl-NL", language: "en", phonePrefix: "+31",  countryCode: "NL", countryName: "Países Bajos" },
  "Europe/Zurich":                  { currency: "CHF", intlLocale: "de-CH", language: "en", phonePrefix: "+41",  countryCode: "CH", countryName: "Suiza" },
  // ── Fallback ──────────────────────────────────────────────────────────────────
  "UTC":                            { currency: "EUR", intlLocale: "es-ES", language: "es", phonePrefix: "+34",  countryCode: "ES", countryName: "España" },
};

/** Prefijos telefónicos únicos por país — para selectores de teléfono en toda la app */
export const PHONE_PREFIXES = [
  { prefix: "+54",  code: "AR", flag: "🇦🇷", label: "Argentina",          phoneFormat: "11 1234-5678" },
  { prefix: "+591", code: "BO", flag: "🇧🇴", label: "Bolivia",            phoneFormat: "7 123 4567" },
  { prefix: "+55",  code: "BR", flag: "🇧🇷", label: "Brasil",             phoneFormat: "11 9 1234-5678" },
  { prefix: "+56",  code: "CL", flag: "🇨🇱", label: "Chile",              phoneFormat: "9 1234 5678" },
  { prefix: "+57",  code: "CO", flag: "🇨🇴", label: "Colombia",           phoneFormat: "312 345 6789" },
  { prefix: "+506", code: "CR", flag: "🇨🇷", label: "Costa Rica",         phoneFormat: "8 123-4567" },
  { prefix: "+53",  code: "CU", flag: "🇨🇺", label: "Cuba",               phoneFormat: "5 123 4567" },
  { prefix: "+1",   code: "DO", flag: "🇩🇴", label: "Rep. Dominicana",    phoneFormat: "809 123 4567" },
  { prefix: "+593", code: "EC", flag: "🇪🇨", label: "Ecuador",            phoneFormat: "99 123 4567" },
  { prefix: "+503", code: "SV", flag: "🇸🇻", label: "El Salvador",        phoneFormat: "7 123-4567" },
  { prefix: "+502", code: "GT", flag: "🇬🇹", label: "Guatemala",          phoneFormat: "5 123 4567" },
  { prefix: "+504", code: "HN", flag: "🇭🇳", label: "Honduras",           phoneFormat: "9 123 4567" },
  { prefix: "+52",  code: "MX", flag: "🇲🇽", label: "México",             phoneFormat: "55 1234 5678" },
  { prefix: "+505", code: "NI", flag: "🇳🇮", label: "Nicaragua",          phoneFormat: "8 123 4567" },
  { prefix: "+507", code: "PA", flag: "🇵🇦", label: "Panamá",             phoneFormat: "6 123-4567" },
  { prefix: "+595", code: "PY", flag: "🇵🇾", label: "Paraguay",           phoneFormat: "981 123 456" },
  { prefix: "+51",  code: "PE", flag: "🇵🇪", label: "Perú",               phoneFormat: "987 654 321" },
  { prefix: "+1",   code: "PR", flag: "🇵🇷", label: "Puerto Rico",        phoneFormat: "787 123 4567" },
  { prefix: "+598", code: "UY", flag: "🇺🇾", label: "Uruguay",            phoneFormat: "91 234 567" },
  { prefix: "+58",  code: "VE", flag: "🇻🇪", label: "Venezuela",          phoneFormat: "412 123 4567" },
  { prefix: "+1",   code: "US", flag: "🇺🇸", label: "Estados Unidos",     phoneFormat: "212 555 0100" },
  { prefix: "+1",   code: "CA", flag: "🇨🇦", label: "Canadá",             phoneFormat: "416 555 0100" },
  { prefix: "+34",  code: "ES", flag: "🇪🇸", label: "España",             phoneFormat: "654 321 000" },
  { prefix: "+44",  code: "GB", flag: "🇬🇧", label: "Reino Unido",        phoneFormat: "7911 123456" },
  { prefix: "+351", code: "PT", flag: "🇵🇹", label: "Portugal",           phoneFormat: "912 345 678" },
  { prefix: "+33",  code: "FR", flag: "🇫🇷", label: "Francia",            phoneFormat: "6 12 34 56 78" },
  { prefix: "+49",  code: "DE", flag: "🇩🇪", label: "Alemania",           phoneFormat: "151 12345678" },
  { prefix: "+39",  code: "IT", flag: "🇮🇹", label: "Italia",             phoneFormat: "345 123 4567" },
  { prefix: "+31",  code: "NL", flag: "🇳🇱", label: "Países Bajos",       phoneFormat: "6 12345678" },
  { prefix: "+41",  code: "CH", flag: "🇨🇭", label: "Suiza",              phoneFormat: "78 123 45 67" },
] as const;

/** Lista de países para selectores de dirección/país en toda la app */
export const COUNTRIES = [
  { code: "AR", name: "Argentina",            flag: "🇦🇷" },
  { code: "BO", name: "Bolivia",              flag: "🇧🇴" },
  { code: "BR", name: "Brasil",               flag: "🇧🇷" },
  { code: "CL", name: "Chile",                flag: "🇨🇱" },
  { code: "CO", name: "Colombia",             flag: "🇨🇴" },
  { code: "CR", name: "Costa Rica",           flag: "🇨🇷" },
  { code: "CU", name: "Cuba",                 flag: "🇨🇺" },
  { code: "DO", name: "República Dominicana", flag: "🇩🇴" },
  { code: "EC", name: "Ecuador",              flag: "🇪🇨" },
  { code: "SV", name: "El Salvador",          flag: "🇸🇻" },
  { code: "GT", name: "Guatemala",            flag: "🇬🇹" },
  { code: "HN", name: "Honduras",             flag: "🇭🇳" },
  { code: "MX", name: "México",               flag: "🇲🇽" },
  { code: "NI", name: "Nicaragua",            flag: "🇳🇮" },
  { code: "PA", name: "Panamá",               flag: "🇵🇦" },
  { code: "PY", name: "Paraguay",             flag: "🇵🇾" },
  { code: "PE", name: "Perú",                 flag: "🇵🇪" },
  { code: "PR", name: "Puerto Rico",          flag: "🇵🇷" },
  { code: "UY", name: "Uruguay",              flag: "🇺🇾" },
  { code: "VE", name: "Venezuela",            flag: "🇻🇪" },
  { code: "US", name: "Estados Unidos",       flag: "🇺🇸" },
  { code: "CA", name: "Canadá",               flag: "🇨🇦" },
  { code: "ES", name: "España",               flag: "🇪🇸" },
  { code: "GB", name: "Reino Unido",          flag: "🇬🇧" },
  { code: "PT", name: "Portugal",             flag: "🇵🇹" },
  { code: "FR", name: "Francia",              flag: "🇫🇷" },
  { code: "DE", name: "Alemania",             flag: "🇩🇪" },
  { code: "IT", name: "Italia",               flag: "🇮🇹" },
  { code: "NL", name: "Países Bajos",         flag: "🇳🇱" },
  { code: "CH", name: "Suiza",                flag: "🇨🇭" },
] as const;

export const CURRENCY_SYMBOLS: Record<string, string> = {
  // Europa
  EUR: "€",
  GBP: "£",
  CHF: "Fr.",
  // Norteamérica
  USD: "$",
  CAD: "$",
  MXN: "$",
  // Sudamérica
  ARS: "$",
  BRL: "R$",
  CLP: "$",
  COP: "$",
  PEN: "S/",
  UYU: "$U",
  PYG: "₲",
  BOB: "Bs.",
  VES: "Bs.S",
  // Centroamérica y Caribe
  GTQ: "Q",
  HNL: "L",
  NIO: "C$",
  CRC: "₡",
  DOP: "RD$",
  CUP: "$",
  PAB: "B/.",
};

/** Default currencies shown when org has no finance settings yet */
export const DEFAULT_ENABLED_CURRENCIES = ["EUR", "USD", "GBP"];

export const DEFAULT_LOCALE_SETTINGS: Required<OrgLocaleSettings> = {
  timezone: "America/Argentina/Buenos_Aires",
  currency: "EUR",
  language: "es",
  dateFormat: "DD/MM/YYYY",
};
