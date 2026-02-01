"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RiUserLine, RiBuilding2Line } from "@remixicon/react";

interface QuickCreateContactDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContactCreated?: (contactId: number) => void;
}

export function QuickCreateContactDialog({
  open,
  onOpenChange,
  onContactCreated,
}: QuickCreateContactDialogProps) {
  const [loading, setLoading] = useState(false);
  const [contactType, setContactType] = useState<"person" | "company">("person");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [companyName, setCompanyName] = useState("");

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setCompanyName("");
    setContactType("person");
  };

  const handleSubmit = async () => {
    const name = contactType === "person" 
      ? `${firstName} ${lastName}`.trim() 
      : companyName.trim();

    if (!name) {
      alert("El nombre es requerido");
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        type: contactType,
        name,
      };

      if (contactType === "person") {
        payload.firstName = firstName || undefined;
        payload.lastName = lastName || undefined;
      }

      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();

      if (result.success) {
        resetForm();
        onOpenChange(false);
        onContactCreated?.(result.data.id);
      } else if (result.error?.code === "DUPLICATE_WARNING") {
        const proceed = confirm(
          `Se encontraron posibles duplicados:\n${result.error.duplicates.map((d: { name: string }) => d.name).join(", ")}\n\n¿Deseas crear el contacto de todas formas?`
        );
        if (proceed) {
          // Force create with duplicate flag
          const forceRes = await fetch("/api/contacts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, forceDuplicate: true }),
          });
          const forceResult = await forceRes.json();
          if (forceResult.success) {
            resetForm();
            onOpenChange(false);
            onContactCreated?.(forceResult.data.id);
          } else {
            alert(forceResult.error?.message || "Error al crear contacto");
          }
        }
      } else {
        alert(result.error?.message || "Error al crear contacto");
      }
    } catch (error) {
      console.error("Error creating contact:", error);
      alert("Error al crear contacto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Nuevo Contacto</DialogTitle>
          <DialogDescription>
            Crea un contacto rápidamente. Podrás completar los detalles después.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={contactType} onValueChange={(v) => setContactType(v as "person" | "company")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="person" className="gap-2">
              <RiUserLine className="h-4 w-4" />
              Persona
            </TabsTrigger>
            <TabsTrigger value="company" className="gap-2">
              <RiBuilding2Line className="h-4 w-4" />
              Empresa
            </TabsTrigger>
          </TabsList>

          <TabsContent value="person" className="space-y-4 mt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nombre *</label>
                <Input
                  placeholder="Nombre"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Apellido</label>
                <Input
                  placeholder="Apellido"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                />
              </div>
            </div>
          </TabsContent>

          <TabsContent value="company" className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre de la empresa *</label>
              <Input
                placeholder="Ej: Acme Corp"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                autoFocus
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Creando..." : "Crear y completar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
