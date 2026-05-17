"use client";

import { useState, useEffect, Suspense, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { downloadDocumentPDF } from "@/lib/pdf-download";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Search01Icon,
  PlusSignIcon,
  ArrowDown01Icon,
  ArrowUp01Icon,
  ArrowUpDownIcon,
  Tick01Icon,
  MoreVerticalIcon,
  PencilEdit02Icon,
  Copy01Icon,
  Delete01Icon,
  Exchange01Icon,
  MailSend01Icon,
  Cancel01Icon,
  EyeIcon,
  Download01Icon,
  CheckmarkCircle01Icon,
} from "@hugeicons/core-free-icons";
import { hgIcon } from "@/components/ui/hg-icon";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { DocumentDrawer } from "@/components/finance/document-drawer";
import { DocumentPreview } from "@/components/finance/document-preview";
import { NumericPagination } from "@/components/ui/numeric-pagination";
import { ScopeFilter, type ScopeValue } from "@/components/ui/scope-filter";
import { useUserSession } from "@/hooks/use-user-session";
import { getInitials as initials, avColor } from "@/lib/ui-utils";

const IcoSearch      = hgIcon(Search01Icon);
const IcoPlus        = hgIcon(PlusSignIcon);
const IcoChevDown    = hgIcon(ArrowDown01Icon);
const IcoChevUp      = hgIcon(ArrowUp01Icon);
const IcoSort        = hgIcon(ArrowUpDownIcon);
const IcoCheck       = hgIcon(Tick01Icon);
const IcoMore        = hgIcon(MoreVerticalIcon);
const IcoEdit        = hgIcon(PencilEdit02Icon);
const IcoCopy        = hgIcon(Copy01Icon);
const IcoTrash       = hgIcon(Delete01Icon);
const IcoExchange    = hgIcon(Exchange01Icon);
const IcoSend        = hgIcon(MailSend01Icon);
const IcoX           = hgIcon(Cancel01Icon);
const IcoEye         = hgIcon(EyeIcon);
const IcoDownload    = hgIcon(Download01Icon);
const IcoCheckDouble = hgIcon(CheckmarkCircle01Icon);

interface DocumentItem {
  id: number;
  description: string;
  quantity: string;
  unitPrice: string;
  discount: string;
  taxRate: string;
  total: string;
}

interface DeliveryNote {
  id: number;
  type: string;
  number: string;
  status: string;
  companyId: number | null;
  personId: number | null;
  contactId: number | null;
  vendorId: number | null;
  eventId: number | null;
  direction: string | null;
  issueDate: string;
  dueDate: string | null;
  validUntil: string | null;
  subtotal: string;
  taxAmount: string;
  total: string;
  paidAmount: string | null;
  currency: string;
  notes: string | null;
  termsAndConditions: string | null;
  companyName: string | null;
  personFirstName: string | null;
  personLastName: string | null;
  contactName: string | null;
  vendorName: string | null;
  eventName: string | null;
  items: DocumentItem[];
}

const STATUS_PILL: Record<string, { bg: string; fg: string; label: string }> = {
  draft:     { bg: "#EDEAE3", fg: "#5B5649", label: "Borrador" },
  sent:      { bg: "#F6D9BE", fg: "#A35A1F", label: "Pendiente" },
  approved:  { bg: "#D4E7F0", fg: "#2F6A85", label: "Aprobado" },
  delivered: { bg: "#D9ECD1", fg: "#1F6A3A", label: "Entregado" },
  cancelled: { bg: "#F8D4D4", fg: "#8B2A2A", label: "Cancelado" },
};

type StatusFilter = "all" | "draft" | "sent" | "approved" | "delivered";
const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "all",       label: "Todos" },
  { value: "draft",     label: "Borrador" },
  { value: "sent",      label: "Pendiente" },
  { value: "approved",  label: "Aprobado" },
  { value: "delivered", label: "Entregado" },
];

export default function DeliveryNotesPage() {
  return (
    <Suspense>
      <DeliveryNotesContent />
    </Suspense>
  );
}

