"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  RiAddLine,
  RiUserLine,
  RiBuilding2Line,
  RiDeleteBinLine,
  RiSearchLine,
  RiLinksLine,
} from "@remixicon/react";

interface Relationship {
  id: number;
  role: string | null;
  isPrimary: boolean | null;
  relatedContactId: number;
  relatedContactName: string;
  relatedContactEmail: string | null;
  relatedContactAvatar: string | null;
  relatedContactType: "person" | "company";
}

interface ContactOption {
  id: number;
  name: string;
  email: string | null;
  type: "person" | "company";
  avatar: string | null;
}

interface ContactRelationshipsSectionProps {
  contactId: number;
  contactType: "person" | "company";
  relationships: Relationship[];
  onAddRelationship: (relatedContactId: number, role?: string) => Promise<void>;
  onRemoveRelationship: (relationshipId: number) => Promise<void>;
  onOpenRelatedContact?: (contactId: number) => void;
}

export function ContactRelationshipsSection({
  contactId,
  contactType,
  relationships,
  onAddRelationship,
  onRemoveRelationship,
  onOpenRelatedContact,
}: ContactRelationshipsSectionProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("");
  const [contacts, setContacts] = useState<ContactOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<number | null>(null);

  // Search for contacts of the opposite type
  const searchType = contactType === "person" ? "company" : "person";
  const sectionTitle = contactType === "person" ? "Empresas" : "Personas de contacto";
  const addButtonText = contactType === "person" ? "Relacionar empresa" : "Relacionar persona";

  useEffect(() => {
    if (!isOpen) return;

    const fetchContacts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          type: searchType,
          limit: "20",
        });
        if (search) {
          params.set("search", search);
        }
        const res = await fetch(`/api/contacts?${params}`);
        const data = await res.json();
        if (data.success) {
          // Filter out already related contacts
          const relatedIds = relationships.map((r) => r.relatedContactId);
          const filtered = data.data.filter(
            (c: ContactOption) => c.id !== contactId && !relatedIds.includes(c.id)
          );
          setContacts(filtered);
        }
      } catch (error) {
        console.error("Error fetching contacts:", error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchContacts, 300);
    return () => clearTimeout(debounce);
  }, [isOpen, search, searchType, contactId, relationships]);

  const handleAdd = async (selectedContact: ContactOption) => {
    setAdding(true);
    try {
      await onAddRelationship(selectedContact.id, role || undefined);
      setIsOpen(false);
      setSearch("");
      setRole("");
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (relationshipId: number) => {
    if (!confirm("¿Eliminar esta relación?")) return;
    setRemoving(relationshipId);
    try {
      await onRemoveRelationship(relationshipId);
    } finally {
      setRemoving(null);
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

  return (
    <div className="space-y-4 border-t pt-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
          <RiLinksLine className="h-4 w-4" />
          {sectionTitle}
        </h3>
        <Popover open={isOpen} onOpenChange={setIsOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <RiAddLine className="h-4 w-4" />
              {addButtonText}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="p-3 border-b">
              <div className="relative">
                <RiSearchLine className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={`Buscar ${searchType === "person" ? "persona" : "empresa"}...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Input
                placeholder="Cargo / Rol (opcional)"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="mt-2"
              />
            </div>
            <div className="max-h-64 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  Buscando...
                </div>
              ) : contacts.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No se encontraron {searchType === "person" ? "personas" : "empresas"}
                </div>
              ) : (
                contacts.map((contact) => (
                  <button
                    key={contact.id}
                    onClick={() => handleAdd(contact)}
                    disabled={adding}
                    className="w-full flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors text-left"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={contact.avatar || undefined} />
                      <AvatarFallback className={contact.type === "company" ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"}>
                        {contact.type === "company" ? (
                          <RiBuilding2Line className="h-4 w-4" />
                        ) : (
                          getInitials(contact.name)
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{contact.name}</p>
                      {contact.email && (
                        <p className="text-xs text-muted-foreground truncate">
                          {contact.email}
                        </p>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {relationships.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Sin {contactType === "person" ? "empresas" : "personas"} relacionadas
        </p>
      ) : (
        <div className="space-y-2">
          {relationships.map((rel) => (
            <div
              key={rel.id}
              className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 group"
            >
              <button
                onClick={() => onOpenRelatedContact?.(rel.relatedContactId)}
                className="flex items-center gap-3 flex-1 min-w-0 text-left"
                disabled={!onOpenRelatedContact}
              >
                <Avatar className="h-8 w-8">
                  <AvatarImage src={rel.relatedContactAvatar || undefined} />
                  <AvatarFallback className={rel.relatedContactType === "company" ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"}>
                    {rel.relatedContactType === "company" ? (
                      <RiBuilding2Line className="h-4 w-4" />
                    ) : (
                      <RiUserLine className="h-4 w-4" />
                    )}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate hover:underline">{rel.relatedContactName}</p>
                  {rel.role && (
                    <p className="text-xs text-muted-foreground">{rel.role}</p>
                  )}
                </div>
              </button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity text-destructive hover:text-destructive"
                onClick={() => handleRemove(rel.id)}
                disabled={removing === rel.id}
              >
                <RiDeleteBinLine className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
