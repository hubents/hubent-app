---
description: >-
  HubEnts unified portal for providers — registration, onboarding, event
  collaboration, cross-org task sync, Partners public profile. Use when working on
  provider registration, providerEventAccess, cross-org collaboration, or
  Partners directory features. There is NO separate /vendor portal.
---

# Skill: Provider Portal (Unified)

## Architecture Overview

Providers and planners share a SINGLE portal at `/dashboard`. There is NO `/vendor` route tree. The sidebar, events, tasks, finance, and settings pages adapt dynamically based on `orgType` and plan features.

- `orgType = "tenant"` — Planner organizations
- `orgType = "provider"` — Provider organizations
- Both use the same 7 universal roles: owner, admin, manager, accountant, staff, viewer, client
- Sidebar sections configured per orgType in `src/config/tenant-types.ts` via `getSidebarSections()`
- Middleware at `src/middleware.ts` redirects any `/vendor/*` request to `/dashboard/*`

## Registration Flow (Unified)

1. User fills unified form at `/auth/register`, selects "Proveedor" as org type (name, email, password, company name)
2. API: `POST /api/auth/register` with `orgType: "provider"` creates user + organization (orgType='provider') + membership (role=owner) + provider-free plan
3. Auto-login redirects to `/onboarding?welcome=true` (provider-specific steps: profile, company-public-profile, profile-preview, team)
4. Provider-specific fields (category, Instagram, city, etc.) are collected during onboarding step `company-public-profile`
5. After onboarding: provider lands at `/dashboard`
6. Admin sees new provider at `/admin/tenants` (filter by orgType=provider) and verifies
7. Verified providers appear in Partners at `/dashboard/partners` and `/providers`

**NOTE:** `/provider/register` is DEPRECATED — middleware redirects to `/auth/register`. The separate API `/api/auth/provider-register` has been removed.

## Event Collaboration Flow

1. Planner invites provider from event vendor page → `POST /api/events/[eventId]/providers`
2. Creates `providerEventAccess` row (status: pending) + local vendor record + eventVendors link
3. Provider receives email notification
4. Provider sees invitation in their events list at `/dashboard/events` (scope=accessible)
5. Provider accepts/rejects via `PATCH /api/events/collaborations/[accessId]`
6. If accepted: tasks appear in provider's task board automatically via `useTasks` hook (merges scope=collaborated)

## Key APIs

### Provider Auth
- `POST /api/auth/register` with `orgType: "provider"` — Register new provider org (role=owner, plan=provider-free)

### Unified APIs with scope params
- `GET /api/events?scope=collaborated` — Events where org has active providerEventAccess
- `GET /api/events?scope=accessible` — Both owned + collaborated events
- `GET /api/tasks?scope=collaborated` — Tasks from collaborated events where org's vendor is a participant
- `PATCH /api/events/collaborations/[accessId]` — Accept/reject collaboration invitation
- `GET|PATCH /api/organizations/profile` — Organization public profile CRUD

### Admin
- `/admin/tenants` — Unified org management (filter by orgType)
- `POST /api/admin/tenants/[id]/verify` — Verify or reject provider

### Planner-facing
- `GET /api/providers` — Directory of verified providers
- `GET /api/providers/[slug]` — Public provider profile
- `POST /api/events/[eventId]/providers` — Invite provider to event

## Database Tables

```text
organizations (orgType='provider')
├── verificationStatus: unverified | verified | rejected | suspended
├── providerCategory, instagramHandle, serviceRadius, serviceAreas
├── description, tagline, coverImage, city, region, publicEmail
├── profileCompleteness, services, instagramPosts, brochureUrl
└── planId → subscriptionPlans

providerEventAccess
├── providerOrgId → organizations.id
├── eventId → events.id
├── plannerOrgId → organizations.id
├── vendorId → vendors.id (optional)
├── status: pending | active | rejected | revoked
├── invitedBy → users.id
└── invitedAt, acceptedAt

vendors (planner's internal CRM, may link to provider org)
├── organizationId — belongs to the planner org
├── providerOrgId → organizations.id (links to platform provider)
└── name, category, email, phone
```

## NEVER DO

- NEVER create routes under `/vendor/` — they will be redirected to `/dashboard/`
- NEVER create routes under `/provider/` — `/provider/register` redirects to `/auth/register`
- NEVER use `provider_owner`, `provider_admin`, `provider_tech` role slugs — they were removed
- NEVER gate UI by `!isProvider` or `orgType !== "provider"` — use `can()` permission checks
- NEVER hardcode orgType checks for capabilities — use plan limits (`requireLimit`) or feature flags (`requireFeature`)
