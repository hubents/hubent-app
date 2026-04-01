---
name: provider-portal
description: >-
  HubEnts unified portal for providers — registration, onboarding, event
  collaboration, cross-org task sync, marketplace profile. Use when working on
  provider registration, providerEventAccess, cross-org collaboration, or
  marketplace features. There is NO separate /vendor portal.
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
7. Verified providers appear in marketplace at `/dashboard/marketplace` and `/providers`

**NOTE:** `/provider/register` is DEPRECATED — middleware redirects to `/auth/register`. The separate API `/api/auth/provider-register` has been removed.

## Event Collaboration Flow

1. Planner invites provider from event vendor page → `POST /api/events/[eventId]/providers`
2. Creates `providerEventAccess` row (status: pending) + local vendor record + eventVendors link
3. Provider receives email notification
4. Provider sees invitation in their events list at `/dashboard/events` (scope=accessible)
5. Provider accepts/rejects via `PATCH /api/events/collaborations/[accessId]`
6. If accepted: tasks appear in provider's task board automatically via `useTasks` hook (merges scope=collaborated)

## Auto Provider Event Access (Critical)

When a planner adds a vendor (linked to a provider org) as a task participant, `ensureProviderEventAccess()` in `src/lib/cross-org.ts` automatically creates the `providerEventAccess` row. This means:

- Planner assigns task to vendor → provider AUTOMATICALLY gets event access
- No need for explicit "invite provider" step just for task assignment
- Provider's task board shows the task immediately via scope=collaborated merge

Implementation: `src/lib/invitations.ts` → `addTaskParticipant()` calls `ensureProviderEventAccess()` when `vendorId` has a linked `providerOrgId`.

## Key APIs

### Provider Auth
- `POST /api/auth/register` with `orgType: "provider"` — Register new provider org (role=owner, plan=provider-free)

### Unified APIs with scope params
- `GET /api/events?scope=collaborated` — Events where org has active providerEventAccess
- `GET /api/events?scope=accessible` — Both owned + collaborated events (for DocumentDrawer dropdowns)
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

## Cross-Org Helpers (`src/lib/cross-org.ts`)

- `ensureProviderEventAccess(providerOrgId, eventId, plannerOrgId, invitedBy)` — upsert access row
- `ensureVendorForProviderOrg(plannerOrgId, providerOrgId, createdBy)` — create local vendor record
- `ensureEventVendor(eventId, vendorId)` — link vendor to event
- `autoLinkVendorToEventTasks(eventId, vendorId, addedBy)` — bulk add task participation
- `getProviderOrgForVendor(vendorId)` — resolve provider org from vendor record

## UI Patterns

### Events Page (`src/app/dashboard/events/page.tsx`)
- Provider orgs fetch `scope=accessible` to see both owned and collaborated events
- "Nuevo evento" button visible for ALL orgs with `events:create` permission (no orgType guard)
- Event creation gated by plan limits via `requireLimit("events")`

### Tasks Hook (`src/hooks/use-tasks.ts`)
- For provider orgs: fetches BOTH `/api/tasks` (own) and `/api/tasks?scope=collaborated` in parallel
- Merges and deduplicates by task ID
- Stats calculated from merged list

### Finance DocumentDrawer
- Uses `eventsEndpoint="/api/events?scope=accessible"` by default (shows owned + collaborated events)
- Provider-specific endpoint overrides no longer needed

### Sidebar (`src/components/layout/main-sidebar.tsx`)
- Sections driven by `getSidebarSections(orgType)` from `tenant-types.ts`
- Provider config includes: dashboard, marketplace, public-profile, contacts, events, crm, finance, productivity, team, ai
- Each item has a `permission` field checked via `can()` hook

## Plans and Feature Flags

- `provider-free` — 1 user, 1 event, 200MB storage, free
- `provider-pro` — 3 users, unlimited events, 2000MB, 14.50 EUR/mo
- Feature flags in `feature_flags` table:
  - `public_profile` — all plans
  - `portfolio` — provider-free, provider-pro
  - `custom_roles` — provider-pro, agency
  - `smart_date_block` — provider-pro
  - `recommended` — provider-pro

## NEVER DO

- NEVER create routes under `/vendor/` — they will be redirected to `/dashboard/`
- NEVER use `provider_owner`, `provider_admin`, `provider_tech` role slugs — they were removed
- NEVER gate UI by `!isProvider` or `orgType !== "provider"` — use `can()` permission checks
- NEVER hardcode orgType checks for capabilities — use plan limits (`requireLimit`) or feature flags (`requireFeature`)
- NEVER create a separate sidebar/layout for providers — use the unified `MainSidebar` with `getSidebarSections()`

## Related

- `.cursor/rules/hubents-rbac-provider.mdc` — Unified RBAC reference
- `.cursor/rules/hubents-project-architecture.mdc` — Full architecture
- `.cursor/rules/hubents-saas-billing.mdc` — Plans and billing
