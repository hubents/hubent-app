---
description: HubEnts project architecture, route structure, and coding patterns
---

# Project Architecture

## Tech Stack
- **Framework:** Next.js 15 (App Router) + TypeScript strict
- **Auth:** NextAuth v5 (Credentials, Google OAuth, Resend magic link)
- **DB:** Drizzle ORM + PostgreSQL (Neon HTTP) — **NEVER use `db.transaction()`**
- **Styling:** TailwindCSS + shadcn/ui + Remix Icons (`@remixicon/react`)
- **Payments:** Stripe (dual: platform SaaS billing + tenant client payments)
- **Email:** Resend with custom HTML templates
- **Storage:** Cloudflare R2
- **AI:** Vercel AI SDK + AI Gateway (Gemini)
- **Integrations:** Composio OAuth marketplace
- **Hosting:** Vercel (auto-deploy on push to main)
- **Testing:** Vitest

## Route Structure

### Public Routes (no auth)
- `/auth/login`, `/auth/register` — Auth pages
- `/provider/register` — Provider self-registration
- `/terms`, `/privacy` — Legal pages
- `/rsvp/[slug]` — Public RSVP page
- `/f/[slug]` — Public form landing pages
- `/providers` — Provider directory
- `/payment/success`, `/payment/cancel` — Stripe payment results

### Tenant Portal (`/dashboard`)
- `/dashboard` — Home with stats cards
- `/dashboard/events` — Events list + CRUD
- `/dashboard/events/[id]` — Event detail (tasks, guests, rsvp, finances, vendors, schedule, run-sheet, settings)
- `/dashboard/contacts` — Contact CRM
- `/dashboard/crm` — Sales pipeline (Kanban)
- `/dashboard/tasks` — Global task board
- `/dashboard/documents` — Document manager
- `/dashboard/forms` — Form builder
- `/dashboard/calendar` — Calendar view
- `/dashboard/finance` — Finance module (invoices, quotes, proformas, delivery-notes, payments, reports, settings)
- `/dashboard/chat` — Internal messaging
- `/dashboard/ai` — HubIA assistant
- `/dashboard/menus` — Menu management
- `/dashboard/payments` — Client Stripe payments
- `/dashboard/providers` — Provider directory
- `/dashboard/team` — Team management
- `/dashboard/settings` — Org settings (roles, integrations, developers, templates)

### Vendor Portal (`/vendor`)
- Same structure as dashboard but for provider organizations
- `/vendor/profile` — Provider public profile
- `/vendor/events/[accessId]` — Event access via `providerEventAccess`

### Admin Panel (`/admin`)
- `/admin/tenants`, `/admin/users`, `/admin/providers` — Entity management
- `/admin/plans`, `/admin/billing` — Subscription management
- `/admin/ai` — AI analytics, prompts, settings
- `/admin/api-platform` — API keys, webhooks, logs
- `/admin/announcements`, `/admin/audit`, `/admin/settings`

## API Patterns

### Standard response format
```typescript
return NextResponse.json({ success: true, data: result });
return NextResponse.json({ success: false, error: "msg" }, { status: 400 });
```

### Auth in API routes
```typescript
const session = await requireAuth();           // Basic auth
const session = await requirePermission("events:read"); // RBAC
const session = await requirePlatformAdmin();  // Super admin only
```

### Environment variables — ALWAYS inside functions
```typescript
// NEVER at module level
const url = process.env.NEXT_PUBLIC_APP_URL; // ❌

// ALWAYS inside functions
function getAppUrl() {
  return process.env.NEXT_PUBLIC_APP_URL;    // ✅
}
```

### Emails — fire-and-forget
```typescript
sendEmail(to, subject, html)
  .catch((err) => console.error("Failed to send email:", err));
```

### Error logging
- Use `console.error` for critical failures in API routes
- Use `withMonitoring` wrapper for API monitoring
- Never use `console.log` in production API code

## Key Files
- `src/db/schema.ts` — All Drizzle table definitions
- `src/db/index.ts` — DB connection (Neon HTTP)
- `src/lib/session.ts` — Auth helpers (requireAuth, requirePermission, etc.)
- `src/lib/tenant.ts` — Tenant context helpers (canAccessEvent, canAccessTask)
- `src/lib/event-permissions.ts` — Event-scoped permission helpers
- `src/middleware.ts` — Route protection + org context
- `src/lib/stripe-platform.ts` — Stripe SaaS billing helpers
- `src/lib/monitoring/api-monitor.ts` — API monitoring wrapper
