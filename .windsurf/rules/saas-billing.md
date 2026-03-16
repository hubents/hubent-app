# SaaS Billing Rules

## Stripe Integration (Dual - NO mezclar)
- **Platform** (`STRIPE_PLATFORM_SECRET_KEY`): suscripciones SaaS → `/api/webhooks/stripe-platform`
- **Tenant** (`STRIPE_SECRET_KEY`): cobros a clientes del tenant → `/api/finance/stripe/webhook`
- Lib platform: `src/lib/stripe-platform.ts` → `getStripePlatform()`
- NUNCA mezclar las keys entre los dos flujos

## Plan Enforcement (session.ts)
- `requireActiveSubscription()` → en TODA API de escritura (crear eventos, invitar miembros)
- `requireLimit("events"|"users"|"storage")` → verificar límites del plan
- `requireFeature("key")` → para features gated por plan
- Super admins e impersonation bypasean todos los checks
- `TenantSession.subscriptionStatus` disponible: active/trialing/canceled/past_due/null

## Registro de organizaciones
- **Tenant**: auto-assign Starter (id=5) + trial 14d → `src/app/api/auth/register/route.ts`
- **Provider**: auto-assign provider_free (id=8) + active → `src/app/api/auth/provider-register/route.ts`
- Siempre crear subscription + actualizar org.planId

## Planes activos (sincronizados con Stripe live Mar 2026)
| Plan | ID | Slug | Tipo | €/mes | Stripe Product |
|------|----|------|------|-------|----------------|
| Starter | 5 | starter | tenant | 14.50 | prod_Tzqnggm0AsrDRW |
| Standard | 6 | standard | tenant | 29.50 | prod_TzqnKhKhzr5KLH |
| Agency | 7 | agency | tenant | 49.50 | prod_TzqnVMhGDgZo9Z |
| Free | 8 | provider-free | provider | 0 | N/A (sin Stripe) |
| Pro | 9 | provider-pro | provider | 14.50 | prod_TzqnzSySCfPiog |
- Planes 1-4 desactivados (legacy)
- Script sync: `scripts/sync-stripe-products.ts` (maneja live↔test mode switches)

## Webhooks - Buenas prácticas
- Idempotency: siempre verificar si el invoice/payment ya fue procesado antes de insertar
- `handleInvoicePaid` chequea `stripeInvoiceId` duplicado
- Checkout valida `plan.orgType === org.orgType`

## Admin APIs
- Usar `requirePlatformAdmin()` + `export const dynamic = "force-dynamic"`
- Providers API: evitar correlated SQL subqueries (causan 500 en Vercel serverless)
- Usar queries separadas + merge en JS
