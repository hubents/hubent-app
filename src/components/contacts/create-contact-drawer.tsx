"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RiUserLine, RiBuilding2Line } from "@remixicon/react";

interface CreateContactDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onContactCreated?: () => void;
}

export function CreateContactDrawer({
  open,
  onOpenChange,
  onContactCreated,
}: CreateContactDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [contactType, setContactType] = useState<"person" | "company">("person");
  const [formData, setFormData] = useState({
    // Common
    name: "",
    email: "",
    phone: "",
    phoneCountryCode: "+34",
    // Person
    firstName: "",
    lastName: "",
    nieOrCif: "",
    // Company
    tradeName: "",
    taxId: "",
    website: "",
    contactPersonName: "",
    contactPersonEmail: "",
    // Event
    eventDate: "",
    guestCount: "",
    budget: "",
    venueType: "",
    // Notes
    notes: "",
  });

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      phone: "",
      phoneCountryCode: "+34",
      firstName: "",
      lastName: "",
      nieOrCif: "",
      tradeName: "",
      taxId: "",
      website: "",
      contactPersonName: "",
      contactPersonEmail: "",
      eventDate: "",
      guestCount: "",
      budget: "",
      venueType: "",
      notes: "",
    });
    setContactType("person");
  };

  const handleSubmit = async () => {
    // Build name based on type
    let name = formData.name;
    if (contactType === "person" && formData.firstName) {
      name = `${formData.firstName} ${formData.lastName}`.trim();
    }

    if (!name) {
      alert("El nombre es requerido");
      return;
    }

    setLoading(true);
    try {
      const payload: Record<string, unknown> = {
        type: contactType,
        name,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        phoneCountryCode: formData.phoneCountryCode,
        notes: formData.notes || undefined,
      };

      if (contactType === "person") {
        payload.firstName = formData.firstName || undefined;
        payload.lastName = formData.lastName || undefined;
        payload.nieOrCif = formData.nieOrCif || undefined;
      } else {
        payload.tradeName = formData.tradeName || undefined;
        payload.taxId = formData.taxId || undefined;
        payload.website = formData.website || undefined;
        payload.contactPersonName = formData.contactPersonName || undefined;
        payload.contactPersonEmail = formData.contactPersonEmail || undefined;
      }

      // Event fields
      if (formData.eventDate) {
        payload.eventDate = formData.eventDate;
      }
      if (formData.guestCount) {
        payload.guestCount = parseInt(formData.guestCount, 10);
      }
      if (formData.budget) {
        payload.budget = parseFloat(formData.budget);
      }
      if (formData.venueType) {
        payload.venueType = formData.venueType;
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
        onContactCreated?.();
      } else if (result.error?.code === "DUPLICATE_WARNING") {
        const proceed = confirm(
          `Se encontraron posibles duplicados:\n${result.error.duplicates.map((d: { name: string }) => d.name).join(", ")}\n\n¿Deseas crear el contacto de todas formas?`
        );
        if (proceed) {
          // Force create - in a real app, you'd have a flag for this
          // For now, we'll just show the warning
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
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nuevo Contacto</SheetTitle>
          <SheetDescription>
            Agrega un nuevo contacto a tu lista
          </SheetDescription>
        </SheetHeader>

        <div className="px-4 pb-4 space-y-4">

        <Tabs value={contactType} onValueChange={(v) => setContactType(v as "person" | "company")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="person" className="gap-2">
              <RiUserLine className="h-4 w-4" />
              Contacto
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
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Apellido</label>
                <Input
                  placeholder="Apellido"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  placeholder="email@ejemplo.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Teléfono</label>
                <div className="flex gap-2">
                  <Select
                    value={formData.phoneCountryCode}
                    onValueChange={(v) => setFormData({ ...formData, phoneCountryCode: v })}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="+34">🇪🇸 +34</SelectItem>
                      <SelectItem value="+1">🇺🇸 +1</SelectItem>
                      <SelectItem value="+44">🇬🇧 +44</SelectItem>
                      <SelectItem value="+33">🇫🇷 +33</SelectItem>
                      <SelectItem value="+49">🇩🇪 +49</SelectItem>
                      <SelectItem value="+39">🇮🇹 +39</SelectItem>
                      <SelectItem value="+351">🇵🇹 +351</SelectItem>
                      <SelectItem value="+52">🇲🇽 +52</SelectItem>
                      <SelectItem value="+54">🇦🇷 +54</SelectItem>
                      <SelectItem value="+55">🇧🇷 +55</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="612 345 678"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">NIE o CIF</label>
              <Input
                placeholder="Ingresa el NIE o CIF"
                value={formData.nieOrCif}
                onChange={(e) => setFormData({ ...formData, nieOrCif: e.target.value })}
              />
            </div>
          </TabsContent>

          <TabsContent value="company" className="space-y-4 mt-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nombre de la empresa *</label>
              <Input
                placeholder="Nombre legal de la empresa"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  placeholder="contacto@empresa.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Teléfono</label>
                <div className="flex gap-2">
                  <Select
                    value={formData.phoneCountryCode}
                    onValueChange={(v) => setFormData({ ...formData, phoneCountryCode: v })}
                  >
                    <SelectTrigger className="w-24">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="+34">🇪🇸 +34</SelectItem>
                      <SelectItem value="+1">🇺🇸 +1</SelectItem>
                      <SelectItem value="+44">🇬🇧 +44</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="912 345 678"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    className="flex-1"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Persona de contacto</label>
                <Input
                  placeholder="Nombre del contacto"
                  value={formData.contactPersonName}
                  onChange={(e) => setFormData({ ...formData, contactPersonName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Email de contacto</label>
                <Input
                  type="email"
                  placeholder="persona@empresa.com"
                  value={formData.contactPersonEmail}
                  onChange={(e) => setFormData({ ...formData, contactPersonEmail: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">CIF/NIF</label>
                <Input
                  placeholder="B12345678"
                  value={formData.taxId}
                  onChange={(e) => setFormData({ ...formData, taxId: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Sitio Web</label>
                <Input
                  placeholder="https://www.empresa.com"
                  value={formData.website}
                  onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                />
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Event Fields - Common for both types */}
        <div className="border-t pt-4 mt-4">
          <h4 className="text-sm font-medium mb-3">Información del Evento (opcional)</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Fecha del evento</label>
              <Input
                type="date"
                value={formData.eventDate}
                onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Invitados</label>
              <Input
                type="number"
                placeholder="150"
                value={formData.guestCount}
                onChange={(e) => setFormData({ ...formData, guestCount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Presupuesto (€)</label>
              <Input
                type="number"
                placeholder="30000"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm text-muted-foreground">Tipo de Venue</label>
              <Select
                value={formData.venueType}
                onValueChange={(v) => setFormData({ ...formData, venueType: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hotel">Hotel</SelectItem>
                  <SelectItem value="finca">Finca</SelectItem>
                  <SelectItem value="restaurante">Restaurante</SelectItem>
                  <SelectItem value="playa">Playa</SelectItem>
                  <SelectItem value="jardin">Jardín</SelectItem>
                  <SelectItem value="salon">Salón de eventos</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Comentarios</label>
          <Textarea
            placeholder="Notas o comentarios sobre el contacto..."
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            rows={3}
          />
        </div>

        </div>

        <SheetFooter className="px-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Creando..." : "Crear contacto"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
