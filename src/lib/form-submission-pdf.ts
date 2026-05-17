import { format } from "date-fns";
import { es } from "date-fns/locale";

interface SubmissionField {
  label: string;
  type: string;
  value: unknown;
  options?: unknown;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

interface SubmissionPDFData {
  formName: string;
  formDescription?: string | null;
  respondentName?: string | null;
  respondentEmail?: string | null;
  submittedAt: Date | string;
  fields: SubmissionField[];
  organizationName?: string;
  organizationLogo?: string;
}

function formatFieldValue(field: SubmissionField): string {
  const val = field.value;
  if (val === null || val === undefined || val === "") return "<em>Sin respuesta</em>";

  if (field.type === "checkbox") {
    return val ? "✓ Sí" : "✗ No";
  }
  if (field.type === "multi_select" && Array.isArray(val)) {
    return escapeHtml(val.join(", "));
  }
  if (field.type === "image_select") {
    return escapeHtml(String(val));
  }
  if (field.type === "signature" && typeof val === "string" && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(val)) {
    return `<img src="${val}" alt="Firma" style="max-width: 300px; max-height: 120px; border: 1px solid #e5e7eb; border-radius: 4px;">`;
  }
  if (field.type === "section_title" || field.type === "descriptive_text" || field.type === "separator") {
    return "";
  }
  return escapeHtml(String(val));
}

export function generateSubmissionHTML(data: SubmissionPDFData): string {
  const submittedDate = typeof data.submittedAt === "string"
    ? new Date(data.submittedAt)
    : data.submittedAt;

  const fieldsHTML = data.fields
    .filter((f) => f.type !== "separator")
    .map((field) => {
      if (field.type === "section_title") {
        return `<tr><td colspan="2" style="padding: 16px 12px 8px; font-size: 16px; font-weight: 600; color: #111827; border-bottom: 2px solid #e5e7eb;">${escapeHtml(field.label)}</td></tr>`;
      }
      if (field.type === "descriptive_text") {
        return `<tr><td colspan="2" style="padding: 8px 12px; font-size: 13px; color: #6b7280; font-style: italic;">${escapeHtml(field.label)}</td></tr>`;
      }
      return `
      <tr>
        <td style="padding: 10px 12px; border-bottom: 1px solid #f3f4f6; font-weight: 500; color: #374151; width: 35%; vertical-align: top;">${escapeHtml(field.label)}</td>
        <td style="padding: 10px 12px; border-bottom: 1px solid #f3f4f6; color: #111827;">${formatFieldValue(field)}</td>
      </tr>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${data.formName} - Respuesta</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px; line-height: 1.5; color: #111827; background: #ffffff;
    }
    .container { max-width: 800px; margin: 0 auto; padding: 40px; }
    .header { margin-bottom: 32px; padding-bottom: 20px; border-bottom: 2px solid #111827; }
    .form-title { font-size: 22px; font-weight: 700; margin-bottom: 4px; }
    .form-desc { font-size: 14px; color: #6b7280; margin-bottom: 12px; }
    .meta { display: flex; gap: 24px; flex-wrap: wrap; }
    .meta-item { font-size: 13px; color: #6b7280; }
    .meta-value { font-weight: 500; color: #111827; }
    .fields-table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
    .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e5e7eb; text-align: center; font-size: 12px; color: #9ca3af; }
    @media print {
      body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
      .container { padding: 20px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      ${data.organizationLogo ? `<img src="${data.organizationLogo}" alt="Logo" style="height: 40px; margin-bottom: 12px;">` : ""}
      <div class="form-title">${data.formName}</div>
      ${data.formDescription ? `<div class="form-desc">${data.formDescription}</div>` : ""}
      <div class="meta">
        ${data.respondentName ? `<div class="meta-item">Respondido por: <span class="meta-value">${data.respondentName}</span></div>` : ""}
        ${data.respondentEmail ? `<div class="meta-item">Email: <span class="meta-value">${data.respondentEmail}</span></div>` : ""}
        <div class="meta-item">Fecha: <span class="meta-value">${format(submittedDate, "dd/MM/yyyy HH:mm", { locale: es })}</span></div>
      </div>
    </div>

    <table class="fields-table">
      <tbody>
        ${fieldsHTML}
      </tbody>
    </table>

    <div class="footer">
      <p>Documento generado por Hubents &bull; ${format(new Date(), "dd/MM/yyyy HH:mm", { locale: es })}</p>
    </div>
  </div>
</body>
</html>`;
}
