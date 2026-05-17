"use client";

import { toast } from "sonner";

// ─── Shared types ─────────────────────────────────────────────────────────────

interface PageSlice {
  imgData: string;
  imgHmm: number; // proportional height in mm at useW
  docType: string;
  docNumber: string;
  orgName: string;
}

// ─── Core renderer ────────────────────────────────────────────────────────────

/**
 * Renders an HTML string inside a hidden iframe, captures with html2canvas,
 * and splits the result into smart A4 page slices that never cut mid-row.
 *
 * Returns one PageSlice per PDF page, ready to be inserted into jsPDF.
 */
async function renderHTMLToPageSlices(
  html: string,
  useW: number,  // usable width in mm
  useH: number,  // usable height in mm
  pageW: number, // full page width in mm
): Promise<PageSlice[]> {
  const iframe = document.createElement("iframe");
  iframe.style.cssText = "position:fixed;left:-9999px;top:0;width:794px;height:10px;border:none;";
  document.body.appendChild(iframe);

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!iframeDoc) { document.body.removeChild(iframe); return []; }

  iframeDoc.open();
  iframeDoc.write(html);
  iframeDoc.close();

  await new Promise((resolve) => {
    iframe.onload = resolve;
    setTimeout(resolve, 1500);
  });

  const scrollH = Math.max(
    iframeDoc.documentElement.scrollHeight,
    iframeDoc.body.scrollHeight,
  );
  iframe.style.height = `${scrollH}px`;

  // Extract metadata for the continuation header
  const docType   = (iframeDoc.querySelector(".doc-type")   as HTMLElement | null)?.textContent?.trim() ?? "";
  const docNumber = (iframeDoc.querySelector(".doc-number") as HTMLElement | null)?.textContent?.trim().split("#")[0].trim() ?? "";
  const orgName   = (iframeDoc.querySelector(".org-info")   as HTMLElement | null)?.firstElementChild?.textContent?.trim() ?? "";

  // Get absolute bottom position of an element (relative to body)
  function absBottom(el: HTMLElement): number {
    let y = 0;
    let node: HTMLElement | null = el;
    while (node && node.tagName !== "BODY") {
      y += node.offsetTop;
      node = node.offsetParent as HTMLElement | null;
    }
    return y + el.offsetHeight;
  }

  // Collect safe break points at the bottom edge of rows and sections
  const breakSet = new Set<number>();
  iframeDoc
    .querySelectorAll("tr, .dates, .parties, .totals, .notes-section, .footer")
    .forEach((el) => breakSet.add(absBottom(el as HTMLElement)));
  const sortedBreaks = Array.from(breakSet).sort((a, b) => a - b);

  const html2canvas = (await import("html2canvas")).default;
  const canvas = await html2canvas(iframeDoc.body, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    width: 794,
    windowWidth: 794,
  });
  document.body.removeChild(iframe);

  // CSS pixels that fit in one A4 content area
  // canvas.width px ↔ pageW mm; useH mm → useH * canvas.width / pageW canvas px / scale(2)
  const contentCSSPx = (useH * canvas.width) / (pageW * 2);

  // Build page slices cutting only at safe (row-boundary) positions
  const slices: PageSlice[] = [];
  let cursor = 0;

  while (cursor < scrollH) {
    const ideal = cursor + contentCSSPx;
    let cut = 0;
    for (const bp of sortedBreaks) {
      if (bp > cursor && bp <= ideal) cut = bp;
    }
    if (cut <= cursor) cut = ideal; // nothing fit → force cut
    cut = Math.min(Math.ceil(cut), scrollH);

    const pxStart = Math.round(cursor * 2);
    const pxEnd   = Math.round(cut    * 2);
    const pxH     = pxEnd - pxStart;

    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width  = canvas.width;
    sliceCanvas.height = pxH;
    const ctx = sliceCanvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, sliceCanvas.width, sliceCanvas.height);
    ctx.drawImage(canvas, 0, pxStart, canvas.width, pxH, 0, 0, canvas.width, pxH);

    slices.push({
      imgData: sliceCanvas.toDataURL("image/png"),
      imgHmm: (pxH / canvas.width) * useW,
      docType,
      docNumber,
      orgName,
    });

    cursor = cut;
  }

  return slices;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Generic PDF download from any HTML endpoint.
 * Renders HTML → smart A4 page slices (no mid-row cuts) → jsPDF → download.
 */
