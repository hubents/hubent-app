"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
  RiLoader4Line,
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
  excludedMemberIds: string[];
  excludedVendorIds: number[];
  excludedContactIds: number[];
  onAddMember: (memberId: string) => void;
  onAddVendor: (vendorId: number) => void;
  onAddContact: (contactId: number) => void;
  disabled?: boolean;
}

type FilterType = "all" | "members" | "vendors" | "contacts";

export function ParticipantSelector({
  teamMembers,
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
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchServerData = useCallback(async (searchTerm: string) => {
    setSearching(true);
    try {
      const params = new URLSearchParams({ limit: "20" });
      if (searchTerm) params.set("search", searchTerm);

      const [vendorsRes, contactsRes] = await Promise.all([
        fetch(`/api/vendors?${params}`),
        fetch(`/api/contacts?${params}`),
      ]);
      const [vendorsData, contactsData] = await Promise.all([
        vendorsRes.json(),
        contactsRes.json(),
      ]);

      if (vendorsData.success && Array.isArray(vendorsData.data)) {
        setVendors(vendorsData.data);
      }
      if (contactsData.success && Array.isArray(contactsData.data)) {
        setContacts(contactsData.data);
      }
    } catch (err) {
      console.error("Failed to search participants:", err);
    } finally {
      setSearching(false);
    }
  }, []);

  // Load initial data when popover opens, reset when it closes
  useEffect(() => {
    if (open) {
      fetchServerData("");
    } else {
      setSearch("");
      setTypeFilter("all");
      setVendors([]);
      setContacts([]);
    }
  }, [open, fetchServerData]);

  // Debounced server-side search (only on search text changes)
  const prevSearchRef = useRef("");
  useEffect(() => {
    if (!open) return;
    if (search === prevSearchRef.current) return;
    prevSearchRef.current = search;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchServerData(search);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, open, fetchServerData]);

  // Get unique vendor categories
  const vendorCategories = useMemo(() => {
    const categories = new Set<string>();
    vendors.forEach((v) => {
      if (v.category) categories.add(v.category);
    });
    return Array.from(categories).sort();
  }, [vendors]);

  // Filter available items (exclude already added)
  const filteredMembers = useMemo(() => {
    if (typeFilter !== "all" && typeFilter !== "members") return [];
    const available = teamMembers.filter((m) => !excludedMemberIds.includes(m.id));
    if (!search) return available;
    const searchLower = search.toLowerCase();
    return available.filter(
      (m) =>
        m.name?.toLowerCase().includes(searchLower) ||
        m.email?.toLowerCase().includes(searchLower)
    );
  }, [teamMembers, excludedMemberIds, search, typeFilter]);

  const filteredVendors = useMemo(() => {
    if (typeFilter !== "all" && typeFilter !== "vendors") return [];
    return vendors.filter((v) => !excludedVendorIds.includes(v.id));
  }, [vendors, excludedVendorIds, typeFilter]);

  const filteredContacts = useMemo(() => {
    if (typeFilter !== "all" && typeFilter !== "contacts") return [];
    return contacts.filter((c) => !excludedContactIds.includes(c.id));
  }, [contacts, excludedContactIds, typeFilter]);

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
            <SelectTrigger className="h-7 text-xs w-auto min-w-25">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="members">Miembros</SelectItem>
              <SelectItem value="vendors">Proveedores</SelectItem>
              <SelectItem value="contacts">Contactos</SelectItem>
            </SelectContent>
          </Select>
          {searching && (
            <RiLoader4Line className="h-4 w-4 animate-spin text-muted-foreground self-center" />
          )}
        </div>

        {/* Results - scrollable container */}
        <div 
          className="h-62.5 overflow-y-auto"
          onWheel={(e) => e.stopPropagation()}
        >
          {totalAvailable === 0 && !searching ? (
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
