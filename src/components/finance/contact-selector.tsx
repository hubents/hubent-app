"use client";

import { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
import { hgIcon } from "@/components/ui/hg-icon";
import {
  UserCircleIcon,
  Store01Icon,
  ArrowDown01Icon,
  Cancel01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

const IcoUser = hgIcon(UserCircleIcon);
const IcoStore = hgIcon(Store01Icon);
const IcoChevDown = hgIcon(ArrowDown01Icon);
const IcoX = hgIcon(Cancel01Icon);

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
  stripMode?: boolean;
}

type FilterTab = "all" | "clients" | "vendors" | "contacts";

export function ContactSelector({
  value,
  onChange,
  placeholder = "Seleccionar contacto...",
  disabled = false,
  contacts: externalContacts,
  vendors: externalVendors,
  stripMode = false,
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
          (data.data?.data || []).map((c: any) => ({
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

  // Resolve display info for the trigger.
  // 1. Prefer the matching option from the loaded list (full record).
  // 2. Fall back to the inline `value.name` when the consumer injected the
  //    selection programmatically before this component fetched its catalog
  //    (e.g. the payment drawer pre-fills a contact from a reconciled invoice).
  const selectedOption = useMemo(() => {
    if (!value) return null;
    const fromList = allOptions.find((o) => o.type === value.type && o.id === value.id);
    if (fromList) return fromList;
    if (value.name) {
      return {
        id: value.id,
        type: value.type,
        name: value.name,
        email: value.email ?? null,
        phone: value.phone ?? null,
        address: value.address ?? null,
        taxId: value.taxId ?? null,
      } satisfies ContactOption;
    }
    return null;
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
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className="w-full inline-flex items-center justify-between gap-2 text-[13px] font-normal text-[var(--ink-1)] cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={stripMode
            ? { background: "transparent", border: "none", padding: "4px 0", height: "auto" }
            : { background: "#FFFFFF", border: "1px solid var(--line-strong)", height: 36, borderRadius: "var(--r-sm)", padding: "0 12px" }
          }
        >
          {selectedOption ? (
            <div className="flex items-center gap-2 truncate flex-1 min-w-0">
              {selectedOption.type === "vendor" ? (
                <IcoStore className="h-3.5 w-3.5 text-[var(--ink-3)] flex-shrink-0" />
              ) : (
                <IcoUser className="h-3.5 w-3.5 text-[var(--ink-3)] flex-shrink-0" />
              )}
              <span className="truncate">{selectedOption.name}</span>
              <span
                className="inline-flex items-center rounded-[999px] text-[10px] px-1.5 py-0.5 flex-shrink-0"
                style={{
                  background: "transparent",
                  color: "var(--ink-3)",
                  border: "1px solid var(--line-1)",
                }}
              >
                {selectedOption.type === "vendor" ? "Proveedor" : "Cliente"}
              </span>
            </div>
          ) : (
            <span className="text-[var(--ink-3)]">{placeholder}</span>
          )}
          <div className="flex items-center gap-1 flex-shrink-0">
            {value && (
              <span
                role="button"
                className="rounded p-0.5 cursor-pointer transition-colors hover:bg-[var(--bg-subtle)]"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null);
                }}
              >
                <IcoX className="h-3.5 w-3.5 text-[var(--ink-3)]" />
              </span>
            )}
            <IcoChevDown className="h-3.5 w-3.5 text-[var(--ink-3)]" />
          </div>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="Buscar por nombre o email..."
            value={search}
            onValueChange={setSearch}
          />
          {/* Tabs */}
          <div
            className="flex gap-1 px-1.5 py-1.5"
            style={{ borderBottom: "1px solid var(--line-1)" }}
          >
            {tabs.map((tab) => {
              const active = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={cn(
                    "px-2.5 py-1 text-[11.5px] rounded-[6px] transition-colors cursor-pointer border-none"
                  )}
                  style={{
                    background: active ? "var(--ink-1)" : "transparent",
                    color: active ? "#FFFFFF" : "var(--ink-3)",
                    fontWeight: active ? 600 : 500,
                  }}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
          <CommandList className="max-h-[300px] overflow-y-auto">
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
                      <IcoStore className="h-4 w-4 text-[var(--ink-3)] flex-shrink-0" />
                    ) : (
                      <IcoUser className="h-4 w-4 text-[var(--ink-3)] flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="truncate font-medium text-[13px] text-[var(--ink-1)]">{option.name}</span>
                        <span
                          className="inline-flex items-center rounded-[999px] text-[10px] px-1.5 py-0.5 flex-shrink-0"
                          style={{
                            background: "transparent",
                            color: "var(--ink-3)",
                            border: "1px solid var(--line-1)",
                          }}
                        >
                          {option.type === "vendor" ? "Proveedor" : option.contactType === "company" ? "Empresa" : "Persona"}
                        </span>
                      </div>
                      {option.email && (
                        <p className="text-[11px] text-[var(--ink-3)] truncate">{option.email}</p>
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
