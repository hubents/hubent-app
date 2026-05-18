"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect, useCallback, use } from "react";
import { useOrgCurrency } from "@/hooks/use-org-currency";
import { EventSectionGuard } from "@/components/events/event-section-guard";
import { DocumentDrawer } from "@/components/finance/document-drawer";
import { PaymentDrawer } from "@/components/finance/payment-drawer";
import { DocumentPreview } from "@/components/finance/document-preview";
import { useUserSessionContext } from "@/contexts/user-session-context";
import { useEventPermissions } from "@/hooks/use-event-permissions";
import { hgIcon } from "@/components/ui/hg-icon";
import {
  PlusSignIcon,
  Wallet01Icon,
  Tick02Icon,
  Clock01Icon,
  InvoiceIcon,
  MoreHorizontalIcon,
  File01Icon,
  FileEditIcon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { appConfirm } from "@/lib/confirm";

const IcoPlus   = hgIcon(PlusSignIcon);
const IcoWallet = hgIcon(Wallet01Icon);
const IcoPaid   = hgIcon(Tick02Icon);
const IcoPending= hgIcon(Clock01Icon);
const IcoQuote  = hgIcon(File01Icon);
const IcoInvoice= hgIcon(InvoiceIcon);
const IcoMore   = hgIcon(MoreHorizontalIcon);
const IcoReceipt= hgIcon(FileEditIcon);

interface FinDoc {
  id: number;
  type: string;
  number: string;
  status: string;
  direction: string | null;
  contactId: number | null;
  vendorId: number | null;
  issueDate: string;
  dueDate: string | null;
  total: string;
  paidAmount: string | null;
  currency: string;
  contactName: string | null;
  vendorName: string | null;
  companyName: string | null;
  personFirstName: string | null;
  personLastName: string | null;
}

interface DocGroup {
  key: string;
  emitter: string;
  initials: string;
  color: string;
  docs: FinDoc[];
  total: number;
  paid: number;
}

const EMITTER_COLORS = [
  "#6B8CE8","#8CC8B0","#C4A08C","#B89DC4","#C49A3C",
  "#E8AC6B","#8CB8C8","#C48CA0","#A0C48C","#8CA0C4",
];

const DOC_STATUS: Record<string, { label: string; bg: string; ink: string }> = {
  draft:   { label: "Borrador",  bg: "#F3F4F6", ink: "#374151" },
  sent:    { label: "Enviado",   bg: "#DBEAFE", ink: "#1E40AF" },
  partial: { label: "Parcial",   bg: "#FEF3C7", ink: "#92400E" },
  paid:    { label: "Pagado",    bg: "#D1FAE5", ink: "#065F46" },
  overdue: { label: "Vencido",   bg: "#FEE2E2", ink: "#991B1B" },
  accepted:{ label: "Aceptado",  bg: "#D1FAE5", ink: "#065F46" },
  rejected:{ label: "Rechazado", bg: "#FEE2E2", ink: "#991B1B" },
  payment_promise: { label: "Promesa pago", bg: "#EDE9FE", ink: "#5B21B6" },
};

function isOverdue(doc: FinDoc) {
  if (!doc.dueDate) return false;
  if (doc.status === "paid" || doc.status === "cancelled") return false;
  return new Date(doc.dueDate) < new Date();
}

function docStatus(doc: FinDoc) {
  return DOC_STATUS[isOverdue(doc) ? "overdue" : doc.status] ?? DOC_STATUS.draft;
}

function emitterName(doc: FinDoc): string {
  if (doc.vendorName) return doc.vendorName;
  if (doc.contactName) return doc.contactName;
  if (doc.companyName) return doc.companyName;
  if (doc.personFirstName) return `${doc.personFirstName} ${doc.personLastName || ""}`.trim();
  return "Sin emisor";
}

function toInitials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join("").toUpperCase() || "?";
}

