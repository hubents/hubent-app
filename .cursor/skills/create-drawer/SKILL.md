---
name: create-drawer
description: >-
  Create a new HubEnts Drawer using Sheet component, naming conventions, width
  tiers, padding, and accessibility. Use when adding side panels, forms, or
  overlays that must use Sheet instead of Dialog.
---

# Skill: Crear un Drawer

## Cuándo usar esta skill

Cada vez que necesites crear un panel lateral para formularios, detalles, edición o cualquier vista superpuesta.

## Paso 1: Crear el archivo

Crear `src/components/{modulo}/nombre-drawer.tsx`

```tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface NombreDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function NombreDrawer({
  open,
  onOpenChange,
  onSuccess,
}: NombreDrawerProps) {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setLoading(true);
    try {
      // API call
      toast.success("Operación exitosa");
      onOpenChange(false);
      onSuccess?.();
    } catch {
      toast.error("Error en la operación");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Título del Drawer</SheetTitle>
          <SheetDescription>Descripción opcional</SheetDescription>
        </SheetHeader>

        <div className="space-y-4 px-4 py-4">
          {/* Form fields */}
          <div className="space-y-2">
            <Label>Campo</Label>
            <Input placeholder="Valor" />
          </div>
        </div>

        <SheetFooter className="px-4 pb-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Guardar
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
```

## Paso 2: Elegir el ancho correcto

| Contenido                                    | Clase                                     |
| -------------------------------------------- | ----------------------------------------- |
| Form simple (1-3 campos)                     | `sm:max-w-2xl` (672px)                    |
| Form mediano (4-8 campos)                    | `sm:max-w-3xl` (768px)                    |
| Preview documentos                           | `sm:max-w-4xl` (896px)                    |
| Form complejo (tabs, selects, muchos campos) | `sm:max-w-5xl` (1024px)                   |
| Panel con mucho contenido (chat, preview)    | `sm:max-w-6xl md:max-w-7xl` (1152-1280px) |

## Paso 3: Consumir el Drawer

```tsx
import { NombreDrawer } from "@/components/{modulo}/nombre-drawer";

const [isDrawerOpen, setIsDrawerOpen] = useState(false);

<Button onClick={() => setIsDrawerOpen(true)}>Abrir</Button>

<NombreDrawer
  open={isDrawerOpen}
  onOpenChange={setIsDrawerOpen}
  onSuccess={() => refetch()}
/>
```

## Checklist antes de terminar

- [ ] Archivo nombrado `*-drawer.tsx`
- [ ] Export nombrado `XxxDrawer`
- [ ] Props interface nombrada `XxxDrawerProps`
- [ ] `SheetContent` tiene `overflow-y-auto`
- [ ] Ancho usa el sistema de tallas (no valores arbitrarios)
- [ ] `SheetHeader` con `SheetTitle` presente (accesibilidad)
- [ ] Body del form tiene `px-4 py-4` (alineado con SheetHeader)
- [ ] Manejo de loading state con `Loader2`
- [ ] Toast de éxito/error con `sonner`

## Lo que NUNCA hacer

- ❌ Usar `Dialog` / `DialogContent` para formularios o paneles
- ❌ Usar anchos arbitrarios como `sm:max-w-[500px]`
- ❌ Olvidar `overflow-y-auto` (contenido largo se corta)
- ❌ Nombrar archivos `*-dialog.tsx` o `*-modal.tsx`

## Related project rules

- `.cursor/rules/hubents-ui-drawers.mdc`

## See also

- `hubents-deploy` — si el cambio va a producción el mismo día

## Source

Copied from `.windsurf/skills/create-drawer/SKILL.md` (Windsurf copy unchanged).
