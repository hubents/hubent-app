---
name: hubents-deploy
description: >-
  HubEnts production deploy on Vercel. Use when the user asks to deploy, release,
  ship to production, push to main, run pre-deploy checks, or verify production
  readiness. Includes TypeScript check, Vitest, API console.log scan, optional
  DB seed, permissions reset, Stripe product sync, git push, and smoke tests.
---

# HubEnts — Deploy to production (Vercel)

## When to use this skill

- Deploying or releasing HubEnts to production
- Running pre-deploy checks before merge/push
- User mentions Vercel, `main`, production URL, or “ship it”

## Prerequisites

- `.env.local` with `DATABASE_URL` when running DB/permission scripts
- `STRIPE_PLATFORM_SECRET_KEY` in `.env.local` when running `sync-stripe-products.ts`
- Vercel project env vars configured (see end of this skill)

## Workflow ordering (complex releases)

1. If **schema or migrations** changed → run skill **`hubents-database-migration`** first
2. If **`/api/v1` / OpenAPI / changelog** changed → run **`hubents-api-changelog-update`** before commit
3. Then run this **deploy** checklist and push

## Pre-deploy checks

### 1. TypeScript check

```powershell
npx tsc --noEmit --pretty
```

### 2. All tests

```powershell
npx vitest run
```

### 3. No `console.log` in API routes (only `console.error` allowed)

Git Bash / WSL / macOS / Linux:

```bash
grep -r "console.log" src/app/api/ --include="*.ts" -l
```

PowerShell (Windows):

```powershell
Get-ChildItem -Path src/app/api -Recurse -Filter *.ts | ForEach-Object { if (Select-String -Path $_.FullName -Pattern "console.log" -Quiet) { $_.FullName } }
```

Expect **no output** / empty list. If files appear, remove or replace with `console.error` where appropriate.

## Database scripts (only if schema or seed data changed)

### 4. Seed plans (idempotent)

```powershell
npx tsx scripts/seed-plans.ts
```

### 5. Reset permissions (idempotent — needs `DATABASE_URL`)

```powershell
$envContent = Get-Content ".env.local" | Where-Object { $_ -match "^DATABASE_URL=" }
$dbUrl = $envContent -replace '^DATABASE_URL="?([^"]*)"?$', '$1'
$env:DATABASE_URL = $dbUrl
npx tsx scripts/hard-reset-permissions.ts
```

### 6. Sync Stripe products (needs `STRIPE_PLATFORM_SECRET_KEY` in `.env.local`)

```powershell
npx tsx scripts/sync-stripe-products.ts
```

## Git and deploy

### 7. Stage changes

```powershell
git add -A
```

### 8. Commit

```powershell
git commit -m "type: description"
```

### 9. Push to `main` (triggers Vercel auto-deploy)

```powershell
git push origin main
```

## Post-deploy smoke test (manual)

1. `https://app.hubents.com/terms` — loads without login
2. `https://app.hubents.com/privacy` — loads without login
3. Register new tenant → auto-login → onboarding → dashboard
4. Register new provider → auto-login → onboarding → dashboard (unified portal)
5. Checkout billing from tenant settings
6. Upgrade provider settings (free → pro)
7. Non-existent route → custom 404
8. Toasts on actions

## Post-deploy infrastructure check

After every deploy, verify:
1. Neon `production` branch is still **protected** (Neon Console → Branches → shield icon)
2. `DATABASE_URL` in Vercel matches `ep-floral-sea-ahusfae7-pooler` endpoint
3. Daily backup GitHub Action is enabled and last run succeeded

## Environment variables required in Vercel

- `DATABASE_URL` — Neon PostgreSQL pooler (`ep-floral-sea-ahusfae7-pooler.c-3.us-east-1.aws.neon.tech`)
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL` — `https://app.hubents.com`
- `NEXT_PUBLIC_APP_URL` — `https://app.hubents.com`
- `STRIPE_PLATFORM_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PLATFORM_KEY`, `STRIPE_PLATFORM_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- R2: `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `COMPOSIO_API_KEY`
- `CRON_SECRET`
- `AI_GATEWAY_API_KEY`

## GitHub Secrets required (for daily backup Action)

- `DATABASE_URL` — same Neon pooler URL as Vercel
- `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID`, `R2_BUCKET_NAME`

## Related project rules

- `.cursor/rules/hubents-project-architecture.mdc`
- `.cursor/rules/hubents-saas-billing.mdc`
- `.cursor/rules/hubents-workflow-skills.mdc`

## See also (skills)

- `hubents-database-migration` — Drizzle/Neon migrations before deploy
- `hubents-api-changelog-update` — public API changelog before release
- `create-drawer` — if the release is UI-heavy for drawers
- `pdf-download` — if PDF flows changed

## Source

Derived from `.windsurf/workflows/deploy.md` (Windsurf copy stays unchanged in repo).
