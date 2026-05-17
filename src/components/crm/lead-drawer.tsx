"use client";

import { useState, useEffect, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Av } from "@/components/ui/ds";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RiDeleteBinLine,
  RiUserLine,
  RiBuilding2Line,
  RiMailLine,
  RiPhoneLine,
  RiCalendarLine,
  RiMoneyDollarCircleLine,
  RiPercentLine,
  RiPencilLine,
  RiCheckLine,
  RiCloseLine,
  RiInformationLine,
  RiContactsLine,
  RiHistoryLine,
} from "@remixicon/react";
import { cn } from "@/lib/utils";
import { fmtEur } from "@/lib/format";

interface Lead {
  id: number;
  title: string;
  description?: string | null;
  value: string | null;
  currency: string | null;
  stageId: number | null;
  status: string | null;
  probability: number | null;
  expectedCloseDate: Date | null;
  source?: string | null;
  assignedTo: string | null;
  createdAt: Date | null;
  assignedUserName: string | null;
  assignedUserImage: string | null;
  contactId?: number | null;
  contact?: {
    id: number;
    type: "person" | "company";
    name: string;
    email: string | null;
    phone: string | null;
    avatar: string | null;
  } | null;
}

interface Stage {
  id: number;
  name: string;
  color: string | null;
}

interface LeadDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leadId: number | null;
  stages?: Stage[];
  onLeadUpdated?: () => void;
  onLeadDeleted?: () => void;
}

const SOURCES = [
  { value: "website", label: "Sitio Web" },
  { value: "referral", label: "Referido" },
  { value: "social", label: "Redes Sociales" },
  { value: "event", label: "Evento" },
  { value: "cold", label: "Contacto Frío" },
  { value: "other", label: "Otro" },
];

const PROBABILITIES = ["10", "25", "50", "75", "90"];

