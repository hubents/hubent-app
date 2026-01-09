"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  RiUserLine,
  RiBuilding2Line,
  RiMailLine,
  RiPhoneLine,
  RiCalendarLine,
  RiMoneyDollarCircleLine,
  RiPercentLine,
  RiEditLine,
  RiSaveLine,
  RiCloseLine,
} from "@remixicon/react";

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

interface LeadDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead | null;
  stages?: Stage[];
  onLeadUpdated?: () => void;
  onLeadDeleted?: () => void;
}

export function LeadDetailDialog({
  open,
  onOpenChange,
  lead,
  stages = [],
  onLeadUpdated,
  onLeadDeleted,
}: LeadDetailDialogProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingLead, setLoadingLead] = useState(false);
  const [fullLead, setFullLead] = useState<Lead | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    value: "",
    probability: "50",
    expectedCloseDate: "",
    source: "",
    stageId: "",
  });

  useEffect(() => {
    if (lead && open) {
      fetchLeadDetails(lead.id);
    }
  }, [lead, open]);

  useEffect(() => {
    if (fullLead) {
      setFormData({
        title: fullLead.title || "",
        description: fullLead.description || "",
        value: fullLead.value || "",
        probability: fullLead.probability?.toString() || "50",
        expectedCloseDate: fullLead.expectedCloseDate 
          ? new Date(fullLead.expectedCloseDate).toISOString().split("T")[0] 
          : "",
        source: fullLead.source || "",
        stageId: fullLead.stageId?.toString() || "",
      });
    }
  }, [fullLead]);

  const fetchLeadDetails = async (leadId: number) => {
    setLoadingLead(true);
    try {
      const res = await fetch(`/api/crm/leads/${leadId}`);
      const data = await res.json();
      if (data.success) {
        setFullLead(data.data);
      }
    } catch (error) {
      console.error("Error fetching lead details:", error);
    } finally {
      setLoadingLead(false);
    }
  };

  const handleSave = async () => {
    if (!fullLead) return;
    
    setLoading(true);
    try {
      const res = await fetch(`/api/crm/leads/${fullLead.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          value: formData.value ? parseFloat(formData.value) : null,
          probability: parseInt(formData.probability) || 50,
          expectedCloseDate: formData.expectedCloseDate ? new Date(formData.expectedCloseDate) : null,
          source: formData.source || null,
          stageId: formData.stageId ? parseInt(formData.stageId) : null,
        }),
      });

      if (res.ok) {
        setIsEditing(false);
        onLeadUpdated?.();
        fetchLeadDetails(fullLead.id);
      } else {
        const error = await res.json();
        alert(error.error?.message || "Error al actualizar el lead");
      }
    } catch (error) {
      console.error("Error updating lead:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!fullLead) return;
    if (!confirm("¿Estás seguro de eliminar este lead?")) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/crm/leads/${fullLead.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        onOpenChange(false);
        onLeadDeleted?.();
      }
    } catch (error) {
      console.error("Error deleting lead:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: string | null, currency: string | null) => {
    if (!value) return "—";
    const num = parseFloat(value);
    return new Intl.NumberFormat("es-ES", {
      style: "currency",
      currency: currency || "EUR",
      minimumFractionDigits: 0,
    }).format(num);
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  const getSourceLabel = (source: string | null) => {
    const sources: Record<string, string> = {
      website: "Sitio Web",
      referral: "Referido",
      social: "Redes Sociales",
      event: "Evento",
      cold: "Contacto Frío",
      other: "Otro",
    };
    return source ? sources[source] || source : "—";
  };

  if (!lead) return null;

  const displayLead = fullLead || lead;

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); setIsEditing(false); }}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">
                {isEditing ? "Editar Lead" : displayLead.title}
              </DialogTitle>
              <DialogDescription>
                {isEditing ? "Modifica los datos del lead" : "Detalles del lead"}
              </DialogDescription>
            </div>
            {!isEditing && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <RiEditLine className="h-4 w-4 mr-2" />
                Editar
              </Button>
            )}
          </div>
        </DialogHeader>

        {loadingLead ? (
          <div className="py-12 text-center text-muted-foreground">Cargando...</div>
        ) : isEditing ? (
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Título *</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Descripción</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Valor (€)</label>
                <Input
                  type="number"
                  value={formData.value}
                  onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Probabilidad (%)</label>
                <Select value={formData.probability} onValueChange={(v) => setFormData({ ...formData, probability: v })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="10">10%</SelectItem>
                    <SelectItem value="25">25%</SelectItem>
                    <SelectItem value="50">50%</SelectItem>
                    <SelectItem value="75">75%</SelectItem>
                    <SelectItem value="90">90%</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Etapa</label>
                <Select value={formData.stageId} onValueChange={(v) => setFormData({ ...formData, stageId: v })}>
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
              <div className="space-y-2">
                <label className="text-sm font-medium">Fuente</label>
                <Select value={formData.source} onValueChange={(v) => setFormData({ ...formData, source: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="¿Cómo llegó?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="website">Sitio Web</SelectItem>
                    <SelectItem value="referral">Referido</SelectItem>
                    <SelectItem value="social">Redes Sociales</SelectItem>
                    <SelectItem value="event">Evento</SelectItem>
                    <SelectItem value="cold">Contacto Frío</SelectItem>
                    <SelectItem value="other">Otro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha Esperada de Cierre</label>
              <Input
                type="date"
                value={formData.expectedCloseDate}
                onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button variant="outline" onClick={() => setIsEditing(false)}>
                <RiCloseLine className="h-4 w-4 mr-2" />
                Cancelar
              </Button>
              <Button onClick={handleSave} disabled={loading || !formData.title}>
                <RiSaveLine className="h-4 w-4 mr-2" />
                {loading ? "Guardando..." : "Guardar"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <Tabs defaultValue="details" className="py-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="details">Detalles</TabsTrigger>
              <TabsTrigger value="contact">Contacto</TabsTrigger>
            </TabsList>

            <TabsContent value="details" className="space-y-6 mt-4">
              {/* Lead Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Valor</p>
                  <p className="text-lg font-semibold text-primary">
                    {formatCurrency(displayLead.value, displayLead.currency)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Probabilidad</p>
                  <Badge 
                    variant="outline"
                    className={
                      (displayLead.probability || 0) >= 70 ? "border-green-500 text-green-600" :
                      (displayLead.probability || 0) >= 40 ? "border-yellow-500 text-yellow-600" :
                      "border-red-500 text-red-600"
                    }
                  >
                    {displayLead.probability || 0}%
                  </Badge>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Fecha Esperada de Cierre</p>
                  <p className="font-medium">
                    {displayLead.expectedCloseDate 
                      ? new Date(displayLead.expectedCloseDate).toLocaleDateString("es-ES", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                        })
                      : "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Fuente</p>
                  <p className="font-medium">{getSourceLabel(displayLead.source || null)}</p>
                </div>
              </div>

              {/* Description */}
              {displayLead.description && (
                <div className="space-y-2">
                  <p className="text-sm text-muted-foreground">Descripción</p>
                  <p className="text-sm bg-muted/50 p-3 rounded-lg">{displayLead.description}</p>
                </div>
              )}

              {/* Assigned User */}
              {displayLead.assignedUserName && (
                <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={displayLead.assignedUserImage || undefined} />
                    <AvatarFallback>{displayLead.assignedUserName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm text-muted-foreground">Asignado a</p>
                    <p className="font-medium">{displayLead.assignedUserName}</p>
                  </div>
                </div>
              )}

              {/* Created At */}
              <div className="text-xs text-muted-foreground">
                Creado el {displayLead.createdAt 
                  ? new Date(displayLead.createdAt).toLocaleDateString("es-ES", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })
                  : "—"}
              </div>
            </TabsContent>

            <TabsContent value="contact" className="mt-4">
              {fullLead?.contact ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                    <Avatar className="h-14 w-14">
                      <AvatarImage src={fullLead.contact.avatar || undefined} />
                      <AvatarFallback className={fullLead.contact.type === "company" ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"}>
                        {fullLead.contact.type === "company" 
                          ? <RiBuilding2Line className="h-6 w-6" />
                          : getInitials(fullLead.contact.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold text-lg">{fullLead.contact.name}</h4>
                        <Badge variant="outline">
                          {fullLead.contact.type === "company" ? "Empresa" : "Persona"}
                        </Badge>
                      </div>
                      {fullLead.contact.email && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <RiMailLine className="h-4 w-4" />
                          <a href={`mailto:${fullLead.contact.email}`} className="hover:underline">
                            {fullLead.contact.email}
                          </a>
                        </div>
                      )}
                      {fullLead.contact.phone && (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                          <RiPhoneLine className="h-4 w-4" />
                          <a href={`tel:${fullLead.contact.phone}`} className="hover:underline">
                            {fullLead.contact.phone}
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
        )}

        {!isEditing && (
          <DialogFooter className="border-t pt-4">
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              Eliminar Lead
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cerrar
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
