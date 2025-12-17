# HubEnts

Plataforma integral para gestión de bodas y eventos.

## Stack Tecnológico

- **Framework**: Next.js 14 (App Router)
- **Lenguaje**: TypeScript
- **Estilos**: Tailwind CSS v4
- **Iconos**: Remix Icons + Lucide React
- **Animaciones**: Framer Motion
- **Fuente**: DM Sans

## Características

- 35+ componentes UI (AlignUI ~95%)
- 20+ animaciones CSS
- Dashboard completo con estadísticas
- CRM con pipeline de ventas
- Gestión de eventos y tareas
- Directorio de proveedores
- Calendario integrado
- Sistema de pagos
- Chat y equipo
- Configuración de usuario

## Instalación

```bash
npm install
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

## Scripts

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Servidor de desarrollo (Turbopack) |
| `npm run build` | Build de producción |
| `npm run start` | Servidor de producción |
| `npm run lint` | Verificar código |

## Estructura del Proyecto

```
src/
├── app/                    # Páginas (App Router)
│   ├── dashboard/          # Dashboard y sub-páginas
│   ├── login/              # Autenticación
│   ├── components/         # Showcase de componentes
│   └── demo/               # Demo de animaciones
├── components/
│   ├── ui/                 # Componentes base (41)
│   ├── layout/             # Sidebar, Header
│   └── dashboard/          # Componentes específicos
└── lib/                    # Utilidades y datos mock
```

## Variables de Entorno

Crear archivo `.env.local`:

```env
# Clerk (Auth) - Próximamente
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Neon (Database) - Próximamente
DATABASE_URL=
```

## Deploy

El proyecto está optimizado para Vercel:

1. Conectar repositorio a Vercel
2. Deploy automático en cada push

## Licencia

Privado - HubEnts © 2024
