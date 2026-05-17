"use client";

import { useState, useEffect } from "react";
import { Av } from "@/components/ui/ds";
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
import { hgIcon } from "@/components/ui/hg-icon";
import {
  PlusSignIcon,
  Cancel01Icon,
  Building01Icon,
} from "@hugeicons/core-free-icons";

const IcoPlus = hgIcon(PlusSignIcon);
const IcoX = hgIcon(Cancel01Icon);
const IcoBuilding = hgIcon(Building01Icon);

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
        if (data.success) setContacts(data.data?.data || []);
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
    if (!multiple) setOpen(false);
    setSearch("");
  };

  const isSelected = (contactId: number) => selectedContacts.some((c) => c.id === contactId);

  return (
    <div className={className}>
      {/* Selected contacts */}
      {selectedContacts.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-2">
          {selectedContacts.map((contact) => (
            <div
              key={contact.id}
              className="inline-flex items-center gap-1.5 rounded-[999px] text-[12px] font-medium pl-1 pr-1.5"
              style={{ background: "var(--bg-subtle)", color: "var(--ink-1)", padding: "2px 4px 2px 2px" }}
            >
              <Av src={contact.avatar} name={contact.name} size={20} />
              <span>{contact.name}</span>
              {onRemove && (
                <button
                  onClick={() => onRemove(contact.id)}
                  className="h-4 w-4 rounded-full inline-flex items-center justify-center cursor-pointer border-none bg-transparent transition-colors hover:bg-[var(--line-1)]"
                  aria-label="Quitar"
                >
                  <IcoX className="h-2.5 w-2.5 text-[var(--ink-3)]" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Selector */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-haspopup="listbox"
            aria-expanded={open}
            className="w-full inline-flex items-center justify-start gap-2 rounded-[8px] px-3 py-2 text-[13px] font-medium text-[var(--ink-1)] cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
            style={{ background: "#FFFFFF", border: "1px solid var(--line-strong)" }}
          >
            <IcoPlus className="h-3.5 w-3.5 text-[var(--ink-3)]" />
            {placeholder}
          </button>
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
                <div className="py-6 text-center text-[12.5px] text-[var(--ink-3)]">
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
                      className="flex items-center gap-2.5 cursor-pointer"
                    >
                      <Av src={contact.avatar} name={contact.name} size={28} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12.5px] font-medium text-[var(--ink-1)] truncate">{contact.name}</p>
                        {contact.email && (
                          <p className="text-[11px] text-[var(--ink-3)] truncate">{contact.email}</p>
                        )}
                      </div>
                      <span
                        className="inline-flex items-center rounded-[999px] text-[10.5px] px-1.5 py-0.5 flex-shrink-0"
                        style={{
                          background: "transparent",
                          color: "var(--ink-3)",
                          border: "1px solid var(--line-1)",
                        }}
                      >
                        {contact.type === "company" ? "Empresa" : "Persona"}
                      </span>
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
