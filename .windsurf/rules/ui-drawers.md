# Regla: Siempre usar Drawers (Sheet) en vez de Modales (Dialog)

## Regla principal
**SIEMPRE** usar el componente `Sheet` (drawer lateral) de `@/components/ui/sheet` para cualquier panel, formulario, detalle o acción que requiera una vista superpuesta.

**NUNCA** usar `Dialog` de `@/components/ui/dialog` para estos casos.

## Excepciones permitidas
- `AlertDialog` — Solo para confirmaciones destructivas (eliminar, cancelar, acciones irreversibles)
- `Dialog` en `ui/dialog.tsx` y `app/components/page.tsx` — Componentes base/demo de shadcn/ui

## Convenciones de naming
- Archivos: `nombre-drawer.tsx`
- Export de componente: `NombreDrawer`
- Interface de props: `NombreDrawerProps`

## Sistema de anchos (obligatorio)
| Talla | Clase Tailwind | Pixels | Uso |
|-------|---------------|--------|-----|
| S | `sm:max-w-2xl` | 672px | Forms simples (FAQ, grupo, archivo, config) |
| M | `sm:max-w-3xl` | 768px | Forms medianos (pagos, contacto, vendor, editar evento) |
| L | `sm:max-w-4xl` | 896px | Preview documentos |
| XL | `sm:max-w-5xl` | 1024px | Forms complejos (crear evento, lead detail, importar) |
| Panel | `sm:max-w-6xl md:max-w-7xl` | 1152-1280px | Paneles grandes (task drawer, contact drawer) |
| Doc | `sm:max-w-[1500px]` | 1500px | Document drawer con preview (caso especial) |

## Reglas de SheetContent
1. **SIEMPRE** incluir `overflow-y-auto` en el className
2. **SIEMPRE** usar una talla del sistema de anchos (no valores arbitrarios como `[500px]`)
3. **SIEMPRE** incluir `SheetHeader` con `SheetTitle` (accesibilidad)
