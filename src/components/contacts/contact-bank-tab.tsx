"use client";

import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { RiBankLine } from "@remixicon/react";

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

const paymentMethodOptions = [
  { id: "transfer", label: "Transferencia bancaria" },
  { id: "card", label: "Tarjeta de crédito/débito" },
  { id: "cash", label: "Efectivo" },
  { id: "paypal", label: "PayPal" },
  { id: "bizum", label: "Bizum" },
  { id: "check", label: "Cheque" },
];

export function ContactBankTab({
  loading,
  formData,
  onFieldChange,
}: ContactBankTabProps) {
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

    </div>
  );
}
