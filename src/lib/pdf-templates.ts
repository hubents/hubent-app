import { format } from "date-fns";
import { es } from "date-fns/locale";

// ============================================
// TYPES
// ============================================

interface DocumentItem {
  description: string;
  quantity: string | null;
  unitPrice: string;
  discount?: string | null;
  taxRate?: string | null;
  total: string | null;
}

interface FinanceDocument {
  id: number;
  type: string;
  number: string;
  status: string;
  issueDate: string | Date | null;
  dueDate: string | Date | null;
  validUntil: string | Date | null;
  subtotal: string | null;
  taxAmount: string | null;
  total: string | null;
  currency: string | null;
  globalDiscount?: string | null;
  globalDiscountType?: string | null;
  paymentMethod?: string | null;
  notes: string | null;
  termsAndConditions: string | null;
  items: DocumentItem[];
  // Organization info
  organizationName?: string;
  organizationAddress?: string;
  organizationPhone?: string;
  organizationEmail?: string;
  organizationTaxId?: string;
  organizationLogo?: string;
  // Client info
  contactName?: string | null;
  contactEmail?: string | null;
  contactPhone?: string | null;
  contactAddress?: string | null;
  contactTaxId?: string | null;
  vendorName?: string | null;
  vendorEmail?: string | null;
  vendorPhone?: string | null;
  vendorAddress?: string | null;
  companyName?: string | null;
  personFirstName?: string | null;
  personLastName?: string | null;
  eventName?: string | null;
}

// ============================================
// CONSTANTS
// ============================================

const TYPE_LABELS: Record<string, string> = {
  quote: "PRESUPUESTO",
  proforma: "PROFORMA",
  invoice: "FACTURA",
  delivery_note: "ALBARÁN",
  credit_note: "FACTURA RECTIFICATIVA",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Borrador",
  approved: "Aprobado",
  sent: "Pendiente",
  accepted: "Aceptado",
  rejected: "Rechazado",
  paid: "Pagado",
  overdue: "Vencido",
  cancelled: "Cancelado",
  delivered: "Entregado",
};

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cash: "Efectivo",
  bank_transfer: "Transferencia bancaria",
  card: "Tarjeta",
  stripe: "Stripe",
  other: "Otro",
};

// ============================================
// HELPERS
// ============================================

function formatCurrency(amount: string | number | null, currency: string | null = "EUR"): string {
  const num = typeof amount === "string" ? parseFloat(amount || "0") : (amount || 0);
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: currency || "EUR",
  }).format(num);
}

function formatDate(date: string | Date | null): string {
  if (!date) return "-";
  const dateObj = typeof date === "string" ? new Date(date) : date;
  return format(dateObj, "dd/MM/yyyy", { locale: es });
}

function getClientName(doc: FinanceDocument): string {
  if (doc.contactName) return doc.contactName;
  if (doc.vendorName) return doc.vendorName;
  if (doc.companyName) return doc.companyName;
  if (doc.personFirstName) {
    return `${doc.personFirstName} ${doc.personLastName || ""}`.trim();
  }
  return "Sin cliente";
}

function getClientDetails(doc: FinanceDocument) {
  return {
    email: doc.contactEmail || doc.vendorEmail || null,
    phone: doc.contactPhone || doc.vendorPhone || null,
    address: doc.contactAddress || doc.vendorAddress || null,
    taxId: doc.contactTaxId || null,
  };
}

function formatQuantity(qty: string | number | null): string {
  if (qty === null || qty === undefined) return "0";
  const num = typeof qty === "string" ? parseFloat(qty) : qty;
  if (isNaN(num)) return "0";
  return Number.isInteger(num) ? num.toString() : num.toFixed(2);
}

// ============================================
// PDF HTML TEMPLATE
// ============================================

