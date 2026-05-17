"use client";

import { useState, useEffect } from "react";
import { hgIcon } from "@/components/ui/hg-icon";
import {
  PlusSignIcon,
  UserCircleIcon,
  Building01Icon,
  Delete01Icon,
  Search01Icon,
  Link01Icon,
} from "@hugeicons/core-free-icons";
import { Av } from "@/components/ui/ds";
import { appConfirm } from "@/lib/confirm";

const IcoPlus = hgIcon(PlusSignIcon);
const IcoUser = hgIcon(UserCircleIcon);
const IcoBuilding = hgIcon(Building01Icon);
const IcoTrash = hgIcon(Delete01Icon);
const IcoSearch = hgIcon(Search01Icon);
const IcoLink = hgIcon(Link01Icon);

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

  const searchType = contactType === "person" ? "company" : "person";
  const sectionTitle = contactType === "person" ? "Empresas relacionadas" : "Personas de contacto";
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
        if (search) params.set("search", search);
        const res = await fetch(`/api/contacts?${params}`);
        const data = await res.json();
        if (data.success) {
          const relatedIds = relationships.map((r) => r.relatedContactId);
          const filtered = (data.data?.data || []).filter(
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
    if (!await appConfirm({ title: "Eliminar relación", variant: "destructive", confirmLabel: "Eliminar" })) return;
    setRemoving(relationshipId);
    try {
      await onRemoveRelationship(relationshipId);
    } finally {
      setRemoving(null);
    }
  };

  return (
    <div className="pt-5 border-t" style={{ borderColor: "var(--line-1)" }}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <IcoLink className="h-4 w-4 text-[var(--ink-3)]" />
          <h3 className="text-[13px] font-semibold text-[var(--ink-1)]">{sectionTitle}</h3>
        </div>
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="inline-flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[12.5px] font-medium text-[var(--ink-1)] cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
            style={{ background: "#FFFFFF", border: "1px solid var(--line-strong)" }}
          >
            <IcoPlus className="h-3 w-3" />
            {addButtonText}
          </button>

          {isOpen && (
            <div
              className="absolute right-0 top-[calc(100%+4px)] w-80 rounded-[12px] z-50 overflow-hidden"
              style={{
                background: "#FFFFFF",
                border: "1px solid var(--line-1)",
                boxShadow: "0 8px 28px rgba(0,0,0,.12), 0 2px 6px rgba(0,0,0,.05)",
              }}
            >
              <div className="p-3 flex flex-col gap-2" style={{ borderBottom: "1px solid var(--line-1)" }}>
                <div
                  className="flex items-center gap-2 rounded-[8px]"
                  style={{
                    background: "#FFFFFF",
                    border: "1px solid var(--line-strong)",
                    padding: "7px 11px",
                  }}
                >
                  <IcoSearch className="h-3 w-3 text-[var(--ink-3)]" />
                  <input
                    placeholder={`Buscar ${searchType === "person" ? "persona" : "empresa"}...`}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="flex-1 bg-transparent outline-none text-[13px] text-[var(--ink-1)] placeholder:text-[var(--ink-3)]"
                  />
                </div>
                <input
                  placeholder="Cargo / Rol (opcional)"
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="text-[13px] outline-none"
                  style={{
                    padding: "8px 11px",
                    border: "1px solid var(--line-strong)",
                    borderRadius: 8,
                    background: "#FFFFFF",
                  }}
                />
              </div>

              <div className="max-h-64 overflow-y-auto">
                {loading ? (
                  <div className="p-4 text-center text-[12.5px] text-[var(--ink-3)]">
                    Buscando...
                  </div>
                ) : contacts.length === 0 ? (
                  <div className="p-4 text-center text-[12.5px] text-[var(--ink-3)]">
                    No se encontraron {searchType === "person" ? "personas" : "empresas"}
                  </div>
                ) : (
                  contacts.map((contact) => (
                    <button
                      key={contact.id}
                      onClick={() => handleAdd(contact)}
                      disabled={adding}
                      className="w-full flex items-center gap-2.5 p-2.5 cursor-pointer text-left bg-transparent border-none transition-colors hover:bg-[var(--bg-subtle)]"
                    >
                      <Av src={contact.avatar} name={contact.name} size={28} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[12.5px] font-medium text-[var(--ink-1)] truncate">{contact.name}</p>
                        {contact.email && (
                          <p className="text-[11px] text-[var(--ink-3)] truncate">{contact.email}</p>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {relationships.length === 0 ? (
        <p className="text-[12.5px] text-[var(--ink-3)]">
          Sin {contactType === "person" ? "empresas" : "personas"} relacionadas
        </p>
      ) : (
        <div className="flex flex-col gap-1.5">
          {relationships.map((rel) => (
            <div
              key={rel.id}
              className="flex items-center gap-2.5 rounded-[8px] p-2 group transition-colors hover:bg-[var(--bg-subtle)]"
            >
              <button
                onClick={() => onOpenRelatedContact?.(rel.relatedContactId)}
                disabled={!onOpenRelatedContact}
                className="flex items-center gap-2.5 flex-1 min-w-0 text-left bg-transparent border-none cursor-pointer p-0"
              >
                <Av src={rel.relatedContactAvatar} name={rel.relatedContactName} size={28} />
                <div className="flex-1 min-w-0">
                  <p className="text-[12.5px] font-medium text-[var(--ink-1)] truncate hover:underline">
                    {rel.relatedContactName}
                  </p>
                  {rel.role && (
                    <p className="text-[11px] text-[var(--ink-3)]">{rel.role}</p>
                  )}
                </div>
              </button>
              <button
                onClick={() => handleRemove(rel.id)}
                disabled={removing === rel.id}
                className="h-7 w-7 rounded-[8px] inline-flex items-center justify-center cursor-pointer border-none bg-transparent transition-opacity opacity-0 group-hover:opacity-100"
                title="Eliminar"
              >
                <IcoTrash className="h-3.5 w-3.5 text-[var(--color-danger)]" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
