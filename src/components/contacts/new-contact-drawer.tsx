"use client";

import { useEffect, useState, useMemo } from "react";
import { useOrgLocale } from "@/hooks/use-org-locale";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { hgIcon } from "@/components/ui/hg-icon";
import {
  Cancel01Icon,
  Location01Icon,
  Clock01Icon,
  Folder01Icon,
  BankIcon,
  CreditCardIcon,
  Coins01Icon,
  PaypalIcon,
  ExchangeDollarIcon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";
import { toast } from "sonner";
import { AddressAutocomplete } from "@/components/ui/address-autocomplete";

const IcoX = hgIcon(Cancel01Icon);
const IcoMap = hgIcon(Location01Icon);
const IcoClock = hgIcon(Clock01Icon);
const IcoFolder = hgIcon(Folder01Icon);
const IcoBank = hgIcon(BankIcon);
const IcoCard = hgIcon(CreditCardIcon);
const IcoCoins = hgIcon(Coins01Icon);
const IcoPaypal = hgIcon(PaypalIcon);
const IcoExchange = hgIcon(ExchangeDollarIcon);
const IcoCheck = hgIcon(Tick01Icon);

type TabKey = "detalles" | "archivos" | "pago" | "actividad";
type ContactKind = "person" | "company";
type DealType = "Cliente" | "Lead";

interface FormState {
  contactKind: ContactKind;
  dealType: DealType;
  // Person
  firstName: string;
  lastName: string;
  // Common
  email: string;
  phone: string;
  phoneCountryCode: string;
  address: string;
  nieOrCif: string;
  tradeName: string;
  notes: string;
  // Company
  contactPersonName: string;
  contactPersonEmail: string;
  taxId: string;
  website: string;
  category: string;
  // Bank
  bankName: string;
  bankIban: string;
  bankSwift: string;
  paymentMethods: string[];
}

interface NewContactDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presetSegment?: "all" | "persons" | "companies" | "vendors";
  onContactCreated?: (contactId: number) => void;
}

const COMPANY_CATEGORIES = [
  "Catering",
  "Flores y decoración",
  "Fotografía",
  "Venues",
  "Música",
  "Audio e iluminación",
];

const PAYMENT_METHODS: { id: string; label: string; icon: React.ReactNode }[] = [
  { id: "transfer", label: "Transferencia", icon: <IcoExchange className="h-3.5 w-3.5" /> },
  { id: "cash", label: "Efectivo", icon: <IcoCoins className="h-3.5 w-3.5" /> },
  { id: "paypal", label: "Paypal", icon: <IcoPaypal className="h-3.5 w-3.5" /> },
  { id: "card", label: "Tarjeta de crédito", icon: <IcoCard className="h-3.5 w-3.5" /> },
];

function getInitialForm(presetSegment?: NewContactDrawerProps["presetSegment"], phonePrefix = "+34"): FormState {
  return {
    contactKind: presetSegment === "companies" ? "company" : "person",
    dealType: "Cliente",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    phoneCountryCode: phonePrefix,
    address: "",
    nieOrCif: "",
    tradeName: "",
    notes: "",
    contactPersonName: "",
    contactPersonEmail: "",
    taxId: "",
    website: "",
    category: "",
    bankName: "",
    bankIban: "",
    bankSwift: "",
    paymentMethods: [],
  };
}

function Field({
  label,
  icon,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 drawer-form-field">
      <label className="text-[12px] font-medium text-[var(--ink-2)] inline-flex items-center gap-1.5">
        {icon}
        {label}
      </label>
      {children}
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="text-[10.5px] font-semibold uppercase text-[var(--ink-3)] mt-1"
      style={{ letterSpacing: "0.08em" }}
    >
      {children}
    </div>
  );
}

