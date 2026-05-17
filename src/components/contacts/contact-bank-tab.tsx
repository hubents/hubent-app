"use client";

import { useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { hgIcon } from "@/components/ui/hg-icon";
import {
  BankIcon,
  CreditCardIcon,
  Coins01Icon,
  PaypalIcon,
  ExchangeDollarIcon,
  ReceiptTextIcon,
  Tick01Icon,
  CheckmarkCircle02Icon,
  CancelCircleIcon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";
import { formatIban, cleanIban, validateIban, lookupIban } from "@/lib/iban-utils";

const IcoBank     = hgIcon(BankIcon);
const IcoCard     = hgIcon(CreditCardIcon);
const IcoCoins    = hgIcon(Coins01Icon);
const IcoPaypal   = hgIcon(PaypalIcon);
const IcoExchange = hgIcon(ExchangeDollarIcon);
const IcoCheque   = hgIcon(ReceiptTextIcon);
const IcoCheck    = hgIcon(Tick01Icon);
const IcoValid    = hgIcon(CheckmarkCircle02Icon);
const IcoInvalid  = hgIcon(CancelCircleIcon);
const IcoInfo     = hgIcon(InformationCircleIcon);

export interface BankFormData {
  bankName: string;
  bankAccountNumber: string;
  bankIban: string;
  bankSwift: string;
  paymentMethods: string[];
}

interface ContactBankTabProps {
  loading: boolean;
  formData: BankFormData;
  onFieldChange: (field: string, value: string | string[]) => void;
}

const PAYMENT_METHODS: { id: string; label: string; icon: React.ReactNode }[] = [
  { id: "transfer", label: "Transferencia bancaria", icon: <IcoExchange className="h-3.5 w-3.5" /> },
  { id: "card",     label: "Tarjeta de crédito/débito", icon: <IcoCard className="h-3.5 w-3.5" /> },
  { id: "cash",     label: "Efectivo",              icon: <IcoCoins className="h-3.5 w-3.5" /> },
  { id: "paypal",   label: "PayPal",                icon: <IcoPaypal className="h-3.5 w-3.5" /> },
  { id: "bizum",    label: "Bizum",                 icon: <IcoExchange className="h-3.5 w-3.5" /> },
  { id: "check",    label: "Cheque",               icon: <IcoCheque className="h-3.5 w-3.5" /> },
];

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5 drawer-form-field">
      <label className="text-[12px] font-medium text-[var(--ink-2)]">{label}</label>
      {children}
      {hint && <p className="text-[11px] text-[var(--ink-3)]">{hint}</p>}
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-[10.5px] font-semibold uppercase text-[var(--ink-3)]" style={{ letterSpacing: "0.08em" }}>
      {children}
    </div>
  );
}

