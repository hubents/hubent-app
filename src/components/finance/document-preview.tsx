"use client";

import { useState, useEffect, useMemo } from "react";
import {
  PencilEdit02Icon,
  PrinterIcon,
  MailSend01Icon,
  Download01Icon,
  Loading03Icon,
  EyeIcon,
  CoinsEuroIcon,
  LinkSquare01Icon,
  Copy01Icon,
  Cancel01Icon,
  Tick01Icon,
  ArrowUp01Icon,
} from "@hugeicons/core-free-icons";
import { hgIcon } from "@/components/ui/hg-icon";
import { toast } from "sonner";
import { downloadDocumentPDF, downloadPDFFromHTML } from "@/lib/pdf-download";
import { LiveDocumentPreview, type OrganizationPreviewData, type PreviewData } from "./live-document-preview";
import { PaymentDrawer } from "./payment-drawer";
import { fmtMoney } from "@/lib/format";

const IcoEdit     = hgIcon(PencilEdit02Icon);
const IcoPrint    = hgIcon(PrinterIcon);
const IcoSend     = hgIcon(MailSend01Icon);
const IcoDownload = hgIcon(Download01Icon);
const IcoSpin     = hgIcon(Loading03Icon);
const IcoEye      = hgIcon(EyeIcon);
const IcoCoins    = hgIcon(CoinsEuroIcon);
const IcoLink     = hgIcon(LinkSquare01Icon);
const IcoCopy     = hgIcon(Copy01Icon);
const IcoX        = hgIcon(Cancel01Icon);
const IcoCheck    = hgIcon(Tick01Icon);
const IcoUp       = hgIcon(ArrowUp01Icon);

interface DocumentItem {
  id: number;
  description: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  taxRate: string;
  total: string;
}

interface Document {
  id: number;
  type: string;
  number: string;
  status: string;
  issueDate: string | null;
  dueDate: string | null;
  validUntil: string | null;
  subtotal: string;
  taxAmount: string;
  total: string;
  paidAmount?: string | null;
  currency: string;
  notes: string | null;
  termsAndConditions: string | null;
  stripePaymentUrl?: string | null;
  globalDiscount?: string | null;
  globalDiscountType?: string | null;
  paymentMethod?: string | null;
  direction?: string | null;
  items: DocumentItem[];
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

interface DocumentPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: Document | null;
  onEdit?: () => void;
  onStatusChange?: (status: string) => void;
  onRefresh?: () => void;
  readOnly?: boolean;
  pdfUrl?: string;
}

const TYPE_LABELS: Record<string, string> = {
  quote:        "Presupuesto",
  proforma:     "Proforma",
  invoice:      "Factura",
  delivery_note: "Albarán",
  credit_note:  "Factura Rectificativa",
};

const STATUS_PILL: Record<string, { bg: string; fg: string; label: string }> = {
  draft:           { bg: "#EDEAE3", fg: "#5B5649",  label: "Borrador" },
  approved:        { bg: "#EDEAE3", fg: "#5B5649",  label: "Borrador" },
  sent:            { bg: "#E8D4FF", fg: "#6B4BE0",  label: "Enviado" },
  accepted:        { bg: "#D9ECD1", fg: "#1F6A3A",  label: "Aceptado" },
  payment_promise: { bg: "#FCEFC9", fg: "#8A6A1A",  label: "Promesa de pago" },
  paid:            { bg: "#D9ECD1", fg: "#1F6A3A",  label: "Pagado" },
  partial:         { bg: "#FCEFC9", fg: "#8A6A1A",  label: "Pago parcial" },
  overdue:         { bg: "#F8D4D4", fg: "#8B2A2A",  label: "Vencido" },
  rejected:        { bg: "#F8D4D4", fg: "#8B2A2A",  label: "Cancelado" },
  cancelled:       { bg: "#F8D4D4", fg: "#8B2A2A",  label: "Cancelado" },
  delivered:       { bg: "#D9ECD1", fg: "#1F6A3A",  label: "Entregado" },
};

const STATUS_TRANSITIONS: Record<string, Record<string, { label: string }>> = {
  quote: {
    sent:            { label: "Marcar como enviado" },
    accepted:        { label: "Marcar como aceptado" },
    payment_promise: { label: "Promesa de pago" },
    rejected:        { label: "Rechazar" },
  },
  invoice: {
    sent:    { label: "Marcar como enviado" },
    paid:    { label: "Marcar como pagado" },
    partial: { label: "Pago parcial" },
  },
  proforma: {
    sent:    { label: "Marcar como enviado" },
    paid:    { label: "Marcar como pagado" },
  },
  delivery_note: {
    sent:      { label: "Marcar como enviado" },
    delivered: { label: "Marcar como entregado" },
  },
  credit_note: {
    sent:    { label: "Marcar como enviado" },
    paid:    { label: "Marcar como pagado" },
  },
};