export function LeadDrawer({
  open,
  onOpenChange,
  leadId,
  stages = [],
  onLeadUpdated,
  onLeadDeleted,
}: LeadDrawerProps) {
  const [activeTab, setActiveTab] = useState("details");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [lead, setLead] = useState<Lead | null>(null);

  // Inline editing states
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [editedTitle, setEditedTitle] = useState("");
  const titleInputRef = useRef<HTMLInputElement>(null);

  // Fetch lead details
  useEffect(() => {
    if (open && leadId) {
      fetchLead();
    }
    if (!open) {
      setLead(null);
      setActiveTab("details");
    }
  }, [open, leadId]);

  const fetchLead = async () => {
    if (!leadId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/crm/leads/${leadId}`);
      const data = await res.json();
      if (data.success) {
        setLead(data.data);
      }
    } catch (error) {
      console.error("Error fetching lead:", error);
    } finally {
      setLoading(false);
    }
  };

  // Update lead field
  const updateField = async (field: string, value: unknown) => {
    if (!lead) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/crm/leads/${lead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: value }),
      });
      if (res.ok) {
        const data = await res.json();
        setLead(data.data);
        onLeadUpdated?.();
      }
    } catch (error) {
      console.error("Error updating lead:", error);
    } finally {
      setSaving(false);
    }
  };

  // Handle title edit
  const startEditingTitle = () => {
    setEditedTitle(lead?.title || "");
    setIsEditingTitle(true);
    setTimeout(() => titleInputRef.current?.focus(), 50);
  };

  const saveTitle = async () => {
    if (editedTitle.trim() && editedTitle !== lead?.title) {
      await updateField("title", editedTitle.trim());
    }
    setIsEditingTitle(false);
  };

  const cancelEditTitle = () => {
    setIsEditingTitle(false);
    setEditedTitle("");
  };

  // Delete lead
  const handleDelete = async () => {
    if (!lead) return;
    if (!confirm("¿Estás seguro de eliminar este lead?")) return;

    setDeleting(true);
    try {
      const res = await fetch(`/api/crm/leads/${lead.id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        onOpenChange(false);
        onLeadDeleted?.();
      }
    } catch (error) {
      console.error("Error deleting lead:", error);
    } finally {
      setDeleting(false);
    }
  };

  // Helpers
  const formatCurrency = (value: string | null, currency: string | null) => {
    if (!value) return "—";
    return fmtEur(value, currency || "EUR");
  };

  const formatDate = (date: Date | null) => {
    if (!date) return "";
    const d = new Date(date);
    if (isNaN(d.getTime())) return "";
    return d.toISOString().split("T")[0];
  };

  const getSourceLabel = (source: string | null) => {
    const found = SOURCES.find(s => s.value === source);
    return found?.label || source || "—";
  };

  const getStageName = (stageId: number | null) => {
    const stage = stages.find(s => s.id === stageId);
    return stage?.name || "Sin etapa";
  };

  const getStageColor = (stageId: number | null) => {
    const stage = stages.find(s => s.id === stageId);
    return stage?.color || "#6366f1";
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-2xl w-full overflow-y-auto p-6">
        {loading ? (
          <div className="space-y-4 pt-6">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <div className="space-y-3 pt-4">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </div>
        ) : lead ? (
          <>
            <SheetHeader className="pb-4 border-b">
              <div className="flex items-start justify-between gap-2">
                {isEditingTitle ? (
                  <div className="flex items-center gap-2 flex-1">
                    <Input
                      ref={titleInputRef}
                      value={editedTitle}
                      onChange={(e) => setEditedTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveTitle();
                        if (e.key === "Escape") cancelEditTitle();
                      }}
                      className="text-lg font-semibold"
                    />
                    <Button size="icon" variant="ghost" onClick={saveTitle}>
                      <RiCheckLine className="h-4 w-4 text-green-600" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={cancelEditTitle}>
                      <RiCloseLine className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                ) : (
                  <SheetTitle
                    className="text-xl cursor-pointer hover:text-primary flex items-center gap-2 group"
                    onClick={startEditingTitle}
                  >
                    {lead.title}
                    <RiPencilLine className="h-4 w-4 opacity-0 group-hover:opacity-50" />
                  </SheetTitle>
                )}
              </div>
              {/* Stage Badge */}
              <div className="flex items-center gap-2 pt-2">
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: getStageColor(lead.stageId) }}
                />
                <span className="text-sm text-muted-foreground">
                  {getStageName(lead.stageId)}
                </span>
                {saving && (
                  <Badge variant="outline" className="text-xs animate-pulse">
                    Guardando...
                  </Badge>
                )}
              </div>
            </SheetHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="pt-4">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="details" className="gap-2">
                  <RiInformationLine className="h-4 w-4" />
                  Detalles
                </TabsTrigger>
                <TabsTrigger value="contact" className="gap-2">
                  <RiContactsLine className="h-4 w-4" />
                  Contacto
                </TabsTrigger>
              </TabsList>

              {/* Details Tab */}
              <TabsContent value="details" className="space-y-5 pt-4">
                {/* Value */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <RiMoneyDollarCircleLine className="h-4 w-4 text-muted-foreground" />
                    Valor (€)
                  </label>
                  <Input
                    type="number"
                    value={lead.value || ""}
                    onChange={(e) => updateField("value", e.target.value ? parseFloat(e.target.value) : null)}
                    placeholder="0"
                  />
                </div>

                {/* Probability */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <RiPercentLine className="h-4 w-4 text-muted-foreground" />
                    Probabilidad
                  </label>
                  <Select
                    value={lead.probability?.toString() || "50"}
                    onValueChange={(v) => updateField("probability", parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PROBABILITIES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}%
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Stage */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Etapa</label>
                  <Select
                    value={lead.stageId?.toString() || ""}
                    onValueChange={(v) => updateField("stageId", parseInt(v))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar etapa" />
                    </SelectTrigger>
                    <SelectContent>
                      {stages.map((stage) => (
                        <SelectItem key={stage.id} value={stage.id.toString()}>
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2 h-2 rounded-full"
                              style={{ backgroundColor: stage.color || "#6366f1" }}
                            />
                            {stage.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Source */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Fuente</label>
                  <Select
                    value={lead.source || ""}
                    onValueChange={(v) => updateField("source", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="¿Cómo llegó?" />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCES.map((s) => (
                        <SelectItem key={s.value} value={s.value}>
                          {s.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Expected Close Date */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <RiCalendarLine className="h-4 w-4 text-muted-foreground" />
                    Fecha Esperada de Cierre
                  </label>
                  <Input
                    type="date"
                    value={formatDate(lead.expectedCloseDate)}
                    onChange={(e) => updateField("expectedCloseDate", e.target.value ? new Date(e.target.value) : null)}
                  />
                </div>

                {/* Description */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">Descripción</label>
                  <Textarea
                    value={lead.description || ""}
                    onChange={(e) => updateField("description", e.target.value || null)}
                    placeholder="Notas sobre este lead..."
                    rows={3}
                  />
                </div>

                {/* Assigned User */}
                {lead.assignedUserName && (
                  <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                    <Av src={lead.assignedUserImage} name={lead.assignedUserName} size={40} />
                    <div>
                      <p className="text-xs text-muted-foreground">Asignado a</p>
                      <p className="font-medium">{lead.assignedUserName}</p>
                    </div>
                  </div>
                )}

                {/* Created At */}
                <div className="text-xs text-muted-foreground pt-2">
                  Creado el{" "}
                  {lead.createdAt
                    ? new Date(lead.createdAt).toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "—"}
                </div>
              </TabsContent>

              {/* Contact Tab */}
              <TabsContent value="contact" className="pt-4">
                {lead.contact ? (
                  <div className="space-y-4">
                    <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                      <Av src={lead.contact.avatar} name={lead.contact.name} size={56} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-lg">{lead.contact.name}</h4>
                          <Badge variant="outline">
                            {lead.contact.type === "company" ? "Empresa" : "Persona"}
                          </Badge>
                        </div>
                        {lead.contact.email && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <RiMailLine className="h-4 w-4" />
                            <a
                              href={`mailto:${lead.contact.email}`}
                              className="hover:underline"
                            >
                              {lead.contact.email}
                            </a>
                          </div>
                        )}
                        {lead.contact.phone && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                            <RiPhoneLine className="h-4 w-4" />
                            <a
                              href={`tel:${lead.contact.phone}`}
                              className="hover:underline"
                            >
                              {lead.contact.phone}
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <RiUserLine className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Este lead no tiene un contacto asociado</p>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            {/* Footer Actions */}
            <div className="flex items-center justify-between pt-6 mt-6 border-t pb-4">
              <Button
                variant="destructive"
                size="sm"
                onClick={handleDelete}
                disabled={deleting}
              >
                <RiDeleteBinLine className="h-4 w-4 mr-2" />
                {deleting ? "Eliminando..." : "Eliminar"}
              </Button>
              <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cerrar
              </Button>
            </div>
          </>
        ) : (
          <div className="py-12 text-center text-muted-foreground">
            No se encontró el lead
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
