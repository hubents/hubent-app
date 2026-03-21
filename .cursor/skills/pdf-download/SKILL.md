---
name: pdf-download
description: >-
  HubEnts client-side PDF generation via downloadPDFFromHTML. Use for any
  user-triggered PDF export; never use server Puppeteer createPDF for that path.
  Covers API HTML routes, client handler, and finance document reference.
---

# PDF Download Pattern — HubEnts

## Patrón obligatorio para TODAS las descargas de PDF en la app

### Principio

**NUNCA** usar Puppeteer/Chromium server-side (`createPDF`) para descargas client-triggered.

**SIEMPRE** usar `downloadPDFFromHTML()` de `src/lib/pdf-download.ts`.

### Flujo

```text
1. API server → sirve HTML (Content-Type: text/html)
2. Client → llama downloadPDFFromHTML(url, filename)
3. pdf-download.ts → fetch HTML → iframe → html2canvas → jsPDF → .save()
```

## Implementación paso a paso

### 1. API Route (server)

La API genera HTML optimizado para impresión y lo retorna directamente:

```typescript
// src/app/api/[...]/pdf/route.ts
export async function GET(request: NextRequest, { params }: RouteParams) {
  // ... auth, fetch data, build HTML ...

  const html = generateMyHTML({
    /* data */
  });

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
```

**NO importar** `createPDF` ni `pdf-generator.ts`.

### 2. Client Component

```typescript
import { downloadPDFFromHTML } from "@/lib/pdf-download";

const handleDownload = async () => {
  setLoading(true);
  try {
    await downloadPDFFromHTML(`/api/mi-modulo/pdf`, `mi-documento-nombre`);
  } finally {
    setLoading(false);
  }
};
```

### 3. HTML Template (server)

- Estilos inline (no CSS externo)
- Max width ~800-900px, container centrado
- Logos en base64 data URI (evita CORS)
- Incluir `@media print`

## Funciones en `src/lib/pdf-download.ts`

| Función                                     | Uso                           |
| ------------------------------------------- | ----------------------------- |
| `downloadPDFFromHTML(url, filename)`        | Genérica — cualquier URL HTML |
| `downloadDocumentPDF(documentId, filename)` | Finanzas — documentos         |

## UX

- Toast "Generando PDF..." durante la generación
- Toast "PDF descargado" al completar
- Toast "Error al generar PDF" si falla
- Botón disabled durante descarga

## ¿Por qué no Puppeteer?

- `createPDF()` usa `@sparticuz/chromium-min` pensado para Vercel
- En dev local puede devolver HTML como .pdf no usable en Adobe
- html2canvas + jsPDF funciona en dev y prod

## Referencia: finanzas

- API: `src/app/api/finance/documents/[documentId]/pdf/route.ts` (`?format=html`)
- Client: `src/components/finance/document-preview.tsx` → `downloadDocumentPDF()`
- Lib: `src/lib/pdf-download.ts`

## Related project rules

- `.cursor/rules/hubents-project-architecture.mdc`

## See also

- `hubents-deploy` — si cambias rutas PDF en release

## Source

Derived from `.windsurf/skills/pdf-download/pdf-download.md` (Windsurf file unchanged; Cursor uses `SKILL.md` here).
