"use client";

import { useState, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { FieldPalette, PALETTE_SECTIONS } from "./field-palette";
import { FormCanvas } from "./form-canvas";
import { FieldProperties } from "./field-properties";
import { Button } from "@/components/ui/button";
import { RiSaveLine, RiCheckLine, RiLoader4Line } from "@remixicon/react";

export interface BuilderField {
  id: string;
  type: string;
  label: string;
  placeholder: string;
  required: boolean;
  crmMapping: string | null;
  options: unknown;
  sortOrder: number;
  config: Record<string, unknown>;
  dbId?: number;
}

interface FormBuilderProps {
  formId: number;
  initialFields: BuilderField[];
  onSave: (fields: BuilderField[]) => Promise<void>;
}

let fieldCounter = 0;

export function FormBuilder({ formId, initialFields, onSave }: FormBuilderProps) {
  const [fields, setFields] = useState<BuilderField[]>(initialFields);
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const selectedField = fields.find((f) => f.id === selectedFieldId) ?? null;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    // Reorder within canvas
    if (active.id !== over.id) {
      setFields((prev) => {
        const oldIndex = prev.findIndex((f) => f.id === active.id);
        const newIndex = prev.findIndex((f) => f.id === over.id);
        if (oldIndex === -1 || newIndex === -1) return prev;
        const reordered = arrayMove(prev, oldIndex, newIndex);
        return reordered.map((f, idx) => ({ ...f, sortOrder: idx }));
      });
    }
  };

  const addField = useCallback((type: string, label: string, crmMapping: string | null) => {
    fieldCounter++;
    const newField: BuilderField = {
      id: `new-${fieldCounter}-${Date.now()}`,
      type,
      label,
      placeholder: "",
      required: false,
      crmMapping,
      options: type === "single_select" || type === "multi_select" || type === "image_select"
        ? { choices: [{ label: "Opción 1", value: "option_1" }] }
        : null,
      sortOrder: fields.length,
      config: {},
    };
    setFields((prev) => [...prev, newField]);
    setSelectedFieldId(newField.id);
  }, [fields.length]);

  const addAllCrmFields = useCallback(() => {
    const crmSection = PALETTE_SECTIONS.find((s) => s.title === "Datos CRM");
    if (!crmSection) return;
    setFields((prev) => {
      const existingTypes = new Set(prev.map((f) => f.type));
      const newFields = crmSection.fields
        .filter((f) => !existingTypes.has(f.type))
        .map((f, idx) => {
          fieldCounter++;
          return {
            id: `new-${fieldCounter}-${Date.now()}-${idx}`,
            type: f.type,
            label: f.label,
            placeholder: "",
            required: false,
            crmMapping: f.crmMapping,
            options: null,
            sortOrder: prev.length + idx,
            config: {},
          } as BuilderField;
        });
      if (newFields.length === 0) return prev;
      return [...prev, ...newFields];
    });
  }, []);

  const removeField = useCallback((fieldId: string) => {
    setFields((prev) => prev.filter((f) => f.id !== fieldId).map((f, idx) => ({ ...f, sortOrder: idx })));
    if (selectedFieldId === fieldId) setSelectedFieldId(null);
  }, [selectedFieldId]);

  const updateField = useCallback((fieldId: string, updates: Partial<BuilderField>) => {
    setFields((prev) => prev.map((f) => f.id === fieldId ? { ...f, ...updates } : f));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    try {
      await onSave(fields);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      // silent
    } finally {
      setSaving(false);
    }
  };

  const activeField = fields.find((f) => f.id === activeId);

  return (
    <div className="flex flex-col h-full">
      {/* Save bar */}
      <div className="flex items-center justify-between border-b px-4 py-2 bg-muted/30">
        <p className="text-sm text-muted-foreground">
          {fields.length} {fields.length === 1 ? "campo" : "campos"}
        </p>
        <Button size="sm" onClick={handleSave} disabled={saving}>
          {saving ? (
            <RiLoader4Line className="h-4 w-4 mr-1 animate-spin" />
          ) : saved ? (
            <RiCheckLine className="h-4 w-4 mr-1" />
          ) : (
            <RiSaveLine className="h-4 w-4 mr-1" />
          )}
          {saving ? "Guardando..." : saved ? "Guardado" : "Guardar todo"}
        </Button>
      </div>

      {/* 3-column layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left: Field Palette */}
        <div className="w-64 border-r overflow-y-auto bg-muted/20">
          <FieldPalette onAddField={addField} onAddAllCrm={addAllCrmFields} />
        </div>

        {/* Center: Canvas */}
        <div className="flex-1 overflow-y-auto p-6 bg-background">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
              <FormCanvas
                fields={fields}
                selectedFieldId={selectedFieldId}
                onSelectField={setSelectedFieldId}
                onRemoveField={removeField}
              />
            </SortableContext>
            <DragOverlay>
              {activeField ? (
                <div className="rounded-lg border bg-card p-3 shadow-lg opacity-80">
                  <span className="text-sm font-medium">{activeField.label}</span>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        </div>

        {/* Right: Field Properties */}
        <div className="w-80 border-l overflow-y-auto bg-muted/20">
          <FieldProperties
            field={selectedField}
            onUpdate={(updates: Partial<BuilderField>) => selectedFieldId && updateField(selectedFieldId, updates)}
            onClose={() => setSelectedFieldId(null)}
          />
        </div>
      </div>
    </div>
  );
}
