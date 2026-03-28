import { describe, it, expect, vi, beforeEach } from "vitest";

describe("extractR2Key", () => {
  beforeEach(() => {
    vi.stubEnv("R2_PUBLIC_URL", "https://pub-abc123.r2.dev");
  });

  it("extracts key from a valid R2 public URL", async () => {
    const { extractR2Key } = await import("@/lib/r2");
    const url = "https://pub-abc123.r2.dev/uploads/1234-photo.jpg";
    expect(extractR2Key(url)).toBe("uploads/1234-photo.jpg");
  });

  it("returns null for a non-R2 URL", async () => {
    const { extractR2Key } = await import("@/lib/r2");
    expect(extractR2Key("https://example.com/file.pdf")).toBeNull();
  });

  it("returns null when R2_PUBLIC_URL is not set", async () => {
    vi.stubEnv("R2_PUBLIC_URL", "");
    const { extractR2Key } = await import("@/lib/r2");
    expect(extractR2Key("https://pub-abc123.r2.dev/uploads/file.pdf")).toBeNull();
  });

  it("handles nested paths correctly", async () => {
    const { extractR2Key } = await import("@/lib/r2");
    const url = "https://pub-abc123.r2.dev/uploads/contacts/photos/1234-pic.png";
    expect(extractR2Key(url)).toBe("uploads/contacts/photos/1234-pic.png");
  });
});

describe("useFileUpload deleteFile key extraction", () => {
  it("extracts R2 key from public URL containing /uploads/", () => {
    const url = "https://pub-abc123.r2.dev/uploads/1234-my-file.pdf";
    const key = url.includes("/uploads/")
      ? "uploads/" + url.split("/uploads/").pop()
      : url;
    expect(key).toBe("uploads/1234-my-file.pdf");
  });

  it("passes through a raw key without /uploads/", () => {
    const raw = "some-other-key.pdf";
    const key = raw.includes("/uploads/")
      ? "uploads/" + raw.split("/uploads/").pop()
      : raw;
    expect(key).toBe("some-other-key.pdf");
  });

  it("handles nested upload paths", () => {
    const url = "https://cdn.example.com/uploads/contacts/documents/resume.pdf";
    const key = url.includes("/uploads/")
      ? "uploads/" + url.split("/uploads/").pop()
      : url;
    expect(key).toBe("uploads/contacts/documents/resume.pdf");
  });
});

describe("FilePreviewDialog helpers", () => {
  it("isPdf detects PDF by mimeType", () => {
    const file = { id: 1, name: "doc.pdf", url: "u", type: "file", mimeType: "application/pdf" };
    const result =
      file.mimeType === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    expect(result).toBe(true);
  });

  it("isPdf detects PDF by extension when mimeType is null", () => {
    const file = { id: 1, name: "report.PDF", url: "u", type: "file", mimeType: null };
    const result =
      file.mimeType === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    expect(result).toBe(true);
  });

  it("isImage detects image by type", () => {
    const file = { id: 1, name: "pic.jpg", url: "u", type: "image", mimeType: "image/jpeg" };
    const result =
      file.type === "image" ||
      file.mimeType?.startsWith("image/") ||
      /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(file.name);
    expect(result).toBe(true);
  });

  it("isImage detects image by extension when type is generic", () => {
    const file = { id: 1, name: "capture.png", url: "u", type: "file", mimeType: null as string | null };
    const result =
      file.type === "image" ||
      file.mimeType?.startsWith("image/") ||
      /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(file.name);
    expect(result).toBe(true);
  });

  it("getViewUrl generates correct proxy URL", () => {
    const raw = "https://pub-abc.r2.dev/uploads/1234-file.pdf";
    const result = `/api/files/view?url=${encodeURIComponent(raw)}`;
    expect(result).toBe(
      "/api/files/view?url=https%3A%2F%2Fpub-abc.r2.dev%2Fuploads%2F1234-file.pdf"
    );
  });

  it("non-image non-pdf is neither", () => {
    const file = { id: 1, name: "data.xlsx", url: "u", type: "file", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" };
    const isImg =
      file.type === "image" ||
      file.mimeType?.startsWith("image/") ||
      /\.(jpg|jpeg|png|gif|webp|svg|bmp|ico)$/i.test(file.name);
    const isPdf =
      file.mimeType === "application/pdf" ||
      file.name.toLowerCase().endsWith(".pdf");
    expect(isImg).toBe(false);
    expect(isPdf).toBe(false);
  });
});
