"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  RiLoader4Line,
  RiCheckLine,
  RiErrorWarningLine,
  RiExternalLinkLine,
} from "@remixicon/react";
import { SignatureCanvas } from "@/components/forms/signature-canvas";

interface FormField {
  id: number;
  type: string;
  label: string;
  placeholder: string | null;
  required: boolean;
  crmMapping: string | null;
  options: { choices?: { label: string; value: string; imageUrl?: string }[] } | null;
  sortOrder: number;
}

interface PublicFormData {
  instanceId: number;
  form: {
    id: number;
    name: string;
    description: string | null;
    logoUrl: string | null;
    coverImage: string | null;
    primaryColor: string;
    submitButtonText: string;
    thankYouTitle: string;
    thankYouMessage: string;
    redirectUrl: string | null;
    gdprEnabled: boolean;
    gdprText: string;
    gdprLink: string | null;
    fields: FormField[];
  };
}

type FormState = "loading" | "form" | "submitting" | "success" | "error";

export default function PublicFormPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <RiLoader4Line className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    }>
      <PublicFormPageInner />
    </Suspense>
  );
}

function PublicFormPageInner() {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const isEmbed = searchParams.get("embed") === "true";

  const [formData, setFormData] = useState<PublicFormData | null>(null);
  const [state, setState] = useState<FormState>("loading");
  const [errorMsg, setErrorMsg] = useState("");
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [gdprAccepted, setGdprAccepted] = useState(false);
  const [thankYou, setThankYou] = useState({ title: "", message: "", redirectUrl: "" });

  const fetchForm = useCallback(async () => {
    try {
      const res = await fetch(`/api/public/forms/${slug}`);
      const data = await res.json();
      if (data.success) {
        setFormData(data.data);
        setState("form");
      } else {
        setErrorMsg(data.error || "Formulario no encontrado");
        setState("error");
      }
    } catch {
      setErrorMsg("Error al cargar el formulario");
      setState("error");
    }
  }, [slug]);

  useEffect(() => { fetchForm(); }, [fetchForm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    if (formData.form.gdprEnabled && !gdprAccepted) {
      setErrorMsg("Debes aceptar la política de privacidad");
      return;
    }

    setState("submitting");
    setErrorMsg("");

    try {
      const res = await fetch(`/api/public/forms/${slug}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: values }),
      });
      const data = await res.json();
      if (data.success) {
        setThankYou({
          title: data.data.thankYouTitle || "¡Gracias!",
          message: data.data.thankYouMessage || "Tu respuesta ha sido registrada.",
          redirectUrl: data.data.redirectUrl || "",
        });
        setState("success");

        if (data.data.redirectUrl) {
          setTimeout(() => {
            window.location.href = data.data.redirectUrl;
          }, 2000);
        }
      } else {
        setErrorMsg(data.error || "Error al enviar");
        setState("form");
      }
    } catch {
      setErrorMsg("Error de conexión");
      setState("form");
    }
  };

  const setValue = (label: string, value: unknown) => {
    setValues((prev) => ({ ...prev, [label]: value }));
  };

  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <RiLoader4Line className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (state === "error" && !formData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <RiErrorWarningLine className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <h1 className="text-xl font-semibold text-gray-700">Formulario no disponible</h1>
          <p className="text-sm text-gray-500 mt-2">{errorMsg}</p>
        </div>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className={`flex flex-col items-center justify-center bg-gray-50 ${isEmbed ? "min-h-0 py-8" : "min-h-screen"}`}>
        <div className="max-w-md text-center p-8 flex-1 flex flex-col items-center justify-center">
          {formData?.form.logoUrl && (
            <img src={formData.form.logoUrl} alt="" className="h-10 mx-auto mb-6 object-contain" />
          )}
          <div
            className="h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-6"
            style={{ backgroundColor: formData?.form.primaryColor || "#111827" }}
          >
            <RiCheckLine className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">{thankYou.title}</h1>
          <p className="text-gray-600 mt-3">{thankYou.message}</p>
          {thankYou.redirectUrl && (
            <p className="text-sm text-gray-400 mt-4 flex items-center justify-center gap-1">
              <RiExternalLinkLine className="h-3.5 w-3.5" />
              Redirigiendo...
            </p>
          )}
        </div>
        {!isEmbed && (
          <div className="pb-6 flex items-center justify-center gap-1.5">
            <span className="text-[11px] text-gray-400">Hecho con</span>
            <img src="/images/isotipo-dark.png" alt="HubEnts" className="h-4 w-4 opacity-40" />
            <span className="text-[11px] font-medium text-gray-400">hubents</span>
          </div>
        )}
      </div>
    );
  }

  if (!formData) return null;
  const { form } = formData;

  return (
    <div className={`bg-gray-50 px-4 ${isEmbed ? "py-4" : "min-h-screen py-8"}`}>
      <div className="max-w-xl mx-auto">
        {/* Cover Image */}
        {form.coverImage && (
          <div className="h-44 rounded-t-2xl overflow-hidden -mb-4">
            <img src={form.coverImage} alt="" className="w-full h-full object-cover" />
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className={`bg-white shadow-sm border p-6 space-y-5 ${form.coverImage ? "rounded-b-2xl" : "rounded-2xl"}`}>
          {/* Header */}
          <div className="text-center pb-2">
            {form.logoUrl && (
              <img src={form.logoUrl} alt="" className="h-12 mx-auto mb-3 object-contain" />
            )}
            <h1 className="text-2xl font-bold text-gray-900">{form.name}</h1>
            {form.description && (
              <p className="text-gray-600 mt-2">{form.description}</p>
            )}
          </div>
          {form.fields.map((field) => (
            <FieldRenderer
              key={field.id}
              field={field}
              value={values[field.label]}
              onChange={(val) => setValue(field.label, val)}
              primaryColor={form.primaryColor}
            />
          ))}

          {/* GDPR */}
          {form.gdprEnabled && (
            <div className="flex items-start gap-3 pt-2">
              <Checkbox
                checked={gdprAccepted}
                onCheckedChange={(c) => setGdprAccepted(c === true)}
                id="gdpr"
              />
              <label htmlFor="gdpr" className="text-sm text-gray-600 leading-snug cursor-pointer">
                {form.gdprText}
                {form.gdprLink && (
                  <a href={form.gdprLink} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline ml-1">
                    Ver política
                  </a>
                )}
              </label>
            </div>
          )}

          {/* Error */}
          {errorMsg && (
            <p className="text-sm text-red-600 bg-red-50 rounded-lg px-3 py-2">{errorMsg}</p>
          )}

          {/* Submit */}
          <Button
            type="submit"
            disabled={state === "submitting"}
            className="w-full h-11 text-base font-medium"
            style={{ backgroundColor: form.primaryColor }}
          >
            {state === "submitting" ? (
              <RiLoader4Line className="h-5 w-5 animate-spin" />
            ) : (
              form.submitButtonText || "Enviar"
            )}
          </Button>
        </form>

        {/* Footer */}
        {!isEmbed && (
          <div className="flex items-center justify-center gap-1.5 mt-6">
            <span className="text-[11px] text-gray-400">Hecho con</span>
            <img src="/images/isotipo-dark.png" alt="HubEnts" className="h-4 w-4 opacity-40" />
            <span className="text-[11px] font-medium text-gray-400">hubents</span>
          </div>
        )}
      </div>
    </div>
  );
}

interface FieldRendererProps {
  field: FormField;
  value: unknown;
  onChange: (value: unknown) => void;
  primaryColor: string;
}

function FieldRenderer({ field, value, onChange, primaryColor }: FieldRendererProps) {
  const choices = field.options?.choices || [];

  switch (field.type) {
    case "section_title":
      return <h2 className="text-lg font-semibold text-gray-900 pt-2">{field.label}</h2>;

    case "descriptive_text":
      return <p className="text-sm text-gray-600">{field.label}</p>;

    case "separator":
      return <hr className="border-gray-200" />;

    case "name":
    case "email":
    case "phone":
    case "partner_name":
    case "partner_email":
    case "event_venue":
    case "short_text":
      return (
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-gray-700">
            {field.label}
            {field.required && <span className="text-red-500 ml-0.5">*</span>}
          </Label>
          <Input
            type={field.type === "email" || field.type === "partner_email" ? "email" : field.type === "phone" ? "tel" : "text"}
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || ""}
            required={field.required}
          />
        </div>
      );

    case "event_date":
      return (
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-gray-700">
            {field.label}
            {field.required && <span className="text-red-500 ml-0.5">*</span>}
          </Label>
          <Input
            type="date"
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            required={field.required}
          />
        </div>
      );

    case "guest_count":
    case "budget":
      return (
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-gray-700">
            {field.label}
            {field.required && <span className="text-red-500 ml-0.5">*</span>}
          </Label>
          <Input
            type="text"
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || ""}
            required={field.required}
          />
        </div>
      );

    case "message":
    case "long_text":
      return (
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-gray-700">
            {field.label}
            {field.required && <span className="text-red-500 ml-0.5">*</span>}
          </Label>
          <Textarea
            value={(value as string) || ""}
            onChange={(e) => onChange(e.target.value)}
            placeholder={field.placeholder || ""}
            rows={4}
            required={field.required}
          />
        </div>
      );

    case "single_select":
      return (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">
            {field.label}
            {field.required && <span className="text-red-500 ml-0.5">*</span>}
          </Label>
          <div className="space-y-2">
            {choices.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                  value === opt.value ? "border-gray-900 bg-gray-50" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <input
                  type="radio"
                  name={`field-${field.id}`}
                  value={opt.value}
                  checked={value === opt.value}
                  onChange={() => onChange(opt.value)}
                  className="sr-only"
                />
                <div
                  className={`h-4 w-4 rounded-full border-2 flex items-center justify-center ${
                    value === opt.value ? "border-gray-900" : "border-gray-300"
                  }`}
                >
                  {value === opt.value && <div className="h-2 w-2 rounded-full bg-gray-900" />}
                </div>
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      );

    case "multi_select": {
      const selected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">
            {field.label}
            {field.required && <span className="text-red-500 ml-0.5">*</span>}
          </Label>
          <div className="space-y-2">
            {choices.map((opt) => (
              <label
                key={opt.value}
                className={`flex items-center gap-3 rounded-lg border p-3 cursor-pointer transition-colors ${
                  selected.includes(opt.value) ? "border-gray-900 bg-gray-50" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <Checkbox
                  checked={selected.includes(opt.value)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      onChange([...selected, opt.value]);
                    } else {
                      onChange(selected.filter((v) => v !== opt.value));
                    }
                  }}
                />
                <span className="text-sm">{opt.label}</span>
              </label>
            ))}
          </div>
        </div>
      );
    }

    case "checkbox":
      return (
        <div className="flex items-start gap-3">
          <Checkbox
            checked={value === true}
            onCheckedChange={(c) => onChange(c === true)}
            id={`field-${field.id}`}
          />
          <label htmlFor={`field-${field.id}`} className="text-sm text-gray-700 cursor-pointer leading-snug">
            {field.label}
            {field.required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        </div>
      );

    case "image_select": {
      const imgSelected = Array.isArray(value) ? (value as string[]) : [];
      return (
        <div className="space-y-2">
          <Label className="text-sm font-medium text-gray-700">
            {field.label}
            {field.required && <span className="text-red-500 ml-0.5">*</span>}
          </Label>
          <div className="grid grid-cols-2 gap-3">
            {choices.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  if (imgSelected.includes(opt.value)) {
                    onChange(imgSelected.filter((v) => v !== opt.value));
                  } else {
                    onChange([...imgSelected, opt.value]);
                  }
                }}
                className={`rounded-xl border-2 overflow-hidden transition-all ${
                  imgSelected.includes(opt.value) ? "border-gray-900 ring-2 ring-gray-900/20" : "border-gray-200 hover:border-gray-300"
                }`}
              >
                {opt.imageUrl ? (
                  <img src={opt.imageUrl} alt={opt.label} className="w-full h-24 object-cover" />
                ) : (
                  <div className="w-full h-24 bg-gray-100 flex items-center justify-center text-xs text-gray-400">
                    Sin imagen
                  </div>
                )}
                <p className="text-xs font-medium p-2 text-center">{opt.label}</p>
              </button>
            ))}
          </div>
        </div>
      );
    }

    case "signature":
      return (
        <SignatureCanvas
          value={(value as string) || null}
          onChange={(dataUrl) => onChange(dataUrl)}
          label={field.label}
          required={field.required}
        />
      );

    default:
      return null;
  }
}
