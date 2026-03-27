# Provider Unification — Deploy Checklist

## Auditoría Completa (26 Mar 2026)

### Bugs Encontrados y Fixeados

| # | Severidad | Archivo | Bug | Fix |
|---|-----------|---------|-----|-----|
| 1 | **CRÍTICO** | `api/auth/provider-register/route.ts` | API no aceptaba campo `name` del usuario (usaba `companyName` como nombre de user). Instagram era obligatorio pero el form unificado lo envía opcional. | Agregado campo `name` opcional al schema Zod. Instagram ahora opcional. User.name usa `name \|\| companyName`. Phone se guarda en user y org. |
| 2 | **MEDIO** | `auth/register/page.tsx` | Error handling leía `data.error` (objeto) en vez de `data.error.message` (string). Mostraba `[object Object]` al usuario. | Cambiado a `data.error?.message \|\| data.error` en ambos paths (provider y planner). |

### Verificación de Consistencia

| Check | Estado | Detalle |
|-------|--------|---------|
| SQL Migration vs Schema | ✅ | 22 campos org + 3 campos users + 2 tablas nuevas + 1 FK. Todo coincide 1:1. |
| TypeScript compilation | ✅ | 0 errores producción (3 solo en test files — vitest `vi` mock preexistente). |
| API response shapes | ✅ | GET vendor/profile, GET providers/[slug], GET providers devuelven todos los campos marketplace. |
| Zod validation schemas | ✅ | PATCH vendor/profile valida todos los campos con tipos correctos. |
| Auth flow | ✅ | Login unificado detecta org type. Provider login/register redirigen a /auth/*. |
| Middleware routes | ✅ | /providers/* es público. /vendor/* requiere auth. /api/providers/[slug]/* pasa sin auth. |
| RBAC | ✅ | Vendor APIs usan `requireAuth()` + orgType check. Portfolio CRUD verifica ownership. |

### Archivos Modificados (16 archivos)

**Database (2)**
- `drizzle/0055_provider_marketplace_fields.sql` — Migration SQL
- `src/db/schema.ts` — Schema Drizzle

**APIs (7)**
- `src/app/api/auth/provider-register/route.ts` — Acepta name, instagram opcional
- `src/app/api/vendor/profile/route.ts` — GET/PATCH con campos marketplace
- `src/app/api/vendor/portfolio/route.ts` — GET/POST portfolio items
- `src/app/api/vendor/portfolio/[id]/route.ts` — PATCH/DELETE portfolio items
- `src/app/api/providers/route.ts` — Directorio con campos marketplace
- `src/app/api/providers/[slug]/route.ts` — Perfil público completo
- `src/app/api/providers/[slug]/portfolio/route.ts` — **NUEVO** Portfolio público

**Frontend (5)**
- `src/app/auth/login/page.tsx` — Smart redirect post-login
- `src/app/auth/register/page.tsx` — Selector tipo planner/provider (3 steps)
- `src/app/vendor/profile/page.tsx` — Rediseño completo con 7 secciones
- `src/app/providers/[slug]/page.tsx` — Perfil público marketplace
- `src/middleware.ts` — Provider auth redirect a /vendor

**Redirects (2)**
- `src/app/provider/login/page.tsx` — Redirect → /auth/login
- `src/app/provider/register/page.tsx` — Redirect → /auth/register?type=provider

---

## Checklist Pre-Deploy

### 1. Base de Datos
- [ ] Ejecutar migración `drizzle/0055_provider_marketplace_fields.sql` en Neon
  ```sql
  -- Conectar a Neon SQL Editor y ejecutar el archivo completo
  -- Es safe: usa IF NOT EXISTS en todo
  ```
- [ ] Verificar que las tablas se crearon: `SELECT * FROM organization_portfolio LIMIT 1;`
- [ ] Verificar columnas nuevas: `SELECT description, tagline, city FROM organizations LIMIT 1;`

### 2. Build & Tests
- [ ] `npx tsc --noEmit` — Solo errores de test (vitest), 0 de producción
- [ ] `npm run build` — Build exitoso
- [ ] `npx vitest run` — Tests pasan (ningún test nuevo afectado)

### 3. Git
- [ ] `git status` — Revisar archivos modificados
- [ ] `git diff --stat` — 16 archivos, ~2000 líneas
- [ ] `git add .`
- [ ] `git commit -m "feat: provider marketplace unification - unified auth, marketplace profile, portfolio, public profiles"`
- [ ] `git push origin main`

### 4. Vercel Deploy
- [ ] Deploy automático al push a main
- [ ] Verificar build exitoso en Vercel dashboard
- [ ] No se requieren nuevas env vars

### 5. Smoke Tests Post-Deploy

**Auth Flow:**
- [ ] Ir a `/auth/login` → Login con cuenta provider → Redirige a `/vendor`
- [ ] Ir a `/auth/login` → Login con cuenta planner → Redirige a `/dashboard`
- [ ] Ir a `/provider/login` → Redirige a `/auth/login`
- [ ] Ir a `/provider/register` → Redirige a `/auth/register?type=provider`
- [ ] Ir a `/auth/register` → Muestra selector Planificador/Proveedor
- [ ] Ir a `/auth/register?type=provider` → Salta directo a step 1 (provider)

**Vendor Profile:**
- [ ] Ir a `/vendor/profile` (logueado como provider) → Carga perfil con todas las secciones
- [ ] Editar tagline, descripción, ciudad → Guardar → Verificar que persiste
- [ ] Agregar item de portfolio (URL de imagen) → Aparece en grilla
- [ ] Eliminar item de portfolio → Desaparece

**Perfil Público:**
- [ ] Ir a `/providers/[slug]` → Muestra perfil público con cover, badges, contacto
- [ ] Portfolio aparece si hay items
- [ ] Badge "Verificado" solo aparece si `verificationStatus === "verified"`

**Registro Provider:**
- [ ] Completar registro tipo Provider → Auto-login → Redirige a `/vendor`
- [ ] Completar registro tipo Planner → Auto-login → Redirige a `/onboarding`

---

## Mejoras Pendientes (Post-Deploy)

| Prioridad | Mejora | Detalle |
|-----------|--------|---------|
| Alta | Provider Onboarding Wizard | Post-registro: wizard para completar perfil (no bloqueante) |
| Alta | Rediseño directorio `/dashboard/providers` | Cards con foto, rating, ciudad, precio |
| Media | Upload de imágenes | Portfolio usa URLs externas — integrar upload a S3/Cloudinary |
| Media | SEO metadata | og:image, title, description para `/providers/[slug]` |
| Baja | Reviews system | Reviews vinculados a organization_id (tabla ya preparada) |
| Baja | Provider invitations flow | Planners invitan providers por email (tabla ya creada) |
