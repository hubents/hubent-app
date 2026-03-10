"use client";

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RiDraggable,
  RiDeleteBinLine,
  RiAsterisk,
  RiSurveyLine,
} from "@remixicon/react";
import type { BuilderField } from "./form-builder";

interface FormCanvasProps {
  fields: BuilderField[];
  selectedFieldId: string | null;
  onSelectField: (id: string) => void;
  onRemoveField: (id: string) => void;
}

export function FormCanvas({ fields, selectedFieldId, onSelectField, onRemoveField }: FormCanvasProps) {
  if (fields.length === 0) {
    return (
      <div className="max-w-xl mx-auto">
        <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-xl text-center text-muted-foreground">
          <RiSurveyLine className="h-10 w-10 mb-3 opacity-50" />
          <p className="text-sm font-medium">Sin campos aún</p>
          <p className="text-xs mt-1">Haz clic en un campo de la paleta izquierda para agregarlo</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto space-y-2">
      {fields.map((field) => (
        <SortableFieldItem
          key={field.id}
          field={field}
          isSelected={selectedFieldId === field.id}
          onSelect={() => onSelectField(field.id)}
          onRemove={() => onRemoveField(field.id)}
        />
      ))}
    </div>
  );
}

interface SortableFieldItemProps {
  field: BuilderField;
  isSelected: boolean;
  onSelect: () => void;
  onRemove: () => void;
}

function SortableFieldItem({ field, isSelected, onSelect, onRemove }: SortableFieldItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: field.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isLayout = ["section_title", "descriptive_text", "separator"].includes(field.type);

  if (field.type === "separator") {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "group flex items-center gap-2 rounded-lg border p-3 cursor-pointer transition-colors",
          isSelected ? "border-primary ring-1 ring-primary/20" : "border-transparent hover:border-border",
          isDragging && "opacity-50"
        )}
        onClick={onSelect}
      >
        <button {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-muted-foreground">
          <RiDraggable className="h-4 w-4" />
        </button>
        <hr className="flex-1 border-border" />
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
        >
          <RiDeleteBinLine className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group flex items-start gap-2 rounded-lg border p-3 cursor-pointer transition-colors",
        isSelected ? "border-primary ring-1 ring-primary/20 bg-primary/5" : "border-border hover:border-primary/30",
        isDragging && "opacity-50"
      )}
      onClick={onSelect}
    >
      <button
        {...attributes}
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-muted-foreground mt-0.5"
      >
        <RiDraggable className="h-4 w-4" />
      </button>

      <div className="flex-1 min-w-0">
        {isLayout ? (
          <div>
            {field.type === "section_title" && (
              <p className="font-semibold text-base">{field.label}</p>
            )}
            {field.type === "descriptive_text" && (
              <p className="text-sm text-muted-foreground">{field.label}</p>
            )}
          </div>
        ) : (
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-medium">{field.label}</span>
              {field.required && <RiAsterisk className="h-3 w-3 text-destructive" />}
            </div>
            <FieldPreview field={field} />
          </div>
        )}
      </div>

      <div className="flex items-center gap-1 shrink-0">
        {field.crmMapping && (
          <Badge variant="secondary" className="text-[10px] px-1.5">
            CRM
          </Badge>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 opacity-0 group-hover:opacity-100"
          onClick={(e) => { e.stopPropagation(); onRemove(); }}
        >
          <RiDeleteBinLine className="h-3.5 w-3.5 text-destructive" />
        </Button>
      </div>
    </div>
  );
}

function FieldPreview({ field }: { field: BuilderField }) {
  const placeholder = field.placeholder || field.label;

  switch (field.type) {
    case "name":
    case "email":
    case "phone":
    case "partner_name":
    case "partner_email":
    case "event_venue":
    case "short_text":
      return (
        <div className="h-9 rounded-md border bg-muted/30 px-3 flex items-center">
          <span className="text-xs text-muted-foreground">{placeholder}</span>
        </div>
      );
    case "event_date":
      return (
        <div className="h-9 rounded-md border bg-muted/30 px-3 flex items-center">
          <span className="text-xs text-muted-foreground">dd/mm/aaaa</span>
        </div>
      );
    case "guest_count":
    case "budget":
      return (
        <div className="h-9 rounded-md border bg-muted/30 px-3 flex items-center">
          <span className="text-xs text-muted-foreground">{placeholder}</span>
        </div>
      );
    case "message":
    case "long_text":
      return (
        <div className="h-16 rounded-md border bg-muted/30 px-3 pt-2">
          <span className="text-xs text-muted-foreground">{placeholder}</span>
        </div>
      );
    case "single_select":
    case "multi_select": {
      const opts = (field.options as { choices?: { label: string }[] })?.choices || [];
      return (
        <div className="space-y-1">
          {opts.slice(0, 3).map((opt, i) => (
            <div key={i} className="flex items-center gap-2">
              <div className={cn(
                "h-4 w-4 rounded border",
                field.type === "single_select" ? "rounded-full" : "rounded-sm"
              )} />
              <span className="text-xs text-muted-foreground">{opt.label}</span>
            </div>
          ))}
          {opts.length > 3 && <span className="text-xs text-muted-foreground">+{opts.length - 3} más</span>}
        </div>
      );
    }
    case "checkbox":
      return (
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 rounded-sm border" />
          <span className="text-xs text-muted-foreground">{field.label}</span>
        </div>
      );
    case "image_select":
      return (
        <div className="flex gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 w-16 rounded border bg-muted/40 flex items-center justify-center">
              <span className="text-[10px] text-muted-foreground">Img {i}</span>
            </div>
          ))}
        </div>
      );
    default:
      return null;
  }
}
