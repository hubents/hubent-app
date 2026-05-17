"use client";

import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { hgIcon } from "@/components/ui/hg-icon";
import {
  Clock01Icon,
  PlusSignIcon,
  CallIcon,
  Mail01Icon,
  Calendar03Icon,
  Note01Icon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";

const IcoClock = hgIcon(Clock01Icon);
const IcoPlus = hgIcon(PlusSignIcon);
const IcoPhone = hgIcon(CallIcon);
const IcoMail = hgIcon(Mail01Icon);
const IcoCalendar = hgIcon(Calendar03Icon);
const IcoNote = hgIcon(Note01Icon);
const IcoCheck = hgIcon(Tick01Icon);

interface ContactActivity {
  id: number;
  type: string;
  title: string;
  description: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string | null;
  createdByName: string | null;
}

interface ContactActivityTabProps {
  activities: ContactActivity[];
  loading: boolean;
  onAddActivity: (data: { type: string; title: string; description?: string }) => Promise<unknown>;
}

const ACTIVITY_TYPES: { id: string; label: string; icon: React.ReactNode; color: string }[] = [
  { id: "note", label: "Nota", icon: <IcoNote className="h-3 w-3" />, color: "var(--ink-2)" },
  { id: "call", label: "Llamada", icon: <IcoPhone className="h-3 w-3" />, color: "var(--info-ink)" },
  { id: "email", label: "Email", icon: <IcoMail className="h-3 w-3" />, color: "var(--success-ink)" },
  { id: "meeting", label: "Reunión", icon: <IcoCalendar className="h-3 w-3" />, color: "#9B7EB8" },
  { id: "other", label: "Otro", icon: <IcoCheck className="h-3 w-3" />, color: "var(--warn-ink)" },
];

function getActivityConfig(type: string) {
  return ACTIVITY_TYPES.find((t) => t.id === type) || ACTIVITY_TYPES[0];
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 drawer-form-field">
      <label className="text-[12px] font-medium text-[var(--ink-2)]">{label}</label>
      {children}
    </div>
  );
}

export function ContactActivityTab({
  activities,
  loading,
  onAddActivity,
}: ContactActivityTabProps) {
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    type: "note",
    title: "",
    description: "",
  });

  const handleSubmit = async () => {
    if (!formData.title) return;
    setSaving(true);
    try {
      await onAddActivity({
        type: formData.type,
        title: formData.title,
        description: formData.description || undefined,
      });
      setFormData({ type: "note", title: "", description: "" });
      setShowForm(false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" />
        ))}
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <IcoClock className="h-4 w-4 text-[var(--ink-3)]" />
          <h3 className="text-[13px] font-semibold text-[var(--ink-1)]">
            Historial de actividades
          </h3>
          <span className="text-[11.5px] text-[var(--ink-3)]">({activities.length})</span>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[12.5px] font-medium text-[var(--ink-1)] cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
          style={{ background: "#FFFFFF", border: "1px solid var(--line-strong)" }}
        >
          <IcoPlus className="h-3 w-3" />
          Agregar actividad
        </button>
      </div>

      {showForm && (
        <div
          className="rounded-[8px] p-4 flex flex-col gap-3"
          style={{ background: "var(--bg-subtle)", border: "1px solid var(--line-1)" }}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            <Field label="Tipo">
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                {ACTIVITY_TYPES.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Título *">
              <input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Título de la actividad"
              />
            </Field>
          </div>
          <Field label="Descripción">
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Detalles de la actividad..."
              rows={3}
              style={{ resize: "vertical" }}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowForm(false)}
              className="inline-flex items-center rounded-[8px] px-3 py-1.5 text-[12.5px] font-medium text-[var(--ink-1)] cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
              style={{ background: "#FFFFFF", border: "1px solid var(--line-strong)" }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSubmit}
              disabled={saving || !formData.title}
              aria-disabled={saving || !formData.title}
              className="inline-flex items-center rounded-[8px] px-3 py-1.5 text-[12.5px] font-semibold cursor-pointer transition-colors border-none"
              style={{
                background: "var(--ink-1)",
                color: "#FFFFFF",
                opacity: saving || !formData.title ? 0.5 : 1,
              }}
            >
              {saving ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </div>
      )}

      {activities.length === 0 ? (
        <div
          className="text-center py-12 rounded-[8px]"
          style={{ border: "2px dashed var(--line-1)" }}
        >
          <IcoClock className="h-10 w-10 mx-auto text-[var(--ink-4)] mb-3" />
          <h3 className="text-[14px] font-semibold text-[var(--ink-1)] mb-1">Sin actividades</h3>
          <p className="text-[12.5px] text-[var(--ink-3)] mb-4">
            Registra la primera actividad con este contacto
          </p>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 rounded-[8px] px-3.5 py-2 text-[13px] font-medium text-[var(--ink-1)] cursor-pointer transition-colors mx-auto hover:bg-[var(--bg-hover)]"
            style={{ background: "#FFFFFF", border: "1px solid var(--line-strong)" }}
          >
            <IcoPlus className="h-3.5 w-3.5" />
            Agregar actividad
          </button>
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div
            className="absolute top-0 bottom-0"
            style={{ left: 14, width: 1, background: "var(--line-1)" }}
          />

          <div className="flex flex-col gap-3">
            {activities.map((activity) => {
              const config = getActivityConfig(activity.type);
              return (
                <div key={activity.id} className="relative pl-9">
                  {/* Timeline dot */}
                  <div
                    className="absolute h-7 w-7 rounded-full flex items-center justify-center text-white"
                    style={{ left: 0, top: 4, background: config.color }}
                  >
                    {config.icon}
                  </div>

                  <div
                    className="rounded-[8px] p-3"
                    style={{ background: "#FFFFFF", border: "1px solid var(--line-1)" }}
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-[13px] font-semibold text-[var(--ink-1)]">
                            {activity.title}
                          </p>
                          <span
                            className="inline-flex items-center rounded-[999px] text-[10.5px] px-2 py-0.5"
                            style={{
                              background: "transparent",
                              color: "var(--ink-3)",
                              border: "1px solid var(--line-1)",
                            }}
                          >
                            {config.label}
                          </span>
                        </div>
                        {activity.description && (
                          <p className="text-[12.5px] text-[var(--ink-3)] mt-1">
                            {activity.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 mt-2 text-[11px] text-[var(--ink-3)]">
                      {activity.createdAt && (
                        <span>
                          {new Date(activity.createdAt).toLocaleDateString("es-ES", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      )}
                      {activity.createdByName && (
                        <>
                          <span>·</span>
                          <span>{activity.createdByName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
