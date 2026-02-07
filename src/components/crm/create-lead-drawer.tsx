"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  RiUserLine,
  RiBuilding2Line,
  RiSearchLine,
  RiAddLine,
  RiCheckLine,
} from "@remixicon/react";

interface Contact {
  id: number;
  type: "person" | "company";
  name: string;
  email: string | null;
  phone: string | null;
  avatar: string | null;
}

interface CreateLeadDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLeadCreated?: () => void;
  stageId?: number;
  preselectedContact?: Contact;
}

export function CreateLeadDrawer({ open, onOpenChange, onLeadCreated, stageId, preselectedContact }: CreateLeadDrawerProps) {
  const [loading, setLoading] = useState(false);
  const [contactMode, setContactMode] = useState<"existing" | "new">("existing");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactSearch, setContactSearch] = useState("");
  const [selectedContact, setSelectedContact] = useState<Contact | null>(preselectedContact || null);
  const [loadingContacts, setLoadingContacts] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    value: "",
    expectedCloseDate: "",
    source: "",
    probability: "50",
  });

  const [newContactData, setNewContactData] = useState({
    type: "person" as "person" | "company",
    name: "",
    email: "",
    phone: "",
  });

  useEffect(() => {
    if (preselectedContact) {
      setSelectedContact(preselectedContact);
      setFormData(prev => ({
        ...prev,
        title: preselectedContact.name,
      }));
    }
  }, [preselectedContact]);

  useEffect(() => {
    if (open && contactMode === "existing") {
      fetchContacts();
    }
  }, [open, contactSearch, contactMode]);

  const fetchContacts = async () => {
    setLoadingContacts(true);
    try {
      const params = new URLSearchParams();
      if (contactSearch) params.set("search", contactSearch);
      params.set("limit", "20");
      
      const res = await fetch(`/api/contacts?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setContacts(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching contacts:", error);
    } finally {
      setLoadingContacts(false);
    }
  };

  const handleSubmit = async () => {
    let contactId = selectedContact?.id;

    // If creating new contact, create it first
    if (contactMode === "new") {
      if (!newContactData.name) {
        alert("El nombre del contacto es requerido");
        return;
      }

      try {
        const contactRes = await fetch("/api/contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: newContactData.type,
            name: newContactData.name,
            email: newContactData.email || null,
            phone: newContactData.phone || null,
          }),
        });

        if (!contactRes.ok) {
          alert("Error al crear el contacto");
          return;
        }

        const contactData = await contactRes.json();
        contactId = contactData.data.id;
      } catch (error) {
        console.error("Error creating contact:", error);
        return;
      }
    }

    if (!contactId) {
      alert("Debes seleccionar o crear un contacto");
      return;
    }

    if (!formData.title) {
      alert("El título del lead es requerido");
      return;
    }
    
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
          source: formData.source || null,
          probability: parseInt(formData.probability) || 50,
          contactId,
        }),
      });

      if (res.ok) {
        resetForm();
        onOpenChange(false);
        onLeadCreated?.();
      } else {
        const error = await res.json();
        alert(error.error?.message || "Error al crear el lead");
      }
    } catch (error) {
      console.error("Error creating lead:", error);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      value: "",
      expectedCloseDate: "",
      source: "",
      probability: "50",
    });
    setNewContactData({
      type: "person",
      name: "",
      email: "",
      phone: "",
    });
    setSelectedContact(preselectedContact || null);
    setContactMode("existing");
    setContactSearch("");
  };

  const getInitials = (name: string) => {
    return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
  };

  return (
    <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Nuevo Lead</SheetTitle>
          <SheetDescription>
            Todo lead debe estar asociado a un contacto (persona o empresa)
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 px-4 pb-4">
          {/* Contact Selection */}
          <div className="space-y-3">
            <label className="text-sm font-medium">Contacto *</label>
            
            {preselectedContact ? (
              <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <Avatar className="h-10 w-10">
                  <AvatarImage src={preselectedContact.avatar || undefined} />
                  <AvatarFallback className={preselectedContact.type === "company" ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"}>
                    {preselectedContact.type === "company" ? <RiBuilding2Line className="h-5 w-5" /> : getInitials(preselectedContact.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium">{preselectedContact.name}</p>
                  <p className="text-sm text-muted-foreground">{preselectedContact.email}</p>
                </div>
                <RiCheckLine className="h-5 w-5 text-green-600" />
              </div>
            ) : (
              <Tabs value={contactMode} onValueChange={(v) => setContactMode(v as "existing" | "new")}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="existing">Contacto Existente</TabsTrigger>
                  <TabsTrigger value="new">Crear Nuevo</TabsTrigger>
                </TabsList>

                <TabsContent value="existing" className="space-y-3 mt-3">
                  <div className="relative">
                    <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar contacto por nombre o email..."
                      className="pl-9"
                      value={contactSearch}
                      onChange={(e) => setContactSearch(e.target.value)}
                    />
                  </div>

                  <div className="border rounded-lg max-h-48 overflow-y-auto">
                    {loadingContacts ? (
                      <div className="p-4 text-center text-muted-foreground">Buscando...</div>
                    ) : contacts.length === 0 ? (
                      <div className="p-4 text-center text-muted-foreground">
                        No se encontraron contactos
                        <Button
                          variant="link"
                          className="block mx-auto mt-2"
                          onClick={() => setContactMode("new")}
                        >
                          <RiAddLine className="h-4 w-4 mr-1" />
                          Crear nuevo contacto
                        </Button>
                      </div>
                    ) : (
                      contacts.map((contact) => (
                        <div
                          key={contact.id}
                          className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 border-b last:border-b-0 ${
                            selectedContact?.id === contact.id ? "bg-primary/10" : ""
                          }`}
                          onClick={() => {
                            setSelectedContact(contact);
                            if (!formData.title) {
                              setFormData(prev => ({ ...prev, title: contact.name }));
                            }
                          }}
                        >
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={contact.avatar || undefined} />
                            <AvatarFallback className={contact.type === "company" ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"}>
                              {contact.type === "company" ? <RiBuilding2Line className="h-4 w-4" /> : getInitials(contact.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{contact.name}</p>
                            <p className="text-xs text-muted-foreground truncate">{contact.email || contact.phone || "Sin datos"}</p>
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {contact.type === "company" ? "Empresa" : "Persona"}
                          </Badge>
                          {selectedContact?.id === contact.id && (
                            <RiCheckLine className="h-4 w-4 text-primary" />
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </TabsContent>

                <TabsContent value="new" className="space-y-4 mt-3">
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant={newContactData.type === "person" ? "default" : "outline"}
                      className="flex-1 gap-2"
                      onClick={() => setNewContactData({ ...newContactData, type: "person" })}
                    >
                      <RiUserLine className="h-4 w-4" />
                      Persona
                    </Button>
                    <Button
                      type="button"
                      variant={newContactData.type === "company" ? "default" : "outline"}
                      className="flex-1 gap-2"
                      onClick={() => setNewContactData({ ...newContactData, type: "company" })}
                    >
                      <RiBuilding2Line className="h-4 w-4" />
                      Empresa
                    </Button>
                  </div>

                  <Input
                    placeholder={newContactData.type === "company" ? "Nombre de la empresa *" : "Nombre completo *"}
                    value={newContactData.name}
                    onChange={(e) => {
                      setNewContactData({ ...newContactData, name: e.target.value });
                      if (!formData.title) {
                        setFormData(prev => ({ ...prev, title: e.target.value }));
                      }
                    }}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      type="email"
                      placeholder="Email"
                      value={newContactData.email}
                      onChange={(e) => setNewContactData({ ...newContactData, email: e.target.value })}
                    />
                    <Input
                      placeholder="Teléfono"
                      value={newContactData.phone}
                      onChange={(e) => setNewContactData({ ...newContactData, phone: e.target.value })}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>

          {/* Lead Details */}
          <div className="space-y-4 pt-4 border-t">
            <h4 className="font-medium">Detalles del Lead</h4>

            <div className="space-y-2">
              <label className="text-sm font-medium">Título del Lead *</label>
              <Input
                placeholder="Ej: Boda Junio 2025 - 150 invitados"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Descripción</label>
              <Textarea
                placeholder="Detalles adicionales del lead..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Valor Estimado (€)</label>
                <Input
                  type="number"
                  placeholder="30000"
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
        </div>

        <SheetFooter className="px-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={loading || !formData.title || (contactMode === "existing" && !selectedContact) || (contactMode === "new" && !newContactData.name)}
          >
            {loading ? "Creando..." : "Crear Lead"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
