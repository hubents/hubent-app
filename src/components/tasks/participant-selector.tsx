"use client";

import { useState, useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  RiUserLine,
  RiStore2Line,
  RiContactsLine,
  RiAddLine,
  RiSearchLine,
  RiCloseLine,
} from "@remixicon/react";

interface TeamMember {
  id: string;
  name: string;
  email: string;
  image?: string;
}

interface Vendor {
  id: number;
  name: string;
  category: string | null;
}

interface Contact {
  id: number;
  name: string;
  email: string | null;
  type: string;
  isLead?: boolean;
}

interface ParticipantSelectorProps {
  teamMembers: TeamMember[];
  vendors: Vendor[];
  contacts: Contact[];
  excludedMemberIds: string[];
  excludedVendorIds: number[];
  excludedContactIds: number[];
  onAddMember: (memberId: string) => void;
  onAddVendor: (vendorId: number) => void;
  onAddContact: (contactId: number) => void;
  disabled?: boolean;
}

type FilterType = "all" | "members" | "vendors" | "contacts";
type ContactFilter = "all" | "client" | "lead" | "other";

export function ParticipantSelector({
  teamMembers,
  vendors,
  contacts,
  excludedMemberIds,
  excludedVendorIds,
  excludedContactIds,
  onAddMember,
  onAddVendor,
  onAddContact,
  disabled,
}: ParticipantSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<FilterType>("all");
  const [vendorCategoryFilter, setVendorCategoryFilter] = useState<string>("all");
  const [contactTypeFilter, setContactTypeFilter] = useState<ContactFilter>("all");

  // Reset filters when popover closes
  useEffect(() => {
    if (!open) {
      setSearch("");
      setTypeFilter("all");
      setVendorCategoryFilter("all");
      setContactTypeFilter("all");
    }
  }, [open]);

  // Get unique vendor categories
  const vendorCategories = useMemo(() => {
    const categories = new Set<string>();
    vendors.forEach((v) => {
      if (v.category) categories.add(v.category);
    });
    return Array.from(categories).sort();
  }, [vendors]);

  // Filter available items (exclude already added)
  const availableMembers = useMemo(() => {
    return teamMembers.filter((m) => !excludedMemberIds.includes(m.id));
  }, [teamMembers, excludedMemberIds]);

  const availableVendors = useMemo(() => {
    return vendors.filter((v) => !excludedVendorIds.includes(v.id));
  }, [vendors, excludedVendorIds]);

  const availableContacts = useMemo(() => {
    return contacts.filter((c) => !excludedContactIds.includes(c.id));
  }, [contacts, excludedContactIds]);

  // Apply search and filters
  const filteredMembers = useMemo(() => {
    if (typeFilter !== "all" && typeFilter !== "members") return [];
    const searchLower = search.toLowerCase();
    return availableMembers.filter(
      (m) =>
        m.name?.toLowerCase().includes(searchLower) ||
        m.email?.toLowerCase().includes(searchLower)
    );
  }, [availableMembers, search, typeFilter]);

  const filteredVendors = useMemo(() => {
    if (typeFilter !== "all" && typeFilter !== "vendors") return [];
    let result = availableVendors;
    
    // Apply category filter
    if (vendorCategoryFilter !== "all") {
      result = result.filter((v) => v.category === vendorCategoryFilter);
    }
    
    // Apply search
    const searchLower = search.toLowerCase();
    if (search) {
      result = result.filter((v) => v.name.toLowerCase().includes(searchLower));
    }
    
    return result;
  }, [availableVendors, search, typeFilter, vendorCategoryFilter]);

  const filteredContacts = useMemo(() => {
    if (typeFilter !== "all" && typeFilter !== "contacts") return [];
    let result = availableContacts;
    
    // Apply contact type filter
    if (contactTypeFilter === "client") {
      result = result.filter((c) => !c.isLead && c.type === "person");
    } else if (contactTypeFilter === "lead") {
      result = result.filter((c) => c.isLead);
    } else if (contactTypeFilter === "other") {
      result = result.filter((c) => c.type === "company");
    }
    
    // Apply search
    const searchLower = search.toLowerCase();
    if (search) {
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(searchLower) ||
          c.email?.toLowerCase().includes(searchLower)
      );
    }
    
    return result;
  }, [availableContacts, search, typeFilter, contactTypeFilter]);

  const handleSelectMember = (memberId: string) => {
    onAddMember(memberId);
    setOpen(false);
  };

  const handleSelectVendor = (vendorId: number) => {
    onAddVendor(vendorId);
    setOpen(false);
  };

  const handleSelectContact = (contactId: number) => {
    onAddContact(contactId);
    setOpen(false);
  };

  const totalAvailable =
    filteredMembers.length + filteredVendors.length + filteredContacts.length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          disabled={disabled}
        >
          <RiAddLine className="h-4 w-4" />
          Agregar
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0"
        align="end"
        side="bottom"
        sideOffset={4}
        avoidCollisions={true}
        collisionPadding={10}
      >
        {/* Search Input */}
        <div className="p-3 border-b shrink-0">
          <div className="relative">
            <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar participante..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9"
              autoFocus
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <RiCloseLine className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="p-2 border-b flex gap-2 flex-wrap shrink-0">
          <Select
            value={typeFilter}
            onValueChange={(v) => setTypeFilter(v as FilterType)}
          >
            <SelectTrigger className="h-7 text-xs w-auto min-w-[100px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="members">Miembros</SelectItem>
              <SelectItem value="vendors">Proveedores</SelectItem>
              <SelectItem value="contacts">Contactos</SelectItem>
            </SelectContent>
          </Select>

          {(typeFilter === "all" || typeFilter === "vendors") &&
            vendorCategories.length > 0 && (
              <Select
                value={vendorCategoryFilter}
                onValueChange={setVendorCategoryFilter}
              >
                <SelectTrigger className="h-7 text-xs w-auto min-w-[100px]">
                  <SelectValue placeholder="Categoría" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas categorías</SelectItem>
                  {vendorCategories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

          {(typeFilter === "all" || typeFilter === "contacts") && (
            <Select
              value={contactTypeFilter}
              onValueChange={(v) => setContactTypeFilter(v as ContactFilter)}
            >
              <SelectTrigger className="h-7 text-xs w-auto min-w-[90px]">
                <SelectValue placeholder="Filtro" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="client">Clientes</SelectItem>
                <SelectItem value="lead">Leads</SelectItem>
                <SelectItem value="other">Empresas</SelectItem>
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Results - scrollable container */}
        <div 
          className="overflow-y-scroll overscroll-contain"
          style={{ maxHeight: '250px' }}
        >
          {totalAvailable === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              {search
                ? "No se encontraron resultados"
                : "No hay participantes disponibles"}
            </div>
          ) : (
            <>
              {/* Members Section */}
              {filteredMembers.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50 flex items-center gap-2">
                    <RiUserLine className="h-3 w-3" />
                    MIEMBROS DEL EQUIPO ({filteredMembers.length})
                  </div>
                  {filteredMembers.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => handleSelectMember(member.id)}
                      className="w-full px-3 py-2 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
                    >
                      <Avatar className="h-7 w-7">
                        <AvatarImage src={member.image} />
                        <AvatarFallback className="text-xs">
                          {member.name?.charAt(0) || "?"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {member.name || member.email}
                        </p>
                        {member.name && member.email && (
                          <p className="text-xs text-muted-foreground truncate">
                            {member.email}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Vendors Section */}
              {filteredVendors.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50 flex items-center gap-2">
                    <RiStore2Line className="h-3 w-3" />
                    PROVEEDORES ({filteredVendors.length})
                  </div>
                  {filteredVendors.map((vendor) => (
                    <button
                      key={vendor.id}
                      onClick={() => handleSelectVendor(vendor.id)}
                      className="w-full px-3 py-2 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="h-7 w-7 rounded-full bg-blue-100 flex items-center justify-center">
                        <RiStore2Line className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {vendor.name}
                        </p>
                        {vendor.category && (
                          <p className="text-xs text-muted-foreground truncate">
                            {vendor.category}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Contacts Section */}
              {filteredContacts.length > 0 && (
                <div>
                  <div className="px-3 py-2 text-xs font-medium text-muted-foreground bg-muted/50 flex items-center gap-2">
                    <RiContactsLine className="h-3 w-3" />
                    CONTACTOS ({filteredContacts.length})
                  </div>
                  {filteredContacts.map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => handleSelectContact(contact.id)}
                      className="w-full px-3 py-2 flex items-center gap-3 hover:bg-muted/50 transition-colors text-left"
                    >
                      <div className="h-7 w-7 rounded-full bg-green-100 flex items-center justify-center">
                        <RiContactsLine className="h-4 w-4 text-green-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {contact.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {contact.isLead
                            ? "Lead"
                            : contact.type === "company"
                            ? "Empresa"
                            : "Cliente"}
                          {contact.email && ` • ${contact.email}`}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
