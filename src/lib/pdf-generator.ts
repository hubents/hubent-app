import type { Browser } from "puppeteer-core";

// Chromium URL for serverless - hosted version compatible with Vercel
const CHROMIUM_URL = "https://github.com/nicholasgriffintn/chromium/releases/download/v131.0.0/chromium-v131.0.0-pack.tar";

export async function generatePDFFromHTML(html: string): Promise<Buffer> {
  let browser: Browser | null = null;

  try {
    // Dynamic imports to avoid issues in edge runtime
    const puppeteer = (await import("puppeteer-core")).default;
    const chromium = (await import("@sparticuz/chromium-min")).default;

    // Get executable path
    const executablePath = await chromium.executablePath(CHROMIUM_URL);

    browser = await puppeteer.launch({
      args: chromium.args,
      executablePath,
      headless: true,
    });

    const page = await browser.newPage();

    // Set content and wait for it to load
    await page.setContent(html, {
      waitUntil: "networkidle0",
    });

    // Generate PDF
    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: {
        top: "20mm",
        right: "15mm",
        bottom: "20mm",
        left: "15mm",
      },
    });

    return Buffer.from(pdfBuffer);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Smart function that handles PDF generation with fallback
export async function createPDF(html: string): Promise<{ buffer: Buffer; isPDF: boolean }> {
  const isVercel = process.env.VERCEL === "1";
  const isProduction = process.env.NODE_ENV === "production";

  if (isVercel || isProduction) {
    try {
      const buffer = await generatePDFFromHTML(html);
      return { buffer, isPDF: true };
    } catch (error) {
      console.error("PDF generation failed, falling back to HTML:", error);
      return { buffer: Buffer.from(html, "utf-8"), isPDF: false };
    }
  }

  // Local development - return HTML with flag
  console.warn("PDF generation: Using HTML fallback in development");
  return { buffer: Buffer.from(html, "utf-8"), isPDF: false };
}
