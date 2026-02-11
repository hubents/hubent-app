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
| Talla | Clase Tailwind | Uso |
|-------|---------------|-----|
| sm | `sm:max-w-md` | Forms simples (FAQ, grupo, archivo) |
| md | `sm:max-w-lg` | Forms medianos (pagos, contacto, vendor) |
| lg | `sm:max-w-2xl` | Forms complejos (crear evento, lead detail) |
| xl | `sm:max-w-4xl` | Paneles grandes (task panel) |

## Reglas de SheetContent
1. **SIEMPRE** incluir `overflow-y-auto` en el className
2. **SIEMPRE** usar una talla del sistema de anchos (no valores arbitrarios como `[500px]`)
3. **SIEMPRE** incluir `SheetHeader` con `SheetTitle` (accesibilidad)
