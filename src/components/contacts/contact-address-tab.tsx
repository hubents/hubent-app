"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RiSaveLine, RiMapPinLine } from "@remixicon/react";

interface ContactDetail {
  id: number;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
}

interface ContactAddressTabProps {
  contact: ContactDetail | null;
  loading: boolean;
  onUpdateContact: (updates: Record<string, unknown>) => Promise<unknown>;
}

const countries = [
  { code: "ES", name: "España" },
  { code: "US", name: "Estados Unidos" },
  { code: "GB", name: "Reino Unido" },
  { code: "FR", name: "Francia" },
  { code: "DE", name: "Alemania" },
  { code: "IT", name: "Italia" },
  { code: "PT", name: "Portugal" },
  { code: "MX", name: "México" },
  { code: "AR", name: "Argentina" },
  { code: "BR", name: "Brasil" },
  { code: "CO", name: "Colombia" },
  { code: "CL", name: "Chile" },
];

export function ContactAddressTab({
  contact,
  loading,
  onUpdateContact,
}: ContactAddressTabProps) {
  const [formData, setFormData] = useState({
    address: "",
    city: "",
    state: "",
    postalCode: "",
    country: "ES",
  });
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (contact) {
      setFormData({
        address: contact.address || "",
        city: contact.city || "",
        state: contact.state || "",
        postalCode: contact.postalCode || "",
        country: contact.country || "ES",
      });
      setHasChanges(false);
    }
  }, [contact]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onUpdateContact({
        address: formData.address || null,
        city: formData.city || null,
        state: formData.state || null,
        postalCode: formData.postalCode || null,
        country: formData.country || null,
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
        <RiMapPinLine className="h-5 w-5" />
        <h3 className="text-sm font-medium">Dirección</h3>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Dirección</label>
          <Input
            value={formData.address}
            onChange={(e) => handleChange("address", e.target.value)}
            placeholder="Calle, número, piso..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Ciudad</label>
            <Input
              value={formData.city}
              onChange={(e) => handleChange("city", e.target.value)}
              placeholder="Ciudad"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Provincia/Estado</label>
            <Input
              value={formData.state}
              onChange={(e) => handleChange("state", e.target.value)}
              placeholder="Provincia o estado"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Código Postal</label>
            <Input
              value={formData.postalCode}
              onChange={(e) => handleChange("postalCode", e.target.value)}
              placeholder="28001"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">País</label>
            <Select
              value={formData.country}
              onValueChange={(v) => handleChange("country", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar país" />
              </SelectTrigger>
              <SelectContent>
                {countries.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
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
