"use client";

import { toast } from "sonner";

/**
 * Generic PDF download from any HTML endpoint.
 * Pattern: fetch HTML → iframe render → html2canvas → jsPDF → auto-download.
 *
 * USE THIS for ALL PDF downloads in the app. Never use server-side Puppeteer
 * for client-triggered downloads — it fails in dev and is unreliable.
 *
 * @param htmlUrl - URL that returns HTML content (text/html)
 * @param filename - Download filename (will append .pdf if missing)
 */
export async function downloadPDFFromHTML(
  htmlUrl: string,
  filename: string
): Promise<void> {
  const toastId = toast.loading("Generando PDF...");

  try {
    // 1. Fetch HTML from the server
    const res = await fetch(htmlUrl);
    if (!res.ok) throw new Error("Error al obtener el documento");
    const html = await res.text();

    // 2. Render in a hidden iframe to get a proper DOM element
    const iframe = document.createElement("iframe");
    iframe.style.position = "fixed";
    iframe.style.left = "-9999px";
    iframe.style.top = "-9999px";
    iframe.style.width = "794px"; // A4 width at 96dpi
    iframe.style.height = "1123px"; // A4 height at 96dpi
    iframe.style.border = "none";
    document.body.appendChild(iframe);

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!iframeDoc) throw new Error("No se pudo crear el iframe");

    iframeDoc.open();
    iframeDoc.write(html);
    iframeDoc.close();

    // Wait for content to render
    await new Promise((resolve) => {
      iframe.onload = resolve;
      setTimeout(resolve, 1500); // Fallback timeout
    });

    // 3. Use html2canvas + jsPDF to generate real PDF
    const html2canvas = (await import("html2canvas")).default;
    const { jsPDF } = await import("jspdf");

    const body = iframeDoc.body;

    const canvas = await html2canvas(body, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
      width: 794,
      windowWidth: 794,
    });

    const imgData = canvas.toDataURL("image/png");

    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 5;
    const usableWidth = pageWidth - margin * 2;

    const imgProps = pdf.getImageProperties(imgData);
    const imgHeight = (imgProps.height * usableWidth) / imgProps.width;

    let heightLeft = imgHeight;
    let position = margin;

    // First page
    pdf.addImage(imgData, "PNG", margin, position, usableWidth, imgHeight);
    heightLeft -= (pageHeight - margin * 2);

    // Additional pages if needed
    while (heightLeft > 0) {
      position = heightLeft - imgHeight + margin;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", margin, position, usableWidth, imgHeight);
      heightLeft -= (pageHeight - margin * 2);
    }

    // 4. Download
    pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);

    // Cleanup
    document.body.removeChild(iframe);

    toast.success("PDF descargado", { id: toastId });
  } catch (error) {
    console.error("PDF download error:", error);
    toast.error("Error al generar PDF", { id: toastId });
  }
}

/**
 * Downloads a financial document PDF.
 * Convenience wrapper around downloadPDFFromHTML.
 */
export async function downloadDocumentPDF(
  documentId: number,
  filename: string
): Promise<void> {
  return downloadPDFFromHTML(
    `/api/finance/documents/${documentId}/pdf?format=html`,
    filename
  );
}
