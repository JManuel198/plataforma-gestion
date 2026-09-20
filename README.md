# Plataforma de Gestión Integral

Plataforma de gestión empresarial construida como base escalable y
personalizable por cliente. Empezando por gestión de Órdenes de Trabajo;
CRM, cotizaciones, proyectos, logística y asistencias son el alcance
completo hacia el que escala — ver `docs/spec/` para el detalle de qué
está construido y qué está diferido.

## Stack

- **Framework:** Next.js 16 (App Router) + TypeScript estricto, sin `src/`
- **Estilos:** Tailwind CSS + shadcn/ui
- **Base de datos:** PostgreSQL (Neon)
- **ORM:** Drizzle ORM
- **Autenticación:** Better Auth
- **Kanban:** dnd-kit (planeado, no construido todavía)
- **Generación de PDF:** Playwright (planeado, no construido todavía)
- **Despliegue:** Vercel

## Estructura del proyecto

- `app/` — rutas y páginas (App Router)
- `core/` — auth, roles, catálogos maestros, motor de precios, PDF, auditoría
- `modules/ordenes-trabajo/` — único módulo de negocio construido hasta
  ahora (incluye lo que originalmente iba a ser un módulo `servicios/`
  aparte, fusionado en este tras el primer ensayo con el cliente)
- `config/clientes/` — configuración por cliente (branding, campos, flujos).
  Vacío por ahora: hoy corre una sola instancia compartida, sin `.json`
  de cliente todavía
- `db/schema/` — esquemas de Drizzle
- `db/migrations/` — migraciones generadas (no editar a mano)
- `docs/spec/` — especificación de negocio, fuente de verdad antes que el código
- `.claude/agents/` — subagentes de Claude Code (`auditor`, `arquitecto-datos`)
- `.claude/skills/` — skills de Claude Code (`shadcn-conventions`)

## Configuración local

1. Clonar el repositorio e instalar dependencias:

```
npm install
```

2. Crear `.env.local` en la raíz con:

```
DATABASE_URL="postgresql://usuario:contraseña@host-pooled/basededatos"
DATABASE_URL_DIRECT="postgresql://usuario:contraseña@host-directo/basededatos"
```

`DATABASE_URL` es la cadena pooled de Neon, para la aplicación en tiempo
de ejecución. `DATABASE_URL_DIRECT` es la cadena directa, necesaria para
que las migraciones de Drizzle corran bien — usar la pooled ahí es la
causa más común de errores raros al migrar. Agregar también las
variables que requiera la configuración de Better Auth del proyecto.

3. Verificar que la conexión a la base de datos funciona:

```
npx drizzle-kit check
```

4. Levantar el servidor de desarrollo:

```
npm run dev
```

Abrir `http://localhost:3000`

## Despliegue

Desplegado en Vercel, conectado a la rama `main`. Cada push a `main`
dispara un deploy automático. Variables de entorno configuradas en el
panel de Vercel (Project Settings → Environment Variables), con los
mismos valores que en `.env.local`.

URL de producción: `https://plataforma-gestion-hazel.vercel.app`

## Convenciones del proyecto

Ver `AGENTS.md` para las reglas completas de arquitectura y convenciones
de código que sigue este proyecto (y que sigue Claude Code al trabajar aquí).

## Estado del proyecto

Órdenes de Trabajo (OT) funcional de punta a punta: login con rutas
protegidas, esquema con correlativo atómico (`OT.CCM.AAAA.NNNN`),
formulario y listado con búsqueda, filtro por estado y filtro por rango
de fechas. Servicio y Orden de Trabajo se diseñaron como entidades
separadas y se fusionaron en una sola tras el primer ensayo con el
cliente. Próximo módulo planeado: Personal.

Ver `docs/spec/` para el alcance detallado por bloque y las preguntas de
negocio todavía abiertas.