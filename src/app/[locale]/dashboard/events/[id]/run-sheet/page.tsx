"use client";

import { useTranslations } from "next-intl";
import { use, useState, useEffect, useCallback } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { hgIcon } from "@/components/ui/hg-icon";
import {
  Calendar01Icon,
  PlusSignIcon,
  Edit02Icon,
  Delete01Icon,
  Cancel01Icon,
  Tick01Icon,
  Download01Icon,
  PrinterIcon,
  FilterIcon,
  FilterRemoveIcon,
  Location01Icon,
  UserIcon,
  File02Icon,
  ArrowDown01Icon,
} from "@hugeicons/core-free-icons";

const IcoCalendar = hgIcon(Calendar01Icon);
const IcoPlus = hgIcon(PlusSignIcon);
const IcoEdit = hgIcon(Edit02Icon);
const IcoDelete = hgIcon(Delete01Icon);
const IcoX = hgIcon(Cancel01Icon);
const IcoCheck = hgIcon(Tick01Icon);
const IcoDownload = hgIcon(Download01Icon);
const IcoPrinter = hgIcon(PrinterIcon);
const IcoFilter = hgIcon(FilterIcon);
const IcoFilterOff = hgIcon(FilterRemoveIcon);
const IcoLocation = hgIcon(Location01Icon);
const IcoUser = hgIcon(UserIcon);
const IcoFile = hgIcon(File02Icon);
const IcoChevDown = hgIcon(ArrowDown01Icon);
import { useEvent } from "@/contexts/event-context";
import { useUserSessionContext } from "@/contexts/user-session-context";
import { useEventPermissions } from "@/hooks/use-event-permissions";
import { EventSectionGuard } from "@/components/events/event-section-guard";
import { downloadPDFFromHTML } from "@/lib/pdf-download";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { toast } from "sonner";

interface ScheduleItem {
  id: number;
  title: string;
  description: string | null;
  date: string;
  startTime: string | null;
  endTime: string | null;
  location: string | null;
  notes: string | null;
  source: "event" | "task";
  taskTitle: string | null;
  taskId: number | null;
  vendorId: number | null;
  vendorName: string | null;
}

interface TaskOption {
  id: number;
  title: string;
}

interface VendorOption {
  id: number;
  name: string;
}

const emptyForm = {
  title: "",
  date: "",
  startTime: "",
  endTime: "",
  location: "",
  description: "",
  vendorId: "",
  targetSource: "event" as "event" | "task",
  targetTaskId: "",
};

