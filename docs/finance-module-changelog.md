# Rediseño Completo — Módulo de Finanzas
**Ticket:** 86af9tfb0
**Fecha:** 13 de Febrero 2026
**Commit:** `f24eabd` — `feat(finance): finalize module`
**Archivos afectados:** 24 (3 nuevos, 1 eliminado, 20 modificados)
**Migraciones DB:** `0009_cloudy_spitfire.sql` + `0010_windy_longshot.sql`

---

## Resumen Ejecutivo

Rediseño completo de UX/UI y backend del módulo de finanzas. Se unificó el flujo de creación/edición en un único drawer lateral, se agregaron campos nuevos (descuento global, método de pago, dirección cobro/pago), se creó un selector de contactos unificado, se implementó paginación real en todas las listas, y se corrigieron múltiples bugs.

---

## Antes vs Después

### 1. Creación de Documentos

| Aspecto | ANTES | DESPUÉS |
|---------|-------|---------|
| Flujo de creación | 2 flujos: página `/new` (formulario completo) + botón "Nuevo" (drawer) | **Un solo flujo**: siempre drawer lateral. Las URLs `/new` redirigen automáticamente |
| Selector de contacto | Select simple, solo clientes. Proveedores en otro select aparte | **ContactSelector unificado**: búsqueda en tiempo real con tabs Clientes/Proveedores/Contactos |
| Descuento global | No existía | **Nuevo**: descuento % o € aplicado al subtotal antes de IVA |
| Método de pago | No existía en el documento | **Nuevo**: Transferencia/Efectivo/Tarjeta/Stripe/Otro. Se muestra en PDF |
| Cuenta bancaria | No vinculada al documento | **Nuevo**: selector de cuenta bancaria. IBAN visible en PDF |
| Dirección (Cobro/Pago) | No existía, todo era "cobro" | **Nuevo**: se infiere automáticamente al seleccionar contacto (cliente=cobro) o proveedor (pago) |
| Albaranes | Mostraban precios y totales | **Modo albarán**: oculta precios, IVA, totales. Solo descripción + cantidad |
| Vista previa | No disponible durante creación | **Toggle de preview**: vista previa en vivo del documento mientras se edita |

### 2. Listas de Documentos

| Aspecto | ANTES | DESPUÉS |
|---------|-------|---------|
| Filtro Cobros/Pagos | No existía | **Tabs de dirección**: Todas / Cobros / Pagos en cada lista |
| Click en fila | Abría preview | **Click = Edición**: abre drawer de edición directamente |
| Vista previa | Al hacer click en fila | **Menú "Vista previa"**: accesible desde el dropdown de acciones |
| Paginación | Botones Anterior/Siguiente | **Paginación numérica**: `< 1 2 3 ... 14 15 16 >` con ellipsis |
| Búsqueda | No existía o era client-side | **Búsqueda server-side**: por nombre de contacto o número de documento |
| Estado "Vencida" | No se mostraba | **Calculado automáticamente**: si `fechaVencimiento < hoy` y no está pagada/cancelada |
| Estado "Aprobada" | No existía | **Nuevo estado**: Borrador → Aprobada → Pendiente → Pagada |
| Duplicar documento | Creaba copia server-side incompleta | **Duplicar vía drawer**: abre drawer con datos precargados, el usuario puede modificar antes de guardar |

### 3. Facturas

| Aspecto | ANTES | DESPUÉS |
|---------|-------|---------|
| Registrar pago | Solo desde preview | **Botón en lista**: "Añadir pago" directamente desde el dropdown |
| Dirección del pago | Siempre "cobro" | **Dinámico**: si la factura es de tipo "pago" (proveedor), el registro se crea como "pago" |
| Factura rectificativa | No disponible | **Disponible**: genera nota de crédito con importes negativos |
| Link de pago Stripe | No disponible | **Disponible**: genera link de pago y lo copia al portapapeles |

### 4. Presupuestos

| Aspecto | ANTES | DESPUÉS |
|---------|-------|---------|
| Conversión a factura | Función separada que a veces fallaba | **Vía drawer**: carga datos del presupuesto y abre drawer como factura. El usuario revisa antes de guardar |
| Conversión a albarán | No disponible | **Disponible**: convierte a albarán sin precios |
| Estado "Aceptado/Rechazado" | Existía pero no se podía cambiar fácil | **Botones de estado** visibles en preview |

### 5. Albaranes

