---
description: Provider Portal architecture, APIs, and flows
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

```
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
├── organizationId → organizations.id (planner's org)
├── contactId → contacts.id (bidirectional link)
├── name, category, email, phone, website, address
└── rating

contacts
├── isVendor: boolean
├── vendorCategory: text
└── vendorId → vendors.id
```

## File Structure

```
src/app/vendor/           — Provider portal pages
  layout.tsx              — Provider layout with sidebar
  page.tsx                — Dashboard
  events/page.tsx         — Event invitations
  tasks/page.tsx          — Tasks from shared events
  finance/                — Financial module
  profile/page.tsx        — Org profile editor
  team/page.tsx           — Team management
  settings/page.tsx       — Settings

src/app/provider/
  register/page.tsx       — Registration form
  login/page.tsx          — Login page

src/app/admin/providers/
  page.tsx                — Admin provider management

src/app/dashboard/providers/
  page.tsx                — Planner directory

src/components/layout/
  provider-sidebar.tsx    — Provider portal sidebar

src/lib/
  system-init.ts          — Roles and base permissions
  vendors.ts              — Internal vendors + public profiles
  contacts.ts             — Contact CRUD with vendor sync
```

## Email Templates
- `provider-verified` — Sent when admin verifies provider
- `provider-rejected` — Sent when admin rejects (includes reason)
- `provider-event-invitation` — Sent when planner invites to event
- All emails use Resend, non-blocking with `.catch()` error logging
