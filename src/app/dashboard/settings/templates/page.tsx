"use client";

import { useState, useEffect } from "react";
import { Btn, Inp, Ta, Pill, PCard } from "@/components/ui/ds";
import { PageHeader } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserSession } from "@/hooks/use-user-session";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import {
  Plus,
  MoreVertical,
  Pencil,
  Trash2,
  FileText,
  Sparkles,
  CheckSquare,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";

interface TaskTemplate {
  id: number;
  title: string;
  description: string | null;
  htmlContent: string | null;
  daysBeforeEvent: number | null;
  daysAfterEvent: number | null;
  priority: string | null;
  checklists: Array<{ id: number; title: string }>;
}

interface EventTemplate {
  id: number;
  name: string;
  eventType: string | null;
  description: string | null;
  defaultBudget: string | null;
  isGlobal: boolean | null;
  isActive: boolean | null;
  tasks?: TaskTemplate[];
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

export default function TemplatesPage() {
  const { can } = useUserSession();
  const canManageTemplates = can("events:create");
  const [templates, setTemplates] = useState<EventTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTemplate, setSelectedTemplate] = useState<EventTemplate | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    eventType: "",
    description: "",
    defaultBudget: "",
  });

  const fetchTemplates = async () => {
    try {
      const res = await fetch("/api/events/templates");
      const data = await res.json();
      if (data.success) {
        setTemplates(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching templates:", error);
      toast.error("Error al cargar templates");
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplateDetails = async (templateId: number) => {
    try {
      const res = await fetch(`/api/events/templates/${templateId}`);
      const data = await res.json();
      if (data.success) {
        setSelectedTemplate(data.data);
      }
    } catch (error) {
      console.error("Error fetching template details:", error);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const resetForm = () => {
    setFormData({
      name: "",
      eventType: "",
      description: "",
      defaultBudget: "",
    });
  };

  const handleCreate = async () => {
    if (!formData.name.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/events/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          eventType: formData.eventType || undefined,
          description: formData.description.trim() || undefined,
          defaultBudget: formData.defaultBudget ? parseFloat(formData.defaultBudget) : undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Template creado correctamente");
        setIsCreateOpen(false);
        resetForm();
        fetchTemplates();
      } else {
        toast.error(data.error?.message || "Error al crear template");
      }
    } catch (error) {
      console.error("Error creating template:", error);
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async () => {
    if (!selectedTemplate || !formData.name.trim()) {
      toast.error("El nombre es requerido");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/events/templates/${selectedTemplate.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          eventType: formData.eventType || undefined,
          description: formData.description.trim() || undefined,
          defaultBudget: formData.defaultBudget ? parseFloat(formData.defaultBudget) : undefined,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Template actualizado correctamente");
        setIsEditOpen(false);
        resetForm();
        setSelectedTemplate(null);
        fetchTemplates();
      } else {
        toast.error(data.error?.message || "Error al actualizar template");
      }
    } catch (error) {
      console.error("Error updating template:", error);
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selectedTemplate) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/events/templates/${selectedTemplate.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (data.success) {
        toast.success("Template eliminado correctamente");
        setIsDeleteOpen(false);
        setSelectedTemplate(null);
        fetchTemplates();
      } else {
        toast.error(data.error?.message || "Error al eliminar template");
      }
    } catch (error) {
      console.error("Error deleting template:", error);
      toast.error("Error de conexión");
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (template: EventTemplate) => {
    setSelectedTemplate(template);
    setFormData({
      name: template.name,
      eventType: template.eventType || "",
      description: template.description || "",
      defaultBudget: template.defaultBudget || "",
    });
    setIsEditOpen(true);
  };

  const openDeleteDialog = (template: EventTemplate) => {
    setSelectedTemplate(template);
    setIsDeleteOpen(true);
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        action={canManageTemplates && (
          <Btn variant="primary" onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4" />
            Nuevo Template
          </Btn>
        )}
      />

      {templates.length === 0 ? (
        <PCard>
          <div className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">No hay templates</h3>
            <p className="text-muted-foreground text-center mb-4">
              Crea tu primer template para agilizar la creación de eventos
            </p>
            {canManageTemplates && (
              <Btn variant="primary" onClick={() => setIsCreateOpen(true)} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <Plus className="h-4 w-4" />
                Crear Template
              </Btn>
            )}
          </div>
        </PCard>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {templates.map((template) => {
            const icon = template.eventType ? eventTypeIcons[template.eventType] : "📋";
            const typeLabel = template.eventType ? eventTypeLabels[template.eventType] : null;

            return (
              <PCard
                key={template.id}
                style={{ cursor: "pointer" }}
                onClick={() => fetchTemplateDetails(template.id)}
              >
                <div style={{ marginBottom: 14 }}>
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 24 }}>{icon}</span>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-1)" }}>{template.name}</div>
                        {typeLabel && (
                          <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 3 }}>{typeLabel}</div>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      {template.isGlobal && (
                        <Pill bg="var(--bg-subtle)" color="var(--ink-2)" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11 }}>
                          <Sparkles className="h-3 w-3" />
                          Global
                        </Pill>
                      )}
                      {canManageTemplates && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <button style={{ display: "flex", alignItems: "center", justifyContent: "center", width: 32, height: 32, borderRadius: 6, border: "none", background: "transparent", cursor: "pointer", color: "var(--ink-2)" }}>
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditDialog(template);
                            }}
                          >
                            <Pencil className="h-4 w-4 mr-2" />
                            Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              openDeleteDialog(template);
                            }}
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Eliminar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      )}
                    </div>
                  </div>
                </div>
                <div>
                  {template.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {template.description}
                    </p>
                  )}
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    {template.tasks && template.tasks.length > 0 && (
                      <span className="flex items-center gap-1">
                        <CheckSquare className="h-3 w-3" />
                        {template.tasks.length} tareas
                      </span>
                    )}
                    {template.defaultBudget && (
                      <span>${parseFloat(template.defaultBudget).toLocaleString()}</span>
                    )}
                  </div>
                </div>
              </PCard>
            );
          })}
        </div>
      )}

      {/* Template Detail Panel */}
      {selectedTemplate && !isEditOpen && !isDeleteOpen && (
        <PCard style={{ marginTop: 24 }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 30 }}>
                  {selectedTemplate.eventType ? eventTypeIcons[selectedTemplate.eventType] : "📋"}
                </span>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink-1)" }}>{selectedTemplate.name}</div>
                  {selectedTemplate.eventType && (
                    <div style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 3 }}>
                      {eventTypeLabels[selectedTemplate.eventType]}
                    </div>
                  )}
                </div>
              </div>
              <Btn variant="outline" onClick={() => setSelectedTemplate(null)}>
                Cerrar
              </Btn>
            </div>
          </div>
          <div>
            {selectedTemplate.description && (
              <p className="text-muted-foreground mb-4">{selectedTemplate.description}</p>
            )}

            <h4 className="font-medium mb-3">Tareas del Template ({selectedTemplate.tasks?.length || 0})</h4>

            {selectedTemplate.tasks && selectedTemplate.tasks.length > 0 ? (
              <div className="space-y-3">
                {selectedTemplate.tasks.map((task, index) => (
                  <div key={task.id} className="border rounded-lg p-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium">
                          {index + 1}. {task.title}
                        </p>
                        {task.description && (
                          <p className="text-sm text-muted-foreground mt-1">{task.description}</p>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {task.daysBeforeEvent && <span>-{task.daysBeforeEvent} días</span>}
                        {task.daysAfterEvent && <span>+{task.daysAfterEvent} días</span>}
                      </div>
                    </div>
                    {task.checklists && task.checklists.length > 0 && (
                      <div className="mt-2 pl-4 border-l-2 border-muted">
                        <p className="text-xs font-medium text-muted-foreground mb-1">Checklist:</p>
                        <ul className="text-sm space-y-1">
                          {task.checklists.map((item) => (
                            <li key={item.id} className="flex items-center gap-2">
                              <CheckSquare className="h-3 w-3 text-muted-foreground" />
                              {item.title}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4">
                Este template no tiene tareas definidas
              </p>
            )}
          </div>
        </PCard>
      )}

      {/* Create Template Drawer */}
      <Sheet open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Nuevo Template</SheetTitle>
            <SheetDescription>
              Crea un template base para tus eventos
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 px-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre *</Label>
              <Inp
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Boda Completa"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="eventType">Tipo de Evento</Label>
              <Select
                value={formData.eventType}
                onValueChange={(value) => setFormData({ ...formData, eventType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(eventTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {eventTypeIcons[value]} {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descripción</Label>
              <Ta
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe qué incluye este template..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="budget">Presupuesto por defecto</Label>
              <Inp
                id="budget"
                type="number"
                value={formData.defaultBudget}
                onChange={(e) => setFormData({ ...formData, defaultBudget: e.target.value })}
                placeholder="30000"
              />
            </div>
          </div>
          <SheetFooter>
            <Btn variant="outline" onClick={() => { setIsCreateOpen(false); resetForm(); }}>
              Cancelar
            </Btn>
            <Btn variant="primary" onClick={handleCreate} disabled={saving || !formData.name.trim()} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Crear Template
            </Btn>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Edit Template Drawer */}
      <Sheet open={isEditOpen} onOpenChange={setIsEditOpen}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Editar Template</SheetTitle>
            <SheetDescription>
              Modifica los datos del template
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-4 px-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Nombre *</Label>
              <Inp
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ej: Boda Completa"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-eventType">Tipo de Evento</Label>
              <Select
                value={formData.eventType}
                onValueChange={(value) => setFormData({ ...formData, eventType: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(eventTypeLabels).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {eventTypeIcons[value]} {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Descripción</Label>
              <Ta
                id="edit-description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe qué incluye este template..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-budget">Presupuesto por defecto</Label>
              <Inp
                id="edit-budget"
                type="number"
                value={formData.defaultBudget}
                onChange={(e) => setFormData({ ...formData, defaultBudget: e.target.value })}
                placeholder="30000"
              />
            </div>
          </div>
          <SheetFooter>
            <Btn variant="outline" onClick={() => { setIsEditOpen(false); resetForm(); setSelectedTemplate(null); }}>
              Cancelar
            </Btn>
            <Btn variant="primary" onClick={handleEdit} disabled={saving || !formData.name.trim()} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Guardar Cambios
            </Btn>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Drawer */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Eliminar template?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. Se eliminará el template &quot;{selectedTemplate?.name}&quot; 
              y todas sus tareas asociadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setSelectedTemplate(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
