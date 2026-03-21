---
name: provider-portal
description: >-
  HubEnts Provider Portal registration, verification, event collaboration, vendor
  APIs, and data model. Use when working on /vendor, /provider/register, admin
  providers, planner directory, or providerEventAccess flows.
---

# Skill: Provider Portal

## Overview

The Provider Portal allows service providers (DJ, catering, photography, etc.) to register on HubEnts, get verified by an admin, appear in a public directory, and collaborate on events with planners.

## Registration Flow

1. Provider fills form at `/provider/register` (name, email, password, category, Instagram, phone, service radius)
2. API: `POST /api/auth/provider-register` creates user + organization (orgType='provider') + membership (role=provider_owner)
3. Provider logs in at `/provider/login` → redirected to `/vendor` dashboard
4. Admin sees new provider at `/admin/providers` → verifies or rejects
5. Verified providers appear in planner directory at `/dashboard/providers`

## Event Collaboration Flow

1. Planner invites provider from event's vendor page → `POST /api/events/[eventId]/providers`
2. Provider receives email notification
3. Provider sees invitation at `/vendor/events` → accepts or rejects
4. If accepted: provider can see event tasks at `/vendor/tasks`
5. Table: `providerEventAccess` tracks status (pending/active/rejected/revoked)

## Key APIs

### Provider Auth

- `POST /api/auth/provider-register` — Register new provider org
- Middleware handles `/vendor/*` routes for provider auth

### Provider Portal

- `GET /api/vendor/dashboard` — Dashboard stats
- `GET /api/vendor/events` — List event invitations
- `POST /api/vendor/events/[eventId]/respond` — Accept/reject invitation
- `GET /api/vendor/tasks` — Tasks from shared events
- `GET|PUT /api/vendor/profile` — Organization profile CRUD
- `GET /api/vendor/finance/*` — Financial module

### Admin

- `GET /api/admin/providers` — List all providers with filters
- `POST /api/admin/providers/[id]/verify` — Verify or reject provider

### Planner-facing

- `GET /api/providers` — Directory of verified providers
- `GET /api/providers/[slug]` — Public provider profile
- `GET /api/events/[eventId]/providers` — Providers assigned to event
- `POST /api/events/[eventId]/providers` — Invite provider to event

## Database Tables

```text
organizations (orgType='provider')
├── verificationStatus: unverified | verified | rejected | suspended
├── providerCategory: text
├── instagramHandle: text
├── serviceRadius: integer
└── serviceAreas: json

providerEventAccess
├── providerOrgId → organizations.id
├── eventId → events.id
├── plannerOrgId → organizations.id
├── vendorId → vendors.id (optional link)
├── status: pending | active | rejected | revoked
└── invitedBy → users.id

vendors (internal to planner)
contacts (isVendor, vendorId, ...)
```

## File Structure

```text
src/app/vendor/
src/app/provider/register|login
src/app/admin/providers/
src/app/dashboard/providers/
src/components/layout/provider-sidebar.tsx
src/lib/system-init.ts, vendors.ts, contacts.ts
```

## Email Templates

- `provider-verified`, `provider-rejected`, `provider-event-invitation`
- Resend, non-blocking with `.catch()` logging

## Related project rules

- `.cursor/rules/hubents-rbac-provider.mdc`
- `.cursor/rules/hubents-project-architecture.mdc`

## See also

- `hubents-deploy` — emails and env on production
- `create-drawer` — UI patterns for vendor/planner drawers

## Source

Copied from `.windsurf/skills/provider-portal/SKILL.md` (Windsurf copy unchanged).
