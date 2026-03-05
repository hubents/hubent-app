"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { RiUserLine, RiStore2Line, RiContactsLine, RiArrowDownSLine, RiCloseLine } from "@remixicon/react";
import { cn } from "@/lib/utils";

type EntityType = "contact" | "vendor";

interface ContactOption {
  id: number;
  type: EntityType;
  name: string;
  email: string | null;
  phone?: string | null;
  address?: string | null;
  taxId?: string | null;
  category?: string | null;
  contactType?: string;
}

export interface ContactSelectorValue {
  type: EntityType;
  id: number;
  name?: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  taxId?: string | null;
}

interface ContactSelectorProps {
  value: ContactSelectorValue | null;
  onChange: (value: ContactSelectorValue | null) => void;
  placeholder?: string;
  disabled?: boolean;
  contacts?: ContactOption[];
  vendors?: ContactOption[];
}

type FilterTab = "all" | "clients" | "vendors" | "contacts";

export function ContactSelector({
  value,
  onChange,
  placeholder = "Seleccionar contacto...",
  disabled = false,
  contacts: externalContacts,
  vendors: externalVendors,
}: ContactSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<FilterTab>("all");
  const [contacts, setContacts] = useState<ContactOption[]>(externalContacts || []);
  const [vendorsList, setVendorsList] = useState<ContactOption[]>(externalVendors || []);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (externalContacts) setContacts(externalContacts);
    if (externalVendors) setVendorsList(externalVendors);
  }, [externalContacts, externalVendors]);

  const fetchData = useCallback(async (searchTerm: string) => {
    if (externalContacts && externalVendors) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: "20" });
      if (searchTerm) params.set("search", searchTerm);

      const [contactsRes, vendorsRes] = await Promise.all([
        fetch(`/api/contacts?${params}`),
        fetch(`/api/vendors?${params}`),
      ]);

      if (contactsRes.ok) {
        const data = await contactsRes.json();
        setContacts(
          (data.data || []).map((c: any) => ({
            id: c.id,
            type: "contact" as EntityType,
            name: c.name || `${c.firstName || ""} ${c.lastName || ""}`.trim(),
            email: c.email,
            phone: c.phone || null,
            address: [c.address, c.postalCode, c.city, c.country].filter(Boolean).join(", ") || null,
            taxId: c.taxId || c.nieOrCif || null,
            contactType: c.type,
          }))
        );
      }

      if (vendorsRes.ok) {
        const data = await vendorsRes.json();
        setVendorsList(
          (data.data || []).map((v: any) => ({
            id: v.id,
            type: "vendor" as EntityType,
            name: v.name,
            email: v.email,
            phone: v.phone || null,
            address: v.address || null,
            category: v.category,
          }))
        );
      }
    } catch (error) {
      console.error("Failed to fetch contacts/vendors:", error);
    } finally {
      setLoading(false);
    }
  }, [externalContacts, externalVendors]);

  // Load initial data when popover opens
  useEffect(() => {
    if (open && !externalContacts && !externalVendors) {
      fetchData("");
    }
  }, [open, fetchData, externalContacts, externalVendors]);

  // Debounced server-side search (only on search text changes)
  const prevSearchRef = useRef("");
  useEffect(() => {
    if (!open || externalContacts || externalVendors) return;
    if (search === prevSearchRef.current) return;
    prevSearchRef.current = search;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchData(search);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search, open, fetchData, externalContacts, externalVendors]);

  const allOptions = useMemo(() => {
    const contactOptions = contacts.map((c) => ({ ...c, type: "contact" as EntityType }));
    const vendorOptions = vendorsList.map((v) => ({ ...v, type: "vendor" as EntityType }));
    return [...contactOptions, ...vendorOptions];
  }, [contacts, vendorsList]);

  const filteredOptions = useMemo(() => {
    let options = allOptions;

    if (activeTab === "clients") {
      options = options.filter((o) => o.type === "contact" && o.contactType === "company");
    } else if (activeTab === "vendors") {
      options = options.filter((o) => o.type === "vendor");
    } else if (activeTab === "contacts") {
      options = options.filter((o) => o.type === "contact" && o.contactType !== "company");
    }

    if (search) {
      const s = search.toLowerCase();
      options = options.filter(
        (o) =>
          o.name.toLowerCase().includes(s) ||
          (o.email && o.email.toLowerCase().includes(s))
      );
    }

    return options;
  }, [allOptions, activeTab, search]);

  const selectedOption = useMemo(() => {
    if (!value) return null;
    return allOptions.find((o) => o.type === value.type && o.id === value.id) || null;
  }, [value, allOptions]);

  const tabs: { key: FilterTab; label: string }[] = [
    { key: "all", label: "Todos" },
    { key: "clients", label: "Clientes" },
    { key: "vendors", label: "Proveedores" },
    { key: "contacts", label: "Contactos" },
  ];

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full justify-between font-normal h-9"
        >
          {selectedOption ? (
            <div className="flex items-center gap-2 truncate">
              {selectedOption.type === "vendor" ? (
                <RiStore2Line className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              ) : (
                <RiUserLine className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
              )}
              <span className="truncate">{selectedOption.name}</span>
              <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
                {selectedOption.type === "vendor" ? "Proveedor" : "Cliente"}
              </Badge>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <div className="flex items-center gap-1 flex-shrink-0">
            {value && (
              <span
                role="button"
                className="hover:bg-muted rounded p-0.5"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null);
                }}
              >
                <RiCloseLine className="h-3.5 w-3.5 text-muted-foreground" />
              </span>
            )}
            <RiArrowDownSLine className="h-4 w-4 text-muted-foreground" />
          </div>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar por nombre o email..."
            value={search}
            onValueChange={setSearch}
          />
          {/* Tabs */}
          <div className="flex border-b px-1 py-1 gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  "px-2 py-1 text-xs rounded-md transition-colors",
                  activeTab === tab.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-muted"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
          <CommandList>
            <CommandEmpty>
              {loading ? "Cargando..." : "No se encontraron resultados"}
            </CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={`${option.type}-${option.id}`}
                  value={`${option.type}-${option.id}`}
                  onSelect={() => {
                    onChange({ type: option.type, id: option.id, name: option.name, email: option.email, phone: option.phone, address: option.address, taxId: option.taxId });
                    setOpen(false);
                    setSearch("");
                  }}
                >
                  <div className="flex items-center gap-2 w-full">
                    {option.type === "vendor" ? (
                      <RiStore2Line className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <RiUserLine className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium text-sm">{option.name}</span>
                        <Badge variant="outline" className="text-[10px] px-1 py-0 h-4 flex-shrink-0">
                          {option.type === "vendor" ? "Proveedor" : option.contactType === "company" ? "Empresa" : "Persona"}
                        </Badge>
                      </div>
                      {option.email && (
                        <p className="text-xs text-muted-foreground truncate">{option.email}</p>
                      )}
                    </div>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
