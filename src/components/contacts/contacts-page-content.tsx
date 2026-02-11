"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  RiAddLine,
  RiSearchLine,
  RiUserLine,
  RiBuilding2Line,
  RiMailLine,
  RiPhoneLine,
  RiWhatsappLine,
  RiMoreLine,
  RiDeleteBinLine,
  RiCalendarEventLine,
  RiFileListLine,
  RiUploadLine,
  RiDownloadLine,
  RiExternalLinkLine,
  RiUserStarLine,
  RiStore2Line,
} from "@remixicon/react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useContacts } from "@/hooks/use-contacts";
import { ContactDrawer } from "./contact-drawer";
import { QuickCreateContactDrawer } from "./quick-create-contact-drawer";
import { ImportContactsDrawer } from "./import-contacts-drawer";
import { LinkContactDrawer } from "./link-contact-drawer";
import { CreateLeadDrawer } from "@/components/crm/create-lead-drawer";
import { ContactPreviewDrawer } from "./contact-preview-drawer";

interface Contact {
  id: number;
  type: "person" | "company";
  name: string;
  email: string | null;
  phone: string | null;
  phoneCountryCode: string | null;
  avatar: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  nieOrCif: string | null;
  passportId: string | null;
  taxId: string | null;
  tags: string[] | null;
  isLead: boolean | null;
  isVendor: boolean | null;
  vendorCategory: string | null;
  category: string | null;
}

type Segment = "all" | "vendors" | "companies" | "persons";

