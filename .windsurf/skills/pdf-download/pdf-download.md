# PDF Download Pattern — HubEnts

## Patrón obligatorio para TODAS las descargas de PDF en la app

### Principio
**NUNCA** usar Puppeteer/Chromium server-side (`createPDF`) para descargas client-triggered.
**SIEMPRE** usar `downloadPDFFromHTML()` de `src/lib/pdf-download.ts`.

### Flujo

```
1. API server → sirve HTML (Content-Type: text/html)
2. Client → llama downloadPDFFromHTML(url, filename)
3. pdf-download.ts → fetch HTML → iframe → html2canvas → jsPDF → .save()
```

### Implementación paso a paso

#### 1. API Route (server)
La API genera HTML optimizado para impresión y lo retorna directamente:

```typescript
// src/app/api/[...]/pdf/route.ts
export async function GET(request: NextRequest, { params }: RouteParams) {
  // ... auth, fetch data, build HTML ...
  
  const html = generateMyHTML({ /* data */ });
  
  // Return HTML — client generates real PDF
  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
}
```

**NO importar** `createPDF` ni `pdf-generator.ts`.

#### 2. Client Component
Importar y usar `downloadPDFFromHTML`:

```typescript
import { downloadPDFFromHTML } from "@/lib/pdf-download";

const handleDownload = async () => {
  setLoading(true);
  try {
    await downloadPDFFromHTML(
      `/api/mi-modulo/pdf`,      // URL de la API que retorna HTML
      `mi-documento-nombre`       // Nombre del archivo (sin extensión, se agrega .pdf)
    );
  } finally {
    setLoading(false);
  }
};
```

#### 3. HTML Template (server)
El HTML debe:
- Usar estilos inline (no CSS externo)
- Max width ~800-900px con container centrado
- Logos convertidos a base64 data URI (evita CORS)
- Incluir `@media print` para optimización

### Funciones disponibles en `src/lib/pdf-download.ts`

| Función | Uso |
|---------|-----|
| `downloadPDFFromHTML(url, filename)` | **Genérica** — cualquier URL que retorne HTML |
| `downloadDocumentPDF(documentId, filename)` | **Finanzas** — wrapper para documentos financieros |

### UX
- Toast "Generando PDF..." automático durante la generación
- Toast "PDF descargado" al completar
- Toast "Error al generar PDF" si falla
- El botón debe mostrar estado disabled durante la descarga

### ¿Por qué no Puppeteer?
- `createPDF()` en `pdf-generator.ts` usa `@sparticuz/chromium-min` que solo funciona en Vercel
- En dev local retorna HTML puro renombrado como .pdf → Adobe no puede abrirlo
- html2canvas + jsPDF funciona en todos los entornos (dev + prod)

### Ejemplo completo: Módulo de Finanzas (referencia)
- API: `src/app/api/finance/documents/[documentId]/pdf/route.ts` (soporta `?format=html`)
- Client: `src/components/finance/document-preview.tsx` → `downloadDocumentPDF()`
- Lib: `src/lib/pdf-download.ts`
