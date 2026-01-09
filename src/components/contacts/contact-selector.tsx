"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  RiUserLine,
  RiBuilding2Line,
  RiAddLine,
  RiCloseLine,
} from "@remixicon/react";

interface Contact {
  id: number;
  type: "person" | "company";
  name: string;
  email: string | null;
  avatar: string | null;
}

interface ContactSelectorProps {
  selectedContacts?: Contact[];
  onSelect: (contact: Contact) => void;
  onRemove?: (contactId: number) => void;
  placeholder?: string;
  multiple?: boolean;
  className?: string;
}

export function ContactSelector({
  selectedContacts = [],
  onSelect,
  onRemove,
  placeholder = "Buscar contacto...",
  multiple = false,
  className,
}: ContactSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchContacts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search) params.set("search", search);
        params.set("limit", "20");

        const res = await fetch(`/api/contacts?${params.toString()}`);
        const data = await res.json();

        if (data.success) {
          setContacts(data.data || []);
        }
      } catch (error) {
        console.error("Failed to fetch contacts:", error);
      } finally {
        setLoading(false);
      }
    };

    const debounce = setTimeout(fetchContacts, 300);
    return () => clearTimeout(debounce);
  }, [search]);

  const handleSelect = (contact: Contact) => {
    onSelect(contact);
    if (!multiple) {
      setOpen(false);
    }
    setSearch("");
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const isSelected = (contactId: number) => {
    return selectedContacts.some((c) => c.id === contactId);
  };

  return (
    <div className={className}>
      {/* Selected contacts */}
      {selectedContacts.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedContacts.map((contact) => (
            <Badge
              key={contact.id}
              variant="secondary"
              className="gap-1 pr-1"
            >
              {contact.type === "company" ? (
                <RiBuilding2Line className="h-3 w-3" />
              ) : (
                <RiUserLine className="h-3 w-3" />
              )}
              {contact.name}
              {onRemove && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-4 w-4 ml-1 hover:bg-destructive/20"
                  onClick={() => onRemove(contact.id)}
                >
                  <RiCloseLine className="h-3 w-3" />
                </Button>
              )}
            </Badge>
          ))}
        </div>
      )}

      {/* Selector */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-start gap-2"
          >
            <RiAddLine className="h-4 w-4" />
            {placeholder}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80 p-0" align="start">
          <Command shouldFilter={false}>
            <CommandInput
              placeholder="Buscar por nombre o email..."
              value={search}
              onValueChange={setSearch}
            />
            <CommandList>
              {loading ? (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  Buscando...
                </div>
              ) : contacts.length === 0 ? (
                <CommandEmpty>No se encontraron contactos</CommandEmpty>
              ) : (
                <CommandGroup>
                  {contacts.map((contact) => (
                    <CommandItem
                      key={contact.id}
                      value={contact.id.toString()}
                      onSelect={() => handleSelect(contact)}
                      disabled={isSelected(contact.id)}
                      className="flex items-center gap-3 cursor-pointer"
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
                      <Badge variant="outline" className="text-xs">
                        {contact.type === "company" ? "Empresa" : "Persona"}
                      </Badge>
                    </CommandItem>
                  ))}
                </CommandGroup>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
