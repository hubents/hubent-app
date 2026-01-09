"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RiBankLine, RiSaveLine } from "@remixicon/react";

interface ContactDetail {
  id: number;
  bankName: string | null;
  bankAccountNumber: string | null;
  bankIban: string | null;
  bankSwift: string | null;
  paymentMethods: string[] | null;
}

interface ContactBankTabProps {
  contact: ContactDetail | null;
  loading: boolean;
  onUpdateContact: (updates: Record<string, unknown>) => Promise<unknown>;
}

const paymentMethodOptions = [
  { id: "transfer", label: "Transferencia bancaria" },
  { id: "card", label: "Tarjeta de crédito/débito" },
  { id: "cash", label: "Efectivo" },
  { id: "paypal", label: "PayPal" },
  { id: "bizum", label: "Bizum" },
  { id: "check", label: "Cheque" },
];

export function ContactBankTab({
  contact,
  loading,
  onUpdateContact,
}: ContactBankTabProps) {
  const [formData, setFormData] = useState({
    bankName: "",
    bankAccountNumber: "",
    bankIban: "",
    bankSwift: "",
    paymentMethods: [] as string[],
  });
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (contact) {
      setFormData({
        bankName: contact.bankName || "",
        bankAccountNumber: contact.bankAccountNumber || "",
        bankIban: contact.bankIban || "",
        bankSwift: contact.bankSwift || "",
        paymentMethods: contact.paymentMethods || [],
      });
      setHasChanges(false);
    }
  }, [contact]);

  const handleChange = (field: string, value: string | string[]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const togglePaymentMethod = (methodId: string) => {
    const current = formData.paymentMethods;
    const updated = current.includes(methodId)
      ? current.filter((m) => m !== methodId)
      : [...current, methodId];
    handleChange("paymentMethods", updated);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdateContact({
        bankName: formData.bankName || null,
        bankAccountNumber: formData.bankAccountNumber || null,
        bankIban: formData.bankIban || null,
        bankSwift: formData.bankSwift || null,
        paymentMethods: formData.paymentMethods.length > 0 ? formData.paymentMethods : null,
      });
      setHasChanges(false);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-2 text-muted-foreground">
        <RiBankLine className="h-5 w-5" />
        <h3 className="text-sm font-medium">Información Bancaria</h3>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Nombre del banco</label>
          <Input
            value={formData.bankName}
            onChange={(e) => handleChange("bankName", e.target.value)}
            placeholder="Ej: Banco Santander"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Número de cuenta</label>
          <Input
            value={formData.bankAccountNumber}
            onChange={(e) => handleChange("bankAccountNumber", e.target.value)}
            placeholder="Número de cuenta"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">IBAN</label>
            <Input
              value={formData.bankIban}
              onChange={(e) => handleChange("bankIban", e.target.value)}
              placeholder="ES00 0000 0000 0000 0000 0000"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">SWIFT/BIC</label>
            <Input
              value={formData.bankSwift}
              onChange={(e) => handleChange("bankSwift", e.target.value)}
              placeholder="BSCHESMMXXX"
            />
          </div>
        </div>
      </div>

      <div className="space-y-4 border-t pt-4">
        <h4 className="text-sm font-medium">Métodos de pago</h4>
        <div className="grid grid-cols-2 gap-3">
          {paymentMethodOptions.map((method) => (
            <div key={method.id} className="flex items-center space-x-2">
              <Checkbox
                id={method.id}
                checked={formData.paymentMethods.includes(method.id)}
                onCheckedChange={() => togglePaymentMethod(method.id)}
              />
              <label
                htmlFor={method.id}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {method.label}
              </label>
            </div>
          ))}
        </div>

        {formData.paymentMethods.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2">
            {formData.paymentMethods.map((methodId) => {
              const method = paymentMethodOptions.find((m) => m.id === methodId);
              return (
                <Badge key={methodId} variant="secondary">
                  {method?.label || methodId}
                </Badge>
              );
            })}
          </div>
        )}
      </div>

      {hasChanges && (
        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <RiSaveLine className="h-4 w-4" />
            {saving ? "Guardando..." : "Guardar cambios"}
          </Button>
        </div>
      )}
    </div>
  );
}