export default function RunSheetPage({ params }: { params: Promise<{ id: string }> }) {
  const t = useTranslations("eventDetail");
  const { id } = use(params);
  const eventId = parseInt(id, 10);
  const { activeEvent } = useEvent();
  const { eventScoped } = useUserSessionContext();
  const { canEdit } = useEventPermissions(eventId, eventScoped);
  const canEditRunSheet = canEdit("runsheet");

  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [eventTasks, setEventTasks] = useState<TaskOption[]>([]);
  const [vendorOptions, setVendorOptions] = useState<VendorOption[]>([]);

  // CRUD state
  const [showAddForm, setShowAddForm] = useState(false);
  const [adding, setAdding] = useState(false);
  const [newItem, setNewItem] = useState({ ...emptyForm });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editFields, setEditFields] = useState({ ...emptyForm });
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Filter state
  const [filterVendor, setFilterVendor] = useState("");
  const [filterTask, setFilterTask] = useState("");

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch(`/api/events/${eventId}/schedule`);
      const data = await res.json();
      if (data.success) setItems(data.data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [eventId]);

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks?eventId=${eventId}`);
      const data = await res.json();
      if (data.success) {
        const rows = (data.data || []) as { id: number; title: string }[];
        setEventTasks(rows.map((t) => ({ id: t.id, title: t.title })));
      }
    } catch { /* ignore */ }
  }, [eventId]);

  const fetchVendors = useCallback(async () => {
    try {
      const res = await fetch("/api/vendors");
      const data = await res.json();
      if (data.success) {
        const rows = (data.data || []) as { id: number; name: string }[];
        setVendorOptions(rows.map((v) => ({ id: v.id, name: v.name })));
      }
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchItems();
    fetchTasks();
    fetchVendors();
  }, [fetchItems, fetchTasks, fetchVendors]);

  const itemKey = (item: ScheduleItem) => `${item.source}-${item.id}`;

  // --- ADD ---
  const handleAdd = async () => {
    if (!newItem.title.trim() || !newItem.date) return;
    setAdding(true);
    try {
      const isTask = newItem.targetSource === "task" && newItem.targetTaskId;
      const url = isTask
        ? `/api/tasks/${newItem.targetTaskId}/schedule`
        : `/api/events/${eventId}/schedule`;

      const body: Record<string, unknown> = {
        title: newItem.title.trim(),
        date: newItem.date,
        startTime: newItem.startTime || undefined,
        endTime: newItem.endTime || undefined,
        location: newItem.location.trim() || undefined,
        description: newItem.description.trim() || undefined,
      };
      if (isTask && newItem.vendorId) {
        body.vendorId = parseInt(newItem.vendorId, 10);
      }

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(t("activityAdded"));
        setNewItem({ ...emptyForm });
        setShowAddForm(false);
        fetchItems();
      } else {
        toast.error(data.error || t("errorAdding"));
      }
    } catch {
      toast.error(t("errorAddingActivity"));
    } finally {
      setAdding(false);
    }
  };

  // --- EDIT ---
  const startEdit = (item: ScheduleItem) => {
    setEditingId(itemKey(item));
    setEditFields({
      title: item.title,
      date: new Date(item.date).toISOString().split("T")[0],
      startTime: item.startTime || "",
      endTime: item.endTime || "",
      location: item.location || "",
      description: item.description || "",
      vendorId: item.vendorId?.toString() || "",
      targetSource: item.source,
      targetTaskId: item.taskId?.toString() || "",
    });
  };

  const handleSaveEdit = async (item: ScheduleItem) => {
    const url = item.source === "task"
      ? `/api/tasks/${item.taskId}/schedule`
      : `/api/events/${eventId}/schedule`;

    const body: Record<string, unknown> = {
      scheduleItemId: item.id,
      title: editFields.title.trim(),
      date: editFields.date,
      startTime: editFields.startTime || null,
      endTime: editFields.endTime || null,
      location: editFields.location.trim() || null,
      description: editFields.description.trim() || null,
    };
    if (item.source === "task") {
      body.vendorId = editFields.vendorId ? parseInt(editFields.vendorId, 10) : null;
    }

    try {
      const res = await fetch(url, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (data.success) {
        toast.success(t("activityUpdated"));
        setEditingId(null);
        fetchItems();
      } else {
        toast.error(data.error || t("errorUpdating"));
      }
    } catch {
      toast.error(t("errorUpdating"));
    }
  };

  // --- DELETE ---
  const handleDelete = async (item: ScheduleItem) => {
    const key = itemKey(item);
    if (deletingId === key) {
      const url = item.source === "task"
        ? `/api/tasks/${item.taskId}/schedule?scheduleItemId=${item.id}`
        : `/api/events/${eventId}/schedule?scheduleItemId=${item.id}`;
      try {
        const res = await fetch(url, { method: "DELETE" });
        const data = await res.json();
        if (data.success) {
          toast.success(t("activityDeleted"));
          fetchItems();
        } else {
          toast.error(data.error || t("errorDeleting"));
        }
      } catch {
        toast.error(t("errorDeleting"));
      }
      setDeletingId(null);
    } else {
      setDeletingId(key);
      setTimeout(() => setDeletingId(null), 3000);
    }
  };

  // --- PDF ---
  const handleDownloadPdf = async (opts?: { taskId?: number; vendorId?: number }) => {
    setDownloading(true);
    try {
      const params = new URLSearchParams();
      if (opts?.taskId) params.set("taskId", opts.taskId.toString());
      if (opts?.vendorId) params.set("vendorId", opts.vendorId.toString());
      const qs = params.toString() ? `?${params.toString()}` : "";
      const url = `/api/events/${eventId}/run-sheet/pdf${qs}`;
      const eventName = activeEvent?.name || "evento";
      const suffix = opts?.taskId ? `-tarea-${opts.taskId}` : opts?.vendorId ? `-proveedor-${opts.vendorId}` : "";
      const filename = `orden-del-dia-${eventName.replace(/\s+/g, "-").toLowerCase()}${suffix}`;
      await downloadPDFFromHTML(url, filename);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = async () => {
    const params = new URLSearchParams();
    if (filterVendor) params.set("vendorId", filterVendor);
    if (filterTask) params.set("taskId", filterTask);
    const qs = params.toString() ? `?${params.toString()}` : "";
    const url = `/api/events/${eventId}/run-sheet/pdf${qs}`;
    window.open(url, "_blank");
  };

  // --- FILTERING ---
  const filteredItems = items.filter((item) => {
    if (filterVendor && (item.vendorId?.toString() !== filterVendor)) return false;
    if (filterTask) {
      if (filterTask === "__event__") {
        if (item.source !== "event") return false;
      } else if (item.taskId?.toString() !== filterTask) {
        return false;
      }
    }
    return true;
  });

  const hasFilters = filterVendor || filterTask;

  // Group items by date
  const itemsByDate = filteredItems.reduce<Record<string, ScheduleItem[]>>((acc, item) => {
    const dateKey = new Date(item.date).toISOString().split("T")[0];
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(item);
    return acc;
  }, {});

  Object.values(itemsByDate).forEach((dateItems) => {
    dateItems.sort((a, b) => (a.startTime || "99:99").localeCompare(b.startTime || "99:99"));
  });

  const sortedDates = Object.keys(itemsByDate).sort();

  // Unique tasks/vendors for dropdowns
  const uniqueTasks = items
    .filter((i) => i.source === "task" && i.taskId)
    .reduce<{ id: number; title: string }[]>((acc, item) => {
      if (!acc.find((t) => t.id === item.taskId)) {
        acc.push({ id: item.taskId!, title: item.taskTitle || `Tarea #${item.taskId}` });
      }
      return acc;
    }, []);

  const uniqueVendors = items
    .filter((i) => i.vendorId && i.vendorName)
    .reduce<{ id: number; name: string }[]>((acc, item) => {
      if (!acc.find((v) => v.id === item.vendorId)) {
        acc.push({ id: item.vendorId!, name: item.vendorName! });
      }
      return acc;
    }, []);

  // Prototype's input style — single source of truth so edit/add forms match.
  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "9px 12px",
    height: 36,
    boxSizing: "border-box",
    border: "1px solid var(--line-1)",
    borderRadius: 8,
    background: "#FFFFFF",
    color: "var(--ink-1)",
    fontSize: 13,
    outline: "none",
  };

  return (
    <EventSectionGuard eventId={eventId} section="runsheet">
      <div
        className="rounded-[12px]"
        style={{
          background: "#FFFFFF",
          border: "1px solid var(--line-1)",
          padding: 20,
        }}
      >
        {/* Header */}
        <div className="flex items-start gap-3 mb-3.5 flex-wrap">
          <div>
            <div className="flex items-center gap-2 text-[16px] font-semibold text-[var(--ink-1)]">
              <IcoCalendar className="h-4 w-4" />
              {t("runSheetTitle")}
            </div>
            <div className="text-[12px] text-[var(--ink-3)] mt-0.5">
              {t("runSheetSubtitle")}
            </div>
          </div>
          <div className="ml-auto flex gap-2 flex-wrap">
            {canEditRunSheet && (
              <SmallBtn
                icon={<IcoPlus className="h-3 w-3" />}
                onClick={() => {
                  setShowAddForm(!showAddForm);
                  setEditingId(null);
                }}
              >
                {t("addActivity")}
              </SmallBtn>
            )}
            <SmallBtn
              icon={<IcoPrinter className="h-3 w-3" />}
              onClick={handlePrint}
              disabled={items.length === 0}
            >
              {t("print")}
            </SmallBtn>
            {uniqueVendors.length > 0 && (
              <DropdownBtn
                icon={<IcoFile className="h-3 w-3" />}
                label={t("pdfByVendor")}
                disabled={downloading || items.length === 0}
                items={uniqueVendors.map((v) => ({
                  label: v.name,
                  onClick: () => handleDownloadPdf({ vendorId: v.id }),
                }))}
              />
            )}
            {uniqueTasks.length > 0 && (
              <DropdownBtn
                icon={<IcoFile className="h-3 w-3" />}
                label={t("pdfByTask")}
                disabled={downloading || items.length === 0}
                items={uniqueTasks.map((t) => ({
                  label: t.title,
                  onClick: () => handleDownloadPdf({ taskId: t.id }),
                }))}
              />
            )}
            <button
              onClick={() => handleDownloadPdf()}
              disabled={downloading || items.length === 0}
              className="inline-flex items-center gap-1.5 rounded-[8px] cursor-pointer transition-colors border-none"
              style={{
                background: "var(--ink-1)",
                color: "#FFFFFF",
                padding: "6px 12px",
                fontSize: 12,
                fontWeight: 600,
                opacity: downloading || items.length === 0 ? 0.5 : 1,
              }}
            >
              <IcoDownload className="h-3 w-3" />
              {downloading ? t("generating") : t("downloadPdf")}
            </button>
          </div>
        </div>

        {/* Filters */}
        {items.length > 0 && !showAddForm && !editingId && (
          <div
            className="flex items-center gap-2.5 flex-wrap mb-4 pb-3.5"
            style={{ borderBottom: "1px solid var(--line-1)" }}
          >
            <span className="flex items-center gap-1 text-[12px] text-[var(--ink-3)] font-medium">
              <IcoFilter className="h-3.5 w-3.5" />
              {t("filters")}
            </span>
            {(uniqueVendors.length > 0 || uniqueTasks.length > 0) && (
              <>
                <FilterSelect
                  value={filterVendor}
                  onChange={setFilterVendor}
                  options={[
                    { value: "", label: t("allVendors") },
                    ...uniqueVendors.map((v) => ({
                      value: v.id.toString(),
                      label: v.name,
                    })),
                  ]}
                />
                <FilterSelect
                  value={filterTask}
                  onChange={setFilterTask}
                  options={[
                    { value: "", label: t("allSources") },
                    { value: "__event__", label: t("generalEvent") },
                    ...uniqueTasks.map((task) => ({
                      value: task.id.toString(),
                      label: task.title,
                    })),
                  ]}
                />
              </>
            )}
            {hasFilters && (
              <button
                onClick={() => {
                  setFilterVendor("");
                  setFilterTask("");
                }}
                className="bg-transparent border-none cursor-pointer text-[12px] underline"
                style={{ color: "var(--ink-3)" }}
              >
                <span className="inline-flex items-center gap-1">
                  <IcoFilterOff className="h-3 w-3" />
                  {t("clearFilters")}
                </span>
              </button>
            )}
            <span className="ml-auto text-[12px] text-[var(--ink-3)]">
              {filteredItems.length} {t("of")} {items.length} {t("activities")}
            </span>
          </div>
        )}

        {/* Inline add form */}
        {showAddForm && canEditRunSheet && (
          <ActivityForm
            mode="add"
            inputStyle={inputStyle}
            value={newItem}
            onChange={setNewItem}
            eventTasks={eventTasks}
            vendorOptions={vendorOptions}
            saving={adding}
            onCancel={() => setShowAddForm(false)}
            onSave={handleAdd}
          />
        )}

        {/* Loading / empty / timeline */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center"
            style={{ padding: "60px 20px", minHeight: 280 }}
          >
            <div
              className="h-12 w-12 rounded-full flex items-center justify-center mb-3"
              style={{ background: "var(--bg-subtle)" }}
            >
              <IcoCalendar className="h-5 w-5 text-[var(--ink-3)]" />
            </div>
            <div className="text-[14px] font-semibold text-[var(--ink-1)] mb-1">
              {hasFilters ? t("noMatches") : t("noActivities")}
            </div>
            <div className="text-[12.5px] text-[var(--ink-3)] text-center max-w-[420px]">
              {hasFilters
                ? t("tryClearFilters")
                : canEditRunSheet
                  ? t("planRunSheetDesc")
                  : t("runSheetNotLoaded")}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {sortedDates.map((dateKey) => {
              const dateItems = itemsByDate[dateKey];
              const dateObj = new Date(dateKey + "T12:00:00");
              const dateLabel = format(dateObj, "EEEE d 'de' MMMM, yyyy", {
                locale: es,
              });
              return (
                <div key={dateKey}>
                  <div
                    className="text-[11px] font-semibold uppercase tracking-wide text-[var(--ink-3)] mb-2"
                    style={{ letterSpacing: "0.08em" }}
                  >
                    {dateLabel} · {dateItems.length}{" "}
                    {dateItems.length === 1 ? t("activity") : t("activities")}
                  </div>
                  <div style={{ position: "relative", paddingLeft: 24 }}>
                    {/* Vertical line */}
                    <div
                      style={{
                        position: "absolute",
                        left: 7,
                        top: 8,
                        bottom: 8,
                        width: 1.5,
                        background: "var(--ink-1)",
                        opacity: 0.6,
                      }}
                    />
                    {dateItems.map((item) => {
                      const key = itemKey(item);
                      const isEditing = editingId === key;
                      if (isEditing && canEditRunSheet) {
                        return (
                          <div
                            key={key}
                            style={{
                              position: "relative",
                              padding: "10px 0 14px 20px",
                            }}
                          >
                            <div
                              style={{
                                position: "absolute",
                                left: -7,
                                top: 18,
                                width: 14,
                                height: 14,
                                borderRadius: "50%",
                                background: "var(--ink-1)",
                                border: "3px solid #FFFFFF",
                                boxShadow: "0 0 0 1px var(--line-strong)",
                              }}
                            />
                            <ActivityForm
                              mode="edit"
                              inputStyle={inputStyle}
                              value={editFields}
                              onChange={setEditFields}
                              eventTasks={eventTasks}
                              vendorOptions={vendorOptions}
                              showTaskSelect={item.source === "task"}
                              onCancel={() => setEditingId(null)}
                              onSave={() => handleSaveEdit(item)}
                            />
                          </div>
                        );
                      }
                      const isTaskSource = item.source === "task";
                      return (
                        <div
                          key={key}
                          style={{
                            position: "relative",
                            padding: "10px 0 14px 20px",
                            display: "flex",
                            gap: 14,
                            alignItems: "flex-start",
                          }}
                        >
                          <div
                            style={{
                              position: "absolute",
                              left: -7,
                              top: 18,
                              width: 14,
                              height: 14,
                              borderRadius: "50%",
                              background: isTaskSource
                                ? "#4A6A94"
                                : "var(--ink-1)",
                              border: "3px solid #FFFFFF",
                              boxShadow: "0 0 0 1px var(--line-strong)",
                            }}
                          />
                          <div style={{ minWidth: 78 }}>
                            <div
                              className="text-[15px] font-bold text-[var(--ink-1)]"
                              style={{ letterSpacing: "-0.01em" }}
                            >
                              {item.startTime || "—"}
                            </div>
                            <div
                              className="text-[10.5px] text-[var(--ink-3)] uppercase"
                              style={{ letterSpacing: "0.06em" }}
                            >
                              {item.startTime && item.endTime
                                ? `${item.startTime}–${item.endTime}`
                                : item.startTime
                                  ? t("start")
                                  : t("noTime")}
                            </div>
                          </div>
                          <div
                            className="group"
                            style={{
                              flex: 1,
                              padding: 12,
                              background: isTaskSource
                                ? "color-mix(in srgb, #4A6A94 6%, #FFFFFF)"
                                : "#FFFFFF",
                              border: `1px solid ${
                                isTaskSource
                                  ? "color-mix(in srgb, #4A6A94 25%, var(--line-1))"
                                  : "var(--line-1)"
                              }`,
                              borderRadius: 8,
                              cursor: canEditRunSheet ? "pointer" : "default",
                            }}
                            onClick={
                              canEditRunSheet
                                ? () => {
                                    setShowAddForm(false);
                                    startEdit(item);
                                  }
                                : undefined
                            }
                          >
                            <div className="flex items-center gap-2">
                              <div className="text-[14px] font-semibold flex-1 text-[var(--ink-1)]">
                                {item.title}
                              </div>
                              {canEditRunSheet && (
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startEdit(item);
                                    }}
                                    aria-label="Editar"
                                    className="cursor-pointer"
                                    style={{
                                      background: "none",
                                      border: "none",
                                      padding: 4,
                                      color: "var(--ink-3)",
                                    }}
                                  >
                                    <IcoEdit className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDelete(item);
                                    }}
                                    aria-label="Eliminar"
                                    className="cursor-pointer"
                                    style={{
                                      background:
                                        deletingId === key
                                          ? "rgba(181,84,80,0.10)"
                                          : "none",
                                      border: "none",
                                      padding: 4,
                                      color:
                                        deletingId === key
                                          ? "#B55450"
                                          : "var(--ink-3)",
                                      borderRadius: 4,
                                    }}
                                  >
                                    <IcoDelete className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-[12px] text-[var(--ink-3)]">
                              <span className="inline-flex items-center gap-1">
                                <IcoLocation className="h-3 w-3" />
                                {item.location || "—"}
                              </span>
                              <span className="inline-flex items-center gap-1">
                                <IcoUser className="h-3 w-3" />
                                {item.vendorName || "—"}
                              </span>
                              <span
                                style={{
                                  background: "var(--bg-subtle)",
                                  padding: "2px 8px",
                                  borderRadius: 999,
                                  fontSize: 11,
                                  color: "var(--ink-2)",
                                }}
                              >
                                {isTaskSource
                                  ? item.taskTitle || t("task")
                                  : t("generalEvent")}
                              </span>
                            </div>
                            {(item.description || item.notes) && (
                              <div
                                className="mt-2 text-[12px] text-[var(--ink-2)]"
                                style={{
                                  paddingTop: 8,
                                  borderTop: "1px solid var(--line-1)",
                                  whiteSpace: "pre-line",
                                }}
                              >
                                {[item.description, item.notes]
                                  .filter(Boolean)
                                  .join("\n")}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </EventSectionGuard>
  );
}

// =============================================================================
// Helper components — match the prototype's chrome
// =============================================================================
function SmallBtn({
  icon,
  children,
  onClick,
  disabled,
}: {
  icon?: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-[8px] cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
      style={{
        background: "#FFFFFF",
        border: "1px solid var(--line-strong)",
        padding: "6px 12px",
        fontSize: 12,
        fontWeight: 500,
        color: "var(--ink-1)",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {icon}
      {children}
    </button>
  );
}

function DropdownBtn({
  icon,
  label,
  disabled,
  items,
}: {
  icon?: React.ReactNode;
  label: string;
  disabled?: boolean;
  items: { label: string; onClick: () => void }[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => !disabled && setOpen((o) => !o)}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 rounded-[8px] cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
        style={{
          background: "#FFFFFF",
          border: "1px solid var(--line-strong)",
          padding: "6px 12px",
          fontSize: 12,
          fontWeight: 500,
          color: "var(--ink-1)",
          opacity: disabled ? 0.5 : 1,
        }}
      >
        {icon}
        {label}
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-30"
            onClick={() => setOpen(false)}
          />
          <div
            className="absolute right-0 top-full mt-1 z-40 rounded-[8px]"
            style={{
              background: "#FFFFFF",
              border: "1px solid var(--line-1)",
              boxShadow: "0 4px 16px rgba(0,0,0,0.08)",
              minWidth: 200,
              padding: 4,
            }}
          >
            {items.map((item, i) => (
              <button
                key={i}
                onClick={() => {
                  setOpen(false);
                  item.onClick();
                }}
                className="w-full text-left rounded-[6px] cursor-pointer hover:bg-[var(--bg-subtle)] transition-colors"
                style={{
                  padding: "6px 10px",
                  fontSize: 12.5,
                  color: "var(--ink-1)",
                  background: "none",
                  border: "none",
                }}
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function FilterSelect({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="cursor-pointer"
        style={{
          appearance: "none",
          height: 30,
          padding: "0 28px 0 10px",
          border: "1px solid var(--line-1)",
          borderRadius: 8,
          background: "#FFFFFF",
          color: "var(--ink-1)",
          fontSize: 12,
          outline: "none",
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <span
        className="pointer-events-none"
        style={{
          position: "absolute",
          right: 8,
          top: "50%",
          transform: "translateY(-50%)",
          color: "var(--ink-3)",
        }}
      >
        <IcoChevDown className="h-3 w-3" />
      </span>
    </div>
  );
}

type ActivityFormState = typeof emptyForm;

function ActivityForm({
  mode,
  inputStyle,
  value,
  onChange,
  eventTasks,
  vendorOptions,
  showTaskSelect,
  saving,
  onCancel,
  onSave,
}: {
  mode: "add" | "edit";
  inputStyle: React.CSSProperties;
  value: ActivityFormState;
  onChange: (v: ActivityFormState) => void;
  eventTasks: { id: number; title: string }[];
  vendorOptions: { id: number; name: string }[];
  showTaskSelect?: boolean;
  saving?: boolean;
  onCancel: () => void;
  onSave: () => void;
}) {
  const t = useTranslations("eventDetail");
  const canSave = value.title.trim().length > 0 && !!value.date;
  const set = <K extends keyof ActivityFormState>(
    k: K,
    v: ActivityFormState[K],
  ) => onChange({ ...value, [k]: v });
  const showVendor =
    mode === "edit"
      ? showTaskSelect
      : value.targetSource === "task";
  return (
    <div
      className="rounded-[8px]"
      style={{
        background: "var(--bg-subtle)",
        border: "1px solid var(--line-1)",
        padding: 18,
        marginBottom: 16,
      }}
    >
      <div className="text-[13px] font-semibold text-[var(--ink-1)] mb-3">
        {mode === "edit" ? t("editActivity") : t("newActivity")}
      </div>
      <div
        className="grid gap-2.5 mb-2.5"
        style={{ gridTemplateColumns: "2fr 1fr 1fr 1fr" }}
      >
        <input
          placeholder={t("activityTitlePlaceholder")}
          value={value.title}
          onChange={(e) => set("title", e.target.value)}
          style={inputStyle}
        />
        <input
          type="date"
          value={value.date}
          onChange={(e) => set("date", e.target.value)}
          style={inputStyle}
        />
        <input
          type="time"
          value={value.startTime}
          onChange={(e) => set("startTime", e.target.value)}
          style={inputStyle}
        />
        <input
          type="time"
          value={value.endTime}
          onChange={(e) => set("endTime", e.target.value)}
          style={inputStyle}
        />
      </div>
      <div
        className="grid gap-2.5 mb-2.5"
        style={{ gridTemplateColumns: "1fr 2fr" }}
      >
        {mode === "add" ? (
          <select
            value={
              value.targetSource === "task" ? value.targetTaskId : "__event__"
            }
            onChange={(e) => {
              if (e.target.value === "__event__") {
                onChange({
                  ...value,
                  targetSource: "event",
                  targetTaskId: "",
                  vendorId: "",
                });
              } else {
                onChange({
                  ...value,
                  targetSource: "task",
                  targetTaskId: e.target.value,
                });
              }
            }}
            style={inputStyle}
          >
            <option value="__event__">{t("generalEvent")}</option>
            {eventTasks.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
        ) : showVendor ? (
          <select
            value={value.vendorId}
            onChange={(e) => set("vendorId", e.target.value)}
            style={inputStyle}
          >
            <option value="">{t("noVendor")}</option>
            {vendorOptions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        ) : (
          <div />
        )}
        <input
          placeholder={t("locationOptional")}
          value={value.location}
          onChange={(e) => set("location", e.target.value)}
          style={inputStyle}
        />
      </div>
      {mode === "add" && value.targetSource === "task" && (
        <div className="mb-2.5">
          <select
            value={value.vendorId}
            onChange={(e) => set("vendorId", e.target.value)}
            style={inputStyle}
          >
            <option value="">{t("vendorOptional")}</option>
            {vendorOptions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
      )}
      <textarea
        placeholder={t("notesOptional")}
        value={value.description}
        onChange={(e) => set("description", e.target.value)}
        rows={2}
        style={{
          ...inputStyle,
          height: "auto",
          minHeight: 60,
          padding: "10px 12px",
          resize: "vertical",
        }}
      />
      <div className="flex justify-end gap-2 mt-3.5">
        <button
          onClick={onCancel}
          className="inline-flex items-center rounded-[8px] cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
          style={{
            background: "#FFFFFF",
            border: "1px solid var(--line-strong)",
            padding: "6px 14px",
            fontSize: 12.5,
            fontWeight: 500,
            color: "var(--ink-1)",
          }}
        >
          <IcoX className="h-3 w-3 mr-1" />
          {t("cancel")}
        </button>
        <button
          onClick={() => canSave && onSave()}
          disabled={!canSave || saving}
          className="inline-flex items-center rounded-[8px] cursor-pointer transition-colors border-none"
          style={{
            background: "var(--ink-1)",
            color: "#FFFFFF",
            padding: "6px 14px",
            fontSize: 12.5,
            fontWeight: 600,
            opacity: !canSave || saving ? 0.5 : 1,
          }}
        >
          <IcoCheck className="h-3 w-3 mr-1" />
          {saving
            ? t("saving")
            : mode === "edit"
              ? t("save")
              : t("add")}
        </button>
      </div>
    </div>
  );
}
