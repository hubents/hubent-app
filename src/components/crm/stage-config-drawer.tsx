"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

// Guideline alert colors
const ALERT_GREEN  = "#17A95C";
const ALERT_YELLOW = "#D97706";
const ALERT_RED    = "#E85D4E";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Btn } from "@/components/ui/ds";
import { hgIcon } from "@/components/ui/hg-icon";
import {
  Cancel01Icon,
  PlusSignIcon,
  Delete02Icon,
} from "@hugeicons/core-free-icons";

const IcoX = hgIcon(Cancel01Icon);
const IcoPlus = hgIcon(PlusSignIcon);
const IcoTrash = hgIcon(Delete02Icon);

interface Stage {
  id: number;
  name: string;
  color: string | null;
  sortOrder: number | null;
  isDefault?: boolean | null;
  isWon: boolean | null;
  isLost: boolean | null;
}

interface StageConfigDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stages?: Stage[];
  onStagesChanged?: () => void;
  // Legacy single-stage props (backward compat — ignored)
  stage?: Stage | null;
  onStageCreated?: () => void;
  onStageUpdated?: () => void;
  onStageDeleted?: () => void;
  nextSortOrder?: number;
}

const PALETTE = [
  "#B8B5AE", "#F4B942", "#5B8FE8", "#9B7EDB",
  "#00B66D", "#E85D4E", "#E89C6B", "#7FA890",
  "#C97A7A", "#6B8CE8",
];

