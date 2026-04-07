import { describe, expect, it } from "vitest";
import { z } from "zod";
import { INSTAGRAM_POST_URL_REGEX, isInstagramPostUrl } from "@/lib/instagram-post-url";

const zodPostUrl = z.string().regex(INSTAGRAM_POST_URL_REGEX);

describe("isInstagramPostUrl", () => {
  it("accepts reel URL with username in path", () => {
    const u = "https://www.instagram.com/gimenezger/reel/DWguDACj17b/";
    expect(isInstagramPostUrl(u)).toBe(true);
    expect(() => zodPostUrl.parse(u)).not.toThrow();
  });

  it("accepts short reel URL without username", () => {
    expect(isInstagramPostUrl("https://www.instagram.com/reel/ABC123xyz/")).toBe(true);
  });

  it("accepts post with username in path", () => {
    const u = "https://www.instagram.com/some.user_name/p/AbCdEfGhIj1/";
    expect(isInstagramPostUrl(u)).toBe(true);
    expect(() => zodPostUrl.parse(u)).not.toThrow();
  });

  it("accepts post and tv paths", () => {
    expect(isInstagramPostUrl("https://instagram.com/p/AbC12_d-e/")).toBe(true);
    expect(isInstagramPostUrl("http://www.instagram.com/tv/XYZ789/")).toBe(true);
  });

  it("accepts URL with query string after shortcode (prefix still valid)", () => {
    const u = "https://www.instagram.com/reel/ABC123/?igsh=foo";
    expect(isInstagramPostUrl(u)).toBe(true);
  });

  it("accepts URLs with leading/trailing whitespace", () => {
    expect(isInstagramPostUrl("  https://www.instagram.com/reel/ABC/  ")).toBe(true);
  });

  it("rejects non-Instagram URLs", () => {
    expect(isInstagramPostUrl("https://example.com/reel/abc/")).toBe(false);
  });
});
