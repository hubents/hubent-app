"use client";

import { useState, useRef } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { hgIcon } from "@/components/ui/hg-icon";
import {
  Cancel01Icon,
  Upload01Icon,
  Download01Icon,
  Tick01Icon,
  Csv01Icon,
} from "@hugeicons/core-free-icons";

const IcoX = hgIcon(Cancel01Icon);
const IcoUpload = hgIcon(Upload01Icon);
const IcoDownload = hgIcon(Download01Icon);
const IcoCheck = hgIcon(Tick01Icon);
const IcoCsv = hgIcon(Csv01Icon);

interface ImportContactsDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportComplete?: () => void;
}

interface ParsedContact {
  name: string;
  email: string;
  phone: string;
  type: "person" | "company";
  city?: string;
  valid: boolean;
  error?: string;
}

export function ImportContactsDrawer({
  open,
  onOpenChange,
  onImportComplete,
}: ImportContactsDrawerProps) {
  const [step, setStep] = useState<"upload" | "preview" | "importing" | "done">("upload");
  const [parsedContacts, setParsedContacts] = useState<ParsedContact[]>([]);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState({ success: 0, failed: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetDialog = () => {
    setStep("upload");
    setParsedContacts([]);
    setProgress(0);
    setResults({ success: 0, failed: 0 });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      parseCSV(text);
    };
    reader.readAsText(file);
  };

  const parseCSV = (text: string) => {
    const lines = text.split("\n").filter((line) => line.trim());
    if (lines.length < 2) {
      alert("El archivo CSV debe tener al menos una fila de encabezados y una de datos");
      return;
    }
    const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
    const nameIndex = headers.findIndex((h) => h.includes("nombre") || h.includes("name"));
    const emailIndex = headers.findIndex((h) => h.includes("email") || h.includes("correo"));
    const phoneIndex = headers.findIndex((h) => h.includes("telefono") || h.includes("phone") || h.includes("tel"));
    const typeIndex = headers.findIndex((h) => h.includes("tipo") || h.includes("type"));
    const cityIndex = headers.findIndex((h) => h.includes("ciudad") || h.includes("city"));

    if (nameIndex === -1) {
      alert("El CSV debe tener una columna 'nombre' o 'name'");
      return;
    }

    const contacts: ParsedContact[] = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      const name = values[nameIndex]?.trim() || "";
      const email = emailIndex >= 0 ? values[emailIndex]?.trim() || "" : "";
      const phone = phoneIndex >= 0 ? values[phoneIndex]?.trim() || "" : "";
      const typeValue = typeIndex >= 0 ? values[typeIndex]?.trim().toLowerCase() || "" : "";
      const city = cityIndex >= 0 ? values[cityIndex]?.trim() || "" : "";
      const type: "person" | "company" =
        typeValue.includes("empresa") || typeValue.includes("company") ? "company" : "person";

      let valid = true;
      let error = "";
      if (!name) {
        valid = false;
        error = "Nombre requerido";
      } else if (email && !isValidEmail(email)) {
        valid = false;
        error = "Email inválido";
      }
      contacts.push({ name, email, phone, type, city, valid, error });
    }
    setParsedContacts(contacts);
    setStep("preview");
  };

  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === "," && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const isValidEmail = (email: string): boolean => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  const handleImport = async () => {
    const validContacts = parsedContacts.filter((c) => c.valid);
    if (validContacts.length === 0) {
      alert("No hay contactos válidos para importar");
      return;
    }

    setStep("importing");
    let success = 0;
    let failed = 0;
    for (let i = 0; i < validContacts.length; i++) {
      const contact = validContacts[i];
      try {
        const res = await fetch("/api/contacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: contact.type,
            name: contact.name,
            email: contact.email || undefined,
            phone: contact.phone || undefined,
            city: contact.city || undefined,
          }),
        });
        if (res.ok) success++;
        else failed++;
      } catch {
        failed++;
      }
      setProgress(Math.round(((i + 1) / validContacts.length) * 100));
    }
    setResults({ success, failed });
    setStep("done");
    onImportComplete?.();
  };

  const downloadTemplate = () => {
    const template =
      "nombre,email,telefono,tipo,ciudad\nJuan Pérez,juan@ejemplo.com,+34612345678,persona,Madrid\nEmpresa ABC,contacto@empresa.com,+34912345678,empresa,Barcelona";
    const blob = new Blob([template], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla_contactos.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const validCount = parsedContacts.filter((c) => c.valid).length;
  const invalidCount = parsedContacts.filter((c) => !c.valid).length;

  return (
    <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetDialog(); }}>
      <SheetContent
        side="right"
        className="overflow-hidden bg-white border-0 [&>button]:hidden flex flex-col"
        style={{ width: "min(720px, 100vw)", maxWidth: "100vw", padding: 0, gap: 0 }}
      >
        {/* Header */}
        <div
          className="flex items-start gap-3 px-6 pt-5 pb-4 flex-shrink-0"
          style={{ borderBottom: "1px solid var(--line-1)" }}
        >
          <div className="flex-1 min-w-0">
            <div
              className="text-[18px] font-semibold text-[var(--ink-1)]"
              style={{ letterSpacing: "-0.01em" }}
            >
              Importar contactos
            </div>
            <div className="text-[12.5px] text-[var(--ink-3)] mt-0.5">
              Importa contactos desde un archivo CSV
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

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === "upload" && (
            <div className="flex flex-col gap-4">
              <div
                className="rounded-[8px] cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
                style={{
                  border: "1.5px dashed var(--line-strong)",
                  background: "var(--bg-subtle)",
                  padding: "32px 20px",
                  textAlign: "center",
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <div
                  className="h-11 w-11 rounded-[8px] inline-flex items-center justify-center mb-3"
                  style={{ background: "#FFFFFF", border: "1px solid var(--line-1)" }}
                >
                  <IcoCsv className="h-5 w-5 text-[var(--ink-2)]" />
                </div>
                <div className="text-[13.5px] font-semibold text-[var(--ink-1)] mb-1">
                  Importar archivo CSV
                </div>
                <div className="text-[12px] text-[var(--ink-3)] leading-[1.4] mb-3">
                  Suelta el archivo o haz clic aquí para elegir un archivo
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileSelect}
                />
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 rounded-[8px] px-3.5 py-2 text-[13px] font-medium text-[var(--ink-1)] cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
                  style={{ background: "#FFFFFF", border: "1px solid var(--line-strong)" }}
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                >
                  <IcoUpload className="h-3.5 w-3.5" />
                  Seleccionar archivo
                </button>
              </div>

              <div
                className="flex items-center justify-between rounded-[8px] p-4"
                style={{ background: "var(--bg-subtle)", border: "1px solid var(--line-1)" }}
              >
                <div>
                  <p className="text-[13px] font-semibold text-[var(--ink-1)]">¿No tienes un archivo?</p>
                  <p className="text-[12px] text-[var(--ink-3)]">Descarga nuestra plantilla CSV</p>
                </div>
                <button
                  onClick={downloadTemplate}
                  className="inline-flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[12.5px] font-medium text-[var(--ink-1)] cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
                  style={{ background: "#FFFFFF", border: "1px solid var(--line-strong)" }}
                >
                  <IcoDownload className="h-3 w-3" />
                  Descargar plantilla
                </button>
              </div>
            </div>
          )}

          {step === "preview" && (
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className="inline-flex items-center gap-1 rounded-[999px] text-[11.5px] font-medium px-2.5 py-1"
                  style={{ background: "var(--success-bg)", color: "var(--success-ink)" }}
                >
                  {validCount} válidos
                </span>
                {invalidCount > 0 && (
                  <span
                    className="inline-flex items-center gap-1 rounded-[999px] text-[11.5px] font-medium px-2.5 py-1"
                    style={{ background: "var(--danger-bg)", color: "var(--danger-ink)" }}
                  >
                    {invalidCount} con errores
                  </span>
                )}
              </div>

              <div
                className="rounded-[8px] max-h-[60vh] overflow-y-auto"
                style={{ border: "1px solid var(--line-1)" }}
              >
                <table className="tbl">
                  <thead>
                    <tr>
                      <th style={{ width: 40 }}></th>
                      <th>Nombre</th>
                      <th>Email</th>
                      <th>Teléfono</th>
                      <th>Tipo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parsedContacts.slice(0, 50).map((contact, i) => (
                      <tr
                        key={i}
                        style={contact.valid ? undefined : { background: "var(--danger-bg)" }}
                      >
                        <td>
                          {contact.valid ? (
                            <span style={{ color: "var(--success)" }}>
                              <IcoCheck className="h-3.5 w-3.5" />
                            </span>
                          ) : (
                            <span style={{ color: "var(--color-danger)" }}>
                              <IcoX className="h-3.5 w-3.5" />
                            </span>
                          )}
                        </td>
                        <td className="font-medium" style={{ color: "var(--ink-1)" }}>{contact.name || "—"}</td>
                        <td style={{ color: "var(--ink-2)" }}>{contact.email || "—"}</td>
                        <td style={{ color: "var(--ink-2)" }}>{contact.phone || "—"}</td>
                        <td>
                          <span
                            className="inline-flex items-center rounded-[999px] text-[10.5px] px-2 py-0.5"
                            style={{
                              background: "transparent",
                              color: "var(--ink-2)",
                              border: "1px solid var(--line-1)",
                            }}
                          >
                            {contact.type === "company" ? "Empresa" : "Persona"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {parsedContacts.length > 50 && (
                <p className="text-[11.5px] text-[var(--ink-3)] text-center">
                  Mostrando 50 de {parsedContacts.length} contactos
                </p>
              )}
            </div>
          )}

          {step === "importing" && (
            <div className="flex flex-col items-center text-center py-10 gap-4">
              <div className="animate-pulse">
                <IcoUpload className="h-10 w-10 text-[var(--color-primary)]" />
              </div>
              <h3 className="text-[14px] font-semibold text-[var(--ink-1)]">Importando contactos…</h3>
              <div
                className="w-full h-1.5 rounded-[999px] overflow-hidden"
                style={{ background: "var(--bg-subtle)" }}
              >
                <div
                  className="h-full transition-all duration-200"
                  style={{ width: `${progress}%`, background: "var(--ink-1)" }}
                />
              </div>
              <p className="text-[12px] text-[var(--ink-3)]">{progress}% completado</p>
            </div>
          )}

          {step === "done" && (
            <div className="flex flex-col items-center text-center py-10 gap-3">
              <div
                className="h-12 w-12 rounded-full flex items-center justify-center"
                style={{ background: "var(--success-bg)", color: "var(--success-ink)" }}
              >
                <IcoCheck className="h-5 w-5" />
              </div>
              <h3 className="text-[14px] font-semibold text-[var(--ink-1)]">
                ¡Importación completada!
              </h3>
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <span
                  className="inline-flex items-center rounded-[999px] text-[11.5px] font-medium px-2.5 py-1"
                  style={{ background: "var(--success-bg)", color: "var(--success-ink)" }}
                >
                  {results.success} importados
                </span>
                {results.failed > 0 && (
                  <span
                    className="inline-flex items-center rounded-[999px] text-[11.5px] font-medium px-2.5 py-1"
                    style={{ background: "var(--danger-bg)", color: "var(--danger-ink)" }}
                  >
                    {results.failed} fallidos
                  </span>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 flex items-center justify-end gap-2 flex-shrink-0"
          style={{ borderTop: "1px solid var(--line-1)" }}
        >
          {step === "upload" && (
            <button
              onClick={() => onOpenChange(false)}
              className="inline-flex items-center rounded-[8px] px-3.5 py-2 text-[13px] font-medium text-[var(--ink-1)] cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
              style={{ background: "#FFFFFF", border: "1px solid var(--line-strong)" }}
            >
              Cancelar
            </button>
          )}
          {step === "preview" && (
            <>
              <button
                onClick={resetDialog}
                className="inline-flex items-center rounded-[8px] px-3.5 py-2 text-[13px] font-medium text-[var(--ink-1)] cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
                style={{ background: "#FFFFFF", border: "1px solid var(--line-strong)" }}
              >
                Volver
              </button>
              <button
                onClick={handleImport}
                disabled={validCount === 0}
                aria-disabled={validCount === 0}
                className="inline-flex items-center rounded-[8px] px-3.5 py-2 text-[13px] font-semibold cursor-pointer transition-colors border-none"
                style={{
                  background: "var(--ink-1)",
                  color: "#FFFFFF",
                  opacity: validCount === 0 ? 0.5 : 1,
                }}
              >
                Importar {validCount} contactos
              </button>
            </>
          )}
          {step === "done" && (
            <button
              onClick={() => { onOpenChange(false); resetDialog(); }}
              className="inline-flex items-center rounded-[8px] px-3.5 py-2 text-[13px] font-semibold cursor-pointer transition-colors border-none"
              style={{ background: "var(--ink-1)", color: "#FFFFFF" }}
            >
              Cerrar
            </button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
