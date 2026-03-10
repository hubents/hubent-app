"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  RiCloseLine,
  RiAddLine,
  RiDeleteBinLine,
} from "@remixicon/react";
import type { BuilderField } from "./form-builder";

interface FieldPropertiesProps {
  field: BuilderField | null;
  onUpdate: (updates: Partial<BuilderField>) => void;
  onClose: () => void;
}

export function FieldProperties({ field, onUpdate, onClose }: FieldPropertiesProps) {
  if (!field) {
    return (
      <div className="flex items-center justify-center h-full p-6 text-center text-muted-foreground">
        <div>
          <p className="text-sm font-medium">Sin campo seleccionado</p>
          <p className="text-xs mt-1">Selecciona un campo del canvas para editar sus propiedades</p>
        </div>
      </div>
    );
  }

  const isLayout = ["section_title", "descriptive_text", "separator"].includes(field.type);
  const hasOptions = ["single_select", "multi_select", "image_select"].includes(field.type);
  const options = (field.options as { choices?: { label: string; value: string; imageUrl?: string }[] }) || { choices: [] };
  const choices = options.choices || [];

  const updateChoice = (index: number, updates: Partial<{ label: string; value: string; imageUrl: string }>) => {
    const newChoices = choices.map((c, i) => i === index ? { ...c, ...updates } : c);
    onUpdate({ options: { choices: newChoices } });
  };

  const addChoice = () => {
    const newChoices = [...choices, { label: `Opción ${choices.length + 1}`, value: `option_${choices.length + 1}` }];
    onUpdate({ options: { choices: newChoices } });
  };

  const removeChoice = (index: number) => {
    const newChoices = choices.filter((_, i) => i !== index);
    onUpdate({ options: { choices: newChoices } });
  };

  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Propiedades</h3>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <RiCloseLine className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-4">
        {/* Field type badge */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs">{field.type}</Badge>
          {field.crmMapping && (
            <Badge variant="secondary" className="text-xs">CRM: {field.crmMapping}</Badge>
          )}
        </div>

        {/* Label */}
        <div>
          <Label className="text-xs">
            {isLayout ? (field.type === "separator" ? "Tipo" : "Texto") : "Etiqueta"}
          </Label>
          {field.type === "separator" ? (
            <p className="text-sm text-muted-foreground mt-1">Línea separadora</p>
          ) : field.type === "descriptive_text" ? (
            <Textarea
              value={field.label}
              onChange={(e) => onUpdate({ label: e.target.value })}
              rows={3}
              className="mt-1"
            />
          ) : (
            <Input
              value={field.label}
              onChange={(e) => onUpdate({ label: e.target.value })}
              className="mt-1"
            />
          )}
        </div>

        {/* Placeholder (only for input fields) */}
        {!isLayout && field.type !== "checkbox" && (
          <div>
            <Label className="text-xs">Placeholder</Label>
            <Input
              value={field.placeholder}
              onChange={(e) => onUpdate({ placeholder: e.target.value })}
              placeholder="Texto de ejemplo..."
              className="mt-1"
            />
          </div>
        )}

        {/* Required toggle (only for non-layout fields) */}
        {!isLayout && (
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Obligatorio</p>
              <p className="text-xs text-muted-foreground">El usuario debe completar este campo</p>
            </div>
            <Switch
              checked={field.required}
              onCheckedChange={(checked) => onUpdate({ required: checked })}
            />
          </div>
        )}

        {/* Options (for select/image_select) */}
        {hasOptions && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs">Opciones</Label>
              <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={addChoice}>
                <RiAddLine className="h-3 w-3 mr-1" /> Agregar
              </Button>
            </div>
            <div className="space-y-2">
              {choices.map((choice, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    value={choice.label}
                    onChange={(e) => updateChoice(index, { label: e.target.value, value: e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "_") })}
                    className="flex-1 h-8 text-sm"
                    placeholder={`Opción ${index + 1}`}
                  />
                  {field.type === "image_select" && (
                    <Input
                      value={choice.imageUrl || ""}
                      onChange={(e) => updateChoice(index, { imageUrl: e.target.value })}
                      className="flex-1 h-8 text-sm"
                      placeholder="URL imagen"
                    />
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    onClick={() => removeChoice(index)}
                    disabled={choices.length <= 1}
                  >
                    <RiDeleteBinLine className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
