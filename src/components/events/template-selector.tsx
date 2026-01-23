"use client";

import { useState, useEffect } from "react";
import { Check, FileText, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface EventTemplate {
  id: number;
  name: string;
  eventType: string | null;
  description: string | null;
  defaultBudget: string | null;
  isGlobal: boolean | null;
  tasks?: Array<{
    id: number;
    title: string;
    checklists?: Array<{ id: number; title: string }>;
  }>;
}

interface TemplateSelectorProps {
  selectedTemplateId: number | null;
  onSelect: (templateId: number | null) => void;
  eventType?: string;
}

const eventTypeLabels: Record<string, string> = {
  wedding: "Boda",
  pre_wedding: "Pre-Boda",
  post_wedding: "Post-Boda",
  birthday: "Cumpleaños",
  corporate: "Corporativo",
  social: "Social",
  other: "Otro",
};

const eventTypeIcons: Record<string, string> = {
  wedding: "💒",
  pre_wedding: "💍",
  post_wedding: "🥂",
  birthday: "🎂",
  corporate: "🏢",
  social: "🎉",
  other: "📅",
};

export function TemplateSelector({ selectedTemplateId, onSelect, eventType }: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<EventTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchTemplates() {
      try {
        const res = await fetch("/api/events/templates");
        const data = await res.json();
        if (data.success) {
          setTemplates(data.data || []);
        }
      } catch (error) {
        console.error("Error fetching templates:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchTemplates();
  }, []);

  const filteredTemplates = eventType
    ? templates.filter((t) => !t.eventType || t.eventType === eventType)
    : templates;

  if (loading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <RadioGroup
        value={selectedTemplateId?.toString() || "none"}
        onValueChange={(value) => onSelect(value === "none" ? null : parseInt(value, 10))}
      >
        <div
          className={cn(
            "flex items-center space-x-3 rounded-lg border p-4 cursor-pointer transition-colors",
            selectedTemplateId === null
              ? "border-primary bg-primary/5"
              : "border-border hover:border-muted-foreground/50"
          )}
          onClick={() => onSelect(null)}
        >
          <RadioGroupItem value="none" id="template-none" />
          <Label htmlFor="template-none" className="flex-1 cursor-pointer">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">Crear desde cero</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Evento vacío sin tareas pre-cargadas
            </p>
          </Label>
        </div>

        {filteredTemplates.map((template) => {
          const taskCount = template.tasks?.length || 0;
          const checklistCount = template.tasks?.reduce(
            (acc, t) => acc + (t.checklists?.length || 0),
            0
          ) || 0;
          const icon = template.eventType ? eventTypeIcons[template.eventType] : "📋";

          return (
            <div
              key={template.id}
              className={cn(
                "flex items-start space-x-3 rounded-lg border p-4 cursor-pointer transition-colors",
                selectedTemplateId === template.id
                  ? "border-primary bg-primary/5"
                  : "border-border hover:border-muted-foreground/50"
              )}
              onClick={() => onSelect(template.id)}
            >
              <RadioGroupItem value={template.id.toString()} id={`template-${template.id}`} className="mt-1" />
              <Label htmlFor={`template-${template.id}`} className="flex-1 cursor-pointer">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{icon}</span>
                  <span className="font-medium">{template.name}</span>
                  {template.isGlobal && (
                    <Badge variant="secondary" className="text-xs">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Global
                    </Badge>
                  )}
                </div>
                {template.description && (
                  <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {template.description}
                  </p>
                )}
                <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                  {template.eventType && (
                    <span>{eventTypeLabels[template.eventType] || template.eventType}</span>
                  )}
                  {taskCount > 0 && <span>{taskCount} tareas</span>}
                  {checklistCount > 0 && <span>{checklistCount} checklist items</span>}
                  {template.defaultBudget && (
                    <span>${parseFloat(template.defaultBudget).toLocaleString()}</span>
                  )}
                </div>
              </Label>
              {selectedTemplateId === template.id && (
                <Check className="h-5 w-5 text-primary mt-1" />
              )}
            </div>
          );
        })}
      </RadioGroup>

      {filteredTemplates.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No hay templates disponibles{eventType ? ` para ${eventTypeLabels[eventType] || eventType}` : ""}.
        </p>
      )}
    </div>
  );
}
