import { NextRequest } from "next/server";
import { Resend } from "resend";
import { requirePermission } from "@/lib/session";
import { getDocument, updateDocumentStatus } from "@/lib/finance";
import { generateDocumentHTML, generateDocumentEmailHTML, generateDocumentEmailSubject } from "@/lib/pdf-templates";
import { createPDF } from "@/lib/pdf-generator";
import { db } from "@/db";
import { organizations, contacts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { apiHandler, ok, notFound, badRequest, serverError } from "@/lib/api-handler";

type RouteParams = { params: Promise<{ documentId: string }> };

function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY || process.env.resend;
  if (!apiKey) {
    throw new Error("RESEND_API_KEY environment variable is not set");
  }
  return new Resend(apiKey);
}

function getFromEmail() {
  return process.env.EMAIL_FROM || "Hubents <noreply@hubents.com>";
}

// POST /api/finance/documents/[documentId]/send - Send document via email
export async function POST(request: NextRequest, { params }: RouteParams) {
  return apiHandler(async () => {
    const session = await requirePermission("finance:create");
    const { documentId } = await params;
    const body = await request.json().catch(() => ({}));

    const document = await getDocument(session, parseInt(documentId, 10));

    if (!document) return notFound("Document not found");

    // Get contact info (single query for both recipient and template data)
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

    // Determine recipient email (priority: body.email > contact > company > person)
    let recipientEmail = body.email;
    let recipientName = body.name;

    if (!recipientEmail && contactInfo?.email) {
      recipientEmail = contactInfo.email;
      recipientName = contactInfo.name;
    }

    if (!recipientEmail) {
      if (document.company?.email) {
        recipientEmail = document.company.email;
        recipientName = document.company.legalName;
      } else if (document.person?.email) {
        recipientEmail = document.person.email;
        recipientName = `${document.person.firstName} ${document.person.lastName || ""}`.trim();
      }
    }

    if (!recipientEmail) {
      return badRequest(
        "No se encontró email del destinatario. Proporciona un email o asigna un contacto con email.",
        "NO_EMAIL"
      );
    }

    // Get organization info (unified source of truth)
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

    // Build full fiscal address
    const fiscalAddressFull = [
      org?.fiscalAddress,
      org?.fiscalPostalCode,
      org?.fiscalCity,
      org?.fiscalCountry,
    ].filter(Boolean).join(", ");

    // Convert logo to base64 data URI for PDF rendering
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

    // Build document for templates
    const pdfDocument = {
      ...document,
      status: document.status || "draft",
      organizationName: org?.fiscalName || org?.name || undefined,
      organizationAddress: fiscalAddressFull || org?.address || undefined,
      organizationPhone: org?.fiscalPhone || org?.phone || undefined,
      organizationEmail: org?.fiscalEmail || undefined,
      organizationTaxId: org?.taxId || undefined,
      organizationLogo: logoDataUri,
      contactName: recipientName || contactInfo?.name || document.vendor?.name || document.company?.legalName ||
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

    // Generate PDF HTML
    const pdfHtml = generateDocumentHTML(pdfDocument);

    // Generate real PDF
    const { buffer: pdfBuffer, isPDF } = await createPDF(pdfHtml);

    // Generate email HTML
    const emailHtml = generateDocumentEmailHTML(pdfDocument, body.message);
    const subject = body.subject || generateDocumentEmailSubject(pdfDocument);

    // Send email with Resend
    const resend = getResendClient();

    const { data, error } = await resend.emails.send({
      from: getFromEmail(),
      to: recipientEmail,
      subject: subject,
      html: emailHtml,
      attachments: [
        {
          filename: isPDF
            ? `${document.type}-${document.number}.pdf`
            : `${document.type}-${document.number}.html`,
          content: pdfBuffer.toString("base64"),
        },
      ],
    });

    if (error) {
      console.error("Resend error:", error);
      return serverError(error.message || "Error al enviar email");
    }

    // Update document status to 'sent' if it was draft
    if (document.status === "draft") {
      await updateDocumentStatus(session, document.id, "sent");
    }

    return ok({
      messageId: data?.id,
      sentTo: recipientEmail,
      status: "sent",
    });
  }, "POST /api/finance/documents/[documentId]/send");
}
