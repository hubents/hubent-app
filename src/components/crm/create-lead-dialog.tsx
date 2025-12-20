"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface CreateLeadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadCreated?: () => void;
  stageId?: number;
}

export function CreateLeadDialog({ open, onOpenChange, onLeadCreated, stageId }: CreateLeadDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    value: "",
    expectedCloseDate: "",
  });

  const handleSubmit = async () => {
    if (!formData.title) return;
    
    setLoading(true);
    try {
      const res = await fetch("/api/crm/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          description: formData.description || null,
          value: formData.value ? parseFloat(formData.value) : null,
          expectedCloseDate: formData.expectedCloseDate ? new Date(formData.expectedCloseDate) : null,
          stageId: stageId || null,
        }),
      });

      if (res.ok) {
        setFormData({
          title: "",
          description: "",
          value: "",
          expectedCloseDate: "",
        });
        onOpenChange(false);
        onLeadCreated?.();
      }
    } catch (error) {
      console.error("Error creating lead:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Nuevo Lead</DialogTitle>
          <DialogDescription>
            Agrega un nuevo lead a tu pipeline de ventas
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Nombre / Título *</label>
            <Input
              placeholder="Ej: María González - Boda Junio 2025"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium">Descripción</label>
            <Textarea
              placeholder="Detalles del lead..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Valor Estimado</label>
              <Input
                type="number"
                placeholder="30000"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Fecha Esperada de Cierre</label>
              <Input
                type="date"
                value={formData.expectedCloseDate}
                onChange={(e) => setFormData({ ...formData, expectedCloseDate: e.target.value })}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !formData.title}
          >
            {loading ? "Creando..." : "Crear Lead"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
