<p align="center">
  <img src="https://app.hubents.com/logo.svg" alt="HubEnts Logo" width="180" />
</p>

<h1 align="center">HubEnts</h1>

<p align="center">
  <strong>The all-in-one SaaS platform for event management.</strong><br/>
  Plan weddings, corporate events, and social gatherings with a unified workspace for planners, providers, and clients.
</p>

<p align="center">
  <a href="https://app.hubents.com">Production</a> &middot;
  <a href="https://app.hubents.com/developers">API Docs</a> &middot;
  <a href="https://app.hubents.com/developers/changelog">Changelog</a> &middot;
  <a href="https://app.hubents.com/providers">Provider Directory</a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js 16" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React 19" />
  <img src="https://img.shields.io/badge/TypeScript-5_strict-3178C6?logo=typescript" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql" alt="Neon PostgreSQL" />
  <img src="https://img.shields.io/badge/Stripe-Dual_billing-635BFF?logo=stripe" alt="Stripe" />
  <img src="https://img.shields.io/badge/Vercel-Deployed-000?logo=vercel" alt="Vercel" />
  <img src="https://img.shields.io/badge/Tests-Vitest-6E9F18?logo=vitest" alt="Vitest" />
  <img src="https://img.shields.io/badge/License-Private-red" alt="Private" />
