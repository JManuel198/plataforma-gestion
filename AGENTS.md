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
- RESUELTO (2026-09-20): estado-formulario.ts y resultado-accion.ts
  viven ahora en core/, que es lo que esta misma nota dejaba dicho que
  había que hacer "si un módulo futuro lo necesita". Ese módulo llegó:
  modules/personal/ usa los dos tipos. Los importan
  modules/ordenes-trabajo/ y modules/personal/ desde @/core/, terreno
  neutral, y ninguno depende del otro. La regla se mantiene para lo que
  venga: cuando una segunda entidad necesite algo que hoy vive en un
  módulo, se mueve a core/ — nunca un import cruzado entre módulos.
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
- RESUELTO (fusión Servicio + OT): la carrera del 23503 al crear una OT
  ya no existe. Nacía de la FK a servicio, que se eliminó junto con la
  tabla: una OT ya no depende de ninguna fila externa, así que no hay
  verificación previa que pueda quedar obsoleta antes del INSERT. El
  23505 sobre codigo_ot sigue traducido en actions.ts, que es el único
  que queda.
- Las columnas de fecha (timestamp sin zona) dependen de dos ajustes de
  node-postgres en db/index.ts: un type parser que lee el valor como UTC,
  y parseInputDatesAsUTC, que hace que las fechas escritas por Node
  (session.expires_at de Better Auth, los $onUpdate de updated_at) se
  guarden también en UTC. Las dos van juntas: con solo una, un proceso
  fuera de UTC guarda hora local y la relee como UTC, y la fecha vuelve
  corrida. En Vercel el proceso ya corre en UTC y no cambian nada. El
  arreglo de fondo es migrar esas columnas a timestamptz — no se hizo en
  este sprint porque exige una migración de datos, no solo de código.
- RESUELTO (2026-09-19): las dos cadenas de .env.local usan ahora
  sslmode=verify-full explícito, no sslmode=require. Antes dependían de
  que pg v8 tratara 'require' como alias de 'verify-full'; en
  pg-connection-string v3 / pg v9 ese alias pasa a la semántica de
  libpq (cifra pero no verifica el certificado), así que la cadena
  habría dejado de validar en silencio al subir la dependencia. Se
  descartó uselibpqcompat=true por ser justo la opción que baja la
  verificación. Ojo al usar psql a mano: libpq, a diferencia de node-pg,
  no usa el almacén de CA del sistema con verify-full — hay que añadir
  &sslrootcert=system a la cadena o falla pidiendo ~/.postgresql/root.crt.
  node-pg, drizzle-kit y la app no necesitan nada.
- RESUELTO (2026-09-20): el render={<Button .../>} de
  components/ui/dialog.tsx (línea 63 en DialogContent y 112 en
  DialogFooter) NO tiene el bug de nativeButton. Se verificó al montar el
  modal de crear/editar OT, que es la primera pantalla real que usa
  Dialog. El caso sí era distinto, y el motivo es preciso: Dialog.Close
  llama a useButton (DialogClose.js:35) igual que el ButtonPrimitive,
  pero el problema nunca fue llamarlo — es el desajuste entre la prop
  `nativeButton` (true por defecto) y el elemento que se renderiza de
  verdad. En useButton.js:183 la rama es
  `isNativeButton ? { type: 'button' } : { role: 'button', ... }`. En los
  Links de navegación se renderizaba un <a> con el flag en true: saltaba
  el aviso y el role pisaba la semántica del enlace. En Dialog lo que va
  en `render` es nuestro Button, que renderiza un <button> nativo, así
  que flag y elemento coinciden: solo añade type="button", sin role y sin
  aviso. La regla general, ya anotada en la skill de convenciones: el
  `render` es correcto siempre que el elemento final coincida con lo que
  declara `nativeButton`, no según qué componente lo use.
- db/schema/ importa listas compartidas (ESTADOS_OT, MONEDAS) desde
  modules/ordenes-trabajo/constantes.ts: ese archivo es la fuente de
  verdad única de ambas y db/schema/orden-trabajo.ts solo las consume
  para construir sus pgEnum. La dirección va de la capa de datos hacia
  un módulo de negocio, al revés de lo habitual, y funciona bien con un
  solo módulo. Si un segundo módulo necesita definir su propio enum
  compartido con el esquema, mover estas listas a core/ — neutral para
  ambos lados — en vez de que db/schema/ termine importando de varios
  módulos de negocio.
- No hay suite de tests. package.json solo define dev, build, start y
  lint: no existe un script `test` ni ninguna dependencia de testing.
  Todo lo que se ha verificado hasta hoy se comprobó con scripts
  temporales, escritos para el momento y borrados después — la reserva
  concurrente del correlativo, el UNIQUE de personal.dni rechazando
  duplicados en la base real, y el cálculo de edad contra tres zonas
  horarias del proceso. Las tres pasaron, pero ninguna quedó como
  protección: nada de eso vuelve a ejecutarse solo cuando alguien toque
  ese código mañana, y el fallo que evitan no se manifiesta como un
  error de compilación ni de lint, sino como un dato incorrecto que
  nadie mira.
  Vale la pena automatizarlas el día que el ritmo de cambios baje lo
  suficiente para invertir ahí sin frenar la construcción — no antes,
  porque hoy el esquema y las pantallas todavía se mueven demasiado
  para que valga fijarlos en pruebas. Cuando llegue ese día, las dos
  primeras son correlativo.ts (dos creaciones simultáneas no pueden
  recibir el mismo número, y la transacción tiene que revertir la
  reserva) y lib/fecha.ts (calcularEdad en los bordes del cumpleaños,
  inicioDelDia/inicioDelDiaSiguiente en los filtros): son las piezas
  más fáciles de romper sin darse cuenta, porque las dos dependen de
  concurrencia y de zonas horarias, que es justo lo que no se ve
  probando a mano en el navegador.
  Ojo al escribirlas: calcularEdad no admite un "hoy" inyectado, así
  que probar el borde exacto de un cumpleaños exige o mockear el reloj
  o refactorizar la función para recibir la fecha de referencia. Lo
  segundo es más limpio y es el momento de hacerlo.
