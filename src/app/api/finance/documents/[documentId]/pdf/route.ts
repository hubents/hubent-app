import { NextRequest, NextResponse } from "next/server";
import { requireRole } from "@/lib/session";
import { getDocument } from "@/lib/finance";
import { generateDocumentHTML } from "@/lib/pdf-templates";
import { createPDF } from "@/lib/pdf-generator";
import { db } from "@/db";
import { organizations, contacts } from "@/db/schema";
import { eq } from "drizzle-orm";

type RouteParams = { params: Promise<{ documentId: string }> };

// GET /api/finance/documents/[documentId]/pdf - Generate PDF HTML for printing/download
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireRole("viewer");
    const { documentId } = await params;

    const document = await getDocument(session, parseInt(documentId, 10));

    if (!document) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Document not found" } },
        { status: 404 }
      );
    }

    // Get organization info for the PDF header (unified source of truth)
    const [org] = await db
      .select({
        name: organizations.name,
        address: organizations.address,
        phone: organizations.phone,
        logo: organizations.logo,
        // Fiscal data from organizations table
        fiscalName: organizations.fiscalName,
        taxId: organizations.taxId,
        fiscalAddress: organizations.fiscalAddress,
        fiscalCity: organizations.fiscalCity,
        fiscalPostalCode: organizations.fiscalPostalCode,
        fiscalCountry: organizations.fiscalCountry,
        fiscalEmail: organizations.fiscalEmail,
        fiscalPhone: organizations.fiscalPhone,
        invoiceLogo: organizations.invoiceLogo,
      })
      .from(organizations)
      .where(eq(organizations.id, session.organizationId))
      .limit(1);

    // Get contact info if available
    let contactInfo = null;
    if (document.contactId) {
      const [contact] = await db
        .select({
          name: contacts.name,
          email: contacts.email,
          phone: contacts.phone,
          address: contacts.address,
          taxId: contacts.taxId,
        })
        .from(contacts)
        .where(eq(contacts.id, document.contactId))
        .limit(1);
      contactInfo = contact;
    }

    // Build full fiscal address
    const fiscalAddressFull = [
      org?.fiscalAddress,
      org?.fiscalPostalCode,
      org?.fiscalCity,
      org?.fiscalCountry,
    ].filter(Boolean).join(", ");

    // Build the full document object for PDF generation
    const pdfDocument = {
      ...document,
      status: document.status || "draft",
      // Use fiscal data with fallbacks to general org data
      organizationName: org?.fiscalName || org?.name || undefined,
      organizationAddress: fiscalAddressFull || org?.address || undefined,
      organizationPhone: org?.fiscalPhone || org?.phone || undefined,
      organizationEmail: org?.fiscalEmail || undefined,
      organizationTaxId: org?.taxId || undefined,
      organizationLogo: org?.invoiceLogo || org?.logo || undefined,
      contactName: contactInfo?.name || document.company?.legalName || 
        (document.person ? `${document.person.firstName} ${document.person.lastName || ""}`.trim() : null),
      contactEmail: contactInfo?.email || document.company?.email || document.person?.email || null,
      contactPhone: contactInfo?.phone || document.company?.phone || document.person?.phone || null,
      contactAddress: contactInfo?.address || document.company?.address || null,
      contactTaxId: contactInfo?.taxId || document.company?.taxId || null,
      eventName: document.event?.name || null,
    };

    // Generate HTML
    const html = generateDocumentHTML(pdfDocument);

    // Check if user wants HTML preview or PDF download
    const url = new URL(request.url);
    const format = url.searchParams.get("format");

    if (format === "html") {
      // Return HTML for preview/print
      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `inline; filename="${document.type}-${document.number}.html"`,
        },
      });
    }

    // Generate real PDF
    const { buffer, isPDF } = await createPDF(html);

    if (isPDF) {
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `inline; filename="${document.type}-${document.number}.pdf"`,
        },
      });
    }

    // Fallback to HTML if PDF generation failed
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="${document.type}-${document.number}.html"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate PDF";
    return NextResponse.json(
      { success: false, error: { code: "PDF_ERROR", message } },
      { status: 500 }
    );
  }
}
