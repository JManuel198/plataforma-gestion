<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Sobre este proyecto
Plataforma de gestión empresarial (CRM, cotizaciones, proyectos, logística,
asistencias), construida como base escalable y personalizable por cliente.
Este documento es la fuente de verdad para cualquier agente de IA que
trabaje en este código.

## Stack
- Next.js 16 (App Router), TypeScript estricto, sin directorio src/
- Tailwind CSS + shadcn/ui
- PostgreSQL (Neon) + Drizzle ORM
- Better Auth
- dnd-kit (kanban arrastrable)
- Playwright (generación de PDF)
- Despliegue en Vercel

## Arquitectura
- core/ — auth, roles, catálogos maestros, motor de precios, generación de
  PDF, auditoría. Nunca se bifurca por cliente.
- modules/ — módulos de negocio independientes: crm/, cotizaciones/,
  proyectos/, logistica/, asistencias/. Cada uno consume core/ pero no
  depende de otro módulo directamente.
- config/clientes/ — un .json por cliente con branding, campos extra,
  flujos de aprobación y módulos activos. Toda personalización vive aquí,
  nunca en ramas de git ni en código condicional por cliente.

  Nota sobre el modelo de despliegue: este repositorio es compartido y
  contiene la configuración de todos los clientes (un .json por cliente).
  Sin embargo, cada cliente corre en su propia instancia desplegada —
  su propio proyecto en Vercel y su propia base de datos en Neon — que
  carga en tiempo de ejecución únicamente el archivo de configuración
  correspondiente a ese cliente, mediante una variable de entorno
  (ej. CLIENTE_ACTIVO=acme). El código fuente es único y compartido;
  el runtime de producción de cada cliente nunca lo es. No existe
  aislamiento por tenant_id porque no hace falta: cada base de datos
  pertenece a un solo cliente.
- docs/spec/ — especificación de negocio capturada de la plataforma guía.
  Fuente de verdad antes que el código: ante cualquier duda sobre una
  regla de negocio, se consulta aquí primero, nunca se asume.
- db/schema/ — definiciones de tablas en Drizzle.
- db/migrations/ — migraciones generadas por Drizzle. Nunca se editan a mano.

## Reglas invariables
1. Toda regla de negocio y todo cálculo vive en el backend. El frontend
   nunca calcula totales, descuentos ni impuestos, solo los muestra.
2. Todo monto se guarda como entero en la unidad mínima (céntimos), nunca
   como float.
3. Ninguna cotización se edita después de aprobada — los cambios generan
   una nueva versión.
4. Cada cliente tiene su propia base de datos (instancia dedicada, no
   multi-tenant compartido). No se filtra por tenant_id.
5. Interfaz: solo shadcn/ui + Tailwind. Sin CSS custom salvo justificación
   explícita en el propio archivo.
6. Toda migración pasa por Drizzle (npx drizzle-kit generate). Nunca SQL
   manual suelto.
7. Antes de tocar una regla de negocio, se consulta docs/spec/. Si no está
   documentada, se registra la duda en docs/spec/preguntas-abiertas.md en
   vez de asumir.
8. Ningún secreto se hardcodea. Todo vive en variables de entorno
   (.env.local, nunca versionado).

## Convenciones
- Archivos: kebab-case. Componentes de React: PascalCase.
- Un módulo de negocio = una carpeta en modules/, con su propio schema.ts,
  actions.ts y components/.
- Los correlativos siguen el formato definido en config/clientes/*.json,
  nunca hardcodeado en el módulo.

## Deuda técnica conocida
- estado-formulario.ts está duplicado entre modules/servicios y
  modules/ordenes-trabajo porque un módulo no puede importar de otro
  (regla de Arquitectura). Unificar en core/ cuando haya tiempo fuera
  de sprint.
- El código de empresa "CCM" en el correlativo de OT vive en
  modules/ordenes-trabajo/constantes.ts, no en config/clientes/*.json
  como dice la convención de Correlativos en AGENTS.md —
  config/clientes/ no tiene ningún .json todavía. Decisión deliberada
  para este sprint, no un descuido. Al mover el correlativo a
  config/clientes/*.json hay que mover las CINCO constantes juntas
  (PREFIJO_OT, CODIGO_EMPRESA, DIGITOS_CORRELATIVO, CORRELATIVO_INICIAL
  y ZONA_HORARIA — esta última hoy en lib/fecha.ts), no solo
  CODIGO_EMPRESA: si no, el archivo de cliente define el formato a
  medias y el resto sigue fijo en el código.
- No hay .env.example. DATABASE_URL_DIRECT (conexión directa de Neon
  para migraciones, distinta de la pooled de runtime) solo está
  documentada en el comentario de drizzle.config.ts, así que alguien
  que clone el repo no sabe que existe.
- Al crear una OT, si el Servicio de origen desaparece entre la
  verificación y el INSERT, Postgres lanza un 23503 (FK violada) que
  nadie traduce y llega al usuario como error 500 crudo — a diferencia
  del 23505, que sí tiene mensaje. La ventana es mínima y la base nunca
  queda inconsistente; es una aspereza, no un riesgo.
- Las columnas de fecha (timestamp sin zona) dependen de dos ajustes de
  node-postgres en db/index.ts: un type parser que lee el valor como UTC,
  y parseInputDatesAsUTC, que hace que las fechas escritas por Node
  (session.expires_at de Better Auth, los $onUpdate de updated_at) se
  guarden también en UTC. Las dos van juntas: con solo una, un proceso
  fuera de UTC guarda hora local y la relee como UTC, y la fecha vuelve
  corrida. En Vercel el proceso ya corre en UTC y no cambian nada. El
  arreglo de fondo es migrar esas columnas a timestamptz — no se hizo en
  este sprint porque exige una migración de datos, no solo de código.
- components/ui/dialog.tsx:112 usa render={<Button .../>} en el trigger
  de cierre — mismo patrón de render que el bug de nativeButton que se
  corrigió en los Links de navegación, pero Dialog no se usa en ninguna
  pantalla todavía y el caso puede ser distinto (Close no es un link).
  Verificar en consola la primera vez que se use Dialog en una pantalla
  real, antes de asumir que está bien o que hay que corregirlo.