function groupByEmitter(docs: FinDoc[]): DocGroup[] {
  const map = new Map<string, DocGroup>();
  let colorIdx = 0;
  for (const doc of docs) {
    const key = doc.vendorId ? `v${doc.vendorId}` : doc.contactId ? `c${doc.contactId}` : "manual";
    if (!map.has(key)) {
      const name = emitterName(doc);
      map.set(key, {
        key,
        emitter: name,
        initials: toInitials(name),
        color: EMITTER_COLORS[colorIdx++ % EMITTER_COLORS.length],
        docs: [],
        total: 0,
        paid: 0,
      });
    }
    const g = map.get(key)!;
    g.docs.push(doc);
    g.total += parseFloat(doc.total || "0");
    g.paid  += parseFloat(doc.paidAmount || "0");
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

export default function EventFinancesPage({ params }: { params: Promise<{ id: string }> }) {
  const t = useTranslations("eventDetail");
  const { id } = use(params);
  const eventId = parseInt(id, 10);
  const { eventScoped } = useUserSessionContext();
  const { canEdit } = useEventPermissions(eventId, eventScoped);
  const canEditFinances = canEdit("finances");
  const { formatCurrency } = useOrgCurrency();

  const [loading, setLoading]   = useState(true);
  const [docs, setDocs]         = useState<FinDoc[]>([]);
  const [budget, setBudget]     = useState(0);

  // Drawer / preview state
  const [drawerOpen, setDrawerOpen]           = useState(false);
  const [drawerDocId, setDrawerDocId]         = useState<number | undefined>();
  const [drawerType, setDrawerType]           = useState<"quote" | "invoice">("invoice");
  const [drawerInitial, setDrawerInitial]     = useState<Record<string, unknown> | undefined>();
  const [previewOpen, setPreviewOpen]         = useState(false);
  const [previewDoc, setPreviewDoc]           = useState<Record<string, unknown> | null>(null);
  const [paymentOpen, setPaymentOpen]         = useState(false);
  const [paymentDoc, setPaymentDoc]           = useState<FinDoc | null>(null);

  // Row menu
  const [menuDocId, setMenuDocId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const [eventRes, quotesRes, invoicesRes] = await Promise.all([
        fetch(`/api/events/${eventId}`),
        fetch(`/api/events/${eventId}/documents/finance?type=quote&limit=200`),
        fetch(`/api/events/${eventId}/documents/finance?type=invoice&limit=200`),
      ]);
      const [eventData, quotesData, invoicesData] = await Promise.all([
        eventRes.json(), quotesRes.json(), invoicesRes.json(),
      ]);
      if (eventData.success) setBudget(parseFloat(eventData.data?.budget || "0"));
      const all: FinDoc[] = [
        ...(quotesData.success ? quotesData.data || [] : []),
        ...(invoicesData.success ? invoicesData.data || [] : []),
      ];
      all.sort((a, b) => new Date(b.issueDate).getTime() - new Date(a.issueDate).getTime());
      setDocs(all);
    } catch {
      toast.error(t("errorLoadingDocuments"));
    } finally {
      setLoading(false);
    }
  }, [eventId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Close row menu on outside click
  useEffect(() => {
    if (!menuDocId) return;
    const h = () => setMenuDocId(null);
    const id = setTimeout(() => document.addEventListener("mousedown", h), 0);
    return () => { clearTimeout(id); document.removeEventListener("mousedown", h); };
  }, [menuDocId]);

  const openNew = (type: "quote" | "invoice") => {
    setDrawerDocId(undefined);
    setDrawerType(type);
    setDrawerInitial({ eventId });
    setDrawerOpen(true);
  };

  const openEdit = (doc: FinDoc) => {
    setDrawerDocId(doc.id);
    setDrawerType(doc.type as "quote" | "invoice");
    setDrawerInitial(undefined);
    setDrawerOpen(true);
  };

  const openPreview = async (docId: number) => {
    try {
      const res = await fetch(`/api/events/${eventId}/documents/finance/${docId}`);
      const data = await res.json();
      if (data.success && data.data) {
        setPreviewDoc(data.data);
        setPreviewOpen(true);
      }
    } catch {
      toast.error(t("errorLoadingDocument"));
    }
  };

  const openPayment = (doc: FinDoc) => {
    setPaymentDoc(doc);
    setPaymentOpen(true);
  };

  const handleDelete = async (doc: FinDoc) => {
    if (!await appConfirm({ title: `${t("deleteDocument")} #${doc.number}`, variant: "destructive", confirmLabel: t("delete") })) return;
    try {
      await fetch(`/api/finance/documents/${doc.id}`, { method: "DELETE" });
      toast.success(t("documentDeleted"));
      fetchData();
    } catch {
      toast.error(t("errorDeleting"));
    }
  };

  // KPIs
  const invoicesDocs = docs.filter(d => d.type === "invoice");
  const quotesDocs   = docs.filter(d => d.type === "quote");
  const totalBilled  = invoicesDocs.reduce((s, d) => s + parseFloat(d.total || "0"), 0);
  const totalPaid    = invoicesDocs.reduce((s, d) => s + parseFloat(d.paidAmount || "0"), 0);
  const totalPending = invoicesDocs
    .filter(d => d.status !== "paid")
    .reduce((s, d) => s + (parseFloat(d.total || "0") - parseFloat(d.paidAmount || "0")), 0);
  const paidPct = totalBilled > 0 ? Math.round((totalPaid / totalBilled) * 100) : 0;

  const groups = groupByEmitter(docs);

  const docStatusLabel = (status: string): string => {
    const map: Record<string, string> = {
      draft: t("statusDraft"),
      sent: t("statusSent"),
      partial: t("statusPartial"),
      paid: t("statusPaid"),
      overdue: t("statusOverdue"),
      accepted: t("statusAccepted"),
      rejected: t("statusRejected"),
      payment_promise: t("statusPaymentPromise"),
    };
    return map[status] ?? status;
  };

  const formatDate = (s: string) => {
    const d = new Date(s);
    return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
  };

  if (loading) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {[1,2,3].map(i => (
          <div key={i} style={{ height: 80, borderRadius: 12, background: "var(--bg-subtle)", animation: "pulse 1.5s ease-in-out infinite" }} />
        ))}
      </div>
    );
  }

  return (
    <EventSectionGuard eventId={eventId} section="finances">
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>

        {/* Toolbar */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: "var(--ink-1)" }}>
              {t("eventFinances")}
            </div>
            <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 2 }}>
              {docs.length} {docs.length !== 1 ? t("documents") : t("document")} · {groups.length} {groups.length !== 1 ? t("vendors") : t("vendor")}
            </div>
          </div>
          {canEditFinances && (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={() => openNew("quote")}
                className="inline-flex items-center gap-1.5 cursor-pointer border-none"
                style={{ background: "var(--bg-subtle)", color: "var(--ink-1)", border: "1px solid var(--line-strong)", padding: "7px 13px", borderRadius: 8, fontSize: 13, fontWeight: 500 }}
              >
                <IcoQuote className="h-3.5 w-3.5" />
                {t("quote")}
              </button>
              <button
                onClick={() => openNew("invoice")}
                className="inline-flex items-center gap-1.5 cursor-pointer border-none transition-colors"
                style={{ background: "var(--color-primary)", color: "var(--color-primary-ink)", padding: "7px 13px", borderRadius: 8, fontSize: 13, fontWeight: 600 }}
                onMouseEnter={e => (e.currentTarget.style.background = "var(--color-primary-hover)")}
                onMouseLeave={e => (e.currentTarget.style.background = "var(--color-primary)")}
              >
                <IcoPlus className="h-3.5 w-3.5" />
                {t("invoice")}
              </button>
            </div>
          )}
        </div>

        {/* KPI strip */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {[
            { label: t("eventBudget"), value: formatCurrency(budget), icon: IcoWallet, bg: "#EEF2FF", ink: "#3730A3" },
            { label: t("billed"), value: formatCurrency(totalBilled), sub: `${invoicesDocs.length} ${invoicesDocs.length !== 1 ? t("invoices") : t("invoice")}`, icon: IcoInvoice, bg: "#EDE9FE", ink: "#5B21B6" },
            { label: t("collected"), value: formatCurrency(totalPaid), sub: `${paidPct}% ${t("ofTotal")}`, icon: IcoPaid, bg: "#D1FAE5", ink: "#065F46" },
            { label: t("pending"), value: formatCurrency(Math.max(0, totalPending)), sub: `${quotesDocs.length} ${quotesDocs.length !== 1 ? t("quotes") : t("quote")}`, icon: IcoPending, bg: "#FEF3C7", ink: "#92400E" },
          ].map(kpi => (
            <div key={kpi.label} style={{ background: "#FFFFFF", border: "1px solid var(--line-1)", borderRadius: 12, padding: "14px 16px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: ".05em" }}>{kpi.label}</span>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: kpi.bg, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <kpi.icon className="h-3.5 w-3.5" style={{ color: kpi.ink }} />
                </div>
              </div>
              <div style={{ fontSize: 20, fontWeight: 700, color: "var(--ink-1)", letterSpacing: "-0.02em" }}>{kpi.value}</div>
              {kpi.sub && <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>{kpi.sub}</div>}
            </div>
          ))}
        </div>

        {/* Progress bar */}
        {totalBilled > 0 && (
          <div style={{ background: "#FFFFFF", border: "1px solid var(--line-1)", borderRadius: 12, padding: "14px 16px" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-2)" }}>{t("collectedOverBilled")}</span>
              <span style={{ fontSize: 13, fontWeight: 600, color: "var(--ink-1)" }}>{paidPct}%</span>
            </div>
            <div style={{ height: 7, background: "var(--bg-subtle)", borderRadius: 999, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.min(paidPct, 100)}%`, background: paidPct >= 100 ? "#4DA363" : "var(--color-primary)", borderRadius: 999, transition: "width .4s ease" }} />
            </div>
          </div>
        )}

        {/* Documents grouped by emitter */}
        {docs.length === 0 ? (
          <div style={{ background: "#FFFFFF", border: "1px solid var(--line-1)", borderRadius: 12, padding: "48px 24px", textAlign: "center" }}>
            <IcoReceipt className="h-10 w-10 mx-auto mb-3" style={{ color: "var(--ink-3)", opacity: 0.4 }} />
            <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-2)", marginBottom: 4 }}>{t("noDocumentsYet")}</div>
            <div style={{ fontSize: 13, color: "var(--ink-3)", maxWidth: 340, margin: "0 auto" }}>
              {t("noDocumentsYetDesc")}
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {groups.map(group => (
              <div key={group.key} style={{ background: "#FFFFFF", border: "1px solid var(--line-1)", borderRadius: 12, overflow: "hidden" }}>
                {/* Group header */}
                <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", borderBottom: "1px solid var(--line-1)", background: "var(--bg-subtle)" }}>
                  <div style={{ width: 32, height: 32, borderRadius: "50%", background: group.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "#FFFFFF", flexShrink: 0 }}>
                    {group.initials}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink-1)" }}>{group.emitter}</div>
                    <div style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
                      {group.docs.length} {group.docs.length !== 1 ? t("documents") : t("document")}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: 14, fontWeight: 700, color: "var(--ink-1)" }}>{formatCurrency(group.total)}</div>
                    {group.paid > 0 && (
                      <div style={{ fontSize: 11.5, color: "#065F46" }}>{formatCurrency(group.paid)} {t("collected")}</div>
                    )}
                  </div>
                </div>

                {/* Doc rows */}
                {group.docs.map((doc, i) => {
                  const st = docStatus(doc);
                  const isLast = i === group.docs.length - 1;
                  const isInvoice = doc.type === "invoice";
                  const menuOpen = menuDocId === doc.id;
                  return (
                    <div
                      key={doc.id}
                      style={{ display: "flex", alignItems: "center", gap: 12, padding: "11px 16px", borderBottom: isLast ? "none" : "1px solid var(--line-1)", position: "relative" }}
                    >
                      {/* Doc type icon */}
                      <div style={{ width: 28, height: 28, borderRadius: 7, background: isInvoice ? "#EDE9FE" : "#DBEAFE", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                        {isInvoice
                          ? <IcoInvoice className="h-3.5 w-3.5" style={{ color: "#5B21B6" }} />
                          : <IcoQuote   className="h-3.5 w-3.5" style={{ color: "#1E40AF" }} />}
                      </div>

                      {/* Info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                          <span style={{ fontSize: 13, fontWeight: 500, color: "var(--ink-1)" }}>
                            {isInvoice ? t("invoice") : t("quote")} #{doc.number}
                          </span>
                          <span style={{ background: st.bg, color: st.ink, borderRadius: 999, fontSize: 10.5, fontWeight: 600, padding: "1px 8px" }}>
                            {docStatusLabel(isOverdue(doc) ? "overdue" : doc.status)}
                          </span>
                        </div>
                        <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 1 }}>
                          {formatDate(doc.issueDate)}
                          {doc.dueDate && ` · ${t("dueOn")} ${formatDate(doc.dueDate)}`}
                        </div>
                      </div>

                      {/* Amount */}
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-1)" }}>
                          {formatCurrency(parseFloat(doc.total || "0"))}
                        </div>
                        {doc.paidAmount && parseFloat(doc.paidAmount) > 0 && (
                          <div style={{ fontSize: 11, color: "#065F46" }}>
                            {formatCurrency(parseFloat(doc.paidAmount))} {t("collected")}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div style={{ position: "relative", flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => setMenuDocId(menuOpen ? null : doc.id)}
                          className="cursor-pointer border-none"
                          style={{ background: menuOpen ? "var(--bg-subtle)" : "transparent", padding: "4px 6px", borderRadius: 6, display: "flex", color: "var(--ink-3)" }}
                        >
                          <IcoMore className="h-4 w-4" />
                        </button>
                        {menuOpen && (
                          <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, background: "#FFFFFF", border: "1px solid var(--line-1)", borderRadius: 10, minWidth: 190, padding: 6, boxShadow: "0 12px 32px rgba(15,16,18,.12)", zIndex: 50 }}>
                            <DocMenuItem label={t("preview")} onClick={() => { openPreview(doc.id); setMenuDocId(null); }} />
                            {canEditFinances && doc.status !== "paid" && (
                              <DocMenuItem label={t("edit")} onClick={() => { openEdit(doc); setMenuDocId(null); }} />
                            )}
                            {canEditFinances && isInvoice && (doc.status === "sent" || doc.status === "partial" || doc.status === "draft") && (
                              <DocMenuItem label={t("recordPayment")} onClick={() => { openPayment(doc); setMenuDocId(null); }} highlight />
                            )}
                            {canEditFinances && doc.status !== "paid" && (
                              <DocMenuItem label={t("delete")} onClick={() => { handleDelete(doc); setMenuDocId(null); }} danger />
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Drawers */}
      <DocumentDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        documentId={drawerDocId}
        type={drawerType}
        initialData={drawerInitial}
        onSuccess={() => { setDrawerOpen(false); fetchData(); }}
      />
      <DocumentPreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        document={previewDoc as any}
      />
      {paymentDoc && (
        <PaymentDrawer
          open={paymentOpen}
          onOpenChange={setPaymentOpen}
          documentId={paymentDoc.id}
          defaultDirection={(paymentDoc.direction as "incoming" | "outgoing") || "outgoing"}
          onSuccess={() => { setPaymentOpen(false); fetchData(); }}
        />
      )}
    </EventSectionGuard>
  );
}

function DocMenuItem({ label, onClick, danger, highlight }: { label: string; onClick: () => void; danger?: boolean; highlight?: boolean }) {
  return (
    <button
      onClick={onClick}
      className="w-full text-left cursor-pointer border-none flex items-center"
      style={{ gap: 8, padding: "8px 10px", borderRadius: 6, background: "transparent", fontSize: 13, fontWeight: 500, color: danger ? "#C33" : highlight ? "var(--color-primary)" : "var(--ink-1)" }}
      onMouseEnter={e => (e.currentTarget.style.background = "var(--bg-subtle)")}
      onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
    >
      {label}
    </button>
  );
}
