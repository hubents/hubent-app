"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Progress } from "@/components/ui/progress";
import {
  RiUploadLine,
  RiFileExcelLine,
  RiCheckLine,
  RiCloseLine,
  RiDownloadLine,
} from "@remixicon/react";

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
  const [importing, setImporting] = useState(false);
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

      const type: "person" | "company" = typeValue.includes("empresa") || typeValue.includes("company") ? "company" : "person";

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

  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleImport = async () => {
    const validContacts = parsedContacts.filter((c) => c.valid);
    if (validContacts.length === 0) {
      alert("No hay contactos válidos para importar");
      return;
    }

    setStep("importing");
    setImporting(true);
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

        if (res.ok) {
          success++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }

      setProgress(Math.round(((i + 1) / validContacts.length) * 100));
    }

    setResults({ success, failed });
    setImporting(false);
    setStep("done");
    onImportComplete?.();
  };

  const downloadTemplate = () => {
    const template = "nombre,email,telefono,tipo,ciudad\nJuan Pérez,juan@ejemplo.com,+34612345678,persona,Madrid\nEmpresa ABC,contacto@empresa.com,+34912345678,empresa,Barcelona";
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
      <SheetContent className="sm:max-w-5xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Importar Contactos</SheetTitle>
          <SheetDescription>
            Importa contactos desde un archivo CSV
          </SheetDescription>
        </SheetHeader>

        {step === "upload" && (
          <div className="space-y-6 px-4 pb-4">
            <div
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-muted/50 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <RiFileExcelLine className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">Arrastra tu archivo CSV aquí</h3>
              <p className="text-sm text-muted-foreground mb-4">
                o haz clic para seleccionar
              </p>
              <Input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileSelect}
              />
              <Button variant="outline">
                <RiUploadLine className="h-4 w-4 mr-2" />
                Seleccionar archivo
              </Button>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div>
                <p className="font-medium">¿No tienes un archivo?</p>
                <p className="text-sm text-muted-foreground">
                  Descarga nuestra plantilla CSV
                </p>
              </div>
              <Button variant="outline" onClick={downloadTemplate}>
                <RiDownloadLine className="h-4 w-4 mr-2" />
                Descargar plantilla
              </Button>
            </div>
          </div>
        )}

        {step === "preview" && (
          <div className="space-y-4 px-4 pb-4">
            <div className="flex items-center gap-4">
              <Badge variant="default" className="bg-green-500">
                {validCount} válidos
              </Badge>
              {invalidCount > 0 && (
                <Badge variant="destructive">
                  {invalidCount} con errores
                </Badge>
              )}
            </div>

            <div className="border rounded-lg max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8"></TableHead>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Tipo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedContacts.slice(0, 50).map((contact, i) => (
                    <TableRow key={i} className={!contact.valid ? "bg-destructive/10" : ""}>
                      <TableCell>
                        {contact.valid ? (
                          <RiCheckLine className="h-4 w-4 text-green-500" />
                        ) : (
                          <RiCloseLine className="h-4 w-4 text-destructive" />
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{contact.name || "-"}</TableCell>
                      <TableCell>{contact.email || "-"}</TableCell>
                      <TableCell>{contact.phone || "-"}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {contact.type === "company" ? "Empresa" : "Persona"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
            {parsedContacts.length > 50 && (
              <p className="text-sm text-muted-foreground text-center">
                Mostrando 50 de {parsedContacts.length} contactos
              </p>
            )}
          </div>
        )}

        {step === "importing" && (
          <div className="space-y-4 px-4 py-8 text-center">
            <div className="animate-pulse">
              <RiUploadLine className="h-12 w-12 mx-auto text-primary mb-4" />
            </div>
            <h3 className="font-medium">Importando contactos...</h3>
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground">{progress}% completado</p>
          </div>
        )}

        {step === "done" && (
          <div className="space-y-4 px-4 py-8 text-center">
            <RiCheckLine className="h-12 w-12 mx-auto text-green-500 mb-4" />
            <h3 className="font-medium">¡Importación completada!</h3>
            <div className="flex items-center justify-center gap-4">
              <Badge variant="default" className="bg-green-500">
                {results.success} importados
              </Badge>
              {results.failed > 0 && (
                <Badge variant="destructive">
                  {results.failed} fallidos
                </Badge>
              )}
            </div>
          </div>
        )}

        <SheetFooter className="px-4">
          {step === "upload" && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
          )}
          {step === "preview" && (
            <>
              <Button variant="outline" onClick={resetDialog}>
                Volver
              </Button>
              <Button onClick={handleImport} disabled={validCount === 0}>
                Importar {validCount} contactos
              </Button>
            </>
          )}
          {step === "done" && (
            <Button onClick={() => { onOpenChange(false); resetDialog(); }}>
              Cerrar
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
