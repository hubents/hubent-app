# HubEnts - Resumen Ejecutivo del Proyecto

**Fecha:** 17 de Febrero, 2026  
**Versión:** 2.0.0  
**URL Producción:** https://app.hubents.com  
**Vercel Project:** hubents-new  
**GitHub:** german-gimenez/hubents-app

---

## 📋 Descripción del Proyecto

HubEnts es una plataforma SaaS multi-tenant para la gestión integral de eventos (bodas, fiestas, corporativos). Combina funcionalidades de CRM, gestión de proyectos, finanzas, coordinación de proveedores y billing con Stripe en una sola aplicación.

---

## ✅ Lo Que Se Desarrolló

### 1. Infraestructura Técnica
| Componente | Tecnología | Estado |
|------------|------------|--------|
| Frontend | Next.js 16, React 19, TypeScript 5 | ✅ Completo |
| UI/UX | Tailwind CSS v4, shadcn/ui, Radix UI | ✅ Completo |
| Base de Datos | Neon PostgreSQL Serverless | ✅ Producción |
| ORM | Drizzle ORM con migraciones | ✅ Completo |
| Autenticación | NextAuth v5 (Google, Email, Credentials) | ✅ Producción |
| Deploy | Vercel (CI/CD automático desde GitHub) | ✅ Activo |
| Storage | Cloudflare R2 (uploads) | ✅ Configurado |
| Email | Resend (transaccional) | ✅ Producción |
| Billing | Stripe (platform + tenant payments) | ✅ Producción |
| AI | Vercel AI SDK con AI Gateway | ✅ Integrado |

### 2. Sistema Multi-Tenant con RBAC
- **Organizaciones:** Cada cliente tiene su espacio aislado (tenant o provider)
- **Roles Tenant:**
  - `owner` - Propietario con acceso total
  - `admin` - Administrador de la organización
  - `planner` - Wedding planner con permisos de gestión
  - `assistant` - Asistente con permisos limitados
  - `accountant` - Solo acceso a finanzas
  - `viewer` - Solo lectura
- **Roles Provider:**
  - `provider_owner` - Dueño del proveedor
  - `provider_admin` - Admin del proveedor
  - `provider_tech` - Técnico del proveedor
- **Permisos granulares** por recurso (events:read, team:invite, finance:*, etc.)

### 3. Módulos Desarrollados

#### 📊 CRM (Gestión de Clientes)
- Pipeline de ventas con vista Kanban
- Drag & drop para mover leads entre etapas
- Gestión de empresas y contactos
- Seguimiento de valor potencial por lead
- Historial de interacciones

#### ✅ Gestión de Tareas
- Lista de tareas con prioridades (alta, media, baja)
- Estados: pendiente, en progreso, completada, cancelada
- Asignación a miembros del equipo
- Vinculación con eventos
- **Chat integrado estilo WhatsApp** por cada tarea
- Mensajes privados entre equipo
- Adjuntos y videos

#### 📅 Gestión de Eventos
- Creación de eventos (bodas, XV años, corporativos, etc.)
- Plantillas de eventos reutilizables
- Generación automática de tareas desde plantillas
- Participantes y roles por evento
- Formularios de briefing personalizados

#### 💰 Módulo Financiero
- Presupuestos y cotizaciones
- Conversión presupuesto → factura
- Catálogo de productos/servicios
- Registro de pagos
- Calendario de pagos programados
- Múltiples cuentas bancarias

#### 👥 Portal de Invitados (RSVP)
- Grupos de invitados (familias, amigos, etc.)
- Gestión individual de invitados
- Landing pages públicas personalizables
- Confirmación de asistencia online
- Estadísticas de confirmaciones
- Restricciones dietéticas y notas

#### 🏪 Marketplace de Proveedores
- Perfiles públicos de proveedores
- Portfolio con imágenes
- Sistema de reseñas y calificaciones
- Categorías (fotografía, catering, música, etc.)
- Proceso de verificación de proveedores
- Portal independiente para providers con su propio registro

#### 💳 SaaS Billing & Subscriptions
- **Stripe Platform Integration** (suscripciones SaaS)
  - Checkout sessions con trial automático
  - Billing portal para autogestión
  - Webhooks: checkout.completed, invoice.paid, payment_failed, sub.updated, sub.deleted
  - Idempotency en invoice webhooks
- **Stripe Tenant Integration** (cobros a clientes del tenant)
  - OAuth Connect para cada org
  - Checkout para facturas individuales
  - Webhook de payment intents
- **5 planes activos**: Starter (€14.50), Standard (€29.50), Agency (€49.50), Provider Free, Provider Pro (€14.50)
- **Entitlements engine**: limits (maxUsers, maxEvents, maxStorage) + feature flags gated por plan
- **Subscription lifecycle**: trial 14d → active/canceled, emails automáticos (expiring, expired, win-back)
- **Guards**: `requireActiveSubscription()`, `requireLimit()`, `requireFeature()` en APIs de escritura

### 4. Panel de Administración (Platform Admin)
- Dashboard con stats separados tenants vs providers
- Gestión de tenants con subscription status
- Gestión de providers con plan, verificación, categoría
- Gestión de usuarios con organizaciones
- CRUD completo de planes de suscripción
- Billing dashboard: MRR, revenue, facturas recientes
- Feature flags
- Logs de auditoría
- AI settings

---

## 🎯 Estado Actual del Proyecto (Feb 2026)

