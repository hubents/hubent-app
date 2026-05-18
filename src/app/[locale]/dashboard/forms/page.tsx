"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { EventScopedGuard } from "@/components/layout/event-scoped-guard";
import { Btn, Pill } from "@/components/ui/ds";
import {
  RiSurveyLine,
  RiAddLine,
  RiSearchLine,
  RiEditLine,
  RiFileCopyLine,
  RiDeleteBinLine,
  RiTaskLine,
  RiMoreLine,
  RiFileList2Line,
  RiGlobeLine,
  RiDownloadLine,
  RiLoader4Line,
  RiCalendarEventLine,
  RiBriefcase4Line,
  RiCloseLine,
} from "@remixicon/react";
import { toast } from "sonner";
import { useUserSession } from "@/hooks/use-user-session";
import { ShareFormDialog } from "@/components/forms/share-form-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface FormItem {
  id: number;
  name: string;
  description: string | null;
  status: string;
  fieldCount: number;
  instanceCount: number;
  submissionCount: number;
  landingSlug: string | null;
  createdAt: string;
  updatedAt: string;
  linkedEvent: { id: number; name: string } | null;
  linkedTask: { id: number; title: string } | null;
}

type LinkFilter = "all" | "event" | "general";
type ViewMode = "forms" | "responses";

// Status pill palette — mirrors prototype's FORM_STATUS_STYLE (formularios.jsx:13-18)
const STATUS_PILL: Record<string, { bg: string; fg: string; label: string }> = {
  active: { bg: "#E4EEEA", fg: "#3F6B4D", label: "Activo" },
  draft: { bg: "#F4EDE0", fg: "#8A6F3A", label: "Borrador" },
  paused: { bg: "#EEEEEE", fg: "#888888", label: "Pausado" },
};

// Time-since label for "Editado". Cheap relative formatting.
function timeSince(iso: string, tForms: ReturnType<typeof useTranslations>): string {
  const ms = Date.now() - new Date(iso).getTime();
  const m = Math.floor(ms / 60000);
  if (m < 60) return m <= 1 ? tForms("timeNow") : tForms("timeMinutes", { m });
  const h = Math.floor(m / 60);
  if (h < 24) return tForms("timeHours", { h });
  const d = Math.floor(h / 24);
  if (d === 1) return tForms("timeYesterday");
  if (d < 7) return tForms("timeDays", { d });
  const w = Math.floor(d / 7);
  if (w < 4) return tForms("timeWeeks", { w, n: w === 1 ? tForms("week") : tForms("weeks") });
  const mo = Math.floor(d / 30);
  return tForms("timeMonths", { mo, n: mo === 1 ? tForms("month") : tForms("months") });
}

export default function FormsPage() {
  return (
    <EventScopedGuard>
      <FormsPageContent />
    </EventScopedGuard>
  );
}

