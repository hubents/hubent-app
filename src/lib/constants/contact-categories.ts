/**
 * Contact Categories Constants
 * Centralized categories for contacts based on type and vendor status
 */

// For persons who are NOT vendors (clients, leads)
export const PERSON_CATEGORIES = [
  "Novio",
  "Novia",
  "Cliente final",
] as const;

// For companies who are NOT vendors (business clients)
export const COMPANY_CATEGORIES = [
  "Tecnología",
  "Marketing y publicidad",
  "Entretenimiento",
  "Educación",
  "Salud",
  "Finanzas",
  "Retail",
  "E-commerce",
  "Turismo y hostelería",
  "Logística y transporte",
  "Construcción e inmobiliaria",
  "Industria y manufactura",
  "Alimentación y bebidas",
  "Energía y medio ambiente",
  "Consultoría y servicios profesionales",
] as const;

// For vendors (both persons and companies offering services)
export const VENDOR_CATEGORIES = [
  "Catering",
  "Fotografía",
  "Floristería",
  "Música",
  "Pastelería",
  "Decoración",
  "Venue",
  "Transporte",
  "Otro",
] as const;

// Type exports for TypeScript
export type PersonCategory = (typeof PERSON_CATEGORIES)[number];
export type CompanyCategory = (typeof COMPANY_CATEGORIES)[number];
export type VendorCategory = (typeof VENDOR_CATEGORIES)[number];

// Helper to get categories based on contact type and vendor status
export function getCategoriesForContact(
  type: "person" | "company",
  isVendor: boolean
): readonly string[] {
  if (isVendor) {
    return VENDOR_CATEGORIES;
  }
  return type === "person" ? PERSON_CATEGORIES : COMPANY_CATEGORIES;
}
