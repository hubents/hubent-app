# Plan Maestro Unificado: RBAC + Portal de Proveedores

> **Versión:** 2.0 | **Fecha:** 14 Feb 2026
> **Tickets:** RBAC TENANTS + Portal Proveedores
> **Decisión:** Implementar RBAC primero (base) → Portal Proveedores encima (reutiliza RBAC)

---

## Índice

1. [Diagnóstico Actual](#1-diagnóstico-actual)
2. [Arquitectura Unificada](#2-arquitectura-unificada)
3. [FASE 1: RBAC Foundation](#3-fase-1-rbac-foundation)
4. [FASE 2: RBAC UI para Tenants](#4-fase-2-rbac-ui-para-tenants)
5. [FASE 3: RBAC Enforcement en APIs](#5-fase-3-rbac-enforcement-en-apis)
6. [FASE 4: Schema Provider Portal](#6-fase-4-schema-provider-portal)
7. [FASE 5: Registro y Auth Provider](#7-fase-5-registro-y-auth-provider)
8. [FASE 6: Layout y Dashboard Provider](#8-fase-6-layout-y-dashboard-provider)
9. [FASE 7: Super Admin - Proveedores](#9-fase-7-super-admin-proveedores)
10. [FASE 8: Perfil Público Provider](#10-fase-8-perfil-público-provider)
11. [FASE 9: Eventos Cross-Org](#11-fase-9-eventos-cross-org)
12. [FASE 10: CRM y Finanzas Provider](#12-fase-10-crm-y-finanzas-provider)
13. [FASE 11: Integración Planner ↔ Provider](#13-fase-11-integración-planner--provider)
14. [FASE 12: Emails, Notificaciones y Testing](#14-fase-12-emails-notificaciones-y-testing)
15. [Timeline y Resumen](#15-timeline-y-resumen)

---

## 1. Diagnóstico Actual

### RBAC Backend (EXISTE pero NO se usa bien)

| Componente | Estado | Problema |
|-----------|--------|----------|
| `roles` tabla | ✅ Existe | System roles solo, no custom roles por tenant |
| `permissions` tabla | ✅ Existe | 25+ permisos definidos (events:read, tasks:create, etc.) |
| `rolePermissions` tabla | ✅ Existe | Vinculaciones correctas |
| `seed-roles.ts` | ✅ 8 roles | Owner, Admin, Planner, Assistant, Accountant, Viewer, Vendor, Client |
| `requireRole()` | ✅ Funciona | Pero usa jerarquía simple, NO permisos granulares |
| `hasPermission()` | ✅ Implementado | **NUNCA se usa** en APIs reales |
| `canAccessEvent()` | ✅ Implementado | Placeholder, no tiene lógica real para vendors/clients |

### RBAC UI (INCOMPLETO)

| Componente | Estado | Problema |
|-----------|--------|----------|
| Team page (`/dashboard/team`) | ⚠️ Parcial | Solo muestra 3 roles hardcodeados: admin, member, viewer |
| Invite dialog | ⚠️ Parcial | El rol "member" **no existe** en seed-roles, crea role fantasma |
| Settings > Equipo | ❌ Solo redirect | No hay gestión de roles ni permisos |
| Custom roles UI | ❌ No existe | Tenants no pueden crear roles personalizados |
| Permission matrix | ❌ No existe | No se puede ver/editar qué puede hacer cada rol |
| Audit log de roles | ❌ No existe | No hay historial de cambios |

### Provider Portal (NO existe)

- Middleware ya contempla `/vendor` routes
- `ExternalUserType` definido con `"vendor" | "client"`
- Tablas vendor existentes: `vendors`, `vendorProfiles`, `vendorPortfolio`, `vendorReviews`, `vendorClaims`
- `eventVendors`, `taskParticipants.vendorId` → vinculaciones existentes

---

## 2. Arquitectura Unificada

### Modelo de datos extendido

```
organizations
├── orgType: "tenant" | "provider" | "client"   ← NUEVO
├── verificationStatus: "unverified" | ...       ← NUEVO (para providers)
└── ...existing fields...

roles
├── isSystem: true/false
├── organizationId: null (global) | number (custom per tenant/provider)
└── permissions via rolePermissions

organizationMembers
├── userId → users.id
├── roleId → roles.id (system o custom)
└── organizationId → organizations.id
```

### Flujo RBAC unificado

```
API Request
  → requireAuth() → TenantSession { userId, orgId, role, permissions[] }
  → requirePermission("tasks:create") ← NUEVO (reemplaza requireRole en muchos casos)
  → si es provider org: mismas tablas, mismos permisos, distinto orgType
```

### ¿Por qué RBAC primero?

1. El Portal Provider **necesita** RBAC funcional (org tipo provider con roles internos)
2. La team page necesita mostrar roles reales ANTES de que entren providers
3. `requirePermission()` debe existir ANTES de crear APIs del provider portal
4. Mismos archivos modificados → hacerlo junto evita re-work

---

## 3. FASE 1: RBAC Foundation (2 días)

### Objetivo: Arreglar la base de datos y funciones de RBAC

### 1.1 Arreglar el mapeo de roles en team page

**Archivo:** `src/app/dashboard/team/page.tsx`

```typescript
// ANTES (hardcoded, incorrecto):
const roleLabels: Record<string, string> = {
  owner: "Propietario",
  admin: "Administrador",
  member: "Miembro",      // ← NO EXISTE en seed
  viewer: "Visualizador",
};

// DESPUÉS (todos los roles del seed):
const roleLabels: Record<string, string> = {
  owner: "Propietario",
  admin: "Administrador",
  planner: "Planner",
  assistant: "Asistente",
  accountant: "Contable",
  viewer: "Visualizador",
  vendor: "Proveedor",
  client: "Cliente",
};
```

**Archivo:** `src/app/dashboard/team/page.tsx` → Select de invitación

```typescript
// ANTES (solo 3 roles):
<SelectItem value="admin">Administrador</SelectItem>
<SelectItem value="member">Miembro</SelectItem>
<SelectItem value="viewer">Visualizador</SelectItem>

// DESPUÉS (roles reales, filtrados por permisos del invitador):
// Se obtienen de la API, no hardcodeados
// Owner puede invitar: Admin, Planner, Assistant, Accountant, Viewer
// Admin puede invitar: Planner, Assistant, Accountant, Viewer
// Planner puede invitar: Assistant, Viewer
```

### 1.2 Crear función `requirePermission()`

**Archivo:** `src/lib/session.ts`

```typescript
/**
 * Require a specific permission (granular RBAC)
 * Falls back to role hierarchy for backward compatibility
 */
export async function requirePermission(
  permission: string
): Promise<TenantSession> {
  const session = await requireAuth();
  
  // Platform admins bypass
  if (session.user.platformLevel === "super_admin") return session;
  
  // Owner and admin have all permissions
  if (session.role === "owner" || session.role === "admin") return session;
  
  // Impersonation has full access
  if (session.isImpersonating) return session;
  
  // Check specific permission
  if (session.permissions.includes(permission)) return session;
  
  // Check wildcard (e.g., "events:*")
  const [resource] = permission.split(":");
  if (session.permissions.includes(`${resource}:*`)) return session;
  
  throw new Error(`Forbidden: Missing permission ${permission}`);
}
```

### 1.3 API para obtener roles disponibles

**Archivo nuevo:** `src/app/api/roles/route.ts`

```typescript
// GET /api/roles - Lista roles del sistema + custom de la org
// GET /api/roles/[id] - Detalle de un rol con permisos
// POST /api/roles - Crear rol custom (solo owner/admin)
// PATCH /api/roles/[id] - Editar rol custom
// DELETE /api/roles/[id] - Eliminar rol custom (si no tiene miembros)
```

### 1.4 API para obtener permisos disponibles

**Archivo nuevo:** `src/app/api/permissions/route.ts`

```typescript
// GET /api/permissions - Lista todos los permisos agrupados por recurso
// Respuesta:
{
  events: [
    { slug: "events:read", name: "Ver Eventos", action: "read" },
    { slug: "events:create", name: "Crear Eventos", action: "create" },
    ...
  ],
  tasks: [...],
  finance: [...],
  ...
}
```

### 1.5 API para invitación con roles reales

**Archivo:** `src/app/api/team/invite/route.ts` → Refactorizar
- Validar que el rol enviado existe en la DB
- No crear roles on-the-fly (eliminar el fallback actual)
- Verificar que el invitador puede asignar ese rol (canInviteRole)

### 1.6 Hook `useRoles()`

**Archivo nuevo:** `src/hooks/use-roles.ts`

```typescript
export function useRoles() {
  // Fetch roles from /api/roles
  // Returns: { systemRoles, customRoles, loading, createRole, updateRole, deleteRole }
}
```

---

## 4. FASE 2: RBAC UI para Tenants (3 días)

### Objetivo: Panel completo de gestión de roles y permisos

### 2.1 Nueva página: Gestión de Roles

**Archivo nuevo:** `src/app/dashboard/settings/roles/page.tsx`

**Layout:**
```
┌─────────────────────────────────────────────────┐
│ Roles y Permisos                    [+ Nuevo Rol]│
├─────────────────────────────────────────────────┤
│                                                  │
│ ROLES DEL SISTEMA (no editables)                │
│ ┌──────────┬──────────────────────┬────────────┐│
│ │ Owner    │ Control total        │ 25/25 perm ││
│ │ Admin    │ Acceso administrativo│ 25/25 perm ││
│ │ Planner  │ Planificador eventos │ 20/25 perm ││
│ │ Assistant│ Asistente            │ 8/25 perm  ││
│ │ Account. │ Solo finanzas        │ 5/25 perm  ││
│ │ Viewer   │ Solo lectura         │ 4/25 perm  ││
│ └──────────┴──────────────────────┴────────────┘│
│                                                  │
│ ROLES PERSONALIZADOS                             │
│ ┌──────────┬──────────────────────┬────────────┐│
│ │ Decorador│ Acceso a tareas+ev.  │ 8/25 perm  ││
│ │ DJ       │ Solo tareas          │ 3/25 perm  ││
│ └──────────┴──────────────────────┴────────────┘│
│                                                  │
└─────────────────────────────────────────────────┘
```

### 2.2 Drawer/Dialog de edición de permisos

**Al hacer click en un rol → Drawer con matriz de permisos:**

```
┌──────────────────────────────────────────┐
│ Editar Rol: Planner                      │
├──────────────────────────────────────────┤
│ Nombre: [Planner        ]                │
│ Descripción: [Planificador de eventos]   │
│                                          │
│ PERMISOS                                 │
│ ┌────────────┬───┬───┬───┬───┬─────────┐│
│ │ Recurso    │ 👁│ ➕│ ✏️│ 🗑│ Especial ││
│ ├────────────┼───┼───┼───┼───┼─────────┤│
│ │ Eventos    │ ✅│ ✅│ ✅│ ❌│         ││
│ │ Tareas     │ ✅│ ✅│ ✅│ ❌│ 💬 Chat  ││
│ │ Proveedores│ ✅│ ✅│ ✅│ ❌│         ││
│ │ Clientes   │ ✅│ ✅│ ✅│ ❌│         ││
│ │ CRM        │ ✅│   │   │   │ 🔧 Full ││
│ │ Finanzas   │ ✅│ ✅│   │   │ 🔧 Full ││
│ │ Invitados  │ ✅│   │   │   │ 🔧 Full ││
│ │ Equipo     │ ✅│   │   │   │ 📩 Inv. ││
│ │ Config     │ ❌│   │   │   │         ││
│ └────────────┴───┴───┴───┴───┴─────────┘│
│                                          │
│          [Cancelar]  [Guardar]           │
└──────────────────────────────────────────┘
```

### 2.3 Refactorizar Team Page

**Archivo:** `src/app/dashboard/team/page.tsx`

Cambios:
- Select de rol obtiene roles de API (no hardcoded)
- Mostrar permisos del rol al seleccionar (tooltip o badge count)
- Permitir cambiar rol de miembro existente (dropdown inline)
- Mostrar badge "Sistema" vs "Custom" en roles
- Link "Gestionar Roles" → `/dashboard/settings/roles`

### 2.4 Refactorizar Settings > Equipo

**Archivo:** `src/app/dashboard/settings/page.tsx`

Cambio: "Equipo" ahora muestra submenu:
- "Miembros" → `/dashboard/team`
- "Roles y Permisos" → `/dashboard/settings/roles`

### 2.5 Historial de cambios de roles

**Tabla nueva (opcional, se puede usar `auditLogs` existente):**
- Reutilizar `auditLogs` con resource="role" y action="update"/"create"/"delete"
- Mostrar historial en la página de roles

---

## 5. FASE 3: RBAC Enforcement en APIs (2 días)

### Objetivo: Migrar APIs de requireRole() a requirePermission()

### 3.1 Migración gradual de APIs

| API Route | Actual | Nuevo |
|-----------|--------|-------|
| `GET /api/tasks` | `requireRole("viewer")` | `requirePermission("tasks:read")` |
| `POST /api/tasks` | `requireRole("planner")` | `requirePermission("tasks:create")` |
| `PATCH /api/tasks/[id]` | `requireRole("planner")` | `requirePermission("tasks:update")` |
| `DELETE /api/tasks/[id]` | `requireRole("planner")` | `requirePermission("tasks:delete")` |
| `GET /api/events` | `requireRole("viewer")` | `requirePermission("events:read")` |
| `POST /api/events` | `requireRole("planner")` | `requirePermission("events:create")` |
| `GET /api/finance/*` | `requireRole("viewer")` | `requirePermission("finance:read")` |
| `POST /api/finance/*` | `requireRole("planner")` | `requirePermission("finance:create")` |
| `GET /api/contacts` | `requireRole("viewer")` | `requirePermission("crm:read")` |
| `POST /api/contacts` | `requireRole("planner")` | `requirePermission("crm:manage")` |
| `GET /api/team` | `requireRole("viewer")` | `requirePermission("team:read")` |
| `POST /api/team/invite` | `requireRole("admin")` | `requirePermission("team:invite")` |

### 3.2 Middleware de permisos para sidebar

**Archivo:** `src/components/layout/main-sidebar.tsx`

- Ocultar items del sidebar según permisos del usuario
- Ej: Accountant solo ve Dashboard + Finanzas + Contactos (lectura)
- Hook `usePermissions()` para consultar permisos client-side

### 3.3 Permisos en componentes UI

**Hook nuevo:** `src/hooks/use-permissions.ts`

```typescript
export function usePermissions() {
  // Obtiene permisos del session context
  return {
    can: (permission: string) => boolean,
    canAny: (permissions: string[]) => boolean,
    canAll: (permissions: string[]) => boolean,
    role: string,
    isOwner: boolean,
    isAdmin: boolean,
  };
}
```

**Uso en componentes:**
```tsx
const { can } = usePermissions();

{can("tasks:create") && <Button>Nueva Tarea</Button>}
{can("finance:manage") && <Link href="/dashboard/finance/settings">Config</Link>}
```

---

## 6. FASE 4: Schema Provider Portal (1 día)

### Objetivo: Extensiones de schema para organizaciones tipo provider

### 4.1 Agregar `orgType` a organizations

```sql
ALTER TABLE organizations ADD COLUMN org_type TEXT DEFAULT 'tenant';
-- Valores: 'tenant', 'provider', 'client'
```

### 4.2 Campos provider en organizations

```sql
ALTER TABLE organizations ADD COLUMN instagram_handle TEXT;
ALTER TABLE organizations ADD COLUMN service_radius INTEGER; -- km
ALTER TABLE organizations ADD COLUMN service_areas JSONB;
ALTER TABLE organizations ADD COLUMN verification_status TEXT DEFAULT 'unverified';
-- unverified, verified, rejected, suspended
ALTER TABLE organizations ADD COLUMN verified_at TIMESTAMP;
ALTER TABLE organizations ADD COLUMN verified_by TEXT REFERENCES users(id);
ALTER TABLE organizations ADD COLUMN rejection_reason TEXT;
ALTER TABLE organizations ADD COLUMN provider_category TEXT;
ALTER TABLE organizations ADD COLUMN provider_plan TEXT DEFAULT 'free';
-- free, pro
```

### 4.3 Tabla provider_event_access (cross-org)

```sql
CREATE TABLE provider_event_access (
  id SERIAL PRIMARY KEY,
  provider_org_id INTEGER NOT NULL REFERENCES organizations(id),
  event_id INTEGER NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  planner_org_id INTEGER NOT NULL REFERENCES organizations(id),
  vendor_id INTEGER REFERENCES vendors(id),
  invited_by TEXT REFERENCES users(id),
  status TEXT DEFAULT 'pending', -- pending, accepted, declined
  invited_at TIMESTAMP DEFAULT NOW(),
  accepted_at TIMESTAMP
);
```

### 4.4 Nuevos document types

```sql
ALTER TYPE document_type ADD VALUE 'rectificative_invoice';
ALTER TYPE document_type ADD VALUE 'loading_document';
```

### 4.5 Roles de sistema para providers

Agregar al seed:
```typescript
// Roles específicos para organizaciones provider
{
  name: "Provider Owner",
  slug: "provider_owner",
  description: "Dueño de la organización proveedora",
  isSystem: true,
  permissions: ["*"],
},
{
  name: "Provider Admin",
  slug: "provider_admin",
  description: "Administrador del proveedor",
  isSystem: true,
  permissions: [
    "events:read", "tasks:*", "finance:*",
    "crm:*", "team:*", "settings:*",
  ],
},
{
  name: "Provider Technician",
  slug: "provider_tech",
  description: "Técnico del proveedor (acceso a tareas y eventos asignados)",
  isSystem: true,
  permissions: [
    "events:read", "tasks:read", "tasks:update", "tasks:comment",
  ],
},
```

**Impacto en tenants/admin:** NINGUNO. Columnas opcionales nuevas.

---

## 7. FASE 5: Registro y Auth Provider (2-3 días)

### Archivos nuevos:
- `src/app/provider/(auth)/register/page.tsx`
- `src/app/provider/(auth)/login/page.tsx`
- `src/app/provider/(auth)/layout.tsx`
- `src/app/api/auth/provider-register/route.ts`

### Flujo de registro independiente:
```
1. /provider/register
2. Formulario: Nombre empresa, Email, Password, Instagram (OBLIGATORIO), Categoría, Teléfono, Radio de trabajo
3. Se crea: User + Organization (orgType='provider', verificationStatus='unverified')
4. Se asigna rol provider_owner
5. Email verificación → Super Admin aprueba/rechaza
```

### Flujo invitación desde Planner:
```
1. Planner agrega proveedor → envía email con link /provider/register?invite=TOKEN
2. Proveedor completa registro (datos pre-filled)
3. Se vincula vendor con org provider
```

### Middleware:
```typescript
// /provider/* → requiere auth + org con orgType='provider'
// /provider/register, /provider/login → rutas públicas de auth
```

---

## 8. FASE 6: Layout y Dashboard Provider (2 días)

### Archivos nuevos:
- `src/app/provider/layout.tsx`
- `src/app/provider/page.tsx` (dashboard)
- `src/components/layout/provider-sidebar.tsx`

### Sidebar del proveedor (con RBAC):
```
📊 Dashboard
📅 Calendario
📅 Eventos (donde está invitado)
👥 Contactos (CRM propio - submenu)
📋 CRM (pipeline propio)
✅ Tareas (propias + de eventos)
💰 Finanzas (submenu completo)
🤖 Enti IA
⚙️ Configuración
👤 Mi Perfil (perfil público)
```

**RBAC aplicado:** El sidebar oculta secciones según permisos del usuario.
- Provider Owner ve todo
- Provider Admin ve todo excepto facturación de plataforma
- Provider Technician solo ve Eventos + Tareas + Chat

### Dashboard:
- Eventos activos
- Tareas pendientes
- Próximas fechas
- Métricas (leads, eventos completados, facturación)
- Estado de verificación (badge prominente si "Sin Verificar")

---

## 9. FASE 7: Super Admin - Proveedores (2 días)

### Archivos nuevos:
- `src/app/admin/providers/page.tsx`
- `src/app/admin/providers/[id]/page.tsx`
- `src/app/api/admin/providers/route.ts`
- `src/app/api/admin/providers/[id]/verify/route.ts`

### Dashboard:
- Total registrados, verificados, sin verificar, rechazados
- Por plan (Gratis/Pro)
- Nuevos últimos 30 días

### Lista con filtros:
- Estado: Todos / Sin Verificar / Verificados / Rechazados / Suspendidos
- Plan, categoría, búsqueda
- Acciones: Verificar, Rechazar, Cambiar plan, Suspender, Eliminar

### Emails:
- Invitación masiva (CSV)
- Recordatorio verificación
- Bienvenida (al aprobar)
- Rechazo (con motivo)

---

## 10. FASE 8: Perfil Público Provider (1-2 días)

### Campos obligatorios:
| Campo | Requerido |
|-------|-----------|
| Nombre comercial | ✅ |
| **Instagram** | **✅ OBLIGATORIO** |
| Descripción | ✅ |
| Categoría | ✅ |
| **Radio de trabajo (km)** | **✅** |
| Áreas de servicio | ✅ |
| Imagen portada | ✅ |

### Landing pública `/vendor/[slug]`:
- Portada + nombre + rating
- Descripción + servicios
- Instagram embed
- Portfolio (galería)
- Reseñas
- Badge: 🟢 Verificado o 🟡 Sin Verificar

---

## 11. FASE 9: Eventos Cross-Org (3 días)

### La fase más compleja. Acceso cross-organizacional.

### Flujo:
```
1. Planner agrega vendor a evento (eventVendors)
2. Si vendor tiene org provider → se crea provider_event_access
3. Notificación al proveedor
4. Proveedor acepta → ve evento en su panel
```

### Lo que el proveedor VE en un evento:
- ✅ Nombre del evento, fecha, ubicación
- ✅ **Nombre de los clientes/novios**
- ✅ Tareas donde participa + tareas propias
- ❌ Presupuesto total
- ❌ Tareas donde NO participa
- ❌ Lista de invitados
- ❌ Otros proveedores (excepto en tareas compartidas)

### Submenu evento para provider:
1. General - Info del evento
2. Tareas - Donde participa + propias
3. Finanzas - Su presupuesto (no el del evento)
4. Configuración - Datos (read-only, sin presupuesto)
5. Colaboradores - Su equipo para este evento

### RBAC en eventos:
- `provider_owner` → ve todo de su org en el evento
- `provider_admin` → ve todo excepto finanzas globales
- `provider_tech` → solo ve tareas asignadas + chat

---

## 12. FASE 10: CRM y Finanzas Provider (2-3 días)

### Reutilizar componentes existentes:

**CRM:** Mismos componentes de `/dashboard/contacts` y `/dashboard/crm`
- Pipeline propio
- Clientes = Planners que lo contratan
- RBAC: `provider_tech` no ve CRM

**Finanzas:** Mismos componentes de `/dashboard/finance/*`
- Dashboard propio
- Presupuestos, facturas, albaranes
- **Factura rectificativa** (nuevo tipo)
- **Documento de carga** (nuevo tipo)
- RBAC: Solo `provider_owner` y `provider_admin` ven finanzas

---

## 13. FASE 11: Integración Planner ↔ Provider (1-2 días)

### Cambios en vista del Planner:
- Badge de estado: 🟡 Sin Verificar / 🟢 Verificado
- Botón "Invitar al Portal" al agregar proveedor
- Provider "Save" solo guarda verificados

### RBAC del Planner para proveedores:
- `requirePermission("vendors:create")` → puede agregar proveedores
- `requirePermission("vendors:update")` → puede editar
- `requirePermission("vendors:delete")` → puede eliminar
- Planner Assistant → solo `vendors:read`

---

## 14. FASE 12: Emails, Notificaciones y Testing (2 días)

### Emails:
1. Invitación registro (desde Planner)
2. Invitación registro (desde Super Admin)
3. Verificación de email
4. Aprobado ✅
5. Rechazado ❌ + motivo
6. Invitación a evento
7. Recordatorio verificación

### Testing:
- Flujo RBAC completo (cada rol ve solo lo que debe)
- Flujo registro provider
- Acceso cross-org a eventos
- Finanzas independientes
- Permisos por recurso

---

## 15. Timeline y Resumen

### Timeline

| Fase | Descripción | Días | Acumulado |
|------|-------------|------|-----------|
| **RBAC** | | | |
| 1 | RBAC Foundation (APIs, requirePermission, fix team page) | 2 | 2 |
| 2 | RBAC UI (roles management, permission matrix) | 3 | 5 |
| 3 | RBAC Enforcement (migrar APIs, sidebar, hook) | 2 | 7 |
| **PROVIDER** | | | |
| 4 | Schema Provider Portal (migraciones) | 1 | 8 |
| 5 | Registro y Auth Provider | 2-3 | 11 |
| 6 | Layout y Dashboard Provider | 2 | 13 |
| 7 | Super Admin - Proveedores | 2 | 15 |
| 8 | Perfil Público Provider | 1-2 | 17 |
| 9 | Eventos Cross-Org | 3 | 20 |
| 10 | CRM y Finanzas Provider | 2-3 | 23 |
| 11 | Integración Planner ↔ Provider | 1-2 | 25 |
| 12 | Emails, Notificaciones y Testing | 2 | 27 |
| **TOTAL** | | **~27 días** | **~5.5 semanas** |

### Impacto por área

| Área | Impacto | Detalle |
|------|---------|---------|
| **Schema** | MODERADO | orgType en orgs, provider_event_access, nuevos enums |
| **Tenants (Planners)** | ALTO (positivo) | RBAC real, gestión de roles, permisos granulares |
| **Super Admin** | MODERADO | Sección proveedores + verificación |
| **Middleware** | BAJO | Ya preparado, detectar orgType |
| **APIs** | ALTO | Migrar de requireRole a requirePermission |
| **Componentes reutilizados** | ~75% | CRM, Finanzas, Calendario, Tareas, Chat |
| **Componentes nuevos** | ~25% | RBAC UI, Provider layout, registro, perfil público |

### Orden de ejecución

```
FASE 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 11 → 10 → 12
RBAC Foundation → RBAC UI → Enforcement → Schema → Registro → Layout → Admin → Perfil → Eventos → Integración → CRM/Fin → Testing
```

### Fuera de alcance

- ❌ Add-on Logística
- ❌ Add-on Reservas/Alojamiento
- ❌ Instagram API real (solo embed)
- ❌ Portal de Clientes (presupuesto separado: $1,200)
- ❌ PDF del perfil público

### Planes provider

| Feature | Gratis | Pro (14.50€/mes) |
|---------|--------|-------------------|
| Usuarios | 1 | 3 |
| Eventos activos | 1 | Ilimitados |
| Perfil profesional | ✅ | ✅ |
| CRM + Finanzas | ✅ | ✅ |
| Roles de equipo | ❌ | ✅ |
| Recomendado | ❌ | ✅ |