export function StageConfigDrawer({
  open,
  onOpenChange,
  stages: stagesProp,
  onStagesChanged,
  onStageCreated,
  onStageUpdated,
  onStageDeleted,
}: StageConfigDrawerProps) {
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState("#6B8CE8");
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // CRM alert thresholds (days in stage)
  const [alertYellow, setAlertYellow] = useState(4);
  const [alertRed, setAlertRed] = useState(8);

  const refetchAll = () => {
    onStagesChanged?.();
    onStageCreated?.();
    onStageUpdated?.();
    onStageDeleted?.();
  };

  // Load stages + org CRM alert thresholds on open
  useEffect(() => {
    if (!open) return;
    if (stagesProp && stagesProp.length > 0) {
      setStages(stagesProp.map((s) => ({ ...s })));
    } else {
      fetch("/api/crm/stages")
        .then((r) => r.json())
        .then((d) => { if (d.success) setStages(d.data.map((s: Stage) => ({ ...s }))); })
        .catch(() => {});
    }
    // Load saved alert thresholds
    fetch("/api/organizations/profile")
      .then((r) => r.json())
      .then((d) => {
        if (d.success && d.data?.settings?.crmAlerts) {
          const { yellow, red } = d.data.settings.crmAlerts;
          if (typeof yellow === "number") setAlertYellow(yellow);
          if (typeof red === "number") setAlertRed(red);
        }
      })
      .catch(() => {});
  }, [open, stagesProp]);

  const close = () => {
    onOpenChange(false);
    setNewLabel("");
    setDragIdx(null);
    setDragOverIdx(null);
  };

  const updateLocal = (id: number, patch: Partial<Stage>) =>
    setStages((prev) => prev.map((s) => (s.id === id ? { ...s, ...patch } : s)));

  const handleDragStart = (i: number) => setDragIdx(i);
  const handleDragEnter = (i: number) => setDragOverIdx(i);
  const handleDragEnd = () => { setDragIdx(null); setDragOverIdx(null); };
  const handleDrop = () => {
    if (dragIdx === null || dragOverIdx === null || dragIdx === dragOverIdx) {
      handleDragEnd();
      return;
    }
    const next = [...stages];
    const [moved] = next.splice(dragIdx, 1);
    next.splice(dragOverIdx, 0, moved);
    setStages(next);
    handleDragEnd();
  };

  const addStageLocal = () => {
    const label = newLabel.trim();
    if (!label) return;
    const tempId = -Date.now();
    setStages((prev) => [
      ...prev,
      {
        id: tempId,
        name: label,
        color: newColor,
        sortOrder: prev.length,
        isDefault: false,
        isWon: false,
        isLost: false,
      },
    ]);
    setNewLabel("");
  };

  const removeStageLocal = (id: number) =>
    setStages((prev) => prev.filter((s) => s.id !== id));

  const save = async () => {
    setLoading(true);
    try {
      // For each stage, decide create / update / delete based on id
      // Negative id = new (local only); positive id = existing
      const original = stagesProp || [];
      const originalIds = new Set(original.map((s) => s.id));
      const currentIds = new Set(stages.map((s) => s.id).filter((id) => id > 0));

      // Deleted = in original but not in current
      const toDelete = original.filter((s) => !currentIds.has(s.id));
      for (const s of toDelete) {
        await fetch(`/api/crm/stages/${s.id}`, { method: "DELETE" });
      }

      // Iterate current order, assigning new sortOrder
      for (let i = 0; i < stages.length; i++) {
        const s = stages[i];
        if (s.id < 0) {
          // Create new
          await fetch("/api/crm/stages", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: s.name,
              color: s.color,
              sortOrder: i,
              isWon: s.isWon || false,
              isLost: s.isLost || false,
            }),
          });
        } else if (originalIds.has(s.id)) {
          const orig = original.find((o) => o.id === s.id)!;
          if (
            orig.name !== s.name ||
            orig.color !== s.color ||
            orig.sortOrder !== i
          ) {
            await fetch(`/api/crm/stages/${s.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                name: s.name,
                color: s.color,
                sortOrder: i,
                isDefault: s.isDefault || false,
                isWon: s.isWon || false,
                isLost: s.isLost || false,
              }),
            });
          }
        }
      }

      // Save alert thresholds to org settings
      const y = Math.max(1, alertYellow);
      const r = Math.max(y + 1, alertRed);
      await fetch("/api/organizations/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: { crmAlerts: { yellow: y, red: r } } }),
      });

      toast("Embudo actualizado");
      close();
      refetchAll();
    } catch (e) {
      toast(`Error: ${(e as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) close();
      }}
    >
      <SheetContent
        side="right"
        className="bg-white border-0 p-0 gap-0 [&>button]:hidden"
        style={{
          width: 440,
          maxWidth: "100vw",
          boxShadow: "-8px 0 28px rgba(0,0,0,0.1)",
        }}
      >
        {/* Header */}
        <div
          className="flex items-start"
          style={{ padding: "20px 24px", borderBottom: "1px solid var(--line-1)" }}
        >
          <div className="flex-1">
            <div
              className="text-[17px] font-semibold text-[var(--ink-1)]"
              style={{ letterSpacing: "-0.01em" }}
            >
              Configurar embudo
            </div>
            <div className="text-[12.5px] text-[var(--ink-3)] mt-0.5">
              Ordena, renombra o añade etapas del pipeline
            </div>
          </div>
          <button
            onClick={close}
            className="bg-transparent border-none cursor-pointer text-[var(--ink-3)] hover:text-[var(--ink-1)]"
          >
            <IcoX className="h-[18px] w-[18px]" />
          </button>
        </div>

        {/* Body */}
        <div
          className="flex-1 overflow-y-auto flex flex-col gap-2"
          style={{ padding: "20px 24px" }}
        >
          <div
            className="text-[11px] font-semibold uppercase text-[var(--ink-3)] mb-1"
            style={{ letterSpacing: "0.06em" }}
          >
            Etapas del embudo
          </div>

          {stages.map((s, i) => (
            <div
              key={s.id}
              draggable
              onDragStart={() => handleDragStart(i)}
              onDragEnter={() => handleDragEnter(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onDragEnd={handleDragEnd}
              className="flex items-center gap-2.5 transition-colors"
              style={{
                padding: "10px 12px",
                borderRadius: 8,
                border: "1px solid " + (dragOverIdx === i ? "var(--ink-1)" : "var(--line-1)"),
                background: dragOverIdx === i ? "var(--bg-subtle)" : "#FFFFFF",
                cursor: "grab",
              }}
            >
              {/* Grip handle */}
              <div
                className="flex flex-col gap-0.5 text-[var(--ink-4)]"
                style={{ cursor: "grab" }}
              >
                {[0, 1, 2].map((row) => (
                  <div key={row} className="flex gap-0.5">
                    <div
                      style={{
                        width: 3,
                        height: 3,
                        borderRadius: "50%",
                        background: "currentColor",
                      }}
                    />
                    <div
                      style={{
                        width: 3,
                        height: 3,
                        borderRadius: "50%",
                        background: "currentColor",
                      }}
                    />
                  </div>
                ))}
              </div>

              {/* Color picker dot */}
              <div className="relative">
                <input
                  type="color"
                  value={s.color || "#B8B5AE"}
                  onChange={(e) => updateLocal(s.id, { color: e.target.value })}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  style={{ width: "100%", height: "100%" }}
                />
                <div
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: s.color || "#B8B5AE",
                    border: "2px solid white",
                    boxShadow: "0 0 0 1.5px var(--line-strong)",
                    flexShrink: 0,
                  }}
                />
              </div>

              {/* Editable label */}
              <input
                value={s.name}
                onChange={(e) => updateLocal(s.id, { name: e.target.value })}
                className="flex-1 outline-none border-none bg-transparent text-[13px] font-medium text-[var(--ink-1)]"
              />

              {/* Won/Lost badges */}
              {s.isWon && (
                <span
                  className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: "#E4F2EA", color: "#17A95C" }}
                >
                  Ganado
                </span>
              )}
              {s.isLost && (
                <span
                  className="text-[10.5px] font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: "#FDE8E7", color: "#E85D4E" }}
                >
                  Perdido
                </span>
              )}

              {/* Delete (no on won/lost) */}
              {!s.isWon && !s.isLost && (
                <button
                  onClick={() => removeStageLocal(s.id)}
                  className="bg-transparent border-none cursor-pointer text-[var(--ink-4)] p-0.5 flex hover:text-[#C33] transition-colors"
                >
                  <IcoTrash className="h-[14px] w-[14px]" />
                </button>
              )}
            </div>
          ))}

          {/* New stage section */}
          <div className="mt-2">
            <div
              className="text-[11px] font-semibold uppercase text-[var(--ink-3)] mb-2"
              style={{ letterSpacing: "0.06em" }}
            >
              Nueva etapa
            </div>
            <div className="flex gap-2 items-center">
              <div className="flex gap-1 flex-wrap" style={{ width: 80 }}>
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    onClick={() => setNewColor(c)}
                    className="cursor-pointer p-0 border-none"
                    style={{
                      width: 14,
                      height: 14,
                      borderRadius: "50%",
                      background: c,
                      boxShadow:
                        newColor === c ? `0 0 0 2px white, 0 0 0 3.5px ${c}` : "none",
                    }}
                  />
                ))}
              </div>
              <input
                placeholder="Nombre de la etapa..."
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") addStageLocal(); }}
                className="flex-1 outline-none text-[13px]"
                style={{
                  border: "1px solid var(--line-1)",
                  borderRadius: 8,
                  padding: "9px 12px",
                  background: "#FFFFFF",
                  color: "var(--ink-1)",
                }}
              />
              <button
                onClick={addStageLocal}
                className="inline-flex items-center gap-1 text-[13px] font-semibold cursor-pointer"
                style={{
                  background: "var(--color-primary)",
                  color: "#FFFFFF",
                  border: "1px solid var(--color-primary)",
                  padding: "8px 12px",
                  borderRadius: 8,
                }}
              >
                <IcoPlus className="h-3 w-3" />
                Añadir
              </button>
            </div>
          </div>

          {/* CRM Alert thresholds */}
          <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--line-1)" }}>
            <div
              className="text-[11px] font-semibold uppercase text-[var(--ink-3)] mb-3"
              style={{ letterSpacing: "0.06em" }}
            >
              Alertas por tiempo en etapa
            </div>
            <p style={{ fontSize: 12, color: "var(--ink-3)", marginBottom: 12, lineHeight: 1.5 }}>
              El contador "D" en cada lead cambia de color según los días que lleva en su etapa actual.
            </p>

            {/* Visual scale */}
            <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
              {[
                { color: ALERT_GREEN,  bg: "#D1FAE5", label: "Verde",    tip: `0–${alertYellow - 1}D` },
                { color: ALERT_YELLOW, bg: "#FEF3C7", label: "Amarillo", tip: `${alertYellow}–${alertRed - 1}D` },
                { color: ALERT_RED,    bg: "#FEE2E2", label: "Rojo",     tip: `${alertRed}D+` },
              ].map((item) => (
                <div
                  key={item.label}
                  style={{
                    flex: 1, borderRadius: 8, padding: "8px 10px",
                    background: item.bg, border: `1px solid ${item.color}33`,
                    textAlign: "center",
                  }}
                >
                  <div style={{ width: 10, height: 10, borderRadius: "50%", background: item.color, margin: "0 auto 4px" }} />
                  <div style={{ fontSize: 11.5, fontWeight: 600, color: item.color }}>{item.label}</div>
                  <div style={{ fontSize: 10.5, color: item.color, opacity: 0.8, marginTop: 1 }}>{item.tip}</div>
                </div>
              ))}
            </div>

            {/* Threshold inputs */}
            <div style={{ display: "flex", gap: 10 }}>
              <ThresholdInput
                label="Amarillo a partir de"
                color={ALERT_YELLOW}
                value={alertYellow}
                min={1}
                max={alertRed - 1}
                onChange={(v) => setAlertYellow(Math.min(v, alertRed - 1))}
              />
              <ThresholdInput
                label="Rojo a partir de"
                color={ALERT_RED}
                value={alertRed}
                min={alertYellow + 1}
                max={365}
                onChange={(v) => setAlertRed(Math.max(v, alertYellow + 1))}
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ display: "flex", gap: 10, padding: "14px 24px 20px", borderTop: "1px solid var(--line-1)" }}>
          <Btn variant="ghost" onClick={close} style={{ flex: 1 }}>Cancelar</Btn>
          <Btn onClick={save} disabled={loading} style={{ flex: 2 }}>
            {loading ? "Guardando..." : "Guardar cambios"}
          </Btn>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function ThresholdInput({
  label, color, value, min, max, onChange,
}: {
  label: string; color: string; value: number;
  min: number; max: number; onChange: (v: number) => void;
}) {
  return (
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: "var(--ink-3)", marginBottom: 5 }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
        <button
          onClick={() => onChange(Math.max(min, value - 1))}
          style={{
            width: 26, height: 26, borderRadius: 6, border: "1px solid var(--line-strong)",
            background: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700,
            color: "var(--ink-2)", display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >−</button>
        <div style={{
          flex: 1, textAlign: "center", fontSize: 15, fontWeight: 700,
          color, padding: "4px 0",
        }}>
          {value}D
        </div>
        <button
          onClick={() => onChange(Math.min(max, value + 1))}
          style={{
            width: 26, height: 26, borderRadius: 6, border: "1px solid var(--line-strong)",
            background: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700,
            color: "var(--ink-2)", display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >+</button>
      </div>
    </div>
  );
}
