"use client";

export async function generatePDFFromElement(element: HTMLElement, filename: string): Promise<void> {
  const { jsPDF } = await import("jspdf");
  const html2canvas = (await import("html2canvas")).default;

  // Capture the element as canvas with high quality
  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
  });

  const imgData = canvas.toDataURL("image/png");

  // Create PDF in A4 format
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  
  // Calculate dimensions maintaining aspect ratio
  const imgProps = pdf.getImageProperties(imgData);
  const imgWidth = pageWidth - 20; // 10mm margin on each side
  const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

  // Handle multi-page if content is too long
  let heightLeft = imgHeight;
  let position = 10; // Top margin

  // Add first page
  pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
  heightLeft -= (pageHeight - 20);

  // Add additional pages if needed
  while (heightLeft > 0) {
    position = heightLeft - imgHeight + 10;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
    heightLeft -= (pageHeight - 20);
  }

  // Download the PDF
  pdf.save(filename);
}

export async function generatePDFBlob(element: HTMLElement): Promise<Blob> {
  const { jsPDF } = await import("jspdf");
  const html2canvas = (await import("html2canvas")).default;

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
  });

  const imgData = canvas.toDataURL("image/png");

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const imgProps = pdf.getImageProperties(imgData);
  const imgWidth = pageWidth - 20;
  const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

  pdf.addImage(imgData, "PNG", 10, 10, imgWidth, imgHeight);

  return pdf.output("blob");
}