| Aspecto | ANTES | DESPUÉS |
|---------|-------|---------|
| Columna Total | Se mostraba (confuso, siempre €0) | **Eliminada**: los albaranes no muestran importes en la lista |
| Estado "Entregado" | No existía en la DB (error) | **Corregido**: nuevo estado `delivered` en la base de datos |
| Conversión a factura | No disponible | **Disponible**: genera factura desde el albarán |

### 6. Pagos

| Aspecto | ANTES | DESPUÉS |
|---------|-------|---------|
| Paginación | Cargaba todos los registros (sin límite) | **Paginación real**: 20 por página con server-side pagination |
| Columna "Conciliado con" | No existía | **Nueva columna**: muestra nº de documento vinculado (ej: FAC-2026-0001) |
| Columna Contacto | No existía | **Nueva columna**: nombre del contacto asociado al pago |

### 7. Proformas

| Aspecto | ANTES | DESPUÉS |
|---------|-------|---------|
| Página | No existía | **Nueva página**: `/dashboard/finance/proformas` con todas las funcionalidades estándar |
| Sidebar | No aparecía | **Agregada** al menú lateral de Finanzas |

### 8. Vista Previa de Documentos

| Aspecto | ANTES | DESPUÉS |
|---------|-------|---------|
| Descuento global | No se mostraba | **Visible**: fila de descuento global entre subtotal e IVA |
| Método de pago | No se mostraba | **Visible**: sección con el método de pago del documento |
| Barra de progreso de pago | No existía | **Nueva**: barra visual de % pagado con colores (verde=pagado, ámbar=pendiente) |
| Registrar pago desde preview | No disponible para todos los tipos | **Disponible**: para facturas y proformas con monto pendiente |

### 9. PDFs

| Aspecto | ANTES | DESPUÉS |
|---------|-------|---------|
| Método de pago | No aparecía | **Visible**: sección "Forma de pago" con método + datos bancarios |
| Descuento global | No aparecía | **Visible**: fila de descuento en el resumen de totales |
| Estado "Aprobado" | No existía | **Visible**: badge de estado en el PDF |
| Estado "Vencido" | No existía | **Visible**: badge en rojo si el documento está vencido |
| Albaranes | Mostraban columnas de precio | **Corregido**: solo Descripción + Cantidad |

---

## Flujo de Estados (Nuevo)

```
FACTURAS / PROFORMAS:
  Borrador → Aprobada → Pendiente → Pagada
                                  → Cancelada
  (Vencida = calculado si fecha vencimiento < hoy)

PRESUPUESTOS:
  Borrador → Aprobado → Pendiente → Aceptado
                                  → Rechazado
  (Vencido = calculado si fecha validez < hoy)

ALBARANES:
  Borrador → Aprobado → Pendiente → Entregado
                                  → Cancelado

FACTURA RECTIFICATIVA:
  Borrador → Aprobada → Pendiente → Pagada
                                  → Cancelada
```

---

## Campos Nuevos en Base de Datos

| Campo | Tabla | Tipo | Descripción |
|-------|-------|------|-------------|
| `global_discount` | `financial_documents` | decimal(10,2) | Valor del descuento global |
| `global_discount_type` | `financial_documents` | text | `"percentage"` o `"fixed"` |
| `payment_method` | `financial_documents` | text | Método de pago seleccionado |
| `bank_account_id` | `financial_documents` | integer (FK) | Cuenta bancaria vinculada |
| `delivered` | enum `document_status` | valor | Nuevo estado para albaranes |
| `default_payment_method` | `organization_finance_settings` | text | Método de pago por defecto |
| `default_bank_account_id` | `organization_finance_settings` | integer (FK) | Cuenta bancaria por defecto |

---

## Componentes Nuevos

### ContactSelector (`contact-selector.tsx`)
- Selector unificado de clientes, proveedores y contactos
- Búsqueda en tiempo real con debounce
- Tabs por categoría: Todos / Clientes / Proveedores / Contactos
- Al seleccionar proveedor → dirección automática = "Pago"
- Al seleccionar cliente → dirección automática = "Cobro"

### NumericPagination (`numeric-pagination.tsx`)
- Componente reutilizable de paginación numérica
- Muestra páginas con ellipsis para rangos largos
- Botones Anterior/Siguiente
- Usado en: Facturas, Presupuestos, Albaranes, Pagos, Proformas

---

## Cálculo de Totales (Nuevo)