### Lo Que Funciona en Producción
| Funcionalidad | Estado |
|---------------|--------|
| Login con Google / Email / Credentials | ✅ Producción |
| Dashboard principal | ✅ Producción |
| CRM Kanban + contactos | ✅ Producción |
| Gestión de Tareas + Chat | ✅ Producción |
| Calendario | ✅ Producción |
| Gestión de Eventos | ✅ Producción |
| Finanzas + Pagos Stripe | ✅ Producción |
| RSVP + Lista de Invitados | ✅ Producción |
| Billing SaaS + Suscripciones | ✅ Producción |
| Provider Portal + Registro | ✅ Producción |
| Admin Panel completo | ✅ Producción |
| AI Chat (Vercel AI SDK) | ✅ Producción |
| Push Notifications | ✅ Producción |
| File uploads (R2) | ✅ Producción |

### APIs Disponibles (80+ endpoints)
```
/api/auth/*              - Autenticación (register con orgType, login)
/api/crm/*               - CRM (leads, companies, people)
/api/tasks/*             - Tareas + chat + attachments
/api/events/*            - Eventos + guests + templates
/api/finance/*           - Documentos financieros + pagos + Stripe Connect
/api/team/*              - Equipo + invitaciones
/api/vendors/*           - Proveedores
/api/rsvp/*              - RSVP público
/api/subscriptions/*     - Checkout + portal Stripe
/api/webhooks/*          - Stripe platform webhooks
/api/entitlements        - Plan limits + features + usage
/api/user/*              - Perfil + billing + notifications
/api/admin/*             - Dashboard, tenants, providers, users, plans, billing
/api/cron/*              - Subscription lifecycle
/api/ai/*                - AI chat + suggestions
```

---

## 🔧 Mejoras Pendientes (Post-Launch)

### P2 - Nice to Have

| Mejora | Descripción |
|--------|-------------|
| Rate limiting | APIs sensibles (auth, checkout, webhooks) |
| Storage tracking real | `getUsage()` devuelve storage:0 |
| Downgrade flow UI | UI para comunicar proración al bajar de plan |
| useEntitlements en UI | Mostrar warnings visuales de límites en componentes |
| Multi-idioma | Soporte i18n |
| WhatsApp Business | Integración con WhatsApp |
| App móvil | React Native |

---

## 📁 Estructura del Proyecto

```
hubents-new/
├── src/
│   ├── app/                    # Páginas Next.js
│   │   ├── api/               # 80+ API endpoints
│   │   ├── dashboard/         # Panel principal (tenant)
│   │   ├── admin/             # Panel administrador (platform)
│   │   ├── auth/              # Login, register (unified: planners + providers)
│   ├── components/            # Componentes React
│   │   ├── ui/               # shadcn/ui components
│   │   ├── crm/              # LeadKanban
│   │   ├── tasks/            # TaskPanel + Chat
│   │   ├── calendar/         # Calendario
│   │   ├── admin/            # Admin components
│   │   └── ai/               # AI chat components
│   ├── contexts/              # React contexts
│   │   ├── ai-context.tsx
│   │   ├── event-context.tsx
│   │   └── user-session-context.tsx
│   ├── db/                    # Base de datos
│   │   ├── schema.ts         # 55+ tablas definidas
│   │   ├── index.ts          # Conexión Drizzle (Neon HTTP)
│   │   └── seed-plans.ts     # Seed planes + feature flags
│   ├── hooks/                 # React hooks
│   │   ├── use-entitlements.ts # Plan limits + features
│   │   ├── use-leads.ts
│   │   ├── use-tasks.ts
│   │   └── use-events.ts
│   └── lib/                   # Utilidades
│       ├── session.ts         # Auth + requireLimit + requireActiveSubscription
│       ├── tenant.ts          # RBAC + permissions + plan info
│       ├── entitlements.ts    # Usage + feature flags
│       ├── stripe-platform.ts # Stripe SaaS billing
│       ├── email.ts           # Resend emails
│       ├── r2.ts              # Cloudflare R2 uploads
│       ├── events.ts          # Event helpers
│       ├── finance.ts         # Finance helpers
│       ├── guests.ts          # RSVP helpers
│       └── audit.ts           # Audit logging
├── scripts/                   # 25+ scripts de utilidad
├── drizzle/                   # 35+ migraciones SQL
├── docs/                      # Documentación
└── .windsurf/                 # Cascade rules + skills
```

---

## 📊 Métricas del Proyecto

| Métrica | Valor |
|---------|-------|
| Tablas en BD | 55+ |
| API endpoints | 80+ |
| Componentes UI | 100+ |
| Hooks personalizados | 15+ |
| Páginas | 40+ |
| Scripts de utilidad | 25+ |
| Migraciones SQL | 35+ |
| Feature flags | 7 |
| Planes activos | 5 (3 tenant + 2 provider) |
| Tenants registrados | 33 |
| Providers registrados | 2 |

---

## 💡 Conclusión

HubEnts está **en producción** en https://app.hubents.com con:

- ✅ Billing SaaS completo con Stripe (checkout, portal, webhooks, lifecycle)
- ✅ Plan enforcement (limits + features + subscription status)
- ✅ RBAC granular para tenants y providers
- ✅ Admin panel completo con billing dashboard
- ✅ 33 tenants + 2 providers registrados
- ✅ Auditoría SaaS completada Feb 2026 — todos los P0 y P1 resueltos

**Estado: Listo para cobrar suscripciones.**

---

*Última actualización: 17 Febrero 2026 - HubEnts v2.0.0*