export function generateDocumentHTML(doc: FinanceDocument): string {
  const typeLabel = TYPE_LABELS[doc.type] || doc.type.toUpperCase();
  const clientName = getClientName(doc);

  const itemsHTML = doc.items
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">${item.description}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${formatQuantity(item.quantity)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatCurrency(item.unitPrice, doc.currency)}</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.discount || "0"}%</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.taxRate ?? "21"}%</td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: 500;">${formatCurrency(item.total, doc.currency)}</td>
      </tr>
    `
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${typeLabel} ${doc.number}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      line-height: 1.5;
      color: #111827;
      background: #ffffff;
    }
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 40px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
      padding-bottom: 20px;
      border-bottom: 2px solid #111827;
    }
    .logo-section {
      flex: 1;
    }
    .logo {
      height: 48px;
      margin-bottom: 12px;
    }
    .org-info {
      font-size: 12px;
      color: #6b7280;
    }
    .doc-info {
      text-align: right;
    }
    .doc-type {
      font-size: 24px;
      font-weight: 700;
      color: #111827;
      margin-bottom: 4px;
    }
    .doc-number {
      font-size: 16px;
      color: #6b7280;
      margin-bottom: 8px;
    }
    .doc-id {
      font-size: 12px;
      color: #9ca3af;
      margin-left: 4px;
    }
    .doc-status {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      background: #f3f4f6;
      color: #374151;
    }
    .parties {
      display: flex;
      justify-content: space-between;
      margin-bottom: 32px;
    }
    .party {
      flex: 1;
    }
    .party-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #9ca3af;
      margin-bottom: 8px;
    }
    .party-name {
      font-size: 16px;
      font-weight: 600;
      margin-bottom: 4px;
    }
    .party-details {
      font-size: 13px;
      color: #6b7280;
    }
    .dates {
      display: flex;
      gap: 32px;
      margin-bottom: 32px;
      padding: 16px;
      background: #f9fafb;
      border-radius: 8px;
    }
    .date-item {
      flex: 1;
    }
    .date-label {
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #9ca3af;
      margin-bottom: 4px;
    }
    .date-value {
      font-size: 14px;
      font-weight: 500;
    }
    .items-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 24px;
    }
    .items-table th {
      padding: 12px;
      text-align: left;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #6b7280;
      background: #f9fafb;
      border-bottom: 2px solid #e5e7eb;
    }
    .items-table th:nth-child(2),
    .items-table th:nth-child(4),
    .items-table th:nth-child(5) {
      text-align: center;
    }
    .items-table th:nth-child(3),
    .items-table th:nth-child(6) {
      text-align: right;
    }
    .totals {
      display: flex;
      justify-content: flex-end;
      margin-bottom: 32px;
    }
    .totals-box {
      width: 280px;
    }
    .total-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #e5e7eb;
    }
    .total-row.grand {
      border-bottom: none;
      border-top: 2px solid #111827;
      padding-top: 12px;
      margin-top: 8px;
      font-size: 18px;
      font-weight: 700;
    }
    .total-label {
      color: #6b7280;
    }
    .total-row.grand .total-label {
      color: #111827;
    }
    .notes-section {
      margin-bottom: 24px;
      padding: 16px;
      background: #f9fafb;
      border-radius: 8px;
    }
    .notes-title {
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #374151;
      margin-bottom: 8px;
    }
    .notes-content {
      font-size: 13px;
      color: #6b7280;
      white-space: pre-wrap;
    }
    .footer {
      margin-top: 40px;
      padding-top: 20px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      font-size: 12px;
      color: #9ca3af;
    }
    @media print {
      body {
        print-color-adjust: exact;
        -webkit-print-color-adjust: exact;
      }
      .container {
        padding: 20px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <div class="logo-section">
        ${doc.organizationLogo ? `<img src="${doc.organizationLogo}" alt="Logo" class="logo">` : '<div style="font-size: 24px; font-weight: 700; margin-bottom: 12px;">hubents</div>'}
        <div class="org-info">
          ${doc.organizationName ? `<div>${doc.organizationName}</div>` : ""}
          ${doc.organizationAddress ? `<div>${doc.organizationAddress}</div>` : ""}
          ${doc.organizationTaxId ? `<div>CIF/NIF: ${doc.organizationTaxId}</div>` : ""}
          ${doc.organizationPhone ? `<div>Tel: ${doc.organizationPhone}</div>` : ""}
          ${doc.organizationEmail ? `<div>${doc.organizationEmail}</div>` : ""}
        </div>
      </div>
      <div class="doc-info">
        <div class="doc-type">${typeLabel}</div>
        <div class="doc-number">${doc.number} <span class="doc-id">#${doc.id}</span></div>
        <span class="doc-status">${STATUS_LABELS[doc.status] || doc.status}</span>
      </div>
    </div>

    <!-- Parties -->
    <div class="parties">
      <div class="party">
        <div class="party-label">Cliente</div>
        <div class="party-name">${clientName}</div>
        <div class="party-details">
          ${(() => { const d = getClientDetails(doc); return [
            d.email ? `<div>${d.email}</div>` : "",
            d.phone ? `<div>${d.phone}</div>` : "",
            d.address ? `<div>${d.address}</div>` : "",
            d.taxId ? `<div>CIF/NIF: ${d.taxId}</div>` : "",
          ].join(""); })()}
        </div>
      </div>
      ${
        doc.eventName
          ? `
      <div class="party" style="text-align: right;">
        <div class="party-label">Evento</div>
        <div class="party-name">${doc.eventName}</div>
      </div>
      `
          : ""
      }
    </div>

    <!-- Dates -->
    <div class="dates">
      <div class="date-item">
        <div class="date-label">Fecha de emisión</div>
        <div class="date-value">${formatDate(doc.issueDate)}</div>
      </div>
      ${
        doc.dueDate
          ? `
      <div class="date-item">
        <div class="date-label">Fecha de vencimiento</div>
        <div class="date-value">${formatDate(doc.dueDate)}</div>
      </div>
      `
          : ""
      }
      ${
        doc.validUntil
          ? `
      <div class="date-item">
        <div class="date-label">Válido hasta</div>
        <div class="date-value">${formatDate(doc.validUntil)}</div>
      </div>
      `
          : ""
      }
    </div>

    <!-- Items Table -->
    <table class="items-table">
      <thead>
        <tr>
          <th>Descripción</th>
          <th>Cant.</th>
          <th>Precio</th>
          <th>Dto.</th>
          <th>IVA</th>
          <th>Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHTML}
      </tbody>
    </table>

    <!-- Totals -->
    <div class="totals">
      <div class="totals-box">
        <div class="total-row">
          <span class="total-label">Subtotal</span>
          <span>${formatCurrency(doc.subtotal, doc.currency)}</span>
        </div>
        ${(() => {
          const gd = parseFloat(doc.globalDiscount || "0");
          if (gd > 0) {
            const label = doc.globalDiscountType === "fixed"
              ? `Descuento global (${formatCurrency(gd, doc.currency)})`
              : `Descuento global (${gd}%)`;
            return `<div class="total-row"><span class="total-label">${label}</span><span>-</span></div>`;
          }
          return "";
        })()}
        <div class="total-row">
          <span class="total-label">IVA</span>
          <span>${formatCurrency(doc.taxAmount, doc.currency)}</span>
        </div>
        <div class="total-row grand">
          <span class="total-label">Total</span>
          <span>${formatCurrency(doc.total, doc.currency)}</span>
        </div>
      </div>
    </div>

    <!-- Payment Method -->
    ${
      doc.paymentMethod
        ? `
    <div class="notes-section">
      <div class="notes-title">Método de pago</div>
      <div class="notes-content">${PAYMENT_METHOD_LABELS[doc.paymentMethod] || doc.paymentMethod}</div>
    </div>
    `
        : ""
    }

    <!-- Notes -->
    ${
      doc.notes
        ? `
    <div class="notes-section">
      <div class="notes-title">Notas</div>
      <div class="notes-content">${doc.notes}</div>
    </div>
    `
        : ""
    }

    <!-- Terms -->
    ${
      doc.termsAndConditions
        ? `
    <div class="notes-section">
      <div class="notes-title">Términos y Condiciones</div>
      <div class="notes-content">${doc.termsAndConditions}</div>
    </div>
    `
        : ""
    }

    <!-- Footer -->
    <div class="footer">
      <p>Documento generado por Hubents • ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}</p>
    </div>
  </div>
</body>
</html>
`;
}

