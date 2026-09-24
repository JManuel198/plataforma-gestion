# Plataforma de Gestión Integral

Plataforma de gestión empresarial construida como base escalable y
personalizable por cliente. Hoy cubre Órdenes de Trabajo, Personal y los cinco
catálogos maestros; cotizaciones, CRM, proyectos, logística y asistencias son
el alcance hacia el que crece — ver `docs/spec/` para el detalle de qué está
construido y qué está diferido.

## Stack

- **Framework:** Next.js 16 (App Router) + TypeScript estricto, sin `src/`
- **Estilos:** Tailwind CSS + shadcn/ui
- **Base de datos:** PostgreSQL (Neon)
- **ORM:** Drizzle ORM
- **Autenticación:** Better Auth
- **Pruebas:** Playwright (`@playwright/test`), con dos pruebas de humo; la
  suite real sigue pendiente (ver deuda técnica en `AGENTS.md`)
- **Generación de PDF:** planeado, no construido todavía. Sería Playwright,
  pero no con el paquete que ya está instalado: `@playwright/test` es el
  runner de pruebas. Para generar PDF en Vercel harían falta `playwright-core`
  y `@sparticuz/chromium`, porque una función serverless no puede ejecutar el
  Chromium completo que descarga el paquete normal
- **Despliegue:** Vercel

## Estructura del proyecto

- `app/` — rutas y páginas (App Router). Las pantallas privadas viven bajo
  `app/(protegido)/`
- `core/` — capa compartida entre módulos, que nunca se bifurca por cliente.
  Agrupa el patrón de fila clicable → vista → editar de los listados, la
  búsqueda por coincidencia parcial, el hook unificado de filtros de listado,
  los correlativos atómicos para los códigos autogenerados, la traducción de
  errores de PostgreSQL a mensajes para el usuario, los campos con sugerencias
  y los tipos compartidos de dinero, monedas y resultados de Server Actions
- `modules/` — un módulo de negocio por carpeta, cada uno con su `schema.ts`,
  `actions.ts` y `components/`. Ninguno importa de otro: lo compartido sube a
  `core/`. Los que existen hoy:
  - `ordenes-trabajo/` — Órdenes de Trabajo
  - `personal/` — Personal
  - `materiales/`, `lista-precios/`, `servicios/`, `tarifario-personal/` y
    `epps/` — los cinco catálogos maestros

  `crm/`, `cotizaciones/`, `proyectos/`, `logistica/` y `asistencias/` también
  están en `modules/`, pero solo con un README de marcador: son visión futura,
  no código
- `components/` — lo transversal a la interfaz: barra lateral de navegación,
  botón de cerrar sesión y `ui/` con los primitivos de shadcn. Lo específico
  de una entidad vive en `modules/<entidad>/components/`, nunca aquí
- `config/clientes/` — pensado para un `.json` por cliente (branding, campos,
  flujos, módulos activos). La estructura existe en la arquitectura, pero sin
  uso activo: no hay ningún `.json` de cliente ni plan de reventa confirmado,
  y generalizar por cliente no es un objetivo en curso
- `db/schema/` — esquemas de Drizzle
- `db/migrations/` — migraciones generadas (no editar a mano)
- `docs/spec/` — especificación de negocio, fuente de verdad antes que el
  código; `preguntas-abiertas.md` recoge las decisiones todavía sin confirmar
- `tests/` — pruebas end-to-end con Playwright (`npm test`)

### Cómo se construye

El proyecto se desarrolla con Claude Code, y parte de sus reglas viven en el
propio repositorio:

- `AGENTS.md` — reglas invariables, convenciones y deuda técnica conocida
- `.claude/agents/` — subagentes: `auditor` (revisa el código contra las
  reglas y la especificación, solo lectura) y `arquitecto-datos` (diseña el
  esquema y genera las migraciones de Drizzle)
- `.claude/skills/` — `shadcn-conventions`, las convenciones de interfaz y de
  los patrones de listado

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

Dos módulos de negocio y los cinco catálogos maestros construidos, con
navegación por barra lateral y tema visual verde. Ninguna entrada del menú
queda como "próximamente".

- **Acceso:** login y rutas protegidas. `app/(protegido)/layout.tsx` verifica
  la sesión contra la base; `proxy.ts` hace además un chequeo optimista de la
  cookie para no renderizar pantallas privadas de más
- **Navegación:** barra lateral colapsable a iconos (en pantallas angostas se
  convierte en un cajón), con dos secciones desplegables: **SSOMA** (Personal)
  y **Catálogos maestros**. Los encabezados son solo texto del menú: las rutas
  son planas (`/personal`, `/materiales`, …)
- **Listados:** todos siguen el mismo patrón: clic en la fila para ver el
  registro y, desde ahí, editarlo en la misma ventana modal, sin salir de la
  pantalla. Búsqueda y filtros se guardan en la URL y se combinan entre sí

### Órdenes de Trabajo

CRUD completo, con código autogenerado (`OT.CCM.AAAA.NNNN`). Siete estados en
el ciclo Pendiente → Aceptada → En ejecución → Pausada → Finalizada →
Facturado → Cancelada, que se cambian en línea desde la propia fila; pasar a
Facturado o Cancelada pide confirmación. Búsqueda de texto más filtros por
estado y por rango de fechas. Una OT no se borra: cumple ese papel el estado
Cancelada.

### Personal

CRUD completo con baja lógica: dar de baja a alguien lo marca inactivo, nunca
borra la fila, y el filtro «Ver solo dados de baja» permite verlo y
reactivarlo. DNI único garantizado por la base. Búsqueda por nombre, apellido,
DNI o cargo.

### Catálogos maestros

Los cinco tienen tabla, CRUD, buscador y código autogenerado:

| Catálogo | Código | Baja lógica |
|---|---|---|
| Materiales | `MAT.0000001` | Sí |
| Lista de precios | `OFFT.0000001` | Sí |
| Servicios | `SRV.0000001` | No — pendiente de confirmar |
| Tarifario de personal | `PRS.0001` | Sí |
| EPPs | `EPP.000001` | No — decidido que no aplica |

Los dos catálogos sin baja lógica no están en la misma situación. En
**Servicios** la ausencia es una pregunta abierta: todavía no se ha confirmado
con el cliente si hace falta inactivar servicios, y la columna se añadirá si
la respuesta es que sí. En **EPPs** ya se decidió que no corresponde. En
ninguno de los dos hay acción de borrado. Materiales, Lista de precios y
Tarifario de personal sí tienen baja lógica, con su filtro «Ver solo
inactivos».

### Lo que sigue

El siguiente módulo planeado es **Cotización**, construido sobre estos
catálogos. Todavía no está en desarrollo: `modules/cotizaciones/` solo
contiene su README de marcador.

Diferido a versiones futuras: generación de PDF, clientes/empresas con
pantalla propia, CRM, proyectos, logística y asistencias.

Ver `docs/spec/` para el alcance detallado y las preguntas de negocio todavía
abiertas.