function getAvailableStatuses(type: string, current: string): string[] {
  if (type === "quote") {
    if (current === "draft")           return ["sent"];
    if (current === "sent")            return ["accepted", "rejected"];
    if (current === "accepted")        return ["payment_promise", "sent"];
    if (current === "payment_promise") return ["accepted", "sent"];
    if (current === "partial")         return ["paid", "payment_promise"];
    if (current === "rejected")        return ["sent", "accepted"];
    return [];
  }
  if (type === "invoice" || type === "proforma" || type === "credit_note") {
    if (current === "draft")   return ["sent"];
    if (current === "sent")    return ["paid"];
    if (current === "partial") return ["paid"];
    return [];
  }
  if (type === "delivery_note") {
    if (current === "draft") return ["sent"];
    if (current === "sent")  return ["delivered"];
    return [];
  }
  return [];
}

export function DocumentPreview({
  open,
  onOpenChange,
  document,
  onEdit,
  onStatusChange,
  onRefresh,
  readOnly,
  pdfUrl,
}: DocumentPreviewProps) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [sendOpen, setSendOpen] = useState(false);
  const [sendLoading, setSendLoading] = useState(false);
  const [sendEmail, setSendEmail] = useState("");
  const [sendMessage, setSendMessage] = useState("");
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [stripeLoading, setStripeLoading] = useState(false);
  const [orgData, setOrgData] = useState<OrganizationPreviewData | undefined>();

  useEffect(() => {
    if (!open) return;
    fetch("/api/user/profile")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        const org = data?.data?.organization;
        if (org) {
          setOrgData({
            name: org.fiscalName || org.name,
            taxId: org.taxId || undefined,
            fiscalAddress: org.fiscalAddress || undefined,
            fiscalCity: org.fiscalCity || undefined,
            fiscalPostalCode: org.fiscalPostalCode || undefined,
            fiscalCountry: org.fiscalCountry || undefined,
            fiscalEmail: org.fiscalEmail || undefined,
            fiscalPhone: org.fiscalPhone || undefined,
            invoiceLogo: org.invoiceLogo || org.logo || undefined,
          });
        }
      })
      .catch(() => {});
  }, [open]);

  const previewData = useMemo((): PreviewData | null => {
    if (!document) return null;
    const clientName =
      document.contactName ||
      document.vendorName ||
      document.companyName ||
      (document.personFirstName ? `${document.personFirstName} ${document.personLastName || ""}`.trim() : "") ||
      undefined;
    return {
      type: document.type as PreviewData["type"],
      contactName: clientName,
      vendorName: document.vendorName || undefined,
      contactEmail: document.contactEmail || document.vendorEmail || undefined,
      contactPhone: document.contactPhone || document.vendorPhone || undefined,
      contactAddress: document.contactAddress || document.vendorAddress || undefined,
      contactTaxId: document.contactTaxId || undefined,
      eventName: document.eventName || undefined,
      documentNumber: document.number,
      documentId: document.id,
      status: document.status,
      items: document.items.map(item => ({
        description: item.description,
        quantity: parseFloat(item.quantity || "0"),
        unitPrice: parseFloat(item.unitPrice || "0"),
        discount: parseFloat(item.discount || "0"),
        taxRate: parseFloat(item.taxRate ?? "21"),
        total: parseFloat(item.total || "0"),
      })),
      notes: document.notes || undefined,
      termsAndConditions: document.termsAndConditions || undefined,
      issueDate: document.issueDate || undefined,
      dueDate: document.dueDate || undefined,
      validUntil: document.validUntil || undefined,
      currency: document.currency || "EUR",
      organization: orgData,
      globalDiscount: parseFloat(document.globalDiscount || "0"),
      globalDiscountType: (document.globalDiscountType as "percentage" | "fixed") || "percentage",
      globalDiscountEnabled: parseFloat(document.globalDiscount || "0") > 0,
      paymentMethod: document.paymentMethod || undefined,
    };
  }, [document, orgData]);

  if (!document) return null;

  const totalAmt   = parseFloat(document.total || "0");
  const paidAmt    = parseFloat(document.paidAmount || "0");
  const pendingAmt = totalAmt - paidAmt;
  const paymentPct = totalAmt > 0 ? Math.min((paidAmt / totalAmt) * 100, 100) : 0;
  const isPartial  = paidAmt > 0 && paidAmt < totalAmt;

  const pill       = STATUS_PILL[document.status] || { bg: "var(--bg-subtle)", fg: "var(--ink-2)", label: document.status };
  const partialPill = STATUS_PILL.partial;
  const typeLabel  = TYPE_LABELS[document.type] || document.type;
  const clientName =
    document.contactName ||
    document.vendorName ||
    document.companyName ||
    (document.personFirstName ? `${document.personFirstName} ${document.personLastName || ""}`.trim() : "Sin cliente");

  const available = getAvailableStatuses(document.type, document.status);
  const transitions = STATUS_TRANSITIONS[document.type] || {};

  const showPaymentSection = !readOnly && (
    document.type === "invoice" ||
    document.type === "proforma" ||
    (document.type === "quote" && ["payment_promise", "partial", "paid"].includes(document.status))
  );

  const handleDownloadPDF = async () => {
    setPdfLoading(true);
    try {
      if (pdfUrl) await downloadPDFFromHTML(pdfUrl, `${document.type}-${document.number}.pdf`);
      else await downloadDocumentPDF(document.id, `${document.type}-${document.number}.pdf`);
    } finally { setPdfLoading(false); }
  };

  const handleSend = async () => {
    setSendLoading(true);
    try {
      const res = await fetch(`/api/finance/documents/${document.id}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: sendEmail || undefined, message: sendMessage || undefined }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success(`Documento enviado a ${data.data.sentTo}`);
        setSendOpen(false); setSendEmail(""); setSendMessage(""); onRefresh?.();
      } else { toast.error(data.error?.message || "Error al enviar"); }
    } catch { toast.error("Error al enviar"); }
    finally { setSendLoading(false); }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const res = await fetch(`/api/finance/documents/${document.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        toast.success(`Estado actualizado`);
        onStatusChange?.(newStatus); onRefresh?.();
      } else { toast.error("Error al actualizar estado"); }
    } catch { toast.error("Error al actualizar estado"); }
  };

  const handleStripeLink = async () => {
    setStripeLoading(true);
    try {
      const res = await fetch("/api/finance/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ documentId: document.id }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        await navigator.clipboard.writeText(data.data.checkoutUrl);
        toast.success("Link de pago copiado"); onRefresh?.();
      } else { toast.error(data.error?.message || "Error al generar link"); }
    } catch { toast.error("Error"); }
    finally { setStripeLoading(false); }
  };

  const ActionBtn = ({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[12.5px] font-medium cursor-pointer transition-colors hover:bg-[var(--bg-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
      style={{ background: "#FFFFFF", border: "1px solid var(--line-strong)", color: "var(--ink-1)" }}
    >
      {children}
    </button>
  );

  return (
    <>
      {/* Payment Drawer */}
      <PaymentDrawer
        open={paymentOpen}
        onOpenChange={setPaymentOpen}
        onSuccess={() => { setPaymentOpen(false); onRefresh?.(); }}
        documentId={document.id}
        document={{
          number: document.number,
          total: document.total,
          paidAmount: document.paidAmount || "0",
          currency: document.currency,
          direction: document.direction,
        }}
        showDirectionSelector={false}
      />

      {/* Send sub-drawer */}
      {sendOpen && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(20,18,12,0.4)", zIndex: 80, display: "flex", justifyContent: "flex-end" }}
          onClick={() => setSendOpen(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: 480, background: "var(--bg-panel)", borderTopLeftRadius: 16, borderBottomLeftRadius: 16, display: "flex", flexDirection: "column", height: "100%" }}
          >
            <div style={{ padding: "18px 22px", borderBottom: "1px solid var(--line-1)", display: "flex", alignItems: "center", gap: 10, flexShrink: 0 }}>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink-1)" }}>Enviar {typeLabel}</div>
                <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>{document.number} · {clientName}</div>
              </div>
              <button onClick={() => setSendOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", padding: 6, display: "flex" }}>
                <IcoX className="h-4 w-4" />
              </button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: "20px 22px", display: "flex", flexDirection: "column", gap: 16 }}>
              {/* Summary */}
              <div style={{ background: "var(--bg-subtle)", borderRadius: 10, padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                  <span style={{ color: "var(--ink-3)" }}>Documento</span>
                  <span style={{ fontWeight: 500, color: "var(--ink-1)" }}>{document.number}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                  <span style={{ color: "var(--ink-3)" }}>Cliente</span>
                  <span style={{ fontWeight: 500, color: "var(--ink-1)" }}>{clientName}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5 }}>
                  <span style={{ color: "var(--ink-3)" }}>Total</span>
                  <span style={{ fontWeight: 700, color: "var(--ink-1)" }}>{fmtMoney(document.total, document.currency)}</span>
                </div>
              </div>
              {/* Email */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink-2)" }}>Email del destinatario</label>
                <input
                  type="email"
                  value={sendEmail}
                  onChange={e => setSendEmail(e.target.value)}
                  placeholder="Dejar vacío para usar el email del contacto"
                  style={{ padding: "8px 12px", border: "1px solid var(--line-1)", borderRadius: 8, fontSize: 13, outline: "none", color: "var(--ink-1)", background: "var(--bg-panel)" }}
                />
                <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>Si no se especifica, se usará el email del contacto asociado.</span>
              </div>
              {/* Message */}
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <label style={{ fontSize: 12.5, fontWeight: 500, color: "var(--ink-2)" }}>Mensaje personalizado (opcional)</label>
                <textarea
                  value={sendMessage}
                  onChange={e => setSendMessage(e.target.value)}
                  placeholder="Añade un mensaje personalizado al email..."
                  rows={4}
                  style={{ padding: "8px 12px", border: "1px solid var(--line-1)", borderRadius: 8, fontSize: 13, outline: "none", color: "var(--ink-1)", background: "var(--bg-panel)", resize: "vertical" }}
                />
              </div>
            </div>
            <div style={{ padding: "14px 22px", borderTop: "1px solid var(--line-1)", display: "flex", gap: 8, justifyContent: "flex-end", flexShrink: 0 }}>
              <button
                onClick={() => window.open(`/api/finance/documents/${document.id}/pdf?format=html`, "_blank")}
                style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--line-1)", background: "var(--bg-panel)", color: "var(--ink-2)", fontSize: 13, cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <IcoEye className="h-3.5 w-3.5" /> Preview
              </button>
              <button onClick={() => setSendOpen(false)} style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--line-1)", background: "var(--bg-panel)", color: "var(--ink-2)", fontSize: 13, cursor: "pointer" }}>Cancelar</button>
              <button
                onClick={handleSend}
                disabled={sendLoading}
                style={{ padding: "8px 18px", borderRadius: 8, border: "none", background: "var(--ink-1)", color: "#fff", fontSize: 13, fontWeight: 500, cursor: sendLoading ? "not-allowed" : "pointer", opacity: sendLoading ? 0.7 : 1, display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                {sendLoading ? <IcoSpin className="h-3.5 w-3.5" style={{ animation: "spin 1s linear infinite" }} /> : <IcoSend className="h-3.5 w-3.5" />}
                {sendLoading ? "Enviando..." : "Enviar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main preview drawer */}
      {open && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(20,18,12,0.35)", zIndex: 60, display: "flex", justifyContent: "flex-end" }}
          onClick={() => onOpenChange(false)}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{ width: "min(760px, 96vw)", background: "var(--bg-panel)", borderTopLeftRadius: 16, borderBottomLeftRadius: 16, display: "flex", flexDirection: "column", height: "100%" }}
          >
            {/* Header */}
            <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--line-1)", display: "flex", alignItems: "center", gap: 12, flexShrink: 0 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: "var(--ink-1)", letterSpacing: "-0.01em" }}>
                    {typeLabel} {document.number}
                  </span>
                  <span
                    className="inline-flex items-center rounded-[999px] text-[11.5px] font-medium"
                    style={{ background: pill.bg, color: pill.fg, padding: "3px 10px" }}
                  >
                    {pill.label}
                  </span>
                  {isPartial && (
                    <span
                      className="inline-flex items-center rounded-[999px] text-[11.5px] font-medium"
                      style={{ background: partialPill.bg, color: partialPill.fg, padding: "3px 10px" }}
                    >
                      {partialPill.label}
                    </span>
                  )}
                </div>
                {clientName !== "Sin cliente" && (
                  <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 3 }}>{clientName}</div>
                )}
              </div>
              <button
                onClick={() => onOpenChange(false)}
                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ink-3)", padding: 6, display: "flex", flexShrink: 0 }}
              >
                <IcoX className="h-4 w-4" />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto" }}>
              {/* Action bar */}
              <div style={{ padding: "12px 22px", borderBottom: "1px solid var(--line-1)", display: "flex", flexWrap: "wrap", gap: 6 }}>
                {onEdit && (
                  <ActionBtn onClick={onEdit}>
                    <IcoEdit className="h-3.5 w-3.5" /> Editar
                  </ActionBtn>
                )}
                <ActionBtn onClick={() => window.print()}>
                  <IcoPrint className="h-3.5 w-3.5" /> Imprimir
                </ActionBtn>
                <ActionBtn onClick={handleDownloadPDF} disabled={pdfLoading}>
                  {pdfLoading ? <IcoSpin className="h-3.5 w-3.5" style={{ animation: "spin 1s linear infinite" }} /> : <IcoDownload className="h-3.5 w-3.5" />}
                  PDF
                </ActionBtn>
                {!readOnly && (
                  <ActionBtn onClick={() => setSendOpen(true)}>
                    <IcoSend className="h-3.5 w-3.5" /> Enviar
                  </ActionBtn>
                )}
                {!readOnly && (document.type === "invoice" || document.type === "proforma") && document.status !== "paid" && document.status !== "cancelled" && pendingAmt > 0 && (
                  document.stripePaymentUrl ? (
                    <ActionBtn onClick={async () => { await navigator.clipboard.writeText(document.stripePaymentUrl!); toast.success("Link copiado"); }}>
                      <IcoCopy className="h-3.5 w-3.5" /> Copiar link pago
                    </ActionBtn>
                  ) : (
                    <ActionBtn onClick={handleStripeLink} disabled={stripeLoading}>
                      {stripeLoading ? <IcoSpin className="h-3.5 w-3.5" style={{ animation: "spin 1s linear infinite" }} /> : <IcoLink className="h-3.5 w-3.5" />}
                      Link de pago
                    </ActionBtn>
                  )
                )}
              </div>

              {/* Status transitions */}
              {!readOnly && available.length > 0 && (
                <div style={{ padding: "10px 22px", borderBottom: "1px solid var(--line-1)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", background: "var(--bg-subtle)" }}>
                  <span style={{ fontSize: 12, color: "var(--ink-3)", fontWeight: 500 }}>Cambiar estado:</span>
                  {available.map(s => {
                    const tr = transitions[s];
                    const sPill = STATUS_PILL[s] || { bg: "var(--bg-subtle)", fg: "var(--ink-2)", label: s };
                    return (
                      <button
                        key={s}
                        onClick={() => handleStatusChange(s)}
                        className="inline-flex items-center gap-1.5 rounded-[7px] text-[12px] font-medium cursor-pointer transition-colors"
                        style={{ padding: "5px 12px", background: sPill.bg, color: sPill.fg, border: "none" }}
                      >
                        <IcoCheck className="h-3 w-3" />
                        {tr?.label || s}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Payment section */}
              {showPaymentSection && (
                <div style={{ padding: "16px 22px", borderBottom: "1px solid var(--line-1)" }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, background: "var(--bg-subtle)", borderRadius: 10, padding: "14px 16px", border: "1px solid var(--line-1)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span style={{ color: "var(--ink-3)" }}>Total documento</span>
                      <span style={{ fontWeight: 500 }}>{fmtMoney(document.total, document.currency)}</span>
                    </div>
                    {paidAmt > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                        <span style={{ color: "#1F6A3A" }}>Pagado</span>
                        <span style={{ color: "#1F6A3A", fontWeight: 500 }}>−{fmtMoney(paidAmt.toString(), document.currency)}</span>
                      </div>
                    )}
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, fontWeight: 700, borderTop: "1px solid var(--line-1)", paddingTop: 8 }}>
                      <span>Pendiente</span>
                      <span style={{ color: pendingAmt > 0 ? "#8A6A1A" : "#1F6A3A" }}>{fmtMoney(pendingAmt.toString(), document.currency)}</span>
                    </div>
                    {paidAmt > 0 && (
                      <div>
                        <div style={{ height: 6, background: "var(--line-2)", borderRadius: 999, overflow: "hidden" }}>
                          <div style={{ height: "100%", width: `${paymentPct}%`, background: "#10B981", borderRadius: 999, transition: "width .4s" }} />
                        </div>
                        <div style={{ fontSize: 11, color: "var(--ink-3)", textAlign: "right", marginTop: 4 }}>
                          {paymentPct.toFixed(0)}% pagado
                        </div>
                      </div>
                    )}
                    {document.status !== "paid" && document.status !== "cancelled" && pendingAmt > 0 && (
                      <button
                        onClick={() => setPaymentOpen(true)}
                        className="inline-flex items-center justify-center gap-2 rounded-[8px] text-[13px] font-semibold cursor-pointer"
                        style={{ padding: "9px 16px", background: "var(--ink-1)", color: "#fff", border: "none", width: "100%" }}
                      >
                        <IcoCoins className="h-4 w-4" /> Registrar pago
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Live document preview */}
              {previewData && (
                <div>
                  <LiveDocumentPreview data={previewData} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
