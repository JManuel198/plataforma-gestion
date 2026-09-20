# Plataforma de Gestión Integral

Plataforma de gestión empresarial construida como base escalable y
personalizable por cliente. Hoy cubre Órdenes de Trabajo y Personal; CRM,
cotizaciones, proyectos, logística y asistencias son el alcance completo hacia
el que escala — ver `docs/spec/` para el detalle de qué está construido y qué
está diferido.

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
- `core/` — código transversal compartido entre módulos. Hoy contiene
  `estado-formulario.ts` y `resultado-accion.ts`, los tipos que devuelven las
  Server Actions; a futuro, roles, catálogos maestros, motor de precios, PDF y
  auditoría
- `modules/ordenes-trabajo/` — Órdenes de Trabajo (incluye lo que
  originalmente iba a ser un módulo `servicios/` aparte, fusionado en este
  tras el primer ensayo con el cliente)
- `modules/personal/` — Personal
- `components/` — lo transversal a la interfaz: barra lateral de navegación,
  botón de cerrar sesión y `ui/` con los primitivos de shadcn. Lo específico
  de una entidad vive en `modules/<entidad>/components/`, nunca aquí
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

Dos módulos completos y en uso: Órdenes de Trabajo y Personal, con navegación
por barra lateral y tema visual verde. Listo para la siguiente revisión con el
cliente.

El siguiente módulo planeado es Clientes/Empresas, con autocompletado de datos
por RUC contra una API peruana — el proveedor está por elegir.

## Alcance actual

- Login, rutas protegidas en el servidor (`app/(protegido)/layout.tsx` verifica
  la sesión contra la base) más un chequeo optimista en `proxy.ts` que solo
  comprueba que la cookie exista, para no renderizar pantallas privadas de más
- Navegación: barra lateral izquierda, colapsable a iconos, que en pantallas
  angostas se convierte en un cajón y no ocupa ancho
- Tema: verde corporativo aplicado con variables CSS en `app/globals.css`,
  nunca con clases de color sueltas en los componentes

### Órdenes de Trabajo

Entidad única, fusión de lo que originalmente eran Servicio y OT por separado.
Cada OT lleva código autogenerado con correlativo atómico
(`OT.CCM.AAAA.NNNN`), cotización y revisión, servicio, orden de compra,
cliente, precio (entero en céntimos) con su moneda, estado, fecha de creación,
responsable y comentarios.

Siete estados, en orden del ciclo: Pendiente → Aceptada → En ejecución →
Pausada → Finalizada → Facturado → Cancelada.

Crear y editar se hacen en una ventana modal sobre el listado, sin salir de la
pantalla. El listado combina búsqueda de texto (código, cliente o servicio),
filtro por estado y filtro por rango de fechas: los tres se acumulan en la URL
en vez de pisarse. El estado también se cambia desde la propia fila, y pasar a
Facturado o Cancelada pide confirmación.

### Personal

CRUD con baja lógica: dar de baja pone la columna `activo` en false y la
persona desaparece del listado, pero la fila nunca se borra. DNI único
garantizado por la base, no solo por el formulario. La edad no se almacena —
se calcula al mostrarla a partir de la fecha de nacimiento, porque guardada
quedaría desactualizada sola. Búsqueda por nombre, apellido, DNI o cargo, y un
interruptor para ver también a quien está de baja. Mismo patrón de modal que
Órdenes de Trabajo.

Diferido a versiones futuras: Clientes/Empresas con pantalla propia (próximo),
catálogo de servicios reutilizable, cotización formal con PDF, kanban de
oportunidades, aprobaciones, logística y asistencias.

Ver `docs/spec/` para el alcance detallado por bloque y las preguntas de
negocio todavía abiertas.