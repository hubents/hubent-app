# Hard checklist — Instagram post URLs (perfil público)

Audit steps for the plan: accept `instagram.com/{usuario}/reel|p|tv/{shortcode}` in addition to paths without username.

## Plan coverage

| Step | Check | Status |
|------|--------|--------|
| 1 | Shared module `src/lib/instagram-post-url.ts` with `INSTAGRAM_POST_URL_REGEX` + `isInstagramPostUrl` | OK |
| 2 | Dashboard Mi Perfil Público uses `isInstagramPostUrl` (no duplicate regex) | OK |
| 3 | PATCH `/api/organizations/profile` Zod uses same `INSTAGRAM_POST_URL_REGEX` | OK |
| 4 | Página pública `/providers/[slug]` filtra embeds con `isInstagramPostUrl` | OK |
| 5 | No otros `instagram.com/(p\|reel|tv)` sueltos en repo para este flujo | OK (grep) |

## Gaps found and closed

| Gap | Resolution |
|-----|------------|
| Regex solo aceptaba `instagram.com/reel/...` sin usuario en la ruta | Segmento opcional `(?:[\w.]+\/)?` en `instagram-post-url.ts` |
| Regex duplicado en 3 sitios | Un solo módulo importado en UI, API y perfil público |
| Sin prueba alineada Zod ↔ helper | Test con `z.string().regex(INSTAGRAM_POST_URL_REGEX)` |
| Sin checklist versionado | Este archivo |

## Tests ejecutados

- `pnpm exec vitest run src/__tests__/lib/instagram-post-url.test.ts`
- `pnpm exec vitest run` (suite completa antes de deploy)

## E2E manual (no hay Playwright en el repo)

1. Partners / proveedor verificado: Dashboard → Mi Perfil Público → sección Instagram posts.
2. Pegar `https://www.instagram.com/{usuario}/reel/{id}/` → no debe aparecer “URL inválida”.
3. Guardar cambios → sin error de validación del API.
4. Abrir perfil público (`/providers/{slug}`) → el post debe listarse / embed según librería.

## Deploy

- Rama: `main`
- Vercel: deploy automático al push
- Post-deploy: smoke según skill `hubents-deploy`
