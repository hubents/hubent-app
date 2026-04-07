# Hard checklist audit — Logo unificado, perfil público, impersonación

Fecha de auditoría: 2026-04-08  
Plan de referencia: logos unificados + fix `/api/user/profile` (tenant activo).

## 1. Plan vs implementación

| # | Requisito del plan | Estado | Evidencia / notas |
|---|-------------------|--------|-------------------|
| 1.1 | GET/PATCH `/api/user/profile` usa contexto de tenant activo (cookie + impersonación) | OK | `requireAuth()` + `tenantSession.organizationId` en lectura/escritura de `organizations` |
| 1.2 | `ensureUserHasOrganization` antes de `requireAuth` (bootstrap) | OK | Mantiene creación automática de org |
| 1.3 | Doble escritura: al guardar `invoiceLogo`, actualizar `logo` con el mismo valor | OK | Bloque `orgData.invoiceLogo` en PATCH |
| 1.4 | No actualizar org vía `orgData.logo` suelto en user profile | OK | Línea `orgData.logo` eliminada del PATCH |
| 1.5 | Formulario fiscal: `invoiceLogo \|\| logo` para legacy | OK | `FiscalSection` estado inicial |
| 1.6 | Deep link `?section=fiscal` abre Datos fiscales | OK | `useSearchParams` + estado inicial |
| 1.7 | Mi Perfil Público: sin input de logo; preview + CTA a Configuración | OK | `public-profile/page.tsx` |
| 1.8 | PATCH `/api/organizations/profile` sin campo `logo` | OK | `updateSchema` sin `logo`; sin `updates.logo` |
| 1.9 | GET `/api/organizations/profile` expone `invoiceLogo` para preview | OK | Respuesta incluye `invoiceLogo` |
| 1.10 | Copy UX: título/ayuda logo en Datos fiscales | OK | "Logo de la organización" + texto PDF ~48px |
| 1.11 | Sin `console.log` en rutas API de perfil | OK | Solo `console.error` donde aplica |
| 1.12 | Cliente settings sin `console.log` de debug | OK | Removido "Profile loaded" |

## 2. Gaps encontrados y resolución

| Gap | Resolución |
|-----|------------|
| `console.log` en settings al cargar perfil | Eliminado |
| E2E automatizado (Playwright) | **No hay suite E2E en el repo** — sección 4 manual obligatoria |

## 3. Tests automatizados

| Check | Comando / archivo |
|-------|-------------------|
| TypeScript | `pnpm exec tsc --noEmit` |
| Vitest | `pnpm exec vitest run` |
| Contrato estático perfil/logo | `src/__tests__/api/user-profile-logo-audit.test.ts` |

## 4. E2E manual (última auditoría antes de producción)

Ejecutar en staging o producción tras deploy:

1. **Usuario normal (sin impersonar)**  
   - Configuración → Datos fiscales → subir logo → Guardar.  
   - Verificar factura/preview de documento muestra el logo.  
   - Mi Perfil Público muestra la misma imagen y el botón lleva a Datos fiscales.

2. **Impersonación (super admin)**  
   - Impersonar tenant A; cambiar logo en Datos fiscales.  
   - Confirmar que el logo cambió en org A (no en la org personal del admin).  
   - Salir de impersonación; org personal intacta.

3. **Deep link**  
   - Abrir `/dashboard/settings?section=fiscal` y comprobar que la sección activa es Datos fiscales.

4. **PATCH org profile**  
   - Guardar solo otros campos en Mi Perfil Público (ej. tagline); el logo no debe poder editarse desde ahí.

## 5. Migración DB opcional (fuera de este PR)

- Script COALESCE `logo` / `invoice_logo` para filas desalineadas: pendiente de producto.

## 6. Sign-off

- [ ] Revisor ejecutó sección 4 en entorno desplegado  
- [ ] Commit y push a `main` registrados en ticket ClickUp  