export function NewContactDrawer({
  open,
  onOpenChange,
  presetSegment,
  onContactCreated,
}: NewContactDrawerProps) {
  const orgLocale = useOrgLocale();
  const [tab, setTab] = useState<TabKey>("detalles");
  const initialForm = useMemo(() => getInitialForm(presetSegment, orgLocale.phonePrefix), [presetSegment, orgLocale.phonePrefix]);
  const [form, setForm] = useState<FormState>(() => getInitialForm(presetSegment));
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (open) {
      setTab("detalles");
      setForm(initialForm);
    }
  }, [open, initialForm]);

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const togglePaymentMethod = (id: string) =>
    setForm((f) => ({
      ...f,
      paymentMethods: f.paymentMethods.includes(id)
        ? f.paymentMethods.filter((m) => m !== id)
        : [...f.paymentMethods, id],
    }));

  const isValid = form.contactKind === "company"
    ? form.tradeName.trim().length > 0 || form.contactPersonName.trim().length > 0
    : form.firstName.trim().length > 0;

  const buildPayload = () => {
    const isCompany = form.contactKind === "company";
    const name = isCompany
      ? (form.tradeName || form.contactPersonName).trim()
      : `${form.firstName} ${form.lastName}`.trim();

    const payload: Record<string, unknown> = {
      type: form.contactKind,
      name,
      email: form.email || undefined,
      phone: form.phone || undefined,
      phoneCountryCode: form.phoneCountryCode || undefined,
      address: form.address || undefined,
      tradeName: form.tradeName || undefined,
      notes: form.notes || undefined,
      isLead: form.dealType === "Lead",
      bankName: form.bankName || undefined,
      bankIban: form.bankIban || undefined,
      bankSwift: form.bankSwift || undefined,
      paymentMethods: form.paymentMethods.length > 0 ? form.paymentMethods : undefined,
    };

    if (isCompany) {
      payload.taxId = form.taxId || undefined;
      payload.contactPersonName = form.contactPersonName || undefined;
      payload.contactPersonEmail = form.contactPersonEmail || undefined;
      payload.website = form.website ? `https://${form.website.replace(/^https?:\/\//, "")}` : undefined;
      payload.category = form.category || undefined;
    } else {
      payload.firstName = form.firstName || undefined;
      payload.lastName = form.lastName || undefined;
      payload.nieOrCif = form.nieOrCif || undefined;
    }

    return payload;
  };

  const submit = async () => {
    if (!isValid || submitting) return;
    setSubmitting(true);
    try {
      const payload = buildPayload();
      const res = await fetch("/api/contacts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const result = await res.json();

      if (result.success && result.data) {
        toast.success(`Contacto «${result.data.name}» creado`);
        onContactCreated?.(result.data.id);
        onOpenChange(false);
      } else if (result.error?.code === "DUPLICATE_WARNING") {
        const proceed = confirm(
          `Se encontraron posibles duplicados:\n${result.error.duplicates.map((d: { name: string }) => d.name).join(", ")}\n\n¿Crear el contacto de todas formas?`,
        );
        if (proceed) {
          const forceRes = await fetch("/api/contacts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...payload, forceDuplicate: true }),
          });
          const forceResult = await forceRes.json();
          if (forceResult.success && forceResult.data) {
            toast.success(`Contacto «${forceResult.data.name}» creado`);
            onContactCreated?.(forceResult.data.id);
            onOpenChange(false);
          } else {
            toast.error(forceResult.error?.message || "Error al crear contacto");
          }
        }
      } else {
        toast.error(result.error?.message || "Error al crear contacto");
      }
    } catch (err) {
      toast.error((err as Error).message || "Error al crear contacto");
    } finally {
      setSubmitting(false);
    }
  };

  const tabs: { id: TabKey; label: string }[] = [
    { id: "detalles", label: "Detalles" },
    { id: "archivos", label: "Archivos" },
    { id: "pago", label: "Información de pago" },
    { id: "actividad", label: "Actividad" },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="overflow-hidden bg-white border-0 [&>button]:hidden flex flex-col"
        style={{ width: "min(500px, 100vw)", maxWidth: "100vw", padding: 0, gap: 0 }}
      >
        {/* Header */}
        <div className="flex items-start gap-3 px-6 pt-5 pb-3 flex-shrink-0">
          <div className="flex-1 min-w-0">
            <div
              className="text-[18px] font-semibold text-[var(--ink-1)]"
              style={{ letterSpacing: "-0.01em" }}
            >
              Nuevo contacto
            </div>
            <div className="text-[12.5px] text-[var(--ink-3)] mt-0.5">
              Ingresa los detalles del contacto
            </div>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="bg-transparent border-none cursor-pointer text-[var(--ink-3)] hover:text-[var(--ink-1)] transition-colors"
            aria-label="Cerrar"
          >
            <IcoX className="h-[18px] w-[18px]" />
          </button>
        </div>

        {/* Tabs */}
        <div
          className="flex gap-[22px] px-6 pt-2 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--line-1)" }}
        >
          {tabs.map((t) => {
            const active = tab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="bg-transparent border-none cursor-pointer transition-colors"
                style={{
                  padding: "8px 0",
                  fontSize: 13,
                  fontWeight: active ? 600 : 400,
                  color: active ? "var(--ink-1)" : "var(--ink-3)",
                  borderBottom: active ? "2px solid var(--ink-1)" : "2px solid transparent",
                  marginBottom: -1,
                }}
              >
                {t.label}
              </button>
            );
          })}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 pt-[18px] pb-6">
          {tab === "detalles" && (
            <div className="flex flex-col gap-3.5">
              {/* Top: kind + deal type */}
              <div className="grid grid-cols-2 gap-2.5">
                <Field label="Tipo de contacto *">
                  <select
                    value={form.contactKind}
                    onChange={(e) => update("contactKind", e.target.value as ContactKind)}
                  >
                    <option value="person">Persona</option>
                    <option value="company">Empresa</option>
                  </select>
                </Field>
                <Field label="Tipo *">
                  <select
                    value={form.dealType}
                    onChange={(e) => update("dealType", e.target.value as DealType)}
                  >
                    <option value="Cliente">Cliente</option>
                    <option value="Lead">Lead</option>
                  </select>
                </Field>
              </div>

              {form.contactKind === "person" ? (
                <>
                  <div className="grid grid-cols-2 gap-2.5">
                    <Field label="Nombre">
                      <input
                        placeholder="Nombre..."
                        value={form.firstName}
                        onChange={(e) => update("firstName", e.target.value)}
                      />
                    </Field>
                    <Field label="Apellido">
                      <input
                        placeholder="Apellido..."
                        value={form.lastName}
                        onChange={(e) => update("lastName", e.target.value)}
                      />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <Field label="Email">
                      <input
                        type="email"
                        placeholder="hello@hubents.com"
                        value={form.email}
                        onChange={(e) => update("email", e.target.value)}
                      />
                    </Field>
                    <Field label="Teléfono">
                      <div className="flex gap-1.5">
                        <select
                          value={form.phoneCountryCode}
                          onChange={(e) => update("phoneCountryCode", e.target.value)}
                          style={{ width: 84, flex: "0 0 84px" }}
                        >
                          <option value="+34">🇪🇸 +34</option>
                          <option value="+1">🇺🇸 +1</option>
                          <option value="+44">🇬🇧 +44</option>
                          <option value="+33">🇫🇷 +33</option>
                          <option value="+49">🇩🇪 +49</option>
                        </select>
                        <input
                          placeholder="(555) 000-0000"
                          value={form.phone}
                          onChange={(e) => update("phone", e.target.value)}
                          style={{ flex: 1 }}
                        />
                      </div>
                    </Field>
                  </div>
                  <Field label="Dirección" icon={<IcoMap className="h-3 w-3" />}>
                    <AddressAutocomplete
                      value={form.address}
                      onChange={(val) => update("address", val)}
                      onSelect={(s) => {
                        update("address", s.street || s.displayName.split(",")[0]);
                      }}
                      placeholder="Ingresa la dirección..."
                    />
                  </Field>

                  <Eyebrow>Detalles extra</Eyebrow>
                  <div className="grid grid-cols-2 gap-2.5">
                    <Field label="ID">
                      <input
                        placeholder="DNI, pasaporte u otro ID"
                        value={form.nieOrCif}
                        onChange={(e) => update("nieOrCif", e.target.value)}
                      />
                    </Field>
                    <Field label="Nombre comercial">
                      <input
                        placeholder="Nombre comercial..."
                        value={form.tradeName}
                        onChange={(e) => update("tradeName", e.target.value)}
                      />
                    </Field>
                  </div>

                  <Field label="Comentarios">
                    <textarea
                      rows={3}
                      maxLength={200}
                      placeholder="Detalles adicionales..."
                      value={form.notes}
                      onChange={(e) => update("notes", e.target.value)}
                      style={{ resize: "vertical" }}
                    />
                    <div className="text-[10.5px] text-[var(--ink-3)] text-right mt-0.5">
                      {form.notes.length}/200
                    </div>
                  </Field>
                </>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-2.5">
                    <Field label="Persona de contacto">
                      <input
                        placeholder="Nombre..."
                        value={form.contactPersonName}
                        onChange={(e) => update("contactPersonName", e.target.value)}
                      />
                    </Field>
                    <Field label="Email de contacto">
                      <input
                        type="email"
                        placeholder="contacto@empresa.com"
                        value={form.contactPersonEmail}
                        onChange={(e) => update("contactPersonEmail", e.target.value)}
                      />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    <Field label="Email">
                      <input
                        type="email"
                        placeholder="hello@hubents.com"
                        value={form.email}
                        onChange={(e) => update("email", e.target.value)}
                      />
                    </Field>
                    <Field label="Teléfono">
                      <div className="flex gap-1.5">
                        <select
                          value={form.phoneCountryCode}
                          onChange={(e) => update("phoneCountryCode", e.target.value)}
                          style={{ width: 84, flex: "0 0 84px" }}
                        >
                          <option value="+34">🇪🇸 +34</option>
                          <option value="+1">🇺🇸 +1</option>
                          <option value="+44">🇬🇧 +44</option>
                          <option value="+33">🇫🇷 +33</option>
                          <option value="+49">🇩🇪 +49</option>
                        </select>
                        <input
                          placeholder="(555) 000-0000"
                          value={form.phone}
                          onChange={(e) => update("phone", e.target.value)}
                          style={{ flex: 1 }}
                        />
                      </div>
                    </Field>
                  </div>
                  <Field label="Dirección" icon={<IcoMap className="h-3 w-3" />}>
                    <AddressAutocomplete
                      value={form.address}
                      onChange={(val) => update("address", val)}
                      onSelect={(s) => {
                        update("address", s.street || s.displayName.split(",")[0]);
                      }}
                      placeholder="Ingresa la dirección..."
                    />
                  </Field>

                  <Eyebrow>Detalles extra</Eyebrow>
                  <div className="grid grid-cols-2 gap-2.5">
                    <Field label="Identificación VAT">
                      <input
                        placeholder="VAT"
                        value={form.taxId}
                        onChange={(e) => update("taxId", e.target.value)}
                      />
                    </Field>
                    <Field label="Nombre comercial">
                      <input
                        placeholder="Nombre comercial..."
                        value={form.tradeName}
                        onChange={(e) => update("tradeName", e.target.value)}
                      />
                    </Field>
                  </div>

                  <Field label="Website">
                    <div
                      className="flex items-stretch overflow-hidden drawer-website-input"
                      style={{
                        border: "1px solid var(--line-strong)",
                        borderRadius: 8,
                        background: "#FFFFFF",
                      }}
                    >
                      <span
                        className="text-[12px] flex items-center"
                        style={{
                          background: "var(--bg-subtle)",
                          color: "var(--ink-3)",
                          padding: "9px 12px",
                          borderRight: "1px solid var(--line-1)",
                        }}
                      >
                        https://
                      </span>
                      <input
                        placeholder="www.example.com"
                        value={form.website}
                        onChange={(e) => update("website", e.target.value.replace(/^https?:\/\//, ""))}
                        style={{
                          border: "none",
                          flex: 1,
                          padding: "9px 12px",
                          outline: "none",
                          background: "transparent",
                          fontSize: 13,
                          color: "var(--ink-1)",
                        }}
                      />
                    </div>
                  </Field>

                  <Field label="Categoría">
                    <select
                      value={form.category}
                      onChange={(e) => update("category", e.target.value)}
                    >
                      <option value="">Elige una</option>
                      {COMPANY_CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Comentarios">
                    <textarea
                      rows={3}
                      maxLength={200}
                      placeholder="Detalles adicionales..."
                      value={form.notes}
                      onChange={(e) => update("notes", e.target.value)}
                      style={{ resize: "vertical" }}
                    />
                  </Field>
                </>
              )}
            </div>
          )}

          {tab === "archivos" && (
            <div
              className="text-center py-12 rounded-[8px]"
              style={{ border: "2px dashed var(--line-1)" }}
            >
              <IcoFolder className="h-10 w-10 mx-auto text-[var(--ink-4)] mb-3" />
              <h3 className="text-[14px] font-semibold text-[var(--ink-1)] mb-1">
                Disponible al crear el contacto
              </h3>
              <p className="text-[12.5px] text-[var(--ink-3)]">
                Podrás subir fotos y documentos una vez creado.
              </p>
            </div>
          )}

          {tab === "pago" && (
            <div className="flex flex-col gap-3.5">
              <div
                className="rounded-[8px] p-4 flex flex-col gap-3"
                style={{ background: "#FAFBFF", border: "1.5px solid #B5C9FF" }}
              >
                <Field label="Nombre del banco" icon={<IcoBank className="h-3 w-3" />}>
                  <input
                    placeholder="Nombre..."
                    value={form.bankName}
                    onChange={(e) => update("bankName", e.target.value)}
                  />
                </Field>
                <Field label="IBAN">
                  <input
                    placeholder="ES91 2100 0418 4502 0005 1332"
                    value={form.bankIban}
                    onChange={(e) => update("bankIban", e.target.value)}
                  />
                </Field>
                <Field label="SWIFT/BIC">
                  <input
                    placeholder="AAAAESMMXXX"
                    value={form.bankSwift}
                    onChange={(e) => update("bankSwift", e.target.value)}
                  />
                </Field>
              </div>

              <Eyebrow>Métodos de pago</Eyebrow>
              <div className="grid grid-cols-2 gap-2.5">
                {PAYMENT_METHODS.map((m) => {
                  const checked = form.paymentMethods.includes(m.id);
                  return (
                    <label
                      key={m.id}
                      className="flex items-center gap-2.5 cursor-pointer rounded-[8px] transition-colors"
                      style={{
                        padding: "10px 12px",
                        border: "1px solid var(--line-strong)",
                        background: checked ? "var(--bg-subtle)" : "#FFFFFF",
                      }}
                    >
                      <div
                        className="h-9 w-9 rounded-full flex items-center justify-center flex-shrink-0"
                        style={{
                          background: checked ? "var(--ink-1)" : "var(--bg-subtle)",
                          color: checked ? "#FFFFFF" : "var(--ink-2)",
                        }}
                      >
                        {m.icon}
                      </div>
                      <span className="flex-1 text-[12.5px] font-medium text-[var(--ink-1)]">
                        {m.label}
                      </span>
                      <div
                        className="h-4 w-4 rounded flex items-center justify-center flex-shrink-0"
                        style={{
                          background: checked ? "var(--ink-1)" : "transparent",
                          border: checked
                            ? "1.5px solid var(--ink-1)"
                            : "1.5px solid var(--line-strong)",
                        }}
                      >
                        {checked && <IcoCheck className="h-2.5 w-2.5 text-white" />}
                      </div>
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => togglePaymentMethod(m.id)}
                        className="sr-only"
                      />
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {tab === "actividad" && (
            <div
              className="text-center py-12 rounded-[8px]"
              style={{ border: "2px dashed var(--line-1)" }}
            >
              <IcoClock className="h-10 w-10 mx-auto text-[var(--ink-4)] mb-3" />
              <h3 className="text-[14px] font-semibold text-[var(--ink-1)] mb-1">
                Disponible al crear el contacto
              </h3>
              <p className="text-[12.5px] text-[var(--ink-3)]">
                El historial de actividad se irá registrando una vez creado.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-3.5 flex-shrink-0"
          style={{ borderTop: "1px solid var(--line-1)" }}
        >
          <button
            onClick={submit}
            disabled={!isValid || submitting}
            aria-disabled={!isValid || submitting}
            className="w-full inline-flex items-center justify-center rounded-[8px] cursor-pointer transition-colors border-none"
            style={{
              background: "var(--color-primary)",
              color: "#FFFFFF",
              padding: "12px",
              fontSize: 14,
              fontWeight: 600,
              opacity: !isValid || submitting ? 0.5 : 1,
              cursor: !isValid || submitting ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? "Creando..." : "Crear contacto"}
          </button>
        </div>

      </SheetContent>
    </Sheet>
  );
}

export default NewContactDrawer;