</p>

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Features](#features)
  - [Unified Dashboard (Planners & Providers)](#unified-dashboard-planners--providers)
  - [Event Management](#event-management)
  - [Task Management](#task-management)
  - [CRM & Sales Pipeline](#crm--sales-pipeline)
  - [Contact Management](#contact-management)
  - [Finance Module](#finance-module)
  - [Guest Management & RSVP](#guest-management--rsvp)
  - [Form Builder](#form-builder)
  - [Vendor & Provider Ecosystem](#vendor--provider-ecosystem)
  - [AI Assistant (HubIA)](#ai-assistant-hubia)
  - [Integrations Marketplace](#integrations-marketplace)
  - [Real-Time Notifications & Chat](#real-time-notifications--chat)
  - [Calendar & Scheduling](#calendar--scheduling)
  - [Document Management](#document-management)
- [Platform Administration](#platform-administration)
- [Public API](#public-api)
  - [API Overview](#api-overview)
  - [Endpoints Reference](#endpoints-reference)
  - [Webhook Events](#webhook-events)
  - [MCP Server (AI Integration)](#mcp-server-ai-integration)
  - [Developer Portal](#developer-portal)
- [RBAC & Permissions](#rbac--permissions)
- [Plans & Billing](#plans--billing)
- [Data Model](#data-model)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [Scripts Reference](#scripts-reference)
- [Cron Jobs](#cron-jobs)
- [Testing](#testing)
- [Deployment](#deployment)
- [Infrastructure](#infrastructure)
- [License](#license)

---

## Overview

**HubEnts** is a production SaaS platform built by [NapsixAI](https://napsix.ai) that enables event planners and service providers to collaborate on a single, unified workspace. From wedding coordinators managing guest lists and vendor payments to DJ companies tracking their gigs across multiple planners, HubEnts replaces scattered spreadsheets and disconnected tools with one integrated experience.

**Key numbers:**

| Metric | Count |
|--------|-------|
| Database tables | 108 |
| API endpoints (public) | 62 |
| Webhook event types | 37 |
| MCP tools (AI) | 19 |
| Dashboard pages | 46 |
| Admin panel pages | 22 |
| Component files | 163 |
| Custom hooks | 27 |
| Test suites | 51 |
| DB migrations | 60+ |
| Source files | 685+ |

---

## Tech Stack

| Layer | Technology | Purpose |
|-------|-----------|---------|
| **Framework** | Next.js 16 (App Router, Turbopack) | Server-side rendering, API routes, middleware |
| **UI** | React 19 + React Compiler | Component-driven UI with automatic memoization |
| **Language** | TypeScript 5 (strict mode) | Type safety across entire codebase |
| **Styling** | TailwindCSS v4 + shadcn/ui | Utility-first CSS with accessible component library |
| **Icons** | Remix Icons + Lucide React | Consistent iconography |
| **Database** | PostgreSQL (Neon HTTP) + Drizzle ORM | Serverless-native DB with type-safe queries |
| **Auth** | NextAuth v5 | Credentials, Google OAuth, magic link (Resend) |
| **Payments** | Stripe (dual) | Platform SaaS billing + tenant client payments |
| **Email** | Resend | Transactional emails with custom HTML templates |
| **Storage** | Cloudflare R2 + AWS S3 SDK | File uploads, backups, PDF storage |
| **AI** | Vercel AI SDK + AI Gateway (Gemini) | Conversational AI assistant |
| **Real-time** | Pusher | WebSocket notifications, live chat |
| **Rate Limiting** | Upstash Redis | Sliding window rate limiting for API |
| **Integrations** | Composio | OAuth marketplace (Google Calendar, etc.) |
| **Drag & Drop** | dnd-kit | Kanban boards, task reordering |
| **Charts** | Recharts | Finance reports, dashboard analytics |
| **PDF** | html2canvas + jsPDF (client) / Puppeteer (server) | Document downloads |
| **Forms** | React Hook Form + Zod v4 | Validated forms with schema validation |
| **Flow Charts** | React Flow | Table seating layout (floor plan) |
| **Animations** | Framer Motion | Smooth UI transitions |
| **Testing** | Vitest + Testing Library | Unit/integration tests |
| **Hosting** | Vercel | Auto-deploy, edge functions, cron jobs |
| **Monitoring** | ClickUp error reporter | Automated bug tickets with deduplication |

---

## Architecture

### High-Level System Diagram

```
                    +----------------------------------+
                    |         CLIENTS / USERS          |
                    +----------------------------------+
                              |           |
               +--------------+           +--------------+
               |                                         |
      +--------v--------+                   +------------v-----------+
      |   Web App (SPA) |                   |   Public API (REST)    |
      |   /dashboard    |                   |   /api/v1/*            |
      |   /admin        |                   |   Bearer hb_live_...   |
      |   /auth         |                   +------------+-----------+
      +--------+--------+                                |
               |                                         |
      +--------v-----------------------------------------v-----------+
      |                    Next.js 16 App Router                     |
      |  +------------------+  +------------------+  +-----------+   |
      |  | Server Components|  |  API Routes      |  | Middleware |   |
      |  | (RSC + Client)   |  |  (Internal + v1) |  | (Auth/Org)|   |
      |  +--------+---------+  +--------+---------+  +-----+-----+   |
      |           |                     |                   |         |
      |  +--------v---------------------v-------------------v------+  |
      |  |                   Lib Layer                             |  |
      |  |  session.ts | tenant.ts | cross-org.ts | permissions   |  |
      |  |  stripe-platform.ts | monitoring | clickup | api/*     |  |
      |  +---------------------+------+----------------------------+  |
      |                        |      |                               |
      +------------------------+------+-------------------------------+
                               |      |
                  +------------v-+  +-v-----------+
                  |  Drizzle ORM |  | Cloudflare  |
                  |  (schema.ts) |  | R2 Storage  |
                  +------+-------+  +-------------+
                         |
                  +------v-------+
                  | Neon Postgres|
                  | (HTTP/Pool)  |
                  | 108 tables   |
                  +--------------+
```

### Multi-Tenancy Model

```
+-------------------------------------------------------------------+
|                        PLATFORM (NapsixAI)                        |
|  +--------------------+  +--------------------+  +-----------+    |
|  | Tenant: "La Boda"  |  | Tenant: "EventCo"  |  | Provider: |    |
|  | orgType: tenant     |  | orgType: tenant     |  | "DJ Mix"  |    |
|  | Plan: Standard      |  | Plan: Agency        |  | Plan: Pro |    |
|  |                     |  |                     |  |           |    |
|  | +----+ +----+       |  | +----+ +----+       |  | +----+    |    |
|  | |Evnt| |Evnt|       |  | |Evnt| |Evnt|       |  | |Evnt|    |    |
|  | +----+ +----+       |  | +----+ +----+       |  | +----+    |    |
|  | Users: 5            |  | Users: 15           |  | Users: 3  |    |
|  | Roles: 7 universal  |  | Roles: 7 universal  |  | Roles: 7  |    |
|  +--------------------+  +--------------------+  +-----------+    |
|                                                                    |
|  +--------------------------------------------------------------+  |
|  |            Cross-Org Collaboration Layer                      |  |
|  |  Planner invites Provider to event -> providerEventAccess     |  |
|  |  Vendor assigned to task -> auto-creates access               |  |
|  +--------------------------------------------------------------+  |
+-------------------------------------------------------------------+
```

### Unified Portal (No separate portals)

```
All org types share ONE portal:

/dashboard
  |-- Sidebar adapts via getSidebarSections(orgType)
  |-- Features gated by plan (requireLimit, requireFeature)
  |-- Permissions gated by RBAC (can("resource:action"))
  |-- Events show owned + collaborated (scope=accessible)

NO /vendor portal -- middleware redirects /vendor/* -> /dashboard/*
```

---

## Features

### Unified Dashboard (Planners & Providers)

The main workspace at `/dashboard` provides a real-time overview:

- **Stats cards** -- total events, pending tasks, upcoming deadlines, revenue
- **Recent events** with status indicators
- **Pending tasks** requiring attention
- **Quick actions** to create events, contacts, tasks
- Adapts dynamically based on `orgType` and permissions

### Event Management

Full lifecycle management for any event type:

| Feature | Description |
|---------|-------------|
| **Event Types** | Wedding, pre-wedding, post-wedding, birthday, corporate, social, other |
| **Status Flow** | Draft -> Confirmed -> In Progress -> Completed / Cancelled |
| **Event Detail** | Tabbed view with tasks, guests, RSVP, finances, vendors, schedule, run-sheet, settings |
| **Collaborators** | Invite team members with section-level permissions (general, tasks, guests, rsvp, vendors, finances, settings) |
| **Event Duplication** | Clone events with all tasks, checklist items, and settings |
| **Templates** | Save events as reusable templates; apply templates to new events |
| **Floor Plan** | Visual table/seating layout with drag-and-drop (React Flow) |
| **Run Sheet** | Minute-by-minute event timeline with PDF export |
| **Schedule** | Event agenda with time blocks, vendors, and locations |
| **Documents** | Attach files, photos, contracts to events |
| **Cross-Org Events** | Providers see collaborated events alongside their own |

### Task Management

Enterprise-grade task system with deep integrations:

| Feature | Description |
|---------|-------------|
| **Global Task Board** | Kanban or list view across all events |
| **Event-Scoped Tasks** | Tasks tied to specific events |
| **Checklist Items** | Sub-tasks with assignees and completion tracking |
| **Participants** | Assign planners, vendors, contacts, clients, guests |
| **In-Task Chat** | Real-time messaging per task with file attachments |
| **Email Integration** | Send/receive emails within task context |
| **WhatsApp Messages** | Send/receive WhatsApp messages per task |
| **Video Embeds** | YouTube video links within tasks |
| **Meetings** | Schedule meetings linked to tasks |
| **Rich Content Editor** | HTML content blocks for detailed task descriptions |
| **Task Payments** | Record vendor payments directly from tasks |
| **Task Forms** | Attach and collect form submissions per task |
| **AI Assistant** | AI suggestions and auto-generation for tasks |
| **Schedule Items** | Timeline entries linked to task execution |
| **Drag & Drop Reorder** | Priority-based ordering with dnd-kit |

### CRM & Sales Pipeline

Complete sales management:

| Feature | Description |
|---------|-------------|
| **Kanban Pipeline** | Visual lead stages with drag-and-drop |
| **Custom Stages** | Create, reorder, and configure pipeline stages |
| **Lead Management** | Create leads from contacts, forms, or manually |
| **Lead History** | Full stage-change audit trail |
| **Companies & People** | B2B entity management |
| **Lead-to-Event** | Convert won leads to events automatically |
| **Form Integration** | Form submissions auto-create CRM leads |
| **Soft Deletes** | Recoverable lead deletion |

### Contact Management

Unified CRM for all relationship types:

| Feature | Description |
|---------|-------------|
| **Contact Types** | Person or Company |
| **Contact Sources** | Manual, import, website, referral, social media, event, other |
| **Rich Profiles** | Phone, email, address, bank info, tags, notes |
| **Activity Log** | Notes, calls, emails, meetings, status changes |
| **Documents & Photos** | File attachments per contact |
| **Relationships** | Link people to companies with roles |
| **Event Links** | Associate contacts with events and tasks |
| **Vendor Sync** | Bidirectional sync between contacts and vendor records |
| **CSV Import** | Bulk import contacts from spreadsheets |
| **Tags** | Custom tagging system per organization |
| **GDPR Compliance** | Data management with consent tracking |

### Finance Module

Professional invoicing and payment tracking:

| Document Type | Features |
|---------------|----------|
| **Quotes** | Create, send, convert to invoice, duplicate |
| **Proformas** | Pre-invoice documents with approval flow |
| **Invoices** | Full invoicing with line items, taxes, bank accounts |
| **Delivery Notes** | Proof of delivery documents |
| **Credit Notes** | Issue credits against invoices |

**Additional capabilities:**

- **Payment Records** -- Record payments against documents with multiple methods
- **Payment Schedules** -- Installment plans with due dates
- **Payment Reminders** -- Automated email reminders for overdue payments
- **Product Catalog** -- Reusable products/services with pricing
- **Tax Rates** -- Configurable tax rates per organization
- **Bank Accounts** -- Multiple bank accounts with default selection
- **Financial Reports** -- Revenue, expenses, profit dashboards with charts
- **Finance Settings** -- Currency, numbering formats, payment terms, fiscal data
- **Stripe Connect** -- Accept online payments from clients
- **PDF Export** -- Professional document PDFs with company branding
- **Document Workflow** -- Draft -> Approved -> Sent -> Accepted -> Paid (state machine)
- **Cross-Org Finance** -- Providers can issue documents for collaborated events

### Guest Management & RSVP

Complete guest lifecycle from invitation to check-in:

| Feature | Description |
|---------|-------------|
| **Guest List** | Add, import (CSV), group, and manage guests |
| **Guest Groups** | Organize guests by family, table, or category |
| **RSVP System** | Public RSVP pages with custom slug (`/rsvp/[slug]`) |
| **RSVP Settings** | Toggle plus-one, dietary, itinerary, hotels, FAQs, transport |
| **Itinerary** | Event schedule visible to guests |
| **Hotel Recommendations** | Accommodation suggestions for guests |
| **Nearby Plans** | Activity recommendations around the venue |
| **FAQs** | Frequently asked questions for guests |
| **Transport Options** | Transport booking for guests |
| **Menu Selection** | Dietary preferences and menu choices |
| **Table Assignment** | Seat guests at specific tables (linked to floor plan) |
| **Check-In** | Real-time guest check-in with statistics |
| **Guest Stats** | RSVP counts, attendance rates, dietary breakdown |
| **PDF Guest List** | Export guest list as PDF |
| **Companions** | Track plus-ones and companions |
| **Email Invitations** | Send RSVP invitations via email |

### Form Builder

Drag-and-drop form creation with CRM integration:

| Feature | Description |
|---------|-------------|
| **Visual Builder** | Drag-and-drop field palette with live canvas |
| **Field Types** | Text, number, email, phone, select, radio, checkbox, textarea, date, file, signature |
| **CRM Mapping** | Map form fields to contact/lead properties |
| **Auto-Create** | Form submissions can auto-create contacts and/or leads |
| **Public Landing Pages** | Shareable forms at `/f/[slug]` |
| **Task-Attached Forms** | Collect data within task context |
| **Form Submissions** | View, filter, and export submissions |
| **Branding** | Custom logo, colors, cover image per form |
| **GDPR** | Consent text and privacy policy links |
| **Form Instances** | Multiple deployments of same form template |

### Vendor & Provider Ecosystem

Two-tier vendor system:

```
+------------------------------------------+
|          VENDOR ECOSYSTEM                |
+------------------------------------------+
|                                          |
|  1. LOCAL VENDORS (Internal CRM)         |
|     - Created by planner manually        |
|     - Private to the organization        |
|     - Stored in vendors + contacts       |
|     - Used for task assignment            |
|     - Used for payment tracking          |
|                                          |
|  2. PLATFORM PROVIDERS (Public)          |
|     - Self-registered organizations      |
|     - Public directory (/providers)      |
|     - Verified by platform admin         |
|     - Cross-org event collaboration      |
|     - Own dashboard with events/tasks    |
|                                          |
|  BRIDGE: Planner invites Provider        |
|  -> Creates local vendor record          |
|  -> Creates providerEventAccess          |
|  -> Provider sees event in dashboard     |
+------------------------------------------+
```

**Provider features:**

| Feature | Description |
|---------|-------------|
| **19 Categories** | Catering, photography, DJ, venue, florist, etc. |
| **Public Profile** | Company page with description, services, portfolio |
| **Instagram Integration** | Display Instagram posts on profile |
| **Profile Completeness** | Weighted scoring across 11 fields (logo, description, etc.) |
| **Verification Flow** | Admin review: unverified -> verified / rejected |
| **Partners Directory** | Browse and favorite providers/planners at `/dashboard/partners` |
| **Event Collaboration** | Accept invitations, see tasks, submit documents |
| **Auto-Access** | Adding vendor as task participant auto-creates event access |

### AI Assistant (HubIA)

Contextual AI powered by Gemini:

| Feature | Description |
|---------|-------------|
| **Chat Interface** | Global drawer accessible from any page |
| **Context-Aware** | Understands events, tasks, finance, and CRM context |
| **Admin Prompts** | Customizable prompt templates by context (general, event, task, finance, support, onboarding) |
| **Knowledge Base** | Admin-uploaded documents (FAQs, tutorials, features, policies) |
| **Analytics** | Track conversations, messages, tokens, latency, and ratings |
| **Feedback** | Users can rate AI responses |
| **GDPR Generation** | Auto-generate privacy/GDPR text |

### Integrations Marketplace

OAuth-based integrations via Composio:

- **Google Calendar** -- Sync events bidirectionally
- **Extensible** -- Framework ready for additional integrations
- **Health Checks** -- Integration status monitoring
- **Trigger System** -- Webhook-style triggers from connected services

### Real-Time Notifications & Chat

| Feature | Description |
|---------|-------------|
| **Push Notifications** | Pusher Beams for web push |
| **In-App Notifications** | Notification center with read/unread state |
| **Task Chat** | Real-time messaging per task |
| **Sound Alerts** | Configurable notification sounds |
| **Notification Types** | Event updates, task assignments, RSVP responses, payment confirmations |

### Calendar & Scheduling

| Feature | Description |
|---------|-------------|
| **Calendar View** | Monthly/weekly calendar with event chips |
| **Day Popover** | Click-to-expand daily agenda |
| **Filters** | Filter by event type, status, team member |
| **Event Schedule** | Per-event timeline with time blocks |
| **Run Sheet** | Minute-by-minute execution plan with PDF export |
| **Task Schedule** | Scheduled task execution times |

### Document Management

| Feature | Description |
|---------|-------------|
| **Event Documents** | Files attached to events |
| **Contact Documents** | Files attached to contacts |
| **Task Attachments** | Files, images, links within tasks |
| **File Preview** | In-app file preview dialog |
| **Upload System** | Presigned URLs to Cloudflare R2 |
| **Download** | Secure file downloads |

---

## Platform Administration

The admin panel at `/admin` provides full platform management:

### Admin Modules

| Module | Path | Features |
|--------|------|----------|
| **Dashboard** | `/admin` | Platform-wide statistics and metrics |
| **Tenants** | `/admin/tenants` | List, filter, detail view for all organizations (planners + providers) |
| **Tenant Detail** | `/admin/tenants/[id]` | Members, change type, verify/reject providers |
| **Users** | `/admin/users` | User management, suspension, impersonation |
| **Plans** | `/admin/plans` | Subscription plan CRUD and pricing |
| **Billing** | `/admin/billing` | Revenue overview, subscription management |
| **Providers** | `/admin/providers` | Provider verification queue |
| **Announcements** | `/admin/announcements` | System-wide announcements targeted by plan |
| **Audit Log** | `/admin/audit` | Full audit trail of admin actions |
| **Settings** | `/admin/settings` | Platform configuration |
| **Status** | `/admin/status` | System health and infrastructure status |
| **Integrations** | `/admin/integrations` | Platform-level integration management |
| **Impersonation** | `/admin/impersonate` | Login as any tenant for support |
| **Invitations** | `/admin/invite` | Invite new admin team members |

### AI Admin

| Module | Path | Features |
|--------|------|----------|
| **AI Overview** | `/admin/ai` | AI usage metrics and overview |
| **AI Analytics** | `/admin/ai/analytics` | Conversation stats, token usage, ratings |
| **AI Documents** | `/admin/ai/documents` | Knowledge base management |
| **AI Prompts** | `/admin/ai/prompts` | System prompt templates |
| **AI Settings** | `/admin/ai/settings` | AI configuration and feature flags |

### API Platform Admin

| Module | Path | Features |
|--------|------|----------|
| **API Dashboard** | `/admin/api-platform` | API key usage, active orgs, request volume |
| **API Logs** | `/admin/api-platform/logs` | Request/response logs with filtering |
| **Organizations** | `/admin/api-platform/organizations` | Per-org API usage breakdown |
| **Webhooks** | `/admin/api-platform/webhooks` | Webhook delivery monitoring |

---

## Public API

### API Overview

| Feature | Detail |
|---------|--------|
| **Base URL** | `https://app.hubents.com/api/v1` |
| **Auth** | Bearer token (`hb_live_...` or `hb_test_...`) |
| **Spec** | OpenAPI 3.1 at `/api/v1/openapi` |
| **Format** | JSON, all keys in `snake_case` |
| **Pagination** | Cursor-based (Stripe-style: `starting_after` / `ending_before`) |
| **Rate Limits** | 50-500 req/min depending on plan |
| **Idempotency** | `Idempotency-Key` header (24h TTL) |
| **Versioning** | Date-based via `X-HubEnts-Version` header |
| **Errors** | Stripe-grade: `type`, `code`, `message`, `param`, `request_id` |
| **Scopes** | 19 granular scopes |
| **Webhooks** | 37 event types, HMAC-SHA256 signed, auto-retries |
| **MCP** | 19 tools + 3 resources for AI assistant integration |

### Quick Start

```bash
# 1. Create an API key from Settings > Developers

# 2. List your events
curl https://app.hubents.com/api/v1/events \
  -H "Authorization: Bearer hb_live_..." \
  -H "Content-Type: application/json"

# 3. Create an event
curl -X POST https://app.hubents.com/api/v1/events \
  -H "Authorization: Bearer hb_live_..." \
  -H "Content-Type: application/json" \
  -d '{"name": "Wedding Garcia", "type": "wedding"}'
```

### Endpoints Reference

| # | Method | Endpoint | Description |
|---|--------|----------|-------------|
| 1 | GET | `/me` | Get current organization info |
| 2 | GET | `/events` | List events |
| 3 | POST | `/events` | Create an event |
| 4 | GET | `/events/{id}` | Get event details |
| 5 | PATCH | `/events/{id}` | Update an event |
| 6 | DELETE | `/events/{id}` | Cancel an event |
| 7 | GET | `/events/{id}/guests` | List guests |
| 8 | POST | `/events/{id}/guests` | Add a guest |
| 9 | GET | `/events/{id}/guests/stats` | Guest statistics |
| 10 | GET | `/events/{id}/schedule` | List schedule items |
| 11 | POST | `/events/{id}/schedule` | Add schedule item |
| 12 | GET | `/contacts` | List contacts |
| 13 | POST | `/contacts` | Create a contact |
| 14 | GET | `/contacts/{id}` | Get contact details |
| 15 | PATCH | `/contacts/{id}` | Update a contact |
| 16 | DELETE | `/contacts/{id}` | Soft-delete a contact |
| 17 | GET | `/tasks` | List tasks |
| 18 | POST | `/tasks` | Create a task |
| 19 | GET | `/tasks/{id}` | Get task details |
| 20 | PATCH | `/tasks/{id}` | Update a task |
| 21 | DELETE | `/tasks/{id}` | Cancel a task |
| 22 | GET | `/crm/leads` | List CRM leads |
| 23 | POST | `/crm/leads` | Create a lead |
| 24 | GET | `/crm/leads/{id}` | Get lead details |
| 25 | PATCH | `/crm/leads/{id}` | Update a lead |
| 26 | DELETE | `/crm/leads/{id}` | Delete a lead |
| 27 | POST | `/crm/leads/{id}/move` | Move lead to stage |
| 28 | GET | `/crm/stages` | List pipeline stages |
| 29 | GET | `/crm/pipeline` | Pipeline overview |
| 30 | GET | `/finance/documents` | List financial documents |
| 31 | POST | `/finance/documents` | Create a document |
| 32 | GET | `/finance/documents/{id}` | Get document with items |
| 33 | PATCH | `/finance/documents/{id}` | Update a document |
| 34 | GET | `/finance/payments` | List payments |
| 35 | POST | `/finance/payments` | Record a payment |
| 36 | GET | `/finance/dashboard` | Finance dashboard stats |
| 37 | GET | `/finance/bank-accounts` | List bank accounts |
| 38 | GET | `/finance/products` | List product catalog |
| 39 | GET | `/forms` | List forms |
| 40 | POST | `/forms` | Create a form |
| 41 | GET | `/forms/{id}` | Get form details |
| 42 | PATCH | `/forms/{id}` | Update a form |
| 43 | GET | `/forms/{id}/fields` | List form fields |
| 44 | PUT | `/forms/{id}/fields` | Replace all fields |
| 45 | GET | `/forms/{id}/submissions` | List submissions |
| 46 | GET | `/vendors` | List vendors |
| 47 | POST | `/vendors` | Create a vendor |
| 48 | GET | `/vendors/{id}` | Get vendor details |
| 49 | PATCH | `/vendors/{id}` | Update a vendor |
| 50 | DELETE | `/vendors/{id}` | Delete a vendor |
| 51 | GET | `/templates` | List event templates |
| 52 | GET | `/webhooks` | List webhooks |
| 53 | POST | `/webhooks` | Create a webhook |
| 54 | GET | `/webhooks/{id}` | Get webhook with stats |
| 55 | PATCH | `/webhooks/{id}` | Update a webhook |
| 56 | DELETE | `/webhooks/{id}` | Delete a webhook |
| 57 | POST | `/webhooks/{id}/rotate-secret` | Rotate signing secret |
| 58 | GET | `/api-keys` | List API keys |
| 59 | GET | `/health` | Health check (no auth) |
| 60 | GET | `/mcp` | MCP server manifest |
| 61 | POST | `/mcp/execute` | Execute MCP tool |
| 62 | GET | `/mcp/resources` | Get MCP resource |

### API Scopes

| Scope | Access |
|-------|--------|
| `events:read` | Read events |
| `events:write` | Create/update/delete events |
| `contacts:read` | Read contacts |
| `contacts:write` | Create/update/delete contacts |
| `tasks:read` | Read tasks |
| `tasks:write` | Create/update/delete tasks |
| `finance:read` | Read financial documents/payments |
| `finance:write` | Create/update financial documents |
| `guests:read` | Read guests |
| `guests:write` | Create/update/delete guests |
| `crm:read` | Read CRM leads/pipeline |
| `crm:write` | Create/update/delete leads |
| `forms:read` | Read forms/submissions |
| `forms:write` | Create/update forms/fields |
| `vendors:read` | Read vendors |
| `vendors:write` | Create/update/delete vendors |
| `templates:read` | Read event templates |
| `organization:read` | Read organization info |
| `webhooks:manage` | Full webhook CRUD |

### Webhook Events

| Domain | Events |
|--------|--------|
| **Events** | `event.created`, `event.updated`, `event.deleted`, `event.status_changed` |
| **Contacts** | `contact.created`, `contact.updated`, `contact.deleted` |
| **Guests** | `guest.created`, `guest.updated`, `guest.deleted`, `guest.checked_in`, `guest.rsvp_responded` |
| **Tasks** | `task.created`, `task.updated`, `task.completed`, `task.deleted`, `task.shared_with_host` |
| **CRM** | `lead.created`, `lead.updated`, `lead.stage_changed`, `lead.won`, `lead.lost`, `lead.deleted` |
| **Finance** | `finance.document_created`, `finance.document_updated`, `finance.document_status_changed`, `finance.payment_received`, `finance.payment_created` |
| **Collaboration** | `collaboration.invited`, `collaboration.accepted`, `collaboration.rejected`, `collaboration.revoked` |
| **Forms** | `form.submission_created`, `form.updated` |
| **Vendors** | `vendor.created`, `vendor.updated`, `vendor.deleted` |

### MCP Server (AI Integration)

HubEnts exposes an MCP (Model Context Protocol) server for AI assistants like Claude and ChatGPT:

**19 Tools:**

| Tool | Description |
|------|-------------|
| `hubents_list_events` | List/filter events |
| `hubents_get_event` | Get event details |
| `hubents_create_event` | Create event |
| `hubents_update_event` | Update event |
| `hubents_list_contacts` | List/filter contacts |
| `hubents_create_contact` | Create contact |
| `hubents_list_tasks` | List/filter tasks |
| `hubents_create_task` | Create task |
| `hubents_update_task` | Update task |
| `hubents_list_guests` | List guests for event |
| `hubents_add_guest` | Add guest to event |
| `hubents_get_guest_stats` | Guest statistics |
| `hubents_list_leads` | List CRM leads |
| `hubents_create_lead` | Create CRM lead |
| `hubents_get_pipeline` | Pipeline overview |
| `hubents_list_documents` | List finance documents |
| `hubents_get_finance_dashboard` | Finance dashboard |
| `hubents_list_forms` | List forms |
| `hubents_get_me` | Organization info |

**3 Resources:**

| URI | Description |
|-----|-------------|
| `hubents://openapi-spec` | Full OpenAPI 3.1 spec |
| `hubents://webhook-events` | All webhook event types |
| `hubents://api-scopes` | All available scopes |

### Developer Portal

| Page | URL | Features |
|------|-----|----------|
| **Documentation** | `/developers` | Interactive API docs with Scalar UI, Quick Start, Auth guide, Error reference |
| **Changelog** | `/developers/changelog` | Date-based versioning, breaking change notices |

---

## RBAC & Permissions

### Role Hierarchy

```
+------------------------------------------------------------------+
|                    7 UNIVERSAL ROLES                              |
|  (Same roles for ALL org types -- planner, provider, client)     |
+------------------------------------------------------------------+
|                                                                    |
|  OWNER -------> Full bypass (all permissions)                     |
|  ADMIN -------> Full bypass (all permissions)                     |
|  MANAGER -----> Events CRUD, Tasks, Vendors, CRM, Forms,         |
|                 Finance read                                       |
|  ACCOUNTANT --> Finance full, CRM read, Vendors read,             |
|                 Settings read                                      |
|  STAFF -------> [Event-Scoped] Tasks CRUD, Events read,          |
|                 Vendors read, Forms read, Finance read             |
|  VIEWER ------> [Event-Scoped] Read-only across modules          |
|  CLIENT ------> [Event-Scoped] Events read, Tasks read           |
|                                                                    |
+------------------------------------------------------------------+
```

### Permission Model

- **26 canonical permissions** across 8 resources
- Resources: `events`, `tasks`, `vendors`, `team`, `finance`, `crm`, `settings`, `forms`
- Actions: `read`, `create`, `update`, `delete`, `invite`, `manage`
- **Event-Scoped** roles (`staff`, `viewer`, `client`) only see events where they are participants
- **Granular per-event permissions** via `event_participants.permissions` JSON field

### Auth Patterns

```typescript
// Basic authentication
const session = await requireAuth();

// Permission-based (RBAC)
const session = await requirePermission("events:read");

// Plan limits
await requireLimit("events");     // Check event creation quota
await requireFeature("webhooks"); // Check plan feature flag

// Platform admin only
const session = await requirePlatformAdmin();
```

---

## Plans & Billing

### Subscription Plans

| Plan | Slug | Type | Price | Users | Events | Storage |
|------|------|------|-------|-------|--------|---------|
| **Starter** | `starter` | Planner | 14.50 EUR/mo | 3 | 5 | 500 MB |
| **Standard** | `standard` | Planner | 29.50 EUR/mo | 10 | 25 | 2 GB |
| **Agency** | `agency` | Planner | 49.50 EUR/mo | 25 | Unlimited | 10 GB |
| **Free** | `provider-free` | Provider | Free | 1 | 1 | 200 MB |
| **Pro** | `provider-pro` | Provider | 14.50 EUR/mo | 3 | Unlimited | 2 GB |

### Dual Stripe Architecture

```
+--------------------------------------------------+
|              STRIPE BILLING                       |
+--------------------------------------------------+
|                                                    |
|  PLATFORM STRIPE (STRIPE_PLATFORM_SECRET_KEY)     |
|  - SaaS subscriptions (Starter, Standard, Agency) |
|  - Provider upgrades (Free -> Pro)                |
|  - Webhook: /api/webhooks/stripe-platform          |
|                                                    |
|  TENANT STRIPE (STRIPE_SECRET_KEY)                |
|  - Client-facing payments (invoices, quotes)       |
|  - Stripe Connect for vendor payouts              |
|  - Webhook: /api/finance/stripe/webhook            |
|                                                    |
+--------------------------------------------------+
```

### API Feature Flags (per plan)

| Feature | Required Plan | Description |
|---------|--------------|-------------|
| API Access | Starter+ | REST API access |
| Webhooks | Standard+ | Webhook subscriptions |
| MCP Server | Standard+ | AI integration |
| Multiple API Keys | Standard+ | More than 2 keys |
| Custom Rate Limits | Agency | Above 100 req/min |
| API Logs Export | Agency | Export request logs |
| Provider API | Provider Pro | Provider-specific endpoints |

### API Rate Limits

| Plan | Requests/min | Max API Keys |
|------|-------------|--------------|
| Provider Free | 50 | 1 |
| Starter | 100 | 2 |
| Standard | 200 | 5 |
| Provider Pro | 200 | 5 |
| Agency | 500 | 20 |

---

## Data Model

### Entity Relationship Summary

```
organizations (108 tables total across 20 domains)
  |
  +-- users & memberships (roles, permissions)
  |
  +-- events
  |     +-- tasks (checklist, participants, chat, schedule, payments)
  |     +-- guests (groups, RSVP, check-in, companions, tables)
  |     +-- vendors (local + platform providers)
  |     +-- documents (files, photos)
  |     +-- schedule items + run sheet
  |     +-- floor plan (tables with seating)
  |     +-- event payments
  |
  +-- contacts (activities, documents, photos, tags, relationships)
  |
  +-- CRM (leads, stages, history, companies, people)
  |
  +-- finance (documents, items, payments, schedules, reminders, 
  |            bank accounts, tax rates, product catalog)
  |
  +-- forms (fields, instances, submissions)
  |
  +-- AI (conversations, messages, feedback, config, prompts, docs)
  |
  +-- subscriptions & invoices (Stripe)
  |
  +-- notifications
  |
  +-- integrations (Composio OAuth)
  |
  +-- API (keys, logs, idempotency, webhooks, webhook logs)
  |
  +-- templates (event templates, task templates, checklists)
```

### Tables by Domain

| Domain | Tables | Key Tables |
|--------|--------|------------|
| Auth & NextAuth | 4 | `users`, `accounts`, `sessions`, `verification_tokens` |
| Platform & Admin | 7 | `platform_admins`, `subscription_plans`, `feature_flags`, `audit_logs`, `announcements` |
| Organizations & RBAC | 8 | `organizations`, `roles`, `permissions`, `role_permissions`, `organization_members`, `invitations` |
| Events & Clients | 7 | `events`, `vendors`, `event_vendors`, `provider_event_access`, `event_collaborations` |
| Tasks | 13 | `tasks`, `task_participants`, `task_messages`, `task_attachments`, `task_checklist_items`, `task_schedule_items` |
| CRM | 6 | `leads`, `lead_stages`, `lead_stage_history`, `companies`, `people` |
| Contacts | 8 | `contacts`, `contact_activities`, `contact_documents`, `contact_relationships` |
| Finance | 9 | `financial_documents`, `document_items`, `payment_records`, `payment_schedules`, `bank_accounts`, `tax_rates` |
| Templates | 7 | `event_templates`, `task_templates`, `event_participants`, `briefing_forms` |
| Guests & RSVP | 13 | `guests`, `guest_groups`, `rsvp_responses`, `rsvp_landing_pages`, `rsvp_settings`, `rsvp_hotels` |
| Vendor Directory | 4 | `vendor_profiles`, `vendor_portfolio`, `vendor_reviews`, `vendor_claims` |
| AI | 6 | `ai_conversations`, `ai_messages`, `ai_feedback`, `ai_prompts`, `ai_documents` |
| Forms | 4 | `forms`, `form_fields`, `form_instances`, `form_submissions` |
| API | 5 | `api_keys`, `api_key_logs`, `webhooks`, `webhook_logs`, `idempotency_keys` |
| Integrations | 2 | `organization_integrations`, `composio_triggers` |
| Notifications | 1 | `notifications` |
| Analytics | 1 | `ai_analytics` |
| Seating | 1 | `event_tables` |
| Event Payments | 1 | `event_payments` |
| Favorites | 1 | `provider_favorites` |
| **Total** | **108** | |

---

## Project Structure

```
hubents-new/
|
+-- src/
|   +-- app/
|   |   +-- api/
|   |   |   +-- v1/              # Public API (62 endpoints across 14 resource groups)
|   |   |   +-- admin/           # Admin API routes (tenants, users, plans, billing, AI, monitoring)
|   |   |   +-- auth/            # Auth API (register, login, password reset)
|   |   |   +-- events/          # Event CRUD + sub-resources (guests, tasks, vendors, RSVP, schedule)
|   |   |   +-- tasks/           # Task CRUD + chat, checklist, attachments, meetings, email, WhatsApp
|   |   |   +-- contacts/        # Contact CRUD + activities, documents, events, relationships
|   |   |   +-- crm/             # CRM API (leads, stages, companies, people)
|   |   |   +-- finance/         # Finance API (documents, payments, bank accounts, Stripe, export)
|   |   |   +-- forms/           # Forms API (fields, instances, submissions)
|   |   |   +-- vendors/         # Vendor CRUD
|   |   |   +-- providers/       # Provider directory, favorites
|   |   |   +-- cron/            # Cron jobs (reminders, cleanup, health, subscriptions)
|   |   |   +-- ai/              # AI chat, feedback, GDPR generation
|   |   |   +-- integrations/    # Composio OAuth callbacks
|   |   |   +-- webhooks/        # Stripe + Composio webhooks
|   |   |   +-- user/            # User profile, billing, preferences, context
|   |   |   +-- ...              # calendar, download, notifications, pusher, roles, team, upload
|   |   |
|   |   +-- dashboard/           # Unified portal (46 pages)
|   |   |   +-- events/          # Event list + detail (tasks, guests, RSVP, vendors, finances, schedule)
|   |   |   +-- finance/         # Finance module (invoices, quotes, proformas, delivery notes, payments, reports)
|   |   |   +-- settings/        # Org settings (roles, developers, integrations, templates)
|   |   |   +-- ai/              # HubIA assistant
|   |   |   +-- calendar/        # Calendar view
|   |   |   +-- chat/            # Internal messaging
|   |   |   +-- contacts/        # Contact CRM
|   |   |   +-- crm/             # Sales pipeline (Kanban)
|   |   |   +-- documents/       # Document manager
|   |   |   +-- forms/           # Form builder + detail
|   |   |   +-- menus/           # Menu management
|   |   |   +-- partners/        # Provider/planner marketplace
|   |   |   +-- payments/        # Client payment processing
|   |   |   +-- providers/       # Provider directory
|   |   |   +-- public-profile/  # Organization public profile
|   |   |   +-- tasks/           # Global task board
|   |   |   +-- team/            # Team management
|   |   |
|   |   +-- admin/               # Platform admin panel (22 pages)
|   |   +-- auth/                # Auth pages (login, register, verify, password reset)
|   |   +-- developers/          # Developer portal + changelog
|   |   +-- onboarding/          # Onboarding wizard
|   |   +-- rsvp/                # Public RSVP page
|   |   +-- f/                   # Public form landing pages
|   |   +-- providers/           # Public provider directory
|   |   +-- terms/, privacy/     # Legal pages
|   |
|   +-- components/              # 163 component files across 17 directories
|   |   +-- ui/                  # 63 shadcn/ui components
|   |   +-- tasks/               # 18 task-related components
|   |   +-- layout/              # 12 layout components (sidebar, header, guards)
|   |   +-- contacts/            # 11 contact components
|   |   +-- events/              # 9 event components
|   |   +-- ai/                  # 7 AI chat components
|   |   +-- calendar/            # 7 calendar components
|   |   +-- crm/                 # 6 CRM components
|   |   +-- finance/             # 6 finance components
|   |   +-- forms/               # 6 form builder components
|   |   +-- guests/              # 5 guest management components
|   |   +-- ...
|   |
|   +-- hooks/                   # 27 custom hooks
|   +-- contexts/                # 3 React contexts (user session, events, AI)
|   +-- config/                  # Tenant types, provider constants
|   +-- lib/                     # Core libraries
|   |   +-- api/                 # API layer (auth, errors, rate-limit, webhooks, MCP, OpenAPI)
|   |   +-- monitoring/          # Error reporter (ClickUp integration)
|   |   +-- clickup/             # ClickUp API client
|   |   +-- session.ts           # Auth helpers (requireAuth, requirePermission, etc.)
|   |   +-- tenant.ts            # RBAC, role hierarchy, plan info
|   |   +-- cross-org.ts         # Cross-organization collaboration
|   |   +-- event-permissions.ts # Event-scoped permissions
|   |   +-- stripe-platform.ts   # SaaS billing helpers
|   |   +-- pdf-download.ts      # Client-side PDF generation
|   |
|   +-- db/
|   |   +-- schema.ts            # 108 Drizzle table definitions + 27 enums
|   |   +-- index.ts             # Neon HTTP connection
|   |
|   +-- __tests__/               # 51 test files across 10 domains
|
+-- scripts/                     # 90+ maintenance and migration scripts
+-- drizzle/                     # 60+ SQL migration files
+-- public/                      # Static assets
+-- .github/workflows/           # CI/CD (daily DB backup)
+-- .cursor/rules/               # Cursor AI rules (8 files)
+-- .cursor/skills/              # Cursor AI skills (8 workflows)
+-- .opencode/                   # OpenCode agent config
+-- .windsurf/                   # Windsurf agent config
```

---

## Getting Started

### Prerequisites

- **Node.js** 20+
- **npm** 10+
- **PostgreSQL** (via [Neon](https://neon.tech) account)
- **Stripe** account (for billing features)
- **Resend** account (for email features)

### Installation

```bash
# Clone the repository
git clone https://github.com/german-gimenez/hubents-app.git
cd hubents-app

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Edit .env.local with your credentials (see Environment Variables below)

# Push schema to database
npx drizzle-kit push

# Seed initial data
npx tsx src/db/seed-roles.ts
npx tsx scripts/migrate-provider-roles.ts
npx tsx scripts/hard-reset-permissions.ts
npx tsx scripts/seed-plans.ts
npx tsx scripts/create-admin.ts

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### Environment Variables

```bash
# --- Required ---
DATABASE_URL=                          # Neon PostgreSQL connection string
AUTH_SECRET=                           # openssl rand -base64 32
NEXT_PUBLIC_APP_URL=http://localhost:3000
AUTH_URL=http://localhost:3000

# --- Email (Required for magic link auth) ---
RESEND_API_KEY=                        # From https://resend.com/api-keys
EMAIL_FROM=HubEnts <noreply@hubents.com>

# --- OAuth (Optional) ---
GOOGLE_CLIENT_ID=                      # Google OAuth
GOOGLE_CLIENT_SECRET=

# --- Stripe Platform (Required for billing) ---
STRIPE_PLATFORM_SECRET_KEY=            # Platform SaaS billing
NEXT_PUBLIC_STRIPE_PLATFORM_KEY=
STRIPE_PLATFORM_WEBHOOK_SECRET=

# --- Stripe Tenant (Optional, for client payments) ---
STRIPE_SECRET_KEY=                     # Tenant client payments
STRIPE_PUBLISHABLE_KEY=
STRIPE_CLIENT_ID=                      # Stripe Connect
STRIPE_WEBHOOK_SECRET=

# --- Storage (Required for file uploads) ---
R2_ACCOUNT_ID=                         # Cloudflare R2
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=hubents-uploads
R2_PUBLIC_URL=

# --- Rate Limiting (Optional, for API) ---
UPSTASH_REDIS_REST_URL=                # Upstash Redis
UPSTASH_REDIS_REST_TOKEN=

# --- Cron Jobs ---
CRON_SECRET=                           # Vercel cron protection

# --- AI (Optional) ---
AI_GATEWAY_API_KEY=                    # Vercel AI Gateway

# --- Integrations (Optional) ---
COMPOSIO_API_KEY=                      # Composio OAuth marketplace

# --- Monitoring (Optional) ---
CLICKUP_API_TOKEN=                     # Error reporter
CLICKUP_TEAM_ID=90132561531
CLICKUP_MONITORING_LIST_ID=901322179370
```

---

## Scripts Reference

### Essential Scripts

| Script | Command | Description |
|--------|---------|-------------|
| Dev server | `npm run dev` | Start with Turbopack HMR |
| Production build | `npm run build` | Build for production |
| Start production | `npm run start` | Start production server |
| Lint | `npm run lint` | ESLint check |
| Test | `npm run test` | Run Vitest in watch mode |
| Test (CI) | `npm run test:run` | Run all tests once |

### Database Scripts

| Script | Command | Description |
|--------|---------|-------------|
| Generate migration | `npm run db:generate` | Generate Drizzle migration |
| Push schema | `npm run db:push` | Push schema directly to DB |
| Studio | `npm run db:studio` | Open Drizzle Studio UI |

### Seed & Setup Scripts

| Script | Description |
|--------|-------------|
| `npx tsx src/db/seed-roles.ts` | Create initial system roles |
| `npx tsx scripts/migrate-provider-roles.ts` | Migrate to 7 unified roles |
| `npx tsx scripts/hard-reset-permissions.ts` | Reset canonical permission mappings |
| `npx tsx scripts/seed-plans.ts` | Seed 5 subscription plans + 9 feature flags |
| `npx tsx scripts/sync-stripe-products.ts` | Sync plans with Stripe products/prices |
| `npx tsx scripts/create-admin.ts` | Create super admin user |
| `npx tsx scripts/seed-wedding-template.ts` | Seed wedding event template |
| `npx tsx scripts/seed-all-templates.ts` | Seed all event templates |
| `npx tsx scripts/full-audit.ts` | Run full data integrity audit |

---

## Cron Jobs

Configured in `vercel.json` and executed by Vercel Cron:

| Schedule | Path | Description |
|----------|------|-------------|
| Every hour | `/api/cron/event-reminders` | Send upcoming event reminders |
| Daily 08:00 UTC | `/api/cron/payment-reminders` | Send payment due/overdue reminders |
| Daily 09:00 UTC | `/api/cron/subscription-lifecycle` | Process trial expirations, downgrades |
| Daily 03:00 UTC | `/api/cron/api-cleanup` | Clean expired idempotency keys, old API logs |
| Every 5 minutes | `/api/cron/health-check` | System health monitoring |

All cron endpoints are protected with `CRON_SECRET`.

---

## Testing

```bash
# Run all tests (watch mode)
npm run test

# Run all tests once (CI mode)
npm run test:run

# Run specific test domain
npx vitest run src/__tests__/api/
npx vitest run src/__tests__/finance/
npx vitest run src/__tests__/forms/
```

### Test Coverage

| Domain | Suites | Coverage Area |
|--------|--------|---------------|
| API | 14 | Endpoints, audit, RBAC, MCP, OpenAPI, feature flags, errors, webhooks |
| Finance | 5 | State machine, RBAC, cross-org sync, payment recalculation, event-scoped visibility |
| Forms | 6 | Builder, validation, fields, instances, submissions, CRM lead creation |
| Schedule | 4 | Run sheet, calendar, permissions, validation |
| RBAC | 2 | UI permissions, v3 urgent tickets |
| Contacts | 2 | Drawer state, API |
| Integrations | 2 | RBAC, inbound messaging |
| Scope Filter | 2 | Collaboration scope, filter logic |
| Billing | 1 | Billing audit |
| Security | 1 | R2 SSRF prefix |
| Guests | 1 | Guest list improvements |
| Config | 1 | Partners routing |
| Subscriptions | 1 | Subscription helpers |
| Permissions | 1 | Event-scoped permissions |
| Files | 1 | File download/preview |
| Lib | 1 | Instagram post URL |

---

## Deployment

### Vercel Auto-Deploy

```
Push to main  -->  Vercel builds  -->  Production (app.hubents.com)
Push to branch -->  Vercel builds  -->  Preview deployment
```

### Pre-Deploy Checklist

```bash
# 1. TypeScript check
npx tsc --noEmit --pretty

# 2. Run all tests
npx vitest run

# 3. Verify no console.log in API routes
# (only console.error allowed)

# 4. If schema changed: run migrations
# 5. If plans changed: npx tsx scripts/seed-plans.ts
# 6. If permissions changed: npx tsx scripts/hard-reset-permissions.ts
# 7. If Stripe products changed: npx tsx scripts/sync-stripe-products.ts

# 8. Push to main
git push origin main
```

### Post-Deploy Verification

1. Public pages load (`/terms`, `/privacy`)
2. Registration flow works (tenant + provider)
3. Billing checkout functions
4. Cron jobs are running (check Vercel logs)
5. Database branch is still protected (Neon Console)

---

## Infrastructure

### Production Stack

```
+------------------+     +------------------+     +------------------+
|    Vercel         |     |   Neon Postgres  |     |  Cloudflare R2   |
|  (Next.js host)   |     |   (Database)     |     |  (File storage)  |
|  Auto-deploy      |---->|   108 tables     |     |  Uploads/backups |
|  Edge functions   |     |   HTTP pooler    |     |  CDN delivery    |
|  Cron scheduler   |     |   30d retention  |     +------------------+
+------------------+     |   Protected      |
                          +------------------+
                                  |
                          +-------v--------+
                          | Daily Backup   |
                          | GitHub Action  |
                          | pg_dump -> R2  |
                          | 30 day retain  |
                          +----------------+
```

### External Services

| Service | Purpose |
|---------|---------|
| **Stripe** | SaaS billing + client payments |
| **Resend** | Transactional email |
| **Upstash Redis** | API rate limiting |
| **Pusher** | Real-time notifications + chat |
| **Composio** | OAuth integration marketplace |
| **Google AI (Gemini)** | AI assistant backend |
| **ClickUp** | Error reporting + project management |

### Database Protection

- **2 branches**, both protected (cannot be deleted)
- **30-day history retention** for point-in-time recovery
- **Daily automated backups** via GitHub Action to Cloudflare R2
- **Branch protection** prevents accidental deletion by integrations
- See `AGENTS.md` for full disaster recovery procedure

---

## License

Private -- HubEnts (c) 2024-2026 -- Powered by [NapsixAI](https://napsix.ai)