```
Subtotal de líneas = Σ (cantidad × precio × (1 - descuento_linea%))

Descuento global:
  Si tipo = "percentage" → monto = subtotal × (descuento_global / 100)
  Si tipo = "fixed"      → monto = descuento_global

Subtotal neto = Subtotal de líneas - Descuento global

IVA = Se calcula proporcional por línea sobre el subtotal neto

TOTAL = Subtotal neto + IVA
```

---

## Bugs Corregidos

| # | Bug | Impacto | Fix |
|---|-----|---------|-----|
| 1 | Estado `delivered` no existía en la DB | Albaranes no podían marcarse como "Entregado" | Agregado al enum + migración |
| 2 | `getDocument()` no retornaba nombre del contacto | Preview mostraba "Sin cliente" | Agregado join de contacts/vendors |
| 3 | Páginas `/new` redirigían a ruta 404 | Error al crear documento por formulario | Convertidas a redirect → drawer |
| 4 | `duplicateDocument()` perdía campos | Duplicar no copiaba descuento, método de pago, etc. | Agregados todos los campos |
| 5 | `convertDocument()` perdía descuento global | Convertir presupuesto a factura perdía descuento | Agregado globalDiscount + direction |
| 6 | Pagos sin paginación real | Cargaba todos los registros, problemas de rendimiento | Paginación server-side con limit/offset |
| 7 | Dirección de pago hardcodeada "cobro" | Facturas de proveedor registraban pago como "cobro" | Dinámico basado en dirección del documento |
| 8 | `company.name` no existía | Error TypeScript en build | Corregido a `tradeName \|\| legalName` |

---

## Archivos Modificados

### Nuevos (3)
- `src/components/finance/contact-selector.tsx` — Selector unificado
- `src/components/ui/numeric-pagination.tsx` — Paginación numérica
- `src/app/dashboard/finance/proformas/page.tsx` — Página de proformas

### Eliminados (1)
- `src/components/finance/document-form.tsx` — Reemplazado por DocumentDrawer

### Modificados (20)
- `src/db/schema.ts` — Enum + campos nuevos
- `src/lib/finance.ts` — 8 funciones actualizadas
- `src/lib/pdf-templates.ts` — Descuento global, método pago, estados
- `src/app/api/finance/documents/route.ts` — Params direction/search
- `src/app/api/finance/payments/route.ts` — Paginación + meta
- `src/components/finance/document-drawer.tsx` — ContactSelector, campos nuevos
- `src/components/finance/document-preview.tsx` — Campos nuevos, direction dinámico
- `src/components/layout/main-sidebar.tsx` — Proformas en sidebar
- `src/app/dashboard/finance/invoices/page.tsx` — Rediseño completo
- `src/app/dashboard/finance/quotes/page.tsx` — Rediseño completo
- `src/app/dashboard/finance/delivery-notes/page.tsx` — Rediseño completo
- `src/app/dashboard/finance/payments/page.tsx` — Paginación real
- `src/app/dashboard/finance/invoices/new/page.tsx` — Redirect → drawer
- `src/app/dashboard/finance/quotes/new/page.tsx` — Redirect → drawer
- `src/app/dashboard/finance/delivery-notes/new/page.tsx` — Redirect → drawer
- `drizzle/0009_cloudy_spitfire.sql` — Migración campos nuevos
- `drizzle/0010_windy_longshot.sql` — Migración delivered
- `drizzle/meta/_journal.json` — Registro de migraciones
- `drizzle/meta/0009_snapshot.json` — Snapshot
- `drizzle/meta/0010_snapshot.json` — Snapshot

---

## Decisiones de Diseño Tomadas

1. **Un solo flujo de creación (Drawer)** — Se eliminó el formulario de página completa en favor del drawer lateral. Menos código, un solo componente que mantener, UX consistente.

2. **Click en fila = Edición** — Antes abría preview. Ahora el click principal abre edición (más productivo). Preview se accede desde el menú de acciones.

3. **Dirección inferida** — En lugar de pedir al usuario "¿es cobro o pago?", se infiere automáticamente: si selecciona un proveedor → pago, si selecciona un cliente → cobro.

4. **Estado "Vencida" calculado** — No se guarda en la DB. Se calcula en frontend comparando fecha de vencimiento con la fecha actual. Así no hace falta un cron job para actualizar estados.

5. **Duplicar = Drawer con datos precargados** — En lugar de crear una copia server-side, se abren los datos en el drawer para que el usuario pueda modificar antes de guardar. Más control, menos duplicados accidentales.

6. **Paginación server-side en todo** — Todas las listas usan paginación real (SQL LIMIT/OFFSET + COUNT) para funcionar con miles de registros.
