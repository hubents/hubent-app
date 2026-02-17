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
- `owner` — Full access
- `admin` — Full access except billing
- `planner` — Events, tasks, contacts, vendors, finance
- `assistant` — Events and tasks only
- `accountant` — Finance only
- `viewer` — Read-only everywhere

### Provider Roles (provider organizations)
- `provider_owner` — Full access to provider portal
- `provider_admin` — Manage team and settings
- `provider_tech` — View assigned events and tasks

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
- Created by: Self-registration at `/provider/register`
- Visibility: Public directory (after admin verification)
- Purpose: Own portal, event collaboration, team management
- Verification: Admin verifies → appears in directory
- Files: `src/app/vendor/` (portal), `src/app/admin/providers/` (admin)

### Event Vendor Page (`/dashboard/events/[id]/vendors`)
- Shows BOTH types side by side
- "Proveedores de Plataforma" = invited provider organizations
- "Proveedores Locales" = assigned vendor contacts from CRM
- Table: `providerEventAccess` for platform providers, `eventVendors` for local vendors

## Provider Portal Routes
- `/provider/register` — Registration
- `/provider/login` — Login
- `/vendor` — Dashboard
- `/vendor/events` — Event invitations
- `/vendor/tasks` — Tasks from shared events
- `/vendor/finance` — Own financial module
- `/vendor/profile` — Organization profile
- `/vendor/team` — Team management
- `/vendor/settings` — Settings

## Email Templates
- Provider verified → congratulations email
- Provider rejected → rejection with reason
- Provider invited to event → invitation email
- All emails are non-blocking (fire-and-forget with .catch() logging)