// ============================================
// EMAIL TEMPLATE FOR SENDING DOCUMENTS
// ============================================

export function generateDocumentEmailHTML(
  doc: FinanceDocument,
  customMessage?: string
): string {
  const typeLabel = TYPE_LABELS[doc.type] || doc.type;
  const clientName = getClientName(doc);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f9fafb;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; padding: 48px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 40px 24px; text-align: center; border-bottom: 1px solid #e5e7eb;">
              ${doc.organizationLogo
                ? `<img src="${doc.organizationLogo}" alt="${doc.organizationName || 'Logo'}" style="height: 48px; max-width: 200px; object-fit: contain;">`
                : `<div style="font-size: 24px; font-weight: 700;">${doc.organizationName || 'hubents'}</div>`
              }
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px 40px;">
              <h1 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #111827;">
                ${typeLabel} ${doc.number}
              </h1>
              
              <p style="margin: 0 0 24px; color: #6b7280; font-size: 15px; line-height: 1.6;">
                Hola ${clientName},
              </p>
              
              ${
                customMessage
                  ? `
              <p style="margin: 0 0 24px; color: #6b7280; font-size: 15px; line-height: 1.6;">
                ${customMessage}
              </p>
              `
                  : `
              <p style="margin: 0 0 24px; color: #6b7280; font-size: 15px; line-height: 1.6;">
                Adjunto encontrarás el ${typeLabel.toLowerCase()} <strong>${doc.number}</strong>.
              </p>
              `
              }
              
              <!-- Document Summary -->
              <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                <table width="100%" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Número:</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 500; color: #111827;">${doc.number}</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Fecha:</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 500; color: #111827;">${formatDate(doc.issueDate)}</td>
                  </tr>
                  ${
                    doc.dueDate
                      ? `
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Vencimiento:</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 500; color: #111827;">${formatDate(doc.dueDate)}</td>
                  </tr>
                  `
                      : ""
                  }
                  ${
                    doc.validUntil
                      ? `
                  <tr>
                    <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Válido hasta:</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: 500; color: #111827;">${formatDate(doc.validUntil)}</td>
                  </tr>
                  `
                      : ""
                  }
                  <tr style="border-top: 1px solid #e5e7eb;">
                    <td style="padding: 12px 0 8px; color: #111827; font-size: 16px; font-weight: 600;">Total:</td>
                    <td style="padding: 12px 0 8px; text-align: right; font-size: 18px; font-weight: 700; color: #111827;">${formatCurrency(doc.total, doc.currency)}</td>
                  </tr>
                </table>
              </div>
              
              <p style="margin: 0; color: #9ca3af; font-size: 13px;">
                El documento PDF está adjunto a este correo.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; border-top: 1px solid #e5e7eb; text-align: center;">
              <p style="margin: 0; font-size: 13px; color: #9ca3af;">
                © ${new Date().getFullYear()} Hubents. Todos los derechos reservados.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

export function generateDocumentEmailSubject(doc: FinanceDocument): string {
  const typeLabel = TYPE_LABELS[doc.type] || doc.type;
  return `${typeLabel} ${doc.number}`;
}
