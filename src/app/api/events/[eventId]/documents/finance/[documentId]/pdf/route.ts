import { NextRequest, NextResponse } from "next/server";
import { requireEventSectionAccess } from "@/lib/session";
import { getDocument } from "@/lib/finance";
import { generateDocumentHTML } from "@/lib/pdf-templates";
import { createPDF } from "@/lib/pdf-generator";
import { db } from "@/db";
import { organizations, contacts } from "@/db/schema";
import { eq } from "drizzle-orm";

type RouteParams = { params: Promise<{ eventId: string; documentId: string }> };

// GET /api/events/[eventId]/documents/finance/[documentId]/pdf
// Event-scoped PDF generation — uses requireEventSectionAccess instead of requirePermission
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { eventId: eventIdStr, documentId: documentIdStr } = await params;
    const eventId = parseInt(eventIdStr, 10);
    const documentId = parseInt(documentIdStr, 10);

    if (isNaN(eventId) || isNaN(documentId)) {
      return NextResponse.json(
        { success: false, error: { code: "VALIDATION_ERROR", message: "Invalid eventId or documentId" } },
        { status: 400 }
      );
    }

    const session = await requireEventSectionAccess(eventId, "finances", "view");

    const document = await getDocument(session, documentId);

    if (!document) {
      return NextResponse.json(
        { success: false, error: { code: "NOT_FOUND", message: "Document not found" } },
        { status: 404 }
      );
    }

    // Verify document belongs to this event
    if (document.eventId !== eventId) {
      return NextResponse.json(
        { success: false, error: { code: "FORBIDDEN", message: "Document does not belong to this event" } },
        { status: 403 }
      );
    }

    // Get organization info for the PDF header
    const [org] = await db
      .select({
        name: organizations.name,
        address: organizations.address,
        phone: organizations.phone,
        logo: organizations.logo,
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

    // Convert logo to base64 data URI
    let logoDataUri: string | undefined = org?.invoiceLogo || org?.logo || undefined;
    if (logoDataUri && logoDataUri.startsWith("http")) {
      try {
        const logoRes = await fetch(logoDataUri);
        const logoBuffer = await logoRes.arrayBuffer();
        const contentType = logoRes.headers.get("content-type") || "image/png";
        logoDataUri = `data:${contentType};base64,${Buffer.from(logoBuffer).toString("base64")}`;
      } catch {
        // Keep original URL as fallback
      }
    }

    const pdfDocument = {
      ...document,
      status: document.status || "draft",
      organizationName: org?.fiscalName || org?.name || undefined,
      organizationAddress: fiscalAddressFull || org?.address || undefined,
      organizationPhone: org?.fiscalPhone || org?.phone || undefined,
      organizationEmail: org?.fiscalEmail || undefined,
      organizationTaxId: org?.taxId || undefined,
      organizationLogo: logoDataUri,
      contactName: contactInfo?.name || document.vendor?.name || document.company?.legalName ||
        (document.person ? `${document.person.firstName} ${document.person.lastName || ""}`.trim() : null),
      contactEmail: contactInfo?.email || document.vendor?.email || document.company?.email || document.person?.email || null,
      contactPhone: contactInfo?.phone || document.vendor?.phone || document.company?.phone || document.person?.phone || null,
      contactAddress: contactInfo?.address || document.vendor?.address || document.company?.address || null,
      contactTaxId: contactInfo?.taxId || document.company?.taxId || null,
      vendorName: document.vendor?.name || null,
      vendorEmail: document.vendor?.email || null,
      vendorPhone: document.vendor?.phone || null,
      vendorAddress: document.vendor?.address || null,
      eventName: document.event?.name || null,
    };

    const html = generateDocumentHTML(pdfDocument);

    const url = new URL(request.url);
    const format = url.searchParams.get("format");

    if (format === "html") {
      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `inline; filename="${document.type}-${document.number}.html"`,
        },
      });
    }

    const { buffer, isPDF } = await createPDF(html);

    if (isPDF) {
      return new NextResponse(new Uint8Array(buffer), {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${document.type}-${document.number}.pdf"`,
        },
      });
    }

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Content-Disposition": `inline; filename="${document.type}-${document.number}.html"`,
      },
    });
  } catch (error) {
    console.error("PDF generation error:", error);
    const message = error instanceof Error ? error.message : "Failed to generate PDF";
    const status = message.includes("Forbidden") || message.includes("Unauthorized") ? 403 : 500;
    return NextResponse.json(
      { success: false, error: { code: "PDF_ERROR", message } },
      { status }
    );
  }
}
