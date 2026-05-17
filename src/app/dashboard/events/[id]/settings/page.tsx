"use client";

import { useState, useEffect, useCallback, use } from "react";
import { useEvent } from "@/contexts/event-context";
import { EventSectionGuard } from "@/components/events/event-section-guard";
import { useRouter } from "next/navigation";
import { LocationMap } from "@/components/ui/location-map";
import { CollaboratorDrawer } from "@/components/events/collaborator-drawer";
import { AddCollaboratorModal } from "@/components/events/add-collaborator-modal";
import { toast } from "sonner";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete01Icon, MailSend01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";

// ── Types ──────────────────────────────────────────────────────────────────────
interface EventData {
  id: number;
  name: string;
  type: string;
  status: string;
  date: string | null;
  endDate: string | null;
  location: string | null;
  budget: string | null;
  description: string | null;
}

interface Collaborator {
  id: number;
  userId: string | null;
  contactId: number | null;
  vendorId: number | null;
  userName: string | null;
  userEmail: string | null;
  userImage: string | null;
  contactName: string | null;
  contactEmail: string | null;
  vendorName: string | null;
  vendorCategory: string | null;
  type: string;
  role: string | null;
  permissions: Record<string, string> | null;
  invitedAt: string | null;
  acceptedAt: string | null;
  invitationStatus: "active" | "pending" | "collab_pending" | "no_email" | "not_invited" | null;
  invitationId: number | null;
  invitationExpiresAt: string | null;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const ROLE_LABELS: Record<string, string> = {
  client: "Cliente", organizer: "Organizador", assistant: "Asistente",
  sponsor: "Patrocinador", speaker: "Ponente", vendor: "Proveedor", partner: "Partner", other: "Otro",
};

function collabName(c: Collaborator) {
  return c.userName || c.userEmail || c.contactName || c.vendorName || "Sin nombre";
}
function collabSub(c: Collaborator) {
  if (c.userName && c.userEmail) return c.userEmail;
  if (c.contactEmail) return c.contactEmail;
  if (c.vendorCategory) return c.vendorCategory;
  return null;
}
function collabInitials(c: Collaborator) {
  return collabName(c).charAt(0).toUpperCase();
}
function collabColor(c: Collaborator) {
  if (c.type === "contact") return { bg: "#D1FAE5", fg: "#065F46" };
  if (c.type === "vendor" || c.type === "partner") return { bg: "#FEF3C7", fg: "#92400E" };
  return { bg: "#DBEAFE", fg: "#1E40AF" };
}

// ── Design primitives ─────────────────────────────────────────────────────────
const inp: React.CSSProperties = {
  border: "1px solid var(--line-2)",
  borderRadius: "var(--r-sm)",
  padding: "7px 10px",
  fontSize: 13,
  color: "var(--ink-1)",
  background: "var(--bg-panel)",
  outline: "none",
  width: "100%",
  boxSizing: "border-box",
  fontFamily: "inherit",
};

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-2)", display: "block", marginBottom: 4 }}>{children}</label>;
}