export function FormsPageContent({
  basePath = "/dashboard/forms",
}: {
  basePath?: string;
}) {
  const t = useTranslations("forms");
  const router = useRouter();
  const { can, loading: sessionLoading } = useUserSession();
  const [forms, setForms] = useState<FormItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<LinkFilter>("all");
  const [deleteId, setDeleteId] = useState<number | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("forms");
  const [shareSlug, setShareSlug] = useState<string | null>(null);

  const canCreate = sessionLoading ? true : can("forms:create");
  const canUpdate = sessionLoading ? true : can("forms:update");
  const canDelete = sessionLoading ? true : can("forms:delete");

  const fetchForms = useCallback(async () => {
    try {
      const res = await fetch("/api/forms");
      const data = await res.json();
      if (data.success) setForms(data.data);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === "visible") fetchForms();
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () =>
      document.removeEventListener("visibilitychange", handleVisibility);
  }, [fetchForms]);

  const counts = {
    all: forms.length,
    event: forms.filter((f) => f.linkedEvent != null).length,
    general: forms.filter((f) => f.linkedEvent == null).length,
  };

  const filteredForms = forms.filter((f) => {
    if (filter === "event" && f.linkedEvent == null) return false;
    if (filter === "general" && f.linkedEvent != null) return false;
    if (search && !f.name.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  const handleDuplicate = async (formId: number) => {
    try {
      const res = await fetch(`/api/forms/${formId}/duplicate`, {
        method: "POST",
      });
      const data = await res.json();
      if (data.success) fetchForms();
    } catch {
      // silent
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await fetch(`/api/forms/${deleteId}`, { method: "DELETE" });
      setForms((prev) => prev.filter((f) => f.id !== deleteId));
    } catch {
      // silent
    } finally {
      setDeleteId(null);
    }
  };

  const filterTabs: { id: LinkFilter; label: string; n: number }[] = [
    { id: "all", label: t("filterAll"), n: counts.all },
    { id: "event", label: t("filterLinkedEvent"), n: counts.event },
    { id: "general", label: t("filterGeneral"), n: counts.general },
  ];

  return (
    <div className="space-y-4">
      {/* View Mode Toggle (preserved from existing app) */}
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div
          style={{
            display: "inline-flex",
            background: "var(--bg-subtle)",
            borderRadius: "var(--r-sm)",
            padding: 3,
            gap: 2,
          }}
        >
          <button
            onClick={() => setViewMode("forms")}
            style={pillTabStyle(viewMode === "forms")}
          >
            <RiSurveyLine size={13} /> {t("viewForms")}
          </button>
          <button
            onClick={() => setViewMode("responses")}
            style={pillTabStyle(viewMode === "responses")}
          >
            <RiFileList2Line size={13} /> {t("viewResponses")}
          </button>
        </div>
      </div>

      {viewMode === "responses" ? (
        <AllSubmissionsView basePath={basePath} />
      ) : (
        <div
          style={{
            background: "var(--bg-panel)",
            border: "1px solid var(--line-1)",
            borderRadius: "var(--r-md)",
            padding: 18,
          }}
        >
          {/* Toolbar: filter pills + search + new */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginBottom: 16,
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                display: "flex",
                gap: 4,
                background: "var(--bg-subtle)",
                borderRadius: "var(--r-sm)",
                padding: 3,
              }}
            >
              {filterTabs.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setFilter(t.id)}
                  style={{
                    background: filter === t.id ? "white" : "transparent",
                    color:
                      filter === t.id ? "var(--ink-1)" : "var(--ink-3)",
                    border: "none",
                    padding: "7px 13px",
                    borderRadius: 6,
                    fontSize: 12.5,
                    fontWeight: filter === t.id ? 600 : 500,
                    cursor: "pointer",
                    boxShadow:
                      filter === t.id ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {t.label}
                  <span
                    style={{
                      fontSize: 11,
                      color: "var(--ink-3)",
                      background:
                        filter === t.id ? "var(--bg-subtle)" : "transparent",
                      padding: "1px 6px",
                      borderRadius: 999,
                    }}
                  >
                    {t.n}
                  </span>
                </button>
              ))}
            </div>
            <div
              style={{ position: "relative", flex: 1, maxWidth: 260 }}
            >
              <input
                placeholder={t("searchPlaceholder")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: "100%",
                  padding: "8px 12px 8px 32px",
                  border: "1px solid var(--line-1)",
                  borderRadius: "var(--r-sm)",
                  fontSize: 12.5,
                  background: "white",
                  outline: "none",
                  fontFamily: "inherit",
                }}
              />
              <RiSearchLine
                size={14}
                style={{
                  position: "absolute",
                  left: 10,
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "var(--ink-3)",
                }}
              />
            </div>
            {canCreate && (
              <button
                onClick={() => setCreateOpen(true)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "8px 14px",
                  background: "var(--ink-1)",
                  color: "white",
                  border: "none",
                  borderRadius: "var(--r-sm)",
                  fontSize: 12.5,
                  fontWeight: 500,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <RiAddLine size={13} /> {t("newForm")}
              </button>
            )}
          </div>

          {/* Grid */}
          {loading ? (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))",
                gap: 14,
              }}
            >
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    height: 160,
                    borderRadius: 10,
                    background: "var(--bg-subtle)",
                    opacity: 0.5,
                  }}
                />
              ))}
            </div>
          ) : filteredForms.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "60px 20px",
                color: "var(--ink-3)",
              }}
            >
              <RiSurveyLine
                size={40}
                style={{ opacity: 0.4, marginBottom: 12 }}
              />
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: "var(--ink-1)",
                  marginBottom: 4,
                }}
              >
                {forms.length === 0 ? t("emptyTitle") : t("noResults")}
              </div>
              <div style={{ fontSize: 12.5 }}>
                {forms.length === 0
                  ? t("emptyDescription")
                  : t("noResultsDescription")}
              </div>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(270px, 1fr))",
                gap: 14,
              }}
            >
              {filteredForms.map((f) => (
                <FormCard
                  key={f.id}
                  f={f}
                  onOpen={() => router.push(`${basePath}/${f.id}`)}
                  onDuplicate={() => handleDuplicate(f.id)}
                  onDelete={() => setDeleteId(f.id)}
                  onShare={() =>
                    f.landingSlug && setShareSlug(f.landingSlug)
                  }
                  canUpdate={canUpdate}
                  canCreate={canCreate}
                  canDelete={canDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("deleteTitle")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("deleteDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {shareSlug && (
        <ShareFormDialog
          slug={shareSlug}
          open={!!shareSlug}
          onOpenChange={(open) => {
            if (!open) setShareSlug(null);
          }}
        />
      )}

      {createOpen && (
        <CreateFormModal
          basePath={basePath}
          onClose={() => setCreateOpen(false)}
          onCreated={() => {
            setCreateOpen(false);
            fetchForms();
          }}
        />
      )}
    </div>
  );
}

// ─── Filter pill button helper (matches prototype's segmented pill style) ──
function pillTabStyle(active: boolean): React.CSSProperties {
  return {
    background: active ? "white" : "transparent",
    color: active ? "var(--ink-1)" : "var(--ink-3)",
    border: "none",
    padding: "6px 12px",
    borderRadius: 6,
    fontSize: 12,
    fontWeight: active ? 600 : 500,
    cursor: "pointer",
    boxShadow: active ? "0 1px 2px rgba(0,0,0,0.05)" : "none",
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    fontFamily: "inherit",
  };
}

// ─── Form Card — replicates prototype's FormCard (formularios.jsx:233-281) ──
function FormCard({
  f,
  onOpen,
  onDuplicate,
  onDelete,
  onShare,
  canUpdate,
  canCreate,
  canDelete,
}: {
  f: FormItem;
  onOpen: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onShare: () => void;
  canUpdate: boolean;
  canCreate: boolean;
  canDelete: boolean;
}) {
  const t = useTranslations("forms");
  const STATUS_PILL_LABELS: Record<string, string> = {
    active: t("statusActive"),
    draft: t("statusDraft"),
    paused: t("statusPaused"),
  };
  const statusBase = STATUS_PILL[f.status] || { bg: "#EEEEEE", fg: "#888", label: f.status };
  const s = { ...statusBase, label: STATUS_PILL_LABELS[f.status] || f.status };
  return (
    <div
      onClick={onOpen}
      style={{
        background: "white",
        border: "1px solid var(--line-1)",
        borderRadius: 10,
        padding: 16,
        cursor: "pointer",
        transition: "all .15s",
        display: "flex",
        flexDirection: "column",
        gap: 12,
        minHeight: 160,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--ink-2)";
        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.05)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--line-1)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div
          style={{
            width: 36,
            height: 36,
            background: "var(--bg-subtle)",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--ink-1)",
            flexShrink: 0,
          }}
        >
          <RiSurveyLine size={18} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13.5,
              fontWeight: 600,
              color: "var(--ink-1)",
              lineHeight: 1.3,
              marginBottom: 4,
              textOverflow: "ellipsis",
              overflow: "hidden",
              whiteSpace: "nowrap",
            }}
          >
            {f.name}
          </div>
          <span
            style={{
              display: "inline-block",
              background: s.bg,
              color: s.fg,
              padding: "2px 8px",
              borderRadius: 999,
              fontSize: 10.5,
              fontWeight: 500,
            }}
          >
            {s.label}
          </span>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Btn
              variant="ghost"
              size="sm"
              style={{ width: 28, height: 28, padding: 0, marginRight: -4, marginTop: -4 }}
            >
              <RiMoreLine className="h-4 w-4" />
            </Btn>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            onClick={(e) => e.stopPropagation()}
          >
            <DropdownMenuItem onClick={onOpen}>
              <RiEditLine className="h-4 w-4 mr-2" />
              {canUpdate ? t("edit") : t("view")}
            </DropdownMenuItem>
            {f.landingSlug && (
              <DropdownMenuItem onClick={onShare}>
                <RiGlobeLine className="h-4 w-4 mr-2" />
                {t("share")}
              </DropdownMenuItem>
            )}
            {canCreate && (
              <DropdownMenuItem onClick={onDuplicate}>
                <RiFileCopyLine className="h-4 w-4 mr-2" />
                {t("duplicate")}
              </DropdownMenuItem>
            )}
            {canDelete && (
              <DropdownMenuItem
                className="text-destructive"
                onClick={onDelete}
              >
                <RiDeleteBinLine className="h-4 w-4 mr-2" />
                {t("delete")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Event/General badge (prototype:253-263) */}
      {f.linkedEvent ? (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: 11,
            color: "#A65B1E",
            background: "#FBF2E6",
            padding: "3px 8px",
            borderRadius: 999,
            border: "1px solid #E8D9B8",
            alignSelf: "flex-start",
            maxWidth: "100%",
          }}
        >
          <RiCalendarEventLine size={10} />
          <span
            style={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {f.linkedEvent.name}
            {f.linkedTask ? ` · ${f.linkedTask.title}` : ""}
          </span>
        </div>
      ) : (
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: 11,
            color: "var(--ink-3)",
            alignSelf: "flex-start",
          }}
        >
          <RiBriefcase4Line size={10} />
          <span>{t("filterGeneral")}</span>
        </div>
      )}

      <div
        style={{
          display: "flex",
          gap: 14,
          marginTop: "auto",
          paddingTop: 10,
          borderTop: "1px solid var(--line-1)",
        }}
      >
        <div>
          <div
            style={{
              fontSize: 10,
              color: "var(--ink-3)",
              textTransform: "uppercase",
              letterSpacing: ".04em",
            }}
          >
            {t("statFields")}
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--ink-1)",
            }}
          >
            {f.fieldCount}
          </div>
        </div>
        <div>
          <div
            style={{
              fontSize: 10,
              color: "var(--ink-3)",
              textTransform: "uppercase",
              letterSpacing: ".04em",
            }}
          >
            {t("statResponses")}
          </div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--ink-1)",
            }}
          >
            {f.submissionCount}
          </div>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div
            style={{
              fontSize: 10,
              color: "var(--ink-3)",
              textTransform: "uppercase",
              letterSpacing: ".04em",
            }}
          >
            {t("statEdited")}
          </div>
          <div style={{ fontSize: 11.5, color: "var(--ink-2)" }}>
            {timeSince(f.updatedAt, t)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Create modal — name + (optional) event + task ──
interface EventLite {
  id: number;
  name: string;
  date?: string | null;
}
interface TaskLite {
  id: number;
  title: string;
}

function CreateFormModal({
  basePath,
  onClose,
  onCreated,
}: {
  basePath: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const t = useTranslations("forms");
  const router = useRouter();
  const [name, setName] = useState("");
  const [linkType, setLinkType] = useState<"general" | "event">("general");
  const [eventId, setEventId] = useState<number | "">("");
  const [taskId, setTaskId] = useState<number | "">("");
  const [events, setEvents] = useState<EventLite[]>([]);
  const [tasks, setTasks] = useState<TaskLite[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Load events for the dropdown.
  useEffect(() => {
    let alive = true;
    fetch("/api/events")
      .then((r) => r.json())
      .then((j) => {
        if (alive && j.success) setEvents(j.data || []);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  // Load tasks for the selected event. Loading flag and reset both happen in
  // the onChange handler so this effect only fires the network request.
  useEffect(() => {
    if (!eventId) return;
    let alive = true;
    fetch(`/api/tasks?eventId=${eventId}`)
      .then((r) => r.json())
      .then((j) => {
        if (alive && j.success) setTasks(j.data || []);
      })
      .catch(() => {})
      .finally(() => {
        if (alive) setLoadingTasks(false);
      });
    return () => {
      alive = false;
    };
  }, [eventId]);

  const handleEventChange = (value: number | "") => {
    setEventId(value);
    setTaskId("");
    if (value) {
      setLoadingTasks(true);
    } else {
      setTasks([]);
      setLoadingTasks(false);
    }
  };

  // Esc closes
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);

  const canSubmit =
    name.trim().length > 0 &&
    (linkType === "general" || (linkType === "event" && !!eventId)) &&
    !submitting;

  const submit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      // 1. Create the form.
      const res = await fetch("/api/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      const data = await res.json();
      if (!data.success) {
        toast.error(data.error || t("errorCreate"));
        setSubmitting(false);
        return;
      }
      const formId: number = data.data.id;

      // 2. If linking to event, create the appropriate instance and activate
      //    the form so the public URL (/f/{slug}) is immediately reachable —
      //    that's the URL clients/teammates click to fill it in.
      //    - With taskId → task instance (form will also appear inside that task).
      //    - Without taskId → landing instance with eventId (form is grouped
      //      under the event in the event detail "Formularios" section).
      if (linkType === "event" && eventId) {
        const body: {
          type: "task" | "landing";
          eventId: number;
          taskId?: number;
        } = taskId
          ? { type: "task", eventId: Number(eventId), taskId: Number(taskId) }
          : { type: "landing", eventId: Number(eventId) };
        const ir = await fetch(`/api/forms/${formId}/instances`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const ij = await ir.json();
        if (!ij.success) {
          // Form was created; instance failed. Surface but proceed to builder.
          toast.error(ij.error || t("errorLink"));
        } else {
          // Activate the form so the public URL works right away.
          await fetch(`/api/forms/${formId}/status`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "active" }),
          }).catch(() => {});
        }
      }

      onCreated();
      router.push(`${basePath}/${formId}`);
    } catch {
      toast.error(t("errorCreate"));
      setSubmitting(false);
    }
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(30,25,20,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        backdropFilter: "blur(2px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-panel)",
          borderRadius: "var(--r-md)",
          width: "min(480px, 92vw)",
          padding: 24,
          boxShadow: "0 20px 40px rgba(0,0,0,0.18)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 4,
          }}
        >
          <div>
            <h3
              style={{
                fontSize: 16,
                fontWeight: 600,
                color: "var(--ink-1)",
                margin: 0,
              }}
            >
              {t("newForm")}
            </h3>
            <p
              style={{
                fontSize: 12.5,
                color: "var(--ink-3)",
                marginTop: 4,
                marginBottom: 0,
              }}
            >
              {t("createModalSubtitle")}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--ink-3)",
              padding: 4,
              display: "flex",
            }}
          >
            <RiCloseLine size={18} />
          </button>
        </div>

        {/* Name */}
        <div style={{ marginTop: 18 }}>
          <label
            style={{
              fontSize: 11.5,
              color: "var(--ink-3)",
              fontWeight: 500,
              marginBottom: 6,
              display: "block",
            }}
          >
            {t("labelFormName")}
          </label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("placeholderFormName")}
            style={modalInput}
          />
        </div>

        {/* Link type pills */}
        <div style={{ marginTop: 16 }}>
          <label
            style={{
              fontSize: 11.5,
              color: "var(--ink-3)",
              fontWeight: 500,
              marginBottom: 6,
              display: "block",
            }}
          >
            {t("labelLinkEvent")}
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              onClick={() => setLinkType("general")}
              style={pillBtnStyle(linkType === "general")}
            >
              <RiBriefcase4Line size={12} /> {t("filterGeneral")}
            </button>
            <button
              type="button"
              onClick={() => setLinkType("event")}
              style={pillBtnStyle(linkType === "event")}
            >
              <RiCalendarEventLine size={12} /> {t("linkToEvent")}
            </button>
          </div>
        </div>

        {/* Event select */}
        {linkType === "event" && (
          <>
            <div style={{ marginTop: 14 }}>
              <label
                style={{
                  fontSize: 11.5,
                  color: "var(--ink-3)",
                  fontWeight: 500,
                  marginBottom: 6,
                  display: "block",
                }}
              >
                {t("labelEvent")}
              </label>
              <select
                value={eventId}
                onChange={(e) =>
                  handleEventChange(
                    e.target.value ? Number(e.target.value) : "",
                  )
                }
                style={modalInput}
              >
                <option value="">{t("chooseEvent")}</option>
                {events.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                    {e.date
                      ? ` · ${new Date(e.date).toLocaleDateString("es-ES", { day: "2-digit", month: "short" })}`
                      : ""}
                  </option>
                ))}
              </select>
              {!eventId && (
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--ink-3)",
                    marginTop: 4,
                  }}
                >
                  {t("selectEventHint")}
                </div>
              )}
            </div>

            {/* Task select (optional) — when filled, form will live inside the task */}
            {eventId !== "" && (
              <div style={{ marginTop: 14 }}>
                <label
                  style={{
                    fontSize: 11.5,
                    color: "var(--ink-3)",
                    fontWeight: 500,
                    marginBottom: 6,
                    display: "block",
                  }}
                >
                  {t("labelTask")}
                </label>
                <select
                  value={taskId}
                  onChange={(e) =>
                    setTaskId(e.target.value ? Number(e.target.value) : "")
                  }
                  disabled={loadingTasks}
                  style={modalInput}
                >
                  <option value="">
                    {loadingTasks
                      ? t("loadingTasks")
                      : t("noTask")}
                  </option>
                  {tasks.map((task) => (
                    <option key={task.id} value={task.id}>
                      {task.title}
                    </option>
                  ))}
                </select>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--ink-3)",
                    marginTop: 4,
                  }}
                >
                  {t("taskHint")}
                </div>
              </div>
            )}
          </>
        )}

        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
            marginTop: 22,
          }}
        >
          <button onClick={onClose} style={modalBtn(false)}>
            {t("cancel")}
          </button>
          <button
            onClick={submit}
            disabled={!canSubmit}
            style={{ ...modalBtn(true), opacity: canSubmit ? 1 : 0.5 }}
          >
            {submitting ? t("creating") : t("createForm")}
          </button>
        </div>
      </div>
    </div>
  );
}

