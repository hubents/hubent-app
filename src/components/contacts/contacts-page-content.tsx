"use client";

import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  RiFilter3Line,
  RiArrowUpLine,
  RiArrowDownLine,
  RiArrowUpDownLine,
  RiCloseLine,
} from "@remixicon/react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useContacts } from "@/hooks/use-contacts";
import { ContactDrawer } from "./contact-drawer";
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
type SortField = "name" | "category" | "city" | "type" | null;
type SortDirection = "asc" | "desc";

export function ContactsPageContent() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState("");
  const [segment, setSegment] = useState<Segment>("all");
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewContactId, setPreviewContactId] = useState<number | null>(null);

  // Sort state
  const [sortField, setSortField] = useState<SortField>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");

  // Filter state
  const [filterCity, setFilterCity] = useState("");
  const [filterTag, setFilterTag] = useState("");

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  // Sync segment from URL query param
  useEffect(() => {
    const urlSegment = searchParams.get("segment");
    if (urlSegment && ["vendors", "companies", "persons"].includes(urlSegment)) {
      setSegment(urlSegment as Segment);
    }
  }, [searchParams]);
  const [drawerMode, setDrawerMode] = useState<"view" | "create">("view");
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

  // Sort toggle
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else {
        setSortField(null);
      }
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return <RiArrowUpDownLine className="h-3.5 w-3.5 text-muted-foreground/50" />;
    return sortDirection === "asc"
      ? <RiArrowUpLine className="h-3.5 w-3.5" />
      : <RiArrowDownLine className="h-3.5 w-3.5" />;
  };

  // Client-side sort + filter
  const sortedContacts = useMemo(() => {
    let result = [...contacts];

    // Filter by city
    if (filterCity) {
      result = result.filter((c) => c.city?.toLowerCase().includes(filterCity.toLowerCase()));
    }
    // Filter by tag
    if (filterTag) {
      result = result.filter((c) => c.tags?.some((t) => t.toLowerCase().includes(filterTag.toLowerCase())));
    }

    // Sort
    if (sortField) {
      result.sort((a, b) => {
        let valA = "";
        let valB = "";
        switch (sortField) {
          case "name": valA = a.name; valB = b.name; break;
          case "category": valA = getContactCategory(a) || ""; valB = getContactCategory(b) || ""; break;
          case "city": valA = a.city || ""; valB = b.city || ""; break;
          case "type": valA = getContactTypeBadge(a).label; valB = getContactTypeBadge(b).label; break;
        }
        const cmp = valA.localeCompare(valB, "es");
        return sortDirection === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [contacts, sortField, sortDirection, filterCity, filterTag]);

  // Bulk selection
  const hasActiveFilters = filterCity || filterTag;

  const toggleSelectAll = () => {
    if (selectedIds.size === sortedContacts.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(sortedContacts.map((c) => c.id)));
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (!confirm(`¿Eliminar ${selectedIds.size} contactos seleccionados?`)) return;
    for (const id of selectedIds) {
      await deleteContact(id);
    }
    setSelectedIds(new Set());
  };

  const handleBulkExport = () => {
    const selected = sortedContacts.filter((c) => selectedIds.has(c.id));
    if (selected.length === 0) return;
    const headers = ["Tipo", "Nombre", "Email", "Teléfono", "Ciudad", "Categoría", "Es Proveedor", "Tags"];
    const rows = selected.map((c) => [
      c.type === "company" ? "Empresa" : "Persona",
      c.name,
      c.email || "",
      c.phone ? `${c.phoneCountryCode || ""} ${c.phone}` : "",
      c.city || "",
      getContactCategory(c) || "",
      c.isVendor ? "Sí" : "No",
      c.tags?.join(", ") || "",
    ]);
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `contactos_seleccionados_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Clear selection when contacts change
  useEffect(() => {
    setSelectedIds(new Set());
  }, [contacts]);

  const handleContactClick = (contactId: number) => {
    setPreviewContactId(contactId);
    setIsPreviewOpen(true);
  };

  const handleEditFromPreview = () => {
    setIsPreviewOpen(false);
    if (previewContactId) {
      setSelectedContactId(previewContactId);
      setDrawerMode("view");
      setIsDrawerOpen(true);
    }
  };

  const openCreateDrawer = () => {
    setSelectedContactId(null);
    setDrawerMode("create");
    setIsDrawerOpen(true);
  };

  const handleContactCreated = (newContactId: number) => {
    setSelectedContactId(newContactId);
    setDrawerMode("view");
    refetch();
  };

  const handleDrawerClose = (open: boolean) => {
    setIsDrawerOpen(open);
    if (!open) {
      setDrawerMode("view");
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
          <Button className="gap-2" onClick={openCreateDrawer}>
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

      {/* Segment Tabs, Search, and Filters */}
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
            <div className="flex items-center gap-2">
              <div className="relative w-56">
                <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar..."
                  className="pl-9 h-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-1.5 h-9">
                    <RiFilter3Line className="h-4 w-4" />
                    Filtrar
                    {hasActiveFilters && (
                      <Badge variant="secondary" className="ml-1 h-5 px-1.5 text-xs">
                        {(filterCity ? 1 : 0) + (filterTag ? 1 : 0)}
                      </Badge>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72" align="end">
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium">Filtros</h4>
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Ciudad</label>
                      <Input
                        placeholder="Filtrar por ciudad..."
                        value={filterCity}
                        onChange={(e) => setFilterCity(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs text-muted-foreground">Tag</label>
                      <Input
                        placeholder="Filtrar por tag..."
                        value={filterTag}
                        onChange={(e) => setFilterTag(e.target.value)}
                        className="h-8 text-sm"
                      />
                    </div>
                    {hasActiveFilters && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs"
                        onClick={() => { setFilterCity(""); setFilterTag(""); }}
                      >
                        Limpiar filtros
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Active filter chips */}
          {hasActiveFilters && (
            <div className="flex items-center gap-2 mt-3">
              {filterCity && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  Ciudad: {filterCity}
                  <button onClick={() => setFilterCity("")}><RiCloseLine className="h-3 w-3" /></button>
                </Badge>
              )}
              {filterTag && (
                <Badge variant="secondary" className="gap-1 text-xs">
                  Tag: {filterTag}
                  <button onClick={() => setFilterTag("")}><RiCloseLine className="h-3 w-3" /></button>
                </Badge>
              )}
            </div>
          )}
        </CardHeader>

        {/* Bulk action bar */}
        {selectedIds.size > 0 && (
          <div className="px-6 py-2 bg-muted/50 border-y flex items-center gap-3">
            <span className="text-sm font-medium">{selectedIds.size} seleccionado{selectedIds.size > 1 ? "s" : ""}</span>
            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handleBulkExport}>
              <RiDownloadLine className="h-3.5 w-3.5 mr-1" />
              Exportar
            </Button>
            <Button variant="outline" size="sm" className="h-7 text-xs text-destructive border-destructive/50" onClick={handleBulkDelete}>
              <RiDeleteBinLine className="h-3.5 w-3.5 mr-1" />
              Eliminar
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs ml-auto" onClick={() => setSelectedIds(new Set())}>
              Cancelar
            </Button>
          </div>
        )}

        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : sortedContacts.length === 0 ? (
            <div className="text-center py-12">
              <RiUserLine className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">No hay contactos</h3>
              <p className="text-sm text-muted-foreground mb-4">
                {search || hasActiveFilters ? "No se encontraron contactos con esos filtros" : "Crea tu primer contacto para comenzar"}
              </p>
              {!search && !hasActiveFilters && (
                <Button onClick={openCreateDrawer}>
                  <RiAddLine className="h-4 w-4 mr-2" />
                  Nuevo Contacto
                </Button>
              )}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10">
                    <Checkbox
                      checked={selectedIds.size === sortedContacts.length && sortedContacts.length > 0}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-60">
                    <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort("name")}>
                      Nombre {getSortIcon("name")}
                    </button>
                  </TableHead>
                  <TableHead className="hidden md:table-cell">
                    <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort("category")}>
                      Título {getSortIcon("category")}
                    </button>
                  </TableHead>
                  <TableHead className="hidden lg:table-cell">Teléfono</TableHead>
                  <TableHead className="hidden lg:table-cell">
                    <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort("city")}>
                      Dirección {getSortIcon("city")}
                    </button>
                  </TableHead>
                  <TableHead className="hidden xl:table-cell">Identificación</TableHead>
                  <TableHead>
                    <button className="flex items-center gap-1 hover:text-foreground transition-colors" onClick={() => handleSort("type")}>
                      Tipo {getSortIcon("type")}
                    </button>
                  </TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedContacts.map((contact) => {
                  const idDisplay = getContactIdDisplay(contact);
                  const addressDisplay = getContactAddressDisplay(contact);
                  const typeBadge = getContactTypeBadge(contact);
                  const isSelected = selectedIds.has(contact.id);

                  return (
                    <TableRow
                      key={contact.id}
                      className="cursor-pointer"
                      data-state={isSelected ? "selected" : undefined}
                      onClick={() => handleContactClick(contact.id)}
                    >
                      {/* Checkbox */}
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectOne(contact.id)}
                        />
                      </TableCell>

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
                      <TableCell className="hidden md:table-cell">
                        <span className="text-sm">{getContactCategory(contact) || "—"}</span>
                      </TableCell>

                      {/* Phone */}
                      <TableCell className="hidden lg:table-cell">
                        {contact.phone ? (
                          <span className="text-sm">{contact.phoneCountryCode} {contact.phone}</span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>

                      {/* Address */}
                      <TableCell className="hidden lg:table-cell">
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
                      <TableCell className="hidden xl:table-cell">
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

      {/* Contact Drawer (full edit + create) */}
      <ContactDrawer
        contactId={selectedContactId}
        open={isDrawerOpen}
        onOpenChange={handleDrawerClose}
        onContactDeleted={refetch}
        onContactUpdated={refetch}
        onContactCreated={handleContactCreated}
        mode={drawerMode}
        onOpenRelatedContact={(relatedId) => {
          setSelectedContactId(relatedId);
          setDrawerMode("view");
        }}
      />
    </div>
  );
}