export function DeliveryNotesContent({
  basePath = "/dashboard/finance/delivery-notes",
}: {
  basePath?: string;
}) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { can } = useUserSession();

  const [notes, setNotes] = useState<DeliveryNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [scope, setScope] = useState<ScopeValue>("all");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | undefined>(undefined);
  const [drawerInitialData, setDrawerInitialData] = useState<Record<string, unknown> | undefined>(undefined);
  const [drawerType, setDrawerType] = useState<"delivery_note" | "invoice">("delivery_note");
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewNote, setPreviewNote] = useState<DeliveryNote | null>(null);

  type SortKey = "client" | "issueDate" | "number" | "status";
  const [sort, setSort] = useState<{ key: SortKey; dir: "asc" | "desc" } | null>(null);
  const cycleSort = (key: SortKey) => {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "asc" };
      if (prev.dir === "asc") return { key, dir: "desc" };
      return null;
    });
  };

  useEffect(() => { fetchNotes(); }, [statusFilter, page, scope]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (searchParams.get("new") === "true") {
      openNewDrawer();
      router.replace(basePath);
    }
  }, [searchParams]); // eslint-disable-line react-hooks/exhaustive-deps

  async function fetchNotes() {
    try {
      setFetchError(null);
      const params = new URLSearchParams({ type: "delivery_note", page: page.toString(), limit: "20" });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (searchTerm) params.set("search", searchTerm);
      if (scope !== "all") params.set("scope", scope);
      const res = await fetch(`/api/finance/documents?${params}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setNotes(data.data || []);
          setTotalPages(data.meta?.totalPages || 1);
        }
      } else {
        const data = await res.json().catch(() => null);
        const msg = data?.error?.message || `Error del servidor (${res.status})`;
        setFetchError(msg);
        toast.error(msg);
      }
    } catch {
      setFetchError("No se pudo conectar con el servidor");
      toast.error("Error al cargar albaranes");
    } finally {
      setLoading(false);
    }
  }

  async function deleteNote(id: number) {
    if (!confirm("¿Estás seguro de eliminar este albarán?")) return;
    try {
      const res = await fetch(`/api/finance/documents/${id}`, { method: "DELETE" });
      if (res.ok) { toast.success("Albarán eliminado"); fetchNotes(); }
      else { const d = await res.json().catch(() => null); toast.error(d?.error?.message || "Error al eliminar"); }
    } catch { toast.error("Error al eliminar"); }
  }

  async function fetchDocAndOpenDrawer(id: number, targetType: "delivery_note" | "invoice") {
    try {
      const res = await fetch(`/api/finance/documents/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) {
          const doc = data.data;
          const isDeliveryNote = targetType === "delivery_note";
          setDrawerInitialData({
            contactId: doc.contactId, vendorId: doc.vendorId, eventId: doc.eventId,
            notes: doc.notes,
            termsAndConditions: isDeliveryNote ? undefined : doc.termsAndConditions,
            globalDiscount: isDeliveryNote ? undefined : parseFloat(doc.globalDiscount || "0") || undefined,
            globalDiscountType: isDeliveryNote ? undefined : doc.globalDiscountType,
            paymentMethod: isDeliveryNote ? undefined : doc.paymentMethod,
            bankAccountId: isDeliveryNote ? undefined : doc.bankAccountId,
            items: doc.items?.map((item: Record<string, string>) => ({
              description: item.description,
              quantity: parseFloat(item.quantity),
              unitPrice: isDeliveryNote ? 0 : parseFloat(item.unitPrice || "0"),
              discount: isDeliveryNote ? 0 : parseFloat(item.discount || "0"),
              taxRate: isDeliveryNote ? 0 : parseFloat(item.taxRate ?? "21"),
              total: isDeliveryNote ? 0 : parseFloat(item.total || "0"),
            })),
          });
          setDrawerType(targetType);
          setEditingId(undefined);
          setDrawerOpen(true);
        }
      }
    } catch { toast.error("Error al cargar documento"); }
  }

  async function updateStatus(id: number, status: string) {
    try {
      const res = await fetch(`/api/finance/documents/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (res.ok) {
        toast.success(`Estado actualizado a ${STATUS_PILL[status]?.label || status}`);
        fetchNotes();
      } else {
        const d = await res.json().catch(() => null);
        toast.error(d?.error?.message || "Error al actualizar estado");
      }
    } catch { toast.error("Error al actualizar estado"); }
  }

  function openNewDrawer() {
    setEditingId(undefined); setDrawerInitialData(undefined); setDrawerType("delivery_note"); setDrawerOpen(true);
  }
  function openEditDrawer(id: number) {
    setEditingId(id); setDrawerInitialData(undefined); setDrawerType("delivery_note"); setDrawerOpen(true);
  }
  async function openPreview(id: number) {
    try {
      const res = await fetch(`/api/finance/documents/${id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.data) { setPreviewNote(data.data); setPreviewOpen(true); }
      }
    } catch { toast.error("Error al cargar documento"); }
  }

  const getClientName = (n: DeliveryNote) =>
    n.contactName ||
    n.companyName ||
    (n.personFirstName ? `${n.personFirstName} ${n.personLastName || ""}`.trim() : "") ||
    n.vendorName ||
    "Sin cliente";

  const sortedNotes = useMemo(() => {
    if (!sort) return notes;
    const dir = sort.dir === "asc" ? 1 : -1;
    const valueOf = (n: DeliveryNote): string | number => {
      switch (sort.key) {
        case "client":    return getClientName(n).toLowerCase();
        case "issueDate": return n.issueDate ? new Date(n.issueDate).getTime() : 0;
        case "number":    return n.number || "";
        case "status":    return n.status;
      }
    };
    return [...notes].sort((a, b) => {
      const va = valueOf(a), vb = valueOf(b);
      if (va < vb) return -1 * dir;
      if (va > vb) return 1 * dir;
      return 0;
    });
  }, [notes, sort]); // eslint-disable-line react-hooks/exhaustive-deps

  const kpis = useMemo(() => {
    const total      = notes.length;
    const entregados = notes.filter((n) => n.status === "delivered").length;
    const pendientes = notes.filter((n) => n.status === "draft" || n.status === "sent").length;
    const aprobados  = notes.filter((n) => n.status === "approved").length;
    const pct = (n: number) => total > 0 ? `${Math.round((n / total) * 100)}%` : "0%";
    return [
      { label: "Total albaranes", value: String(total),       delta: "",               sub: "este mes" },
      { label: "Entregados",      value: String(entregados),  delta: pct(entregados),  sub: "del total" },
      { label: "Pendientes",      value: String(pendientes),  delta: pct(pendientes),  sub: "del total" },
      { label: "Aprobados",       value: String(aprobados),   delta: pct(aprobados),   sub: "del total" },
    ];
  }, [notes]);

  if (loading) {
    return (
      <div className="flex flex-col gap-4">
        <div className="h-[72px] rounded-[12px] opacity-60" style={{ background: "var(--bg-subtle)" }} />
        <div className="h-[380px] rounded-[12px] opacity-40" style={{ background: "var(--bg-subtle)" }} />
      </div>
    );
  }

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (!sort || sort.key !== k) return <IcoSort className="h-3 w-3 opacity-30" />;
    return sort.dir === "asc" ? <IcoChevUp className="h-3 w-3" /> : <IcoChevDown className="h-3 w-3" />;
  };

  return (
    <div className="flex flex-col gap-4">

      {/* ── KPI strip — connected cells ── */}
      <div
        className="grid grid-cols-2 md:grid-cols-4 rounded-[12px] overflow-hidden"
        style={{ background: "#FFFFFF", border: "1px solid var(--line-1)" }}
      >
        {kpis.map((k, i) => (
          <div
            key={i}
            className="px-5 py-4"
            style={{ borderLeft: i > 0 ? "1px solid var(--line-1)" : "none" }}
          >
            <div className="text-[12px] text-[var(--ink-3)] font-medium mb-1.5">{k.label}</div>
            <div className="flex items-baseline gap-2 flex-wrap">
              <span className="text-[22px] font-semibold text-[var(--ink-1)]" style={{ letterSpacing: "-0.02em" }}>
                {k.value}
              </span>
              {k.delta && (
                <span className="text-[11px] font-medium text-[var(--ink-3)]">{k.delta}</span>
              )}
              <span className="text-[10.5px] text-[var(--ink-3)]">{k.sub}</span>
            </div>
          </div>
        ))}
      </div>

      {/* ── Table card ── */}
      <div
        className="rounded-[12px] p-[18px]"
        style={{ background: "#FFFFFF", border: "1px solid var(--line-1)" }}
      >
        {/* Toolbar */}
        <div className="flex items-center gap-2.5 mb-3 flex-wrap">
          {/* Search */}
          <div
            className="flex items-center gap-2 rounded-[8px]"
            style={{ background: "#FFFFFF", border: "1px solid var(--line-1)", padding: "8px 12px", width: 280 }}
          >
            <IcoSearch className="h-3.5 w-3.5 text-[var(--ink-3)] flex-shrink-0" />
            <input
              type="text"
              placeholder="Buscar por cliente, número, referencia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { setPage(1); fetchNotes(); } }}
              className="flex-1 bg-transparent outline-none text-[13px] text-[var(--ink-1)] placeholder:text-[var(--ink-3)]"
            />
          </div>

          <ScopeFilter value={scope} onChange={(v) => { setScope(v); setPage(1); }} />

          <div className="ml-auto">
            {can("finance:create") && (
              <button
                onClick={openNewDrawer}
                className="inline-flex items-center gap-1.5 rounded-[8px] px-3.5 py-2 text-[13px] font-semibold cursor-pointer transition-colors"
                style={{ background: "var(--ink-1)", color: "#FFFFFF", border: "1px solid var(--ink-1)" }}
              >
                <IcoPlus className="h-[14px] w-[14px]" />
                Nuevo Albarán
              </button>
            )}
          </div>
        </div>

        {/* Status pill filters */}
        <div className="flex items-center mb-4">
          <div
            className="inline-flex gap-1 rounded-[8px]"
            style={{ background: "var(--bg-subtle)", padding: 3 }}
          >
            {STATUS_OPTIONS.map((o) => {
              const active = statusFilter === o.value;
              return (
                <button
                  key={o.value}
                  onClick={() => { setStatusFilter(o.value); setPage(1); }}
                  className="inline-flex items-center rounded-[6px] cursor-pointer border-none transition-colors"
                  style={{
                    padding: "5px 12px",
                    background: active ? "#FFFFFF" : "transparent",
                    color: active ? "var(--ink-1)" : "var(--ink-3)",
                    fontWeight: active ? 600 : 500,
                    fontSize: 12.5,
                    boxShadow: active ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                  }}
                >
                  {o.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Table */}
        {fetchError ? (
          <div className="text-center py-10">
            <div className="text-[13px] font-medium mb-3" style={{ color: "#B8412D" }}>{fetchError}</div>
            <button
              onClick={fetchNotes}
              className="px-3 py-1.5 rounded-[7px] text-[12.5px] cursor-pointer"
              style={{ border: "1px solid var(--line-strong)", background: "#FFFFFF" }}
            >
              Reintentar
            </button>
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-14">
            <div className="text-[14px] font-semibold text-[var(--ink-1)] mb-1">No hay albaranes</div>
            <div className="text-[12.5px] text-[var(--ink-3)] mb-4">
              {searchTerm ? "No se encontraron resultados para esa búsqueda" : "Crea tu primer albarán con el botón de arriba"}
            </div>
            {!searchTerm && can("finance:create") && (
              <button
                onClick={openNewDrawer}
                className="inline-flex items-center gap-1.5 rounded-[8px] px-3.5 py-2 text-[13px] font-semibold cursor-pointer mx-auto"
                style={{ background: "var(--ink-1)", color: "#FFFFFF", border: "1px solid var(--ink-1)" }}
              >
                <IcoPlus className="h-[14px] w-[14px]" />
                Nuevo Albarán
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="tbl">
              <thead>
                <tr>
                  <th onClick={() => cycleSort("client")} style={{ cursor: "pointer", userSelect: "none" }}>
                    <span className="inline-flex items-center gap-1">Cliente <SortIcon k="client" /></span>
                  </th>
                  <th onClick={() => cycleSort("number")} style={{ cursor: "pointer", userSelect: "none" }}>
                    <span className="inline-flex items-center gap-1">Número <SortIcon k="number" /></span>
                  </th>
                  <th onClick={() => cycleSort("issueDate")} style={{ cursor: "pointer", userSelect: "none" }}>
                    <span className="inline-flex items-center gap-1">Fecha <SortIcon k="issueDate" /></span>
                  </th>
                  <th onClick={() => cycleSort("status")} style={{ cursor: "pointer", userSelect: "none" }}>
                    <span className="inline-flex items-center gap-1">Estado <SortIcon k="status" /></span>
                  </th>
                  <th style={{ width: 44 }} />
                </tr>
              </thead>
              <tbody>
                {sortedNotes.map((note) => {
                  const pill = STATUS_PILL[note.status] || { bg: "var(--bg-subtle)", fg: "var(--ink-2)", label: note.status };
                  const clientName = getClientName(note);
                  return (
                    <tr
                      key={note.id}
                      onClick={() => openPreview(note.id)}
                      style={{ cursor: "pointer" }}
                    >
                      {/* Cliente */}
                      <td>
                        <div className="flex items-center gap-2.5">
                          <div
                            className="flex-shrink-0 flex items-center justify-center rounded-full text-white"
                            style={{ width: 30, height: 30, background: avColor(clientName), fontSize: 11, fontWeight: 600 }}
                          >
                            {initials(clientName)}
                          </div>
                          <span className="text-[13px] font-medium text-[var(--ink-1)]">{clientName}</span>
                        </div>
                      </td>
                      {/* Número */}
                      <td>
                        <span className="text-[13px] text-[var(--ink-2)] font-mono">{note.number}</span>
                      </td>
                      {/* Fecha */}
                      <td>
                        <span className="text-[13px] text-[var(--ink-2)]">
                          {note.issueDate
                            ? format(new Date(note.issueDate), "d MMM yyyy", { locale: es })
                            : "—"}
                        </span>
                      </td>
                      {/* Estado */}
                      <td>
                        <span
                          className="inline-flex items-center rounded-[999px] text-[11.5px] font-medium"
                          style={{ background: pill.bg, color: pill.fg, padding: "3px 10px" }}
                        >
                          {pill.label}
                        </span>
                      </td>
                      {/* Acciones */}
                      <td onClick={(e) => e.stopPropagation()} style={{ textAlign: "center" }}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              className="inline-flex items-center justify-center rounded-[6px] transition-colors hover:bg-[var(--bg-subtle)] cursor-pointer border-none bg-transparent"
                              style={{ width: 28, height: 28, color: "var(--ink-3)" }}
                            >
                              <IcoMore className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openPreview(note.id)}>
                              <IcoEye className="mr-2 h-4 w-4" /> Vista previa
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEditDrawer(note.id)}>
                              <IcoEdit className="mr-2 h-4 w-4" /> Editar
                            </DropdownMenuItem>

                            {/* Status transitions */}
                            <DropdownMenuSeparator />
                            {(note.status === "draft" || note.status === "sent") && (
                              <DropdownMenuItem onClick={() => updateStatus(note.id, "approved")}>
                                <IcoCheck className="mr-2 h-4 w-4" /> Aprobar
                              </DropdownMenuItem>
                            )}
                            {note.status === "approved" && (
                              <DropdownMenuItem onClick={() => updateStatus(note.id, "delivered")}>
                                <IcoCheckDouble className="mr-2 h-4 w-4" /> Marcar como entregado
                              </DropdownMenuItem>
                            )}
                            {note.status === "cancelled" && (
                              <DropdownMenuItem onClick={() => updateStatus(note.id, "sent")}>
                                <IcoSend className="mr-2 h-4 w-4" /> Reactivar
                              </DropdownMenuItem>
                            )}
                            {note.status !== "cancelled" && (
                              <DropdownMenuItem
                                onClick={() => {
                                  if (confirm(`¿Cancelar el albarán ${note.number}?`)) {
                                    updateStatus(note.id, "cancelled");
                                  }
                                }}
                              >
                                <IcoX className="mr-2 h-4 w-4" /> Cancelar
                              </DropdownMenuItem>
                            )}

                            {/* Conversion */}
                            {note.status !== "cancelled" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => fetchDocAndOpenDrawer(note.id, "invoice")}>
                                  <IcoExchange className="mr-2 h-4 w-4" /> Convertir a Factura
                                </DropdownMenuItem>
                              </>
                            )}

                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => fetchDocAndOpenDrawer(note.id, "delivery_note")}>
                              <IcoCopy className="mr-2 h-4 w-4" /> Duplicar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => downloadDocumentPDF(note.id, `delivery-${note.number}.pdf`)}>
                              <IcoDownload className="mr-2 h-4 w-4" /> Descargar PDF
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600" onClick={() => deleteNote(note.id)}>
                              <IcoTrash className="mr-2 h-4 w-4" /> Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center">
          <NumericPagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
        </div>
      )}

      {/* Drawers */}
      <DocumentDrawer
        open={drawerOpen}
        onOpenChange={(open) => {
          setDrawerOpen(open);
          if (!open) { setDrawerInitialData(undefined); setDrawerType("delivery_note"); }
        }}
        type={drawerType}
        documentId={editingId}
        initialData={drawerInitialData}
        onSuccess={fetchNotes}
        onDuplicate={() => { setDrawerOpen(false); if (editingId) fetchDocAndOpenDrawer(editingId, "delivery_note"); }}
        onConvert={(targetType) => {
          setDrawerOpen(false);
          if (editingId) fetchDocAndOpenDrawer(editingId, targetType as "delivery_note" | "invoice");
        }}
      />

      <DocumentPreview
        open={previewOpen}
        onOpenChange={setPreviewOpen}
        document={previewNote}
        onEdit={() => { setPreviewOpen(false); if (previewNote) openEditDrawer(previewNote.id); }}
        onRefresh={fetchNotes}
      />
    </div>
  );
}
