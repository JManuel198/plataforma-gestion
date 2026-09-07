# Plataforma de Gestión Integral

Plataforma de gestión empresarial (CRM, cotizaciones, proyectos, logística,
asistencias) construida como base escalable y personalizable por cliente.

## Stack

- **Framework:** Next.js 16 (App Router) + TypeScript
- **Estilos:** Tailwind CSS + shadcn/ui
- **Base de datos:** PostgreSQL (Neon)
- **ORM:** Drizzle ORM
- **Autenticación:** Better Auth
- **Kanban:** dnd-kit
- **Generación de PDF:** Playwright
- **Despliegue:** Vercel

## Estructura del proyecto

- `app/` — rutas y páginas (App Router)
- `core/` — auth, roles, catálogos maestros, motor de precios, PDF, auditoría
- `modules/` — módulos de negocio: crm, cotizaciones, proyectos, logistica, asistencias
- `config/clientes/` — configuración por cliente (branding, campos, flujos)
- `db/schema/` — esquemas de Drizzle
- `db/migrations/` — migraciones generadas (no editar a mano)
- `docs/spec/` — especificación de negocio, fuente de verdad antes que el código

## Configuración local

1. Clonar el repositorio e instalar dependencias:
```bash
   npm install
```

2. Crear `.env.local` en la raíz con:
DATABASE_URL="postgresql://usuario:contraseña@host/basededatos"
   (Obtener la cadena de conexión desde el panel de Neon)

3. Verificar que la conexión a la base de datos funciona:
```bash
   npx drizzle-kit check
```

4. Levantar el servidor de desarrollo:
```bash
   npm run dev
```
   Abrir `http://localhost:3000`

## Despliegue

Desplegado en Vercel, conectado a la rama `main`. Cada push a `main` dispara
un deploy automático. Variable de entorno `DATABASE_URL` configurada en el
panel de Vercel (Project Settings → Environment Variables), con el mismo
valor que en `.env.local`.

URL de producción: `[pendiente — agregar cuando esté desplegado]`

## Convenciones del proyecto

Ver `AGENTS.md` para las reglas completas de arquitectura y convenciones
de código que sigue este proyecto (y que sigue Claude Code al trabajar aquí).

## Estado del proyecto

MVP en construcción — fase de captura de especificación y checkpoint 1
(cimientos: auth, roles, layout).