export async function downloadPDFFromHTML(
  htmlUrl: string,
  filename: string,
): Promise<void> {
  const toastId = toast.loading("Generando PDF...");

  try {
    const res = await fetch(htmlUrl);
    if (!res.ok) throw new Error("Error al obtener el documento");
    const html = await res.text();

    const { jsPDF } = await import("jspdf");
    const pdf   = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();   // 210 mm
    const pageH = pdf.internal.pageSize.getHeight();  // 297 mm
    const margin = 8;
    const useW  = pageW - margin * 2;
    const useH  = pageH - margin * 2;

    const slices = await renderHTMLToPageSlices(html, useW, useH, pageW);

    slices.forEach(({ imgData, imgHmm, docType, docNumber, orgName }, i) => {
      if (i > 0) {
        pdf.addPage();
        // Continuation header bar
        pdf.setFillColor(249, 250, 251);
        pdf.roundedRect(margin, margin, useW, 9, 1, 1, "F");
        pdf.setFontSize(7.5);
        pdf.setTextColor(107, 114, 128);
        if (orgName) pdf.text(orgName, margin + 3, margin + 5.8);
        if (docType || docNumber) {
          pdf.text(`${docType} ${docNumber}`.trim(), pageW - margin - 3, margin + 5.8, { align: "right" });
        }
        pdf.addImage(imgData, "PNG", margin, margin + 12, useW, imgHmm);
      } else {
        pdf.addImage(imgData, "PNG", margin, margin, useW, imgHmm);
      }

      // Page number
      pdf.setFontSize(7.5);
      pdf.setTextColor(156, 163, 175);
      pdf.text(`${i + 1} / ${slices.length}`, pageW / 2, pageH - 4, { align: "center" });
    });

    pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
    toast.success("PDF descargado", { id: toastId });
  } catch (error) {
    console.error("PDF download error:", error);
    toast.error("Error al generar PDF", { id: toastId });
  }
}

/**
 * Downloads a financial document PDF.
 */
export async function downloadDocumentPDF(
  documentId: number,
  filename: string,
): Promise<void> {
  return downloadPDFFromHTML(
    `/api/finance/documents/${documentId}/pdf?format=html`,
    filename,
  );
}

/**
 * Downloads multiple financial documents as a single combined PDF.
 * Each document starts on a new page; smart page breaking prevents mid-row cuts.
 * Avoids the browser's multiple-download permission dialog.
 */
export async function downloadBulkDocumentsPDF(
  documents: { id: number; number: string }[],
  filename: string,
): Promise<void> {
  if (documents.length === 0) return;

  if (documents.length === 1) {
    return downloadDocumentPDF(
      documents[0].id,
      `${filename}-${documents[0].number}`,
    );
  }

  const toastId = toast.loading(`Generando PDF con ${documents.length} documentos...`);

  try {
    const { jsPDF } = await import("jspdf");
    const pdf   = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const margin = 8;
    const useW  = pageW - margin * 2;
    const useH  = pageH - margin * 2;

    let firstDoc = true;

    for (let d = 0; d < documents.length; d++) {
      const doc = documents[d];
      toast.loading(`Procesando ${d + 1} / ${documents.length}...`, { id: toastId });

      const res = await fetch(`/api/finance/documents/${doc.id}/pdf?format=html`);
      if (!res.ok) { toast.error(`Error al cargar documento ${doc.number}`); continue; }
      const html = await res.text();

      const slices = await renderHTMLToPageSlices(html, useW, useH, pageW);

      slices.forEach(({ imgData, imgHmm, docType, docNumber, orgName }, i) => {
        const isFirstSliceOfDoc = i === 0;

        if (!firstDoc || !isFirstSliceOfDoc) pdf.addPage();
        firstDoc = false;

        if (!isFirstSliceOfDoc) {
          // Continuation header for multi-page documents
          pdf.setFillColor(249, 250, 251);
          pdf.roundedRect(margin, margin, useW, 9, 1, 1, "F");
          pdf.setFontSize(7.5);
          pdf.setTextColor(107, 114, 128);
          if (orgName) pdf.text(orgName, margin + 3, margin + 5.8);
          if (docType || docNumber) {
            pdf.text(`${docType} ${docNumber}`.trim(), pageW - margin - 3, margin + 5.8, { align: "right" });
          }
          pdf.addImage(imgData, "PNG", margin, margin + 12, useW, imgHmm);
        } else {
          pdf.addImage(imgData, "PNG", margin, margin, useW, imgHmm);
        }

        pdf.setFontSize(7.5);
        pdf.setTextColor(156, 163, 175);
        pdf.text(`${i + 1} / ${slices.length}`, pageW / 2, pageH - 4, { align: "center" });
      });
    }

    pdf.save(filename.endsWith(".pdf") ? filename : `${filename}.pdf`);
    toast.success(`${documents.length} documentos descargados`, { id: toastId });
  } catch (error) {
    console.error("Bulk PDF download error:", error);
    toast.error("Error al generar PDF", { id: toastId });
  }
}