function Chip({ children, color }: { children: React.ReactNode; color: "green" | "amber" | "gray" | "red" | "orange" | "outline" | "brand" }) {
  const map: Record<string, React.CSSProperties> = {
    green:   { background: "#DCFCE7", color: "#166534" },
    amber:   { background: "#FEF3C7", color: "#92400E" },
    gray:    { background: "#F3F4F6", color: "#6B7280" },
    red:     { background: "#FEE2E2", color: "#991B1B" },
    orange:  { background: "#FFEDD5", color: "#9A3412" },
    outline: { background: "var(--bg-subtle)", color: "var(--ink-2)", border: "1px solid var(--line-1)" },
    brand:   { background: "var(--color-brand)", color: "white" },
  };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "2px 7px", borderRadius: 999, fontSize: 11, fontWeight: 500, ...map[color] }}>
      {children}
    </span>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function EventDataForm({
  event,
  taskCount,
  onSaved,
  onCancelled,
  onDeleted,
}: {
  event: EventData;
  taskCount: number;
  onSaved: (updated: EventData) => void;
  onCancelled: (updated: EventData) => void;
  onDeleted: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    name: event.name || "",
    type: event.type || "",
    status: event.status || "",
    date: event.date ? event.date.split("T")[0] : "",
    endDate: event.endDate ? event.endDate.split("T")[0] : "",
    location: event.location || "",
    budget: event.budget || "",
    description: event.description || "",
  });

  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.success) { toast.success("Cambios guardados"); onSaved(data.data); }
      else toast.error(data.error?.message || "Error al guardar");
    } catch { toast.error("Error de conexión"); }
    finally { setSaving(false); }
  };

  const handleCancel = async () => {
    setCancelling(true);
    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const data = await res.json();
      if (data.success) { toast.success("Evento cancelado"); onCancelled(data.data); }
      else toast.error(data.error?.message || "Error al cancelar");
    } catch { toast.error("Error de conexión"); }
    finally { setCancelling(false); }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/events/${event.id}`, { method: "DELETE" });
      const data = await res.json();
      if (data.success) onDeleted();
      else toast.error(data.error?.message || "Error al eliminar");
    } catch { toast.error("Error de conexión"); }
    finally { setDeleting(false); }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      {/* Formulario */}
      <div style={{ padding: 20, borderRadius: "var(--r-md)", border: "1px solid var(--line-1)", background: "var(--bg-panel)" }}>
        <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 14 }}>Datos del evento</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <div>
            <FieldLabel>Nombre del evento *</FieldLabel>
            <input style={inp} value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Ej: Boda de Juan y María" />
          </div>
          <div>
            <FieldLabel>Tipo de evento</FieldLabel>
            <select style={inp} value={form.type} onChange={(e) => set("type", e.target.value)}>
              <option value="">Seleccionar tipo</option>
              <option value="wedding">Boda</option>
              <option value="prewedding">Pre-boda</option>
              <option value="postwedding">Post-boda</option>
              <option value="corporate">Corporativo</option>
              <option value="birthday">Cumpleaños</option>
              <option value="social">Social</option>
              <option value="other">Otro</option>
            </select>
          </div>
          <div>
            <FieldLabel>Fecha de inicio</FieldLabel>
            <input style={inp} type="date" value={form.date} onChange={(e) => set("date", e.target.value)} />
          </div>
          <div>
            <FieldLabel>Fecha de finalización</FieldLabel>
            <input style={inp} type="date" value={form.endDate} onChange={(e) => set("endDate", e.target.value)} />
          </div>
          <div>
            <FieldLabel>Estado</FieldLabel>
            <select style={inp} value={form.status} onChange={(e) => set("status", e.target.value)}>
              <option value="">Seleccionar estado</option>
              <option value="draft">Borrador</option>
              <option value="confirmed">Confirmado</option>
              <option value="in_progress">En progreso</option>
              <option value="completed">Completado</option>
              <option value="cancelled">Cancelado</option>
            </select>
          </div>
          <div>
            <FieldLabel>Presupuesto total (€)</FieldLabel>
            <input style={inp} type="number" value={form.budget} onChange={(e) => set("budget", e.target.value)} placeholder="0.00" />
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <FieldLabel>Ubicación</FieldLabel>
            <input style={inp} value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Ej: Calle Falsa 123, Ciudad" />
          </div>
          <div style={{ gridColumn: "1/-1" }}>
            <FieldLabel>Notas internas</FieldLabel>
            <textarea style={{ ...inp, resize: "vertical" }} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Descripción del evento..." rows={3} />
          </div>
        </div>

        {form.location && (
          <div style={{ marginTop: 14 }}>
            <LocationMap address={form.location} className="h-40" />
          </div>
        )}

        <div style={{ marginTop: 16, display: "flex", justifyContent: "flex-end" }}>
          <button
            style={{ padding: "7px 16px", borderRadius: "var(--r-sm)", border: "none", background: "var(--color-brand)", color: "white", fontSize: 13, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.7 : 1, fontFamily: "inherit" }}
            onClick={handleSave} disabled={saving}
          >
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      </div>

      {/* Zona de peligro */}
      <div style={{ padding: 16, borderRadius: "var(--r-md)", border: "1px solid var(--line-1)", background: "var(--bg-panel)" }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: "var(--ink-3)", marginBottom: 12 }}>Zona de peligro</div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          {form.status !== "cancelled" && (
            <button
              style={{ padding: "7px 14px", borderRadius: "var(--r-sm)", border: "1px solid #FCD34D", background: "#FFFBEB", color: "#92400E", fontSize: 13, fontWeight: 500, cursor: cancelling ? "not-allowed" : "pointer", opacity: cancelling ? 0.7 : 1, fontFamily: "inherit" }}
              onClick={() => {
                const msg = taskCount > 0
                  ? `El evento y sus ${taskCount} tarea(s) serán marcados como cancelados. ¿Continuar?`
                  : "El evento será marcado como cancelado. Podrás restaurarlo más tarde. ¿Continuar?";
                if (confirm(msg)) handleCancel();
              }}
              disabled={cancelling}
            >
              {cancelling ? "Cancelando..." : "Cancelar evento"}
            </button>
          )}
          <button
            style={{ padding: "7px 14px", borderRadius: "var(--r-sm)", border: "none", background: "#FEE2E2", color: "#991B1B", fontSize: 13, fontWeight: 500, cursor: deleting ? "not-allowed" : "pointer", opacity: deleting ? 0.7 : 1, display: "flex", alignItems: "center", gap: 6, fontFamily: "inherit" }}
            onClick={() => {
              const msg = taskCount > 0
                ? `Esta acción no se puede deshacer. Se eliminará el evento y todos sus datos. Las ${taskCount} tarea(s) vinculadas serán desvinculadas. ¿Eliminar permanentemente?`
                : "Esta acción no se puede deshacer. Se eliminará el evento y todos sus datos. ¿Eliminar permanentemente?";
              if (confirm(msg)) handleDelete();
            }}
            disabled={deleting}
          >
            <HugeiconsIcon icon={Delete01Icon} size={14} strokeWidth={1.5} />
            {deleting ? "Eliminando..." : "Eliminar evento"}
          </button>
        </div>
      </div>
    </div>
  );
}

function CollaboratorsTab({
  eventId,
  collaborators,
  onRefresh,
}: {
  eventId: number;
  collaborators: Collaborator[];
  onRefresh: () => void;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [editing, setEditing] = useState<Collaborator | null>(null);

  async function resendInvitation(invitationId: number, e: React.MouseEvent) {
    e.stopPropagation();
    const res = await fetch(`/api/invitations?id=${invitationId}`, { method: "PUT" });
    const data = await res.json();
    if (data.success) { toast.success("Invitación reenviada"); onRefresh(); }
    else toast.error(data.error?.message || "Error al reenviar");
  }

  async function revokeInvitation(invitationId: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("¿Revocar esta invitación?")) return;
    const res = await fetch(`/api/invitations?id=${invitationId}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) { toast.success("Invitación revocada"); onRefresh(); }
    else toast.error(data.error?.message || "Error al revocar");
  }

  async function sendInvitation(participantId: number, e: React.MouseEvent) {
    e.stopPropagation();
    const res = await fetch(`/api/events/${eventId}/collaborators/${participantId}/invite`, { method: "POST" });
    const data = await res.json();
    if (data.success) { toast.success("Invitación enviada"); onRefresh(); }
    else toast.error(data.error?.message || "Error al invitar");
  }

  async function removeCollaborator(participantId: number, e: React.MouseEvent) {
    e.stopPropagation();
    if (!confirm("¿Revocar el acceso de este colaborador?")) return;
    const res = await fetch(`/api/events/${eventId}/collaborators/${participantId}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) { toast.success("Acceso revocado"); onRefresh(); }
    else toast.error(data.error?.message || "Error al revocar");
  }

  return (
    <>
      <div style={{ padding: 16, borderRadius: "var(--r-md)", border: "1px solid var(--line-1)", background: "var(--bg-panel)" }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 14, fontWeight: 600 }}>Colaboradores del evento</div>
            <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 2 }}>
              Invita a personas de confianza y controla qué pueden ver y editar.
            </div>
          </div>
          <button
            style={{ padding: "5px 12px", borderRadius: "var(--r-sm)", border: "none", background: "var(--color-brand)", color: "white", fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}
            onClick={() => setAddOpen(true)}
          >
            Añadir colaborador
          </button>
        </div>

        {collaborators.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {collaborators.map((c) => {
              const { bg, fg } = collabColor(c);
              const now = new Date();
              const expires = c.invitationExpiresAt ? new Date(c.invitationExpiresAt) : null;
              const isExpired = expires && expires < now;
              const isExpiringSoon = expires && !isExpired && (expires.getTime() - now.getTime()) < 86400000;

              return (
                <div
                  key={c.id}
                  style={{ display: "flex", alignItems: "center", gap: 12, padding: 12, border: "1px solid var(--line-1)", borderRadius: "var(--r-sm)", cursor: "pointer", transition: "background .15s" }}
                  onClick={() => { setEditing(c); setDrawerOpen(true); }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--bg-subtle)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                >
                  {/* Avatar */}
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: bg, color: fg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12.5, fontWeight: 700, flexShrink: 0 }}>
                    {collabInitials(c)}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 13.5, fontWeight: 600 }}>{collabName(c)}</span>
                      {c.role && <Chip color="outline">{ROLE_LABELS[c.role] || c.role}</Chip>}
                      {/* Status chips */}
                      {c.invitationStatus === "active" && <Chip color="green">Activo</Chip>}
                      {c.invitationStatus === "collab_pending" && <Chip color="amber">Pendiente</Chip>}
                      {c.invitationStatus === "pending" && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Chip color={isExpired ? "gray" : isExpiringSoon ? "red" : "amber"}>
                            {isExpired ? "Expirada" : isExpiringSoon ? "Expira pronto" : "Pendiente"}
                          </Chip>
                          {c.invitationId && (
                            <>
                              <button style={{ padding: 4, background: "none", border: "none", cursor: "pointer", lineHeight: 0 }} title="Reenviar" onClick={(e) => resendInvitation(c.invitationId!, e)}>
                                <HugeiconsIcon icon={MailSend01Icon} size={14} strokeWidth={1.5} color="#3B82F6" />
                              </button>
                              <button style={{ padding: 4, background: "none", border: "none", cursor: "pointer", lineHeight: 0 }} title="Revocar" onClick={(e) => revokeInvitation(c.invitationId!, e)}>
                                <HugeiconsIcon icon={Cancel01Icon} size={14} strokeWidth={1.5} color="#EF4444" />
                              </button>
                            </>
                          )}
                        </div>
                      )}
                      {c.invitationStatus === "no_email" && c.contactId && <Chip color="gray">Sin email</Chip>}
                      {c.invitationStatus === "not_invited" && c.contactId && (
                        <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                          <Chip color="orange">No invitado</Chip>
                          <button style={{ padding: 4, background: "none", border: "none", cursor: "pointer", lineHeight: 0 }} title="Invitar" onClick={(e) => sendInvitation(c.id, e)}>
                            <HugeiconsIcon icon={MailSend01Icon} size={14} strokeWidth={1.5} color="#3B82F6" />
                          </button>
                        </div>
                      )}
                    </div>
                    {collabSub(c) && (
                      <div style={{ fontSize: 11.5, color: "var(--ink-3)", marginTop: 2 }}>{collabSub(c)}</div>
                    )}
                    {c.permissions && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                        {Object.entries(c.permissions)
                          .filter(([, level]) => level !== "none")
                          .map(([section, level]) => (
                            <Chip key={section} color={level === "edit" ? "brand" : "outline"}>{section}</Chip>
                          ))}
                      </div>
                    )}
                  </div>

                  <button
                    style={{ padding: 6, background: "none", border: "none", cursor: "pointer", lineHeight: 0, color: "#EF4444", flexShrink: 0 }}
                    title="Revocar acceso"
                    onClick={(e) => removeCollaborator(c.id, e)}
                  >
                    <HugeiconsIcon icon={Delete01Icon} size={15} strokeWidth={1.5} />
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: "center", padding: "40px 0", color: "var(--ink-3)", fontSize: 13 }}>
            No hay colaboradores asignados
          </div>
        )}
      </div>

      <CollaboratorDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        eventId={eventId}
        onSuccess={onRefresh}
        existingParticipants={collaborators}
        editingParticipant={editing}
      />
      <AddCollaboratorModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        eventId={eventId}
        onSuccess={onRefresh}
      />
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function EventSettingsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const eventId = parseInt(id, 10);
  const { setActiveEvent } = useEvent();
  const router = useRouter();

  const [tab, setTab] = useState<"data" | "collabs">("data");
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<EventData | null>(null);
  const [taskCount, setTaskCount] = useState(0);
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);

  useEffect(() => {
    fetch(`/api/events/${eventId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) {
          setEvent(data.data);
          setActiveEvent(data.data);
          setTaskCount(data.data.taskCount || 0);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [eventId, setActiveEvent]);

  const fetchCollaborators = useCallback(async () => {
    const res = await fetch(`/api/events/${eventId}/collaborators`);
    const data = await res.json();
    if (data.success) setCollaborators(data.data || []);
  }, [eventId]);

  useEffect(() => { fetchCollaborators(); }, [fetchCollaborators]);

  if (loading) {
    return (
      <EventSectionGuard eventId={eventId} section="settings">
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {[48, 280, 160].map((h, i) => (
            <div key={i} style={{ height: h, borderRadius: "var(--r-md)", background: "var(--bg-subtle)", animation: "pulse 1.5s ease-in-out infinite" }} />
          ))}
        </div>
      </EventSectionGuard>
    );
  }

  return (
    <EventSectionGuard eventId={eventId} section="settings">
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

        {/* Tabs */}
        <div style={{ display: "inline-flex", background: "var(--bg-subtle)", borderRadius: 999, padding: 3, gap: 2, alignSelf: "flex-start" }}>
          {([["data", "Datos del evento"], ["collabs", "Colaboradores"]] as const).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              style={{
                padding: "7px 18px", borderRadius: 999, border: "none", cursor: "pointer",
                fontSize: 13, fontWeight: 600, fontFamily: "inherit",
                background: tab === k ? "white" : "transparent",
                color: tab === k ? "var(--ink-1)" : "var(--ink-3)",
                boxShadow: tab === k ? "var(--shadow-1)" : "none",
                transition: "all .15s",
              }}
            >
              {l}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === "data" && event && (
          <EventDataForm
            event={event}
            taskCount={taskCount}
            onSaved={(updated) => { setEvent(updated); setActiveEvent(updated); }}
            onCancelled={(updated) => { setEvent(updated); setActiveEvent(updated); }}
            onDeleted={() => { setActiveEvent(null); router.push("/dashboard/events"); }}
          />
        )}

        {tab === "collabs" && (
          <CollaboratorsTab
            eventId={eventId}
            collaborators={collaborators}
            onRefresh={fetchCollaborators}
          />
        )}
      </div>
    </EventSectionGuard>
  );
}
