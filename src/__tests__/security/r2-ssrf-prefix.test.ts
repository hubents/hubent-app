import { describe, it, expect } from "vitest";

/**
 * Reproduces the SSRF prefix check vulnerability in:
 * - src/app/api/files/view/route.ts (line 19)
 * - src/lib/r2.ts extractR2Key (line 106)
 */

const R2_PUBLIC_URL = "https://pub-abc123.r2.dev";

describe("R2 URL prefix check — SSRF vulnerability", () => {
  describe("VULNERABLE: startsWith(r2PublicUrl) without trailing slash", () => {
    const isAllowed = (url: string) => url.startsWith(R2_PUBLIC_URL);

    it("allows legitimate R2 URL", () => {
      expect(isAllowed("https://pub-abc123.r2.dev/uploads/file.pdf")).toBe(true);
    });

    it("BUG: allows attacker domain that starts with same prefix", () => {
      expect(isAllowed("https://pub-abc123.r2.dev.evil.com/payload")).toBe(true);
    });

    it("BUG: allows subdomain injection", () => {
      expect(isAllowed("https://pub-abc123.r2.dev-attacker.com/steal")).toBe(true);
    });

    it("BUG: allows port-based bypass", () => {
      expect(isAllowed("https://pub-abc123.r2.dev:8443/exfil")).toBe(true);
    });
  });

  describe("FIXED: startsWith(r2PublicUrl + '/') with trailing slash", () => {
    const isAllowed = (url: string) => url.startsWith(R2_PUBLIC_URL + "/");

    it("allows legitimate R2 URL", () => {
      expect(isAllowed("https://pub-abc123.r2.dev/uploads/file.pdf")).toBe(true);
    });

    it("blocks attacker domain that starts with same prefix", () => {
      expect(isAllowed("https://pub-abc123.r2.dev.evil.com/payload")).toBe(false);
    });

    it("blocks subdomain injection", () => {
      expect(isAllowed("https://pub-abc123.r2.dev-attacker.com/steal")).toBe(false);
    });

    it("blocks port-based bypass", () => {
      expect(isAllowed("https://pub-abc123.r2.dev:8443/exfil")).toBe(false);
    });
  });

  describe("extractR2Key — key extraction with fix", () => {
    function extractR2KeyFixed(url: string, publicUrl: string): string | null {
      if (!publicUrl || !url.startsWith(publicUrl + "/")) return null;
      return url.slice(publicUrl.length + 1);
    }

    it("extracts key from legitimate URL", () => {
      expect(extractR2KeyFixed("https://pub-abc123.r2.dev/uploads/123-file.pdf", R2_PUBLIC_URL))
        .toBe("uploads/123-file.pdf");
    });

    it("returns null for attacker domain", () => {
      expect(extractR2KeyFixed("https://pub-abc123.r2.dev.evil.com/payload", R2_PUBLIC_URL))
        .toBeNull();
    });

    it("returns null for empty publicUrl", () => {
      expect(extractR2KeyFixed("https://pub-abc123.r2.dev/uploads/file.pdf", ""))
        .toBeNull();
    });
  });
});