export function ContactBankTab({ loading, formData, onFieldChange }: ContactBankTabProps) {
  const [ibanTouched, setIbanTouched] = useState(false);
  const [autofillMsg, setAutofillMsg] = useState<string | null>(null);

  const handleChange = (field: string, value: string | string[]) => {
    onFieldChange(field, value);
  };

  const togglePaymentMethod = (methodId: string) => {
    const current = formData.paymentMethods;
    const updated = current.includes(methodId)
      ? current.filter((m) => m !== methodId)
      : [...current, methodId];
    handleChange("paymentMethods", updated);
  };

  // Format IBAN as groups of 4 while typing
  const handleIbanChange = (raw: string) => {
    const clean = cleanIban(raw);
    const formatted = formatIban(clean);
    handleChange("bankIban", formatted);
    setAutofillMsg(null);
  };

  // On blur: validate + auto-fill BIC and bank name
  const handleIbanBlur = () => {
    setIbanTouched(true);
    const clean = cleanIban(formData.bankIban);
    if (clean.length < 8) return;

    const result = lookupIban(clean);
    const fills: string[] = [];

    if (result.bic && !formData.bankSwift.trim()) {
      handleChange("bankSwift", result.bic);
      fills.push("BIC");
    }
    if (result.bankName && !formData.bankName.trim()) {
      handleChange("bankName", result.bankName);
      fills.push("Nombre del banco");
    }

    if (fills.length > 0) {
      setAutofillMsg(`Rellenado automáticamente: ${fills.join(" · ")}`);
      setTimeout(() => setAutofillMsg(null), 4000);
    }
  };

  // Auto-uppercase BIC
  const handleSwiftChange = (val: string) => {
    handleChange("bankSwift", val.toUpperCase());
  };

  const ibanClean  = cleanIban(formData.bankIban);
  const ibanValid  = ibanClean.length >= 15 && validateIban(ibanClean);
  const ibanBad    = ibanTouched && ibanClean.length >= 8 && !validateIban(ibanClean);

  if (loading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col gap-6">
      <div className="flex items-center gap-2">
        <IcoBank className="h-4 w-4 text-[var(--ink-3)]" />
        <h3 className="text-[13px] font-semibold text-[var(--ink-1)]">Información bancaria</h3>
      </div>

      {/* Bank box */}
      <div
        className="rounded-[8px] p-4 flex flex-col gap-3"
        style={{ background: "#FAFBFF", border: "1.5px solid #B5C9FF" }}
      >
        <Field label="IBAN">
          <div style={{ position: "relative" }}>
            <input
              value={formData.bankIban}
              onChange={(e) => handleIbanChange(e.target.value)}
              onBlur={handleIbanBlur}
              placeholder="ES00 0000 0000 0000 0000 0000"
              style={{
                paddingRight: ibanClean.length >= 8 ? 32 : undefined,
                borderColor: ibanBad ? "#EF4444" : ibanValid ? "#22C55E" : undefined,
                outline: "none",
              }}
            />
            {ibanValid && (
              <IcoValid
                className="h-4 w-4"
                style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", color: "#22C55E", pointerEvents: "none" }}
              />
            )}
            {ibanBad && (
              <IcoInvalid
                className="h-4 w-4"
                style={{ position: "absolute", right: 9, top: "50%", transform: "translateY(-50%)", color: "#EF4444", pointerEvents: "none" }}
              />
            )}
          </div>
          {ibanBad && (
            <p style={{ fontSize: 11, color: "#EF4444", marginTop: 2 }}>
              IBAN con formato incorrecto — comprueba los dígitos
            </p>
          )}
        </Field>

        {/* Autofill notification */}
        {autofillMsg && (
          <div
            style={{
              display: "flex", alignItems: "center", gap: 6,
              background: "#F0FDF4", border: "1px solid #86EFAC",
              borderRadius: 7, padding: "7px 10px",
              fontSize: 11.5, color: "#166534",
            }}
          >
            <IcoInfo className="h-3.5 w-3.5 flex-shrink-0" />
            {autofillMsg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          <Field label="SWIFT / BIC">
            <input
              value={formData.bankSwift}
              onChange={(e) => handleSwiftChange(e.target.value)}
              placeholder="BSCHESMM"
              style={{ fontFamily: "monospace", letterSpacing: "0.05em" }}
            />
          </Field>
          <Field label="Nombre del banco">
            <input
              value={formData.bankName}
              onChange={(e) => handleChange("bankName", e.target.value)}
              placeholder="Ej: Banco Santander"
            />
          </Field>
        </div>

        <Field label="Número de cuenta">
          <input
            value={formData.bankAccountNumber}
            onChange={(e) => handleChange("bankAccountNumber", e.target.value)}
            placeholder="Número de cuenta"
          />
        </Field>
      </div>

      {/* Payment methods */}
      <div className="flex flex-col gap-3">
        <Eyebrow>Métodos de pago</Eyebrow>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
          {PAYMENT_METHODS.map((method) => {
            const checked = formData.paymentMethods.includes(method.id);
            return (
              <label
                key={method.id}
                className="flex items-center gap-2.5 cursor-pointer rounded-[8px] transition-colors"
                style={{
                  padding: "9px 12px",
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
                  {method.icon}
                </div>
                <span className="flex-1 text-[12.5px] font-medium text-[var(--ink-1)]">
                  {method.label}
                </span>
                <div
                  className="h-4 w-4 rounded flex items-center justify-center flex-shrink-0"
                  style={{
                    background: checked ? "var(--ink-1)" : "transparent",
                    border: checked ? "1.5px solid var(--ink-1)" : "1.5px solid var(--line-strong)",
                  }}
                >
                  {checked && <IcoCheck className="h-2.5 w-2.5 text-white" />}
                </div>
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => togglePaymentMethod(method.id)}
                  className="sr-only"
                />
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
