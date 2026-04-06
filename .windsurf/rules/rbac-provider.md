---
description: Rules for RBAC system and Provider Portal architecture
---

# RBAC & Provider Portal Rules

## Permission System

- All API routes MUST use `requirePermission(resource, action)` — never `requireRole()`
- Resources: `events`, `tasks`, `vendors`, `team`, `finance`, `crm`, `settings`, `providers`
- Actions: `read`, `create`, `update`, `delete`
- Permission check hook: `usePermissions()` → `can("resource:action")`
- Session hook: `useUserSession()` returns `{ role, permissions, orgType }`

## Roles

### Tenant Roles (planner organizations)
- `owner` — Full bypass, control total
- `admin` — Full bypass, control total (equivale a Management de la propuesta)
- `planner` — 19 permisos: eventos, tareas, contacts, vendors, finance read, CRM, forms
- `assistant` — eventScoped, 6 permisos: eventos read, tareas CRUD, vendors read, forms read
- `accountant` — 7 permisos: finance completo, CRM read, vendors read, settings read
- `viewer` — eventScoped, 5 permisos: solo lectura en eventos, tareas, vendors, finance, forms
- `client` — eventScoped, 2 permisos: eventos read, tareas read

### Provider Roles (provider organizations)
- `provider_owner` — Full bypass, control total del portal vendor
- `provider_admin` — 12 permisos: eventos, tareas, vendors, team, finance, CRM, settings, forms
- `provider_tech` — 4 permisos: eventos read, tareas read/update, forms read

### Event-Scoped Roles
- `assistant`, `viewer`, `client` tienen `eventScoped = true`
- Solo ven eventos donde son `event_participants`
- Permisos granulares por evento via `event_participants.permissions` JSON

### Canonical Permissions (26 total)
- Resources: events, tasks, vendors, team, finance, crm, settings, forms
- Actions: read, create, update, delete, invite, manage
- Script de reset: `scripts/hard-reset-permissions.ts` (idempotente, safe to re-run)

## Two Types of Vendors (Critical Architecture)

### 1. Vendor Contacts (Internal CRM)
- Table: `vendors` + `contacts.isVendor`
- Created by: The planner, manually
- Visibility: Private to the planner's organization
- Purpose: Personal vendor directory, invoicing, event assignment
- Sync: Bidirectional between `contacts` and `vendors` tables
- Files: `src/lib/vendors.ts`, `src/lib/contacts.ts`

### 2. Provider Organizations (Platform)
- Table: `organizations` where `orgType = 'provider'`
- Created by: Unified registration at `/auth/register` (user selects "Proveedor" org type)
- Visibility: Public directory (after admin verification)
- Purpose: Event collaboration, Partners / public profile, team management
- Both planners and providers use `/dashboard` — NO separate `/vendor` portal

### Event Vendor Page (`/dashboard/events/[id]/vendors`)
- Shows BOTH types side by side
- "Proveedores de Plataforma" = invited provider organizations
- "Proveedores Locales" = assigned vendor contacts from CRM
- Table: `providerEventAccess` for platform providers, `eventVendors` for local vendors

## Unified Portal (all at /dashboard)
- All org types use `/dashboard` layout with `MainSidebar`
- Sidebar sections configured per orgType via `tenant-types.ts` → `getSidebarSections()`
- `/vendor/*` redirected to `/dashboard/*` by middleware
- `/provider/register` redirected to `/auth/register` by middleware
- `/vendor/settings` — Settings

## Email Templates
- Provider verified → congratulations email
- Provider rejected → rejection with reason
- Provider invited to event → invitation email
- All emails are non-blocking (fire-and-forget with .catch() logging)