const modalInput: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid var(--line-1)",
  borderRadius: "var(--r-sm)",
  fontSize: 13,
  background: "white",
  color: "var(--ink-1)",
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
};

function pillBtnStyle(active: boolean): React.CSSProperties {
  return {
    display: "inline-flex",
    alignItems: "center",
    gap: 6,
    padding: "8px 12px",
    borderRadius: "var(--r-sm)",
    border: `1px solid ${active ? "var(--ink-1)" : "var(--line-1)"}`,
    background: active ? "var(--bg-subtle)" : "white",
    color: active ? "var(--ink-1)" : "var(--ink-2)",
    fontSize: 12.5,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "inherit",
  };
}

function modalBtn(primary: boolean): React.CSSProperties {
  return {
    padding: "8px 16px",
    borderRadius: "var(--r-sm)",
    border: primary ? "none" : "1px solid var(--line-1)",
    background: primary ? "var(--ink-1)" : "white",
    color: primary ? "white" : "var(--ink-2)",
    fontSize: 13,
    fontWeight: 500,
    cursor: "pointer",
    fontFamily: "inherit",
  };
}

// ─── Submissions view (preserved verbatim) ──
interface OrgSubmission {
  id: number;
  formId: number;
  instanceId: number;
  respondentName: string | null;
  respondentEmail: string | null;
  createdAt: string;
  formName: string;
  instanceType: string;
  instanceSlug: string | null;
}