export function ContactsPageContent() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState<Segment>("all");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewContactId, setPreviewContactId] = useState<number | null>(null);

  // Sync segment from URL query param
  useEffect(() => {
    const urlSegment = searchParams.get("segment");
    if (urlSegment && ["vendors", "companies", "persons"].includes(urlSegment)) {
      setSegment(urlSegment as Segment);
    }
  }, [searchParams]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isLinkDialogOpen, setIsLinkDialogOpen] = useState(false);
  const [isLeadDialogOpen, setIsLeadDialogOpen] = useState(false);
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [selectedContactForLead, setSelectedContactForLead] = useState<Contact | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Build filter params based on segment
  const getFilterParams = () => {
    switch (segment) {
      case "vendors":
        return { isVendor: true };
      case "companies":
        return { type: "company", isVendor: false };
      case "persons":
        return { type: "person", isVendor: false };
      default:
        return {};
    }
  };

  const { contacts, stats, loading, refetch, deleteContact } = useContacts({
    search: search || undefined,
    ...getFilterParams(),
  });

  // Helper to get display type for a contact
  const getContactDisplayType = (contact: Contact): "Persona" | "Empresa" | "Proveedor" => {
    if (contact.isVendor) return "Proveedor";
    return contact.type === "company" ? "Empresa" : "Persona";
  };

  // Helper to get category display
  const getContactCategory = (contact: Contact): string | null => {
    if (contact.isVendor) return contact.vendorCategory;
    return contact.category;
  };

  const getContactIdDisplay = (contact: Contact): { value: string; label: string } | null => {
    if (contact.type === "company" && contact.taxId) {
      return { value: contact.taxId, label: "CIF" };
    }
    if (contact.nieOrCif) {
      return { value: contact.nieOrCif, label: "NIE/DNI" };
    }
    if (contact.passportId) {
      return { value: contact.passportId, label: "Pasaporte" };
    }
    if (contact.taxId) {
      return { value: contact.taxId, label: "CIF" };
    }
    return null;
  };

  const getContactAddressDisplay = (contact: Contact): { primary: string; secondary: string | null } | null => {
    if (!contact.city && !contact.address) return null;
    const parts = [contact.city, contact.country].filter(Boolean);
    return {
      primary: parts.join(", ") || "—",
      secondary: contact.address || null,
    };
  };

  const getContactTypeBadge = (contact: Contact): { label: string; dotColor: string } => {
    if (contact.isVendor) return { label: "Proveedor", dotColor: "bg-green-500" };
    if (contact.isLead) return { label: "Lead", dotColor: "bg-amber-500" };
    if (contact.type === "company") return { label: "Empresa", dotColor: "bg-purple-500" };
    return { label: "Persona", dotColor: "bg-blue-500" };
  };

  const handleContactClick = (contactId: number) => {
    setPreviewContactId(contactId);
    setIsPreviewOpen(true);
  };

  const handleEditFromPreview = () => {
    setIsPreviewOpen(false);
    if (previewContactId) {
      setSelectedContactId(previewContactId);
      setIsDrawerOpen(true);
    }
  };

  const handleQuickCall = (e: React.MouseEvent, contact: Contact) => {
    e.stopPropagation();
    if (contact.phone) {
      const fullPhone = `${contact.phoneCountryCode || ""}${contact.phone}`.replace(/\s/g, "");
      window.open(`tel:${fullPhone}`, "_self");
    }
  };

  const handleQuickEmail = (e: React.MouseEvent, contact: Contact) => {
    e.stopPropagation();
    if (contact.email) {
      window.open(`mailto:${contact.email}`, "_self");
    }
  };

  const handleQuickWhatsApp = (e: React.MouseEvent, contact: Contact) => {
    e.stopPropagation();
    if (contact.phone) {
      const fullPhone = `${contact.phoneCountryCode || ""}${contact.phone}`.replace(/\s/g, "").replace("+", "");
      window.open(`https://wa.me/${fullPhone}`, "_blank");
    }
  };

  const handleLinkContact = (e: React.MouseEvent, contact: Contact) => {
    e.stopPropagation();
    setSelectedContact(contact);
    setIsLinkDialogOpen(true);
  };

  const handleConvertToLead = (e: React.MouseEvent, contact: Contact) => {
    e.stopPropagation();
    setSelectedContactForLead(contact);
    setIsLeadDialogOpen(true);
  };

  const handleDeleteContact = async (e: React.MouseEvent, contactId: number) => {
    e.stopPropagation();
    if (confirm("¿Estás seguro de eliminar este contacto?")) {
      await deleteContact(contactId);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleExportCSV = () => {
    if (contacts.length === 0) {
      alert("No hay contactos para exportar");
      return;
    }

    const headers = ["Tipo", "Nombre", "Email", "Teléfono", "Ciudad", "Es Lead", "Tags"];
    const rows = contacts.map(c => [
      c.type === "company" ? "Empresa" : "Persona",
      c.name,
      c.email || "",
      c.phone || "",
      c.city || "",
      c.isLead ? "Sí" : "No",
      c.tags?.join(", ") || "",
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");

    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `contactos_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contactos</h1>
          <p className="text-muted-foreground">
            Administra todos tus contactos desde un solo lugar
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" className="gap-2" onClick={handleExportCSV}>
            <RiDownloadLine className="h-4 w-4" />
            Exportar CSV
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setIsImportDialogOpen(true)}>
            <RiUploadLine className="h-4 w-4" />
            Importar CSV
          </Button>
          <Button className="gap-2" onClick={() => setIsCreateDialogOpen(true)}>
            <RiAddLine className="h-4 w-4" />
            Nuevo Contacto
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <Skeleton className="h-4 w-20 mb-2" />
                <Skeleton className="h-8 w-12" />
              </CardContent>
            </Card>
          ))
        ) : (
          <>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <RiUserLine className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">Total Contactos</span>
                </div>
                <p className="text-2xl font-bold mt-1">{stats.total}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <RiUserLine className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-muted-foreground">Personas</span>
                </div>
                <p className="text-2xl font-bold mt-1 text-blue-500">{stats.persons}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <RiBuilding2Line className="h-4 w-4 text-purple-500" />
                  <span className="text-sm text-muted-foreground">Empresas</span>
                </div>
                <p className="text-2xl font-bold mt-1 text-purple-500">{stats.companies}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <RiStore2Line className="h-4 w-4 text-green-500" />
                  <span className="text-sm text-muted-foreground">Proveedores</span>
                </div>
                <p className="text-2xl font-bold mt-1 text-green-500">{stats.vendors}</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* Segment Tabs and Search */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-4">
            <Tabs value={segment} onValueChange={(v) => setSegment(v as Segment)} className="w-auto">
              <TabsList>
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="vendors">Proveedores</TabsTrigger>
                <TabsTrigger value="companies">Empresas</TabsTrigger>
                <TabsTrigger value="persons">Personas</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-3">
              <div className="relative w-64">
                <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar contactos..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : contacts.length === 0 ? (
            <div className="text-center py-12">
              <RiUserLine className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No hay contactos</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {search ? "No se encontraron contactos con esa búsqueda" : "Crea tu primer contacto para comenzar"}
              </p>
              {!search && (
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <RiAddLine className="h-4 w-4 mr-2" />
                  Nuevo Contacto
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-70">Nombre</TableHead>
                  <TableHead className="hidden lg:table-cell">Título</TableHead>
                  <TableHead className="hidden md:table-cell">Dirección</TableHead>
                  <TableHead className="hidden lg:table-cell">Identificación</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contacts.map((contact) => {
                  const idDisplay = getContactIdDisplay(contact);
                  const addressDisplay = getContactAddressDisplay(contact);
                  const typeBadge = getContactTypeBadge(contact);

                  return (
                    <TableRow
                      key={contact.id}
                      className="cursor-pointer"
                      onClick={() => handleContactClick(contact.id)}
                    >
                      {/* Name + Email */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={contact.avatar || undefined} />
                            <AvatarFallback className={contact.type === "company" ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"}>
                              {contact.type === "company" ? (
                                <RiBuilding2Line className="h-4 w-4" />
                              ) : (
                                getInitials(contact.name)
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0">
                            <p className="font-medium truncate">{contact.name}</p>
                            {contact.email && (
                              <p className="text-xs text-muted-foreground truncate">{contact.email}</p>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Title / Category */}
                      <TableCell className="hidden lg:table-cell">
                        <span className="text-sm">{getContactCategory(contact) || "—"}</span>
                      </TableCell>

                      {/* Address */}
                      <TableCell className="hidden md:table-cell">
                        {addressDisplay ? (
                          <div>
                            <p className="text-sm">{addressDisplay.primary}</p>
                            {addressDisplay.secondary && (
                              <p className="text-xs text-muted-foreground truncate max-w-50">{addressDisplay.secondary}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* ID */}
                      <TableCell className="hidden lg:table-cell">
                        {idDisplay ? (
                          <div>
                            <p className="text-sm font-mono">{idDisplay.value}</p>
                            <p className="text-xs text-muted-foreground">{idDisplay.label}</p>
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Type Badge */}
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <span className={`h-2 w-2 rounded-full ${typeBadge.dotColor}`} />
                          <Badge variant="outline" className="text-xs font-normal">
                            {typeBadge.label}
                          </Badge>
                        </div>
                      </TableCell>

                      {/* Actions Menu */}
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <RiMoreLine className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleContactClick(contact.id)}>
                              <RiExternalLinkLine className="h-4 w-4 mr-2" />
                              Ver detalles
                            </DropdownMenuItem>
                            {contact.phone && (
                              <>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleQuickCall(e as unknown as React.MouseEvent, contact); }}>
                                  <RiPhoneLine className="h-4 w-4 mr-2" />
                                  Llamar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleQuickWhatsApp(e as unknown as React.MouseEvent, contact); }}>
                                  <RiWhatsappLine className="h-4 w-4 mr-2" />
                                  WhatsApp
                                </DropdownMenuItem>
                              </>
                            )}
                            {contact.email && (
                              <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleQuickEmail(e as unknown as React.MouseEvent, contact); }}>
                                <RiMailLine className="h-4 w-4 mr-2" />
                                Enviar email
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            {!contact.isLead && (
                              <DropdownMenuItem
                                onClick={(e) => handleConvertToLead(e as unknown as React.MouseEvent, contact)}
                                className="text-green-600"
                              >
                                <RiUserStarLine className="h-4 w-4 mr-2" />
                                Convertir a Lead
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onClick={(e) => handleLinkContact(e as unknown as React.MouseEvent, contact)}>
                              <RiFileListLine className="h-4 w-4 mr-2" />
                              Vincular a tarea
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={(e) => handleLinkContact(e as unknown as React.MouseEvent, contact)}>
                              <RiCalendarEventLine className="h-4 w-4 mr-2" />
                              Vincular a evento
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => handleDeleteContact(e as unknown as React.MouseEvent, contact.id)}
                            >
                              <RiDeleteBinLine className="h-4 w-4 mr-2" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Quick Create Contact Drawer */}
      <QuickCreateContactDrawer
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onContactCreated={(contactId) => {
          refetch();
          setSelectedContactId(contactId);
          setIsDrawerOpen(true);
        }}
      />

      {/* Import Contacts Drawer */}
      <ImportContactsDrawer
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
        onImportComplete={refetch}
      />

      {/* Link Contact Drawer */}
      <LinkContactDrawer
        open={isLinkDialogOpen}
        onOpenChange={setIsLinkDialogOpen}
        contact={selectedContact}
        onLinkComplete={refetch}
      />

      {/* Create Lead Drawer */}
      <CreateLeadDrawer
        open={isLeadDialogOpen}
        onOpenChange={setIsLeadDialogOpen}
        onLeadCreated={refetch}
        preselectedContact={selectedContactForLead || undefined}
      />

      {/* Contact Preview Drawer (read-only) */}
      <ContactPreviewDrawer
        contactId={previewContactId}
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        onEdit={handleEditFromPreview}
      />

      {/* Contact Drawer (full edit) */}
      <ContactDrawer
        contactId={selectedContactId}
        open={isDrawerOpen}
        onOpenChange={setIsDrawerOpen}
        onContactDeleted={refetch}
        onContactUpdated={refetch}
        onOpenRelatedContact={(relatedId) => {
          setSelectedContactId(relatedId);
        }}
      />
    </div>
  );
}
