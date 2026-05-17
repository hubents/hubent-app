/**
 * List of free/personal email providers.
 * A provider created with one of these domains is not a verified business email,
 * so we can't use the domain for company matching and require extra contact info.
 */
export const GENERIC_EMAIL_DOMAINS = new Set([
  "gmail.com", "gmail.es",
  "hotmail.com", "hotmail.es", "hotmail.co.uk",
  "outlook.com", "outlook.es",
  "yahoo.com", "yahoo.es", "yahoo.co.uk", "yahoo.fr",
  "live.com", "live.es",
  "msn.com",
  "icloud.com", "me.com", "mac.com",
  "protonmail.com", "proton.me",
  "gmx.com", "gmx.es", "gmx.net",
  "ymail.com",
  "aol.com",
  "mail.com",
  "inbox.com",
  "zohomail.com",
]);

export function isGenericEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@")[1] ?? "";
  return GENERIC_EMAIL_DOMAINS.has(domain);
}

export function getEmailDomain(email: string): string {
  return email.trim().toLowerCase().split("@")[1] ?? "";
}