type ResponseFilter = "all" | "landing" | "task";

function AllSubmissionsView({
  basePath = "/dashboard/forms",
}: {
  basePath?: string;
}) {
  const t = useTranslations("forms");
  const [subs, setSubs] = useState<OrgSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [typeFilter, setTypeFilter] = useState<ResponseFilter>("all");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/forms/submissions?limit=50");
        const data = await res.json();
        if (data.success) {
          setSubs(data.data || []);
          setTotal(data.meta?.total ?? 0);
        }
      } catch {
        /* silent */
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filteredSubs =
    typeFilter === "all"
      ? subs
      : subs.filter((s) => s.instanceType === typeFilter);

  const downloadPdf = async (formId: number, subId: number) => {
    try {
      const { downloadPDFFromHTML } = await import("@/lib/pdf-download");
      await downloadPDFFromHTML(
        `/api/forms/${formId}/submissions/${subId}/pdf?format=html`,
        `Respuesta_${subId}.pdf`,
      );
    } catch {
      toast.error(t("errorDownloadPdf"));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <RiLoader4Line className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (subs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <RiFileList2Line className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-medium">{t("noResponses")}</h3>
        <p className="text-sm text-muted-foreground mt-1">
          {t("noResponsesDescription")}
        </p>
      </div>
    );
  }

  const responseFilterTabs: {
    label: string;
    value: ResponseFilter;
    icon: typeof RiGlobeLine;
  }[] = [
    { label: t("filterAll"), value: "all", icon: RiFileList2Line },
    { label: "Landing", value: "landing", icon: RiGlobeLine },
    { label: t("filterTasks"), value: "task", icon: RiTaskLine },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex gap-1 bg-muted rounded-lg p-1">
          {responseFilterTabs.map((tab) => (
            <button
              key={tab.value}
              onClick={() => setTypeFilter(tab.value)}
              className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors flex items-center gap-1.5 ${
                typeFilter === tab.value
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="h-3.5 w-3.5" /> {tab.label}
            </button>
          ))}
        </div>
        <p className="text-sm text-muted-foreground">
          {t("responsesCount", { shown: filteredSubs.length, total })}
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="text-left px-4 py-2 font-medium">{t("colForm")}</th>
              <th className="text-left px-4 py-2 font-medium">{t("colType")}</th>
              <th className="text-left px-4 py-2 font-medium">{t("colName")}</th>
              <th className="text-left px-4 py-2 font-medium">{t("colEmail")}</th>
              <th className="text-left px-4 py-2 font-medium">{t("colDate")}</th>
              <th className="text-left px-4 py-2 font-medium">{t("colPdf")}</th>
            </tr>
          </thead>
          <tbody>
            {filteredSubs.map((sub) => (
              <tr key={sub.id} className="border-t hover:bg-muted/30">
                <td className="px-4 py-2">
                  <a
                    href={`${basePath}/${sub.formId}`}
                    className="text-primary hover:underline font-medium"
                  >
                    {sub.formName}
                  </a>
                </td>
                <td className="px-4 py-2">
                  <Pill bg="transparent" style={{ border: "1px solid var(--line-strong)", fontSize: 11 }}>
                    {sub.instanceType === "landing" ? (
                      <>
                        <RiGlobeLine className="h-3 w-3 mr-1" />
                        Landing
                      </>
                    ) : (
                      <>
                        <RiTaskLine className="h-3 w-3 mr-1" />
                        {t("typeTask")}
                      </>
                    )}
                  </Pill>
                </td>
                <td className="px-4 py-2">{sub.respondentName || "—"}</td>
                <td className="px-4 py-2">{sub.respondentEmail || "—"}</td>
                <td className="px-4 py-2 text-muted-foreground whitespace-nowrap">
                  {new Date(sub.createdAt).toLocaleDateString("es-AR", {
                    day: "2-digit",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </td>
                <td className="px-4 py-2">
                  <Btn
                    variant="ghost"
                    size="sm"
                    style={{ width: 28, height: 28, padding: 0 }}
                    onClick={() => downloadPdf(sub.formId, sub.id)}
                    title={t("downloadPdf")}
                  >
                    <RiDownloadLine className="h-3.5 w-3.5" />
                  </Btn>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
