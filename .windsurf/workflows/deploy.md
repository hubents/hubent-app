---
description: Full deploy workflow for HubEnts - from code changes to production
---

# Deploy Workflow

## When to run
Every time you need to deploy changes to production (Vercel).

## Pre-deploy checks

1. **Run TypeScript check**
// turbo
```
npx tsc --noEmit --pretty
```

2. **Run all tests**
// turbo
```
npx vitest run
```

3. **Verify no console.log in production code** (only console.error allowed in API routes)
```
grep -r "console.log" src/app/api/ --include="*.ts" -l
```

## Database scripts (if schema or seed data changed)

4. **Seed plans** (idempotent — safe to re-run)
```
npx tsx scripts/seed-plans.ts
```

5. **Reset permissions** (idempotent — needs DATABASE_URL in env)
```
$envContent = Get-Content ".env.local" | Where-Object { $_ -match "^DATABASE_URL=" }
$dbUrl = $envContent -replace '^DATABASE_URL="?([^"]*)"?$', '$1'
$env:DATABASE_URL = $dbUrl
npx tsx scripts/hard-reset-permissions.ts
```

6. **Sync Stripe products** (needs STRIPE_PLATFORM_SECRET_KEY in .env.local)
```
npx tsx scripts/sync-stripe-products.ts
```

## Git & Deploy

7. **Stage all changes**
```
git add -A
```

8. **Commit with descriptive message**
```
git commit -m "type: description"
```

9. **Push to main** (triggers Vercel auto-deploy)
// turbo
```
git push origin main
```

## Post-deploy smoke test (manual)

10. Visit `https://app.hubents.com/terms` — should load without login
11. Visit `https://app.hubents.com/privacy` — should load without login
12. Register a new tenant → verify auto-login → onboarding → dashboard
13. Register a new provider → verify auto-login → vendor portal
14. Test checkout billing from tenant settings
15. Test upgrade from vendor settings (free → pro)
16. Visit non-existent route → verify custom 404
17. Verify toast notifications appear on actions

## Environment variables required in Vercel
- `DATABASE_URL` — Neon PostgreSQL connection string
- `NEXTAUTH_SECRET` — NextAuth encryption secret
- `NEXTAUTH_URL` — `https://app.hubents.com`
- `NEXT_PUBLIC_APP_URL` — `https://app.hubents.com`
- `STRIPE_PLATFORM_SECRET_KEY` — Stripe live secret key (sk_live_...)
- `NEXT_PUBLIC_STRIPE_PLATFORM_KEY` — Stripe live publishable key (pk_live_...)
- `STRIPE_PLATFORM_WEBHOOK_SECRET` — Stripe webhook signing secret
- `RESEND_API_KEY` — Resend email API key
- `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` — Cloudflare R2
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` — Google OAuth
- `COMPOSIO_API_KEY` — Composio integrations
- `CRON_SECRET` — For subscription lifecycle cron
- `AI_GATEWAY_API_KEY` — For HubIA
