---
name: hubents-deploy
description: HubEnts production deploy on Vercel. Use when the user asks to deploy, release, ship to production, push to main, run pre-deploy checks, sync Stripe products, or verify production readiness. Includes TypeScript check, Vitest, API console.log scan, optional DB seed, permissions reset, git push, and post-deploy smoke tests.
metadata:
  audience: agents
  workflow: release
---

# HubEnts — Deploy to production (Vercel)

> **Fuente única de verdad:** `.cursor/skills/hubents-deploy/SKILL.md`
> Este archivo es el espejo OpenCode — al editar el flujo, sincronizar ambos.

## Cuándo usar este skill

- Deploy o release de HubEnts a producción
- Pre-deploy checks antes de merge/push
- El usuario menciona Vercel, `main`, URL producción, o "ship it"

## Orden recomendado para releases complejos

1. Si cambió **schema** o migraciones → primero skill **`hubents-database-migration`**
2. Si cambió **`/api/v1` / OpenAPI / changelog** → ejecutar **`hubents-api-changelog-update`** antes del commit
3. Después seguir este checklist y push

## Pre-deploy checks

```powershell
# 1. TypeScript
npx tsc --noEmit --pretty

# 2. Tests
npx vitest run

# 3. No console.log en API routes (solo console.error permitido)
Get-ChildItem -Path src/app/api -Recurse -Filter *.ts | ForEach-Object {
  if (Select-String -Path $_.FullName -Pattern "console.log" -Quiet) { $_.FullName }
}
```

Salida esperada del paso 3: lista vacía.

## Database scripts (solo si cambió schema o seed)

```powershell
# Seed plans (idempotente)
npx tsx scripts/seed-plans.ts

# Reset permissions (necesita DATABASE_URL en env)
$envContent = Get-Content ".env.local" | Where-Object { $_ -match "^DATABASE_URL=" }
$dbUrl = $envContent -replace '^DATABASE_URL="?([^"]*)"?$', '$1'
$env:DATABASE_URL = $dbUrl
npx tsx scripts/hard-reset-permissions.ts

# Sync Stripe products (necesita STRIPE_PLATFORM_SECRET_KEY)
npx tsx scripts/sync-stripe-products.ts
```

## Git y deploy

```powershell
git add -A
git commit -m "type: description"
git push origin main          # dispara deploy automático en Vercel
```

## Post-deploy smoke test

1. `https://app.hubents.com/terms` y `/privacy` cargan sin login
2. Registro nuevo tenant → onboarding → dashboard
3. Registro nuevo provider → onboarding → dashboard (portal unificado)
4. Checkout billing desde tenant settings
5. Upgrade provider settings (free → pro)
6. 404 personalizado en ruta inexistente
7. Toasts en acciones

## Post-deploy infra check

1. Branch Neon `vercel-dev-recovered` sigue **PROTEGIDA** (Neon Console → ícono de escudo)
2. `DATABASE_URL` en Vercel apunta a `ep-gentle-moon-ahp5x11a-pooler`
3. GitHub Action diaria de backup ejecutó OK la última vez

## Vars de entorno requeridas en Vercel

- `DATABASE_URL` — Neon pooler `ep-gentle-moon-ahp5x11a-pooler.c-3.us-east-1.aws.neon.tech`
- `NEXTAUTH_SECRET`, `NEXTAUTH_URL=https://app.hubents.com`
- `NEXT_PUBLIC_APP_URL=https://app.hubents.com`
- `STRIPE_PLATFORM_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PLATFORM_KEY`, `STRIPE_PLATFORM_WEBHOOK_SECRET`
- `RESEND_API_KEY`
- R2: `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`
- `COMPOSIO_API_KEY`, `CRON_SECRET`, `AI_GATEWAY_API_KEY`
- ClickUp: `CLICKUP_API_TOKEN`, `CLICKUP_TEAM_ID=90132561531`, `CLICKUP_MONITORING_LIST_ID=901322179370`

## GitHub Secrets para backup diario

`DATABASE_URL`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_ACCOUNT_ID`, `R2_BUCKET_NAME`

## Related

- Skill `hubents-database-migration` — migraciones Drizzle/Neon antes de deploy
- Skill `hubents-api-changelog-update` — changelog público antes de release
- Skill `neon-data-protection` — protección de branches Neon
- `AGENTS.md` — mapa completo de paridad triple
