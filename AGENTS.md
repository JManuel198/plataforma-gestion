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
- Playwright — hoy se usa para pruebas end-to-end (tests/, `npm test`).
  La generación de PDF, que era su propósito original en este stack,
  todavía no se ha construido.
- Despliegue en Vercel

## Arquitectura
- core/ — auth, roles, catálogos maestros, motor de precios, generación de
  PDF, auditoría. Nunca se bifurca por cliente.
- modules/ — módulos de negocio independientes. Hoy existen de verdad
  ocho: ordenes-trabajo/, personal/, los cinco catálogos maestros
  (materiales/, lista-precios/, servicios/, tarifario-personal/, epps/),
  que comparten forma —fila clicable, correlativo, buscador y, donde hay
  columna `activo`, baja lógica— con materiales/ como referencia, y
  ajustes-usuario/ (perfil de la propia cuenta, sin tabla propia). Cada
  uno consume core/ pero no depende de otro módulo directamente.
  Los módulos originalmente previstos — crm/, cotizaciones/, proyectos/,
  logistica/, asistencias/ — son visión futura, no estructura actual:
  sus carpetas solo contienen un README de marcador.
  **Excepción en curso — CRM (2026-09-24):** es un grupo nuevo de la
  barra lateral, encima de SSOMA, con tres módulos en construcción
  ACTIVA: Clientes (Bloque 2, `/clientes`), Contactos (Bloque 3,
  `/contactos`) y Embudo de oportunidades (Bloque 4, `/oportunidades`).
  Estado (2026-09-25): Clientes ya tiene tabla — `empresas`
  (db/schema/empresas.ts, migración 0018, aplicada en desarrollo) — y
  modules/clientes/ ya tiene actions, queries, schema (Zod) y la consulta
  de RUC por Decolecta (decolecta.ts, key en DECOLECTA_API_KEY). La
  pantalla `/clientes` (título "Empresas") ya lista, busca, filtra por
  tipo, da de baja/reactiva, y crea y edita en el modal con la consulta de
  RUC; el Bloque 2 está completo. La columna Contactos cuenta ya los
  contactos reales de cada empresa (activos e inactivos). Contactos tiene
  esquema — `contactos` (db/schema/contactos.ts, FK `empresa_id` →
  `empresas`, migración 0019, aplicada en desarrollo (2026-09-25)) — y
  modules/contactos/ tiene actions, queries, schema (Zod) y filtros. La
  pantalla `/contactos` ya lista, busca, filtra por inactivos, cuenta
  activos/inactivos, da de baja/reactiva, abre la vista de detalle y crea y
  edita en el modal, con la empresa elegida por búsqueda en servidor (que
  ofrece también las inactivas, marcadas); el Bloque 3 está completo
  (2026-09-25). Embudo de oportunidades está **especificado** en
  docs/spec/oportunidades.md (2026-09-25; guía visual en
  docs/diseno/embudo-oportunidades.html, orden de trabajo en
  docs/diseno/plan-embudo-oportunidades.md), pero **todavía sin tabla ni
  código**: sigue siendo solo la entrada del menú y la ruta protegida con su
  título. Dos cambios fuera del módulo: (1) la Parte 3 del plan movió
  (2026-09-25) a core/ la lógica de correlativo anual de Órdenes de Trabajo
  (`reservarCorrelativoAnual` en core/correlativo.ts; Oportunidades será su
  segundo consumidor), **sin cambiar en nada la numeración de las OT**, en
  un commit propio (ver la deuda técnica del correlativo, abajo); (2) el componente compartido
  de migas de pan (components/migas-de-pan.tsx) se ampliará para aceptar un
  tercer nivel dinámico — hoy solo lo usará la página de detalle
  `/oportunidades/[id]`, el primer módulo con detalle en ruta propia; los
  demás siguen con modal y no se ven afectados. No es
  un "próximamente" indefinido: se llena en los bloques inmediatamente
  siguientes. Las rutas son planas, como el resto (ver la convención de
  etiquetas del menú).
  **CRM OCULTO A USUARIOS CONCRETOS — TEMPORAL, A RETIRAR (2026-09-25):**
  los módulos del CRM que siguen en construcción no se muestran a los
  correos listados en la variable de entorno `CRM_OCULTO_PARA` (separados
  por comas; hoy, un usuario del cliente que los verá cuando se
  presenten). Desde el 2026-09-25 son solo **Contactos y Embudo de
  oportunidades**: Clientes se dejó visible para todos, así que esos
  usuarios ven el grupo CRM con Clientes dentro. A ellos se les quitan
  los enlaces de Contactos y Embudo del menú y de las migas de pan, y
  `/contactos` y `/oportunidades` les responden 404. Qué enlace se oculta
  lo marca `ocultableTemporalmente` en cada enlace de MENU, y qué
  pantalla, que llame a `exigirCrmVisible()`: para liberar otro módulo
  antes que el resto, se le quitan las dos cosas. Sin la variable, todos
  lo ven todo. El correo vive solo en Vercel y en .env.local, nunca en el
  repositorio. Es ocultar, no un permiso. No es la semilla de un sistema
  de roles, que sigue fuera de alcance.
  **Se retira cuando Contactos y Embudo estén terminados, presentados en
  la reunión y aprobados.** Los pasos son dos, en este orden:
  1. Para mostrarlo ya: borrar `CRM_OCULTO_PARA` en Vercel y redesplegar.
     No hace falta tocar código.
  2. Para limpiar el código (después, en su propio commit):
     - borrar core/visibilidad-crm.ts;
     - quitar de las páginas que aún lo tengan (hoy /contactos y
       /oportunidades) el `await exigirCrmVisible()`, su import y el
       comentario `// TEMPORAL` que lo acompaña;
     - quitar del layout protegido el import de `crmOcultoPara`, la
       constante `ocultarCrm` y su comentario, y la prop `ocultarCrm` de
       `BarraLateral` y de `MigasDePan`;
     - quitar `menuVisible` y el campo `ocultableTemporalmente` (del tipo
       Enlace y de los enlaces de MENU que lo lleven) de
       components/barra-lateral.tsx (barra y migas vuelven a usar `MENU`);
     - borrar este párrafo y `CRM_OCULTO_PARA` del README y de
       .env.example.

     Está terminado cuando `tsc` pasa y este grep sale vacío:
     `grep -rn "CRM_OCULTO_PARA\|visibilidad-crm\|crmOcultoPara\|ocultarCrm\|exigirCrmVisible\|ocultableTemporalmente\|menuVisible" --exclude-dir=node_modules --exclude-dir=.next .`
     (todos los comentarios temporales nombran `visibilidad-crm`).
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

  Estado real de esto (2026-09-21): esta estructura existe en el código
  pero no se persigue activamente — no hay plan de reventa confirmado con
  el cliente actual. Si aparece un cliente nuevo, se evalúa un sistema
  aparte, no generalizar este. Lo de arriba sigue describiendo cómo está
  pensado el mecanismo, no un objetivo en curso: por eso config/clientes/
  no tiene todavía ningún .json y varias cosas que "deberían" vivir ahí
  (el correlativo de OT, el array MENU de la barra lateral y el nombre
  "CCM" de la cabecera de la barra, en components/barra-lateral.tsx)
  siguen en el código a sabiendas. No inviertas esfuerzo en generalizar por cliente sin
  que alguien lo pida explícitamente.
- docs/spec/ — especificación de negocio capturada de la plataforma guía.
  Fuente de verdad antes que el código: ante cualquier duda sobre una
  regla de negocio, se consulta aquí primero, nunca se asume.
- docs/diseno/ — mockups de interfaz (hoy, Lista de precios y Embudo de
  oportunidades), como guía visual de los listados, más el plan del Embudo.
  Nunca es spec: en datos y reglas manda docs/spec/.
- db/schema/ — definiciones de tablas en Drizzle.
- db/migrations/ — migraciones generadas por Drizzle. Nunca se editan a mano.

## Reglas invariables
1. Toda regla de negocio y todo cálculo vive en el backend. El frontend
   nunca calcula totales, descuentos ni impuestos, solo los muestra.
   Única excepción, acotada: la vista previa en vivo del precio en el modal
   de Lista de precios. Llama a la MISMA función que usa el servidor
   (modules/lista-precios/precio.ts), el resultado no se envía y el servidor
   recalcula al guardar. Las condiciones que la hacen aceptable están en la
   skill de convenciones, sección "Valores calculados que se muestran en
   vivo"; si el cálculo se complica, se deja de previsualizar.
2. Todo monto se guarda como entero en la unidad mínima (céntimos), nunca
   como float.
3. Ninguna cotización se edita después de aprobada — los cambios generan
   una nueva versión.
4. Cada cliente tiene su propia base de datos (instancia dedicada, no
   multi-tenant compartido). No se filtra por tenant_id.
5. Interfaz: solo shadcn/ui + Tailwind. Sin CSS custom salvo justificación
   explícita en el propio archivo.
6. Toda migración pasa por Drizzle (npx drizzle-kit generate). Nunca SQL
   manual suelto. Única excepción, aprobada explícitamente: la migración de
   datos 0020 (correlativo anual de OT a `correlativo`, ver la deuda
   técnica), escrita sobre un archivo de `drizzle-kit generate --custom`.
7. Antes de tocar una regla de negocio, se consulta docs/spec/. Si no está
   documentada, se registra la duda en docs/spec/preguntas-abiertas.md en
   vez de asumir.
8. Ningún secreto se hardcodea. Todo vive en variables de entorno
   (.env.local, nunca versionado).
9. Ningún registro se borra en operación normal — se desactiva (columna
   `activo` o equivalente). Viene de Cliente/Contacto de la **plataforma
   guía** (el sistema que se está replicando). En este repositorio está
   aplicado en Personal, en los catálogos que tienen columna `activo` y en
   `empresas` (CRM) — cuyo `activo` es independiente de los `estado`/
   `condicion` que vienen de SUNAT; `orden_trabajo.cliente` sigue siendo
   texto libre, sin FK a `empresas`. La OT es la excepción razonada: su
   propio `estado` llega a `Cancelada` y cumple ese papel, así que no lleva
   una segunda bandera (ver entidades.md).
10. Un campo que representa solo fecha, sin hora, se guarda como `date`,
    nunca `timestamp` — una fecha sin hora no debe llevar una columna que
    la tenga, aunque esa columna use zona horaria (`timestamptz`): sigue
    obligando a decidir a qué hora del día corresponde, decisión que no
    tiene respuesta correcta para un dato que nunca tuvo hora. Aplicado ya
    en `fecha_nacimiento` de Personal.

## Convenciones
- Archivos: kebab-case. Componentes de React: PascalCase.
- Un módulo de negocio = una carpeta en modules/, con su propio schema.ts,
  actions.ts y components/.
- Los correlativos siguen el formato definido en config/clientes/*.json,
  nunca hardcodeado en el módulo. **Hoy esto NO se cumple y es deliberado**:
  config/clientes/ no tiene ningún .json, así que las cinco constantes del
  correlativo viven en el código (ver la deuda técnica más abajo). La
  convención se conserva como la forma correcta el día que exista un archivo
  de cliente, no como una tarea pendiente con fecha — desde que se decidió
  no perseguir la generalización multi-cliente (ver la nota de
  config/clientes/ en Arquitectura), mover el correlativo allí dejó de ser
  un objetivo en curso. Mientras tanto, lo que manda es: una sola fuente de
  verdad para el formato, y que las cinco constantes viajen juntas si algún
  día se mueven.
- Las etiquetas del menú lateral van DESACOPLADAS de las rutas (decidido en
  el Bloque 11, 2026-09-21). Los encabezados que agrupan enlaces en
  components/barra-lateral.tsx — hoy "CRM", "SSOMA" y "Catálogos maestros" — son
  solo texto del menú: jamás forman parte de una URL, y ningún href se
  deriva de ellos. Por eso Personal está bajo SSOMA pero sigue en
  /personal, y los cinco catálogos usan rutas planas de nivel superior
  (/materiales, /lista-precios, /servicios, /tarifario-personal, /epps) en
  vez de /catalogos-maestros/...
  El motivo: "SSOMA" es un nombre provisional que probablemente cambie. Con
  la etiqueta fuera de la URL, renombrarlo es editar un string del array
  MENU y nada más; acoplado, rompería cualquier enlace guardado o
  compartido.
  El mismo principio cubre el plegado de esas secciones (son desplegables:
  un clic en el encabezado muestra u oculta sus enlaces). Abrir o cerrar un
  grupo es estado puramente visual y NO toca la URL: nada de
  ?ssoma=abierto ni de rutas distintas según el estado. Arranca abierto y
  no se persiste. Si algún día se quiere que sobreviva a una recarga, el
  sitio es una cookie o localStorage — como ya hace la barra entera con
  sidebar_state —, nunca el searchParams.
  Ojo con los DOS ejes de colapso, que no son el mismo: el de la barra
  entera (collapsible="icon") y el de cada sección. Se cruzan en un punto:
  en modo icono el encabezado se desvanece, así que una sección cerrada
  dejaría sus enlaces inalcanzables. Por eso en modo icono el panel se
  fuerza abierto y el encabezado se marca inert. Está resuelto y comentado
  en SeccionBarra, en components/barra-lateral.tsx; si tocas una de las dos
  cosas, vuelve a probar la combinación.
  Si alguna vez se decide lo contrario (URLs más descriptivas, del tipo
  /catalogos-maestros/materiales): esto se decidió a sabiendas, no por
  descuido. Revertirlo es mover las carpetas de app/(protegido)/<ruta>/ a
  app/(protegido)/<grupo>/<ruta>/, actualizar los href del array MENU en
  components/barra-lateral.tsx — el único archivo que declara la relación
  etiqueta/ruta — y dejar redirecciones de las rutas viejas en
  next.config.ts para no romper lo ya enlazado.
- La regla real del aviso de `nativeButton` de Base UI NO es "nunca usar
  `render`": es que el elemento que termina en el DOM coincida con lo que
  declara `nativeButton`. Confirmado dos veces: en los Links de navegación
  (un <a> con el flag en true — mal) y en el SidebarGroupLabel de la barra
  lateral (un <button> nativo con el flag en true — bien). Antes de dar un
  `render` por bueno o por prohibido, mira qué elemento acaba en el DOM, no
  qué componente lo envuelve. El detalle, con números de línea, en la skill
  de convenciones y en la deuda técnica de abajo.
- Una fila de listado que abre su registro (hoy los nueve listados: Órdenes
  de Trabajo, Personal, los cinco catálogos, Empresas y Contactos, y los que vengan) sigue el
  patrón compartido de `core/fila-clicable.tsx`: tres modos
  —cerrado, viendo, editando— en un solo modal, la fila sigue siendo un `<tr>`
  con `tabIndex` (nunca un `<div role="button">`), y **todo lo interactivo que
  viva dentro de ella va envuelto en `SinPropagacion`**, el modal y los
  `alert-dialog` incluidos. El motivo de fondo: los eventos de React burbujean
  por el árbol de componentes, así que un portal a `document.body` NO libra a
  la fila de recibirlos — un clic en "Cancelar" dentro del diálogo de
  confirmación llega igual al `onClick` del `<tr>`. El ejemplo que mejor lo
  ilustra NO es la equis de inactivar (un `<button>` de verdad, que la red de
  abajo sí ataja) sino la celda de estado de OT: sus opciones son
  `role="option"` sobre un `<div>` y su confirmación vive en otro portal.
  `propsFilaClicable` trae además una red de seguridad (`esClicDeLaFila`) que
  descarta lo que nace fuera de la fila en el DOM o dentro de un control
  nativo, así que hoy un botón suelto sin envolver no rompería nada. **Eso no
  sustituye al envoltorio**: lo que la red NO cubre es un control que no sea
  `button`/`a`/`input`/`select`/`textarea`/`label`/`[role=button]` — un
  `role="switch"` o un `role="checkbox"` pintados sobre un `<span>`, por
  ejemplo. Envolver siempre sale más barato que acordarse de esta lista. El
  detalle está en la skill de convenciones, sección "Fila clicable → vista →
  editar".
- **La propagación de clics es el riesgo permanente de este patrón, y hay que
  vigilarla en CUALQUIER fila que combine clic-para-abrir con controles
  interactivos adentro.** No es una tarea que se cierre al montar la fila: se
  reabre cada vez que alguien mete un control nuevo en una celda. Tres cosas
  que llevarse:
  1. **No hay nada que avise.** Ni `tsc` ni el lint ven la diferencia entre una
     fila bien envuelta y una mal envuelta; el síntoma es un modal que se abre
     de más, y solo se ve probando a mano.
  2. **Lo peligroso no es el botón, es el control que abre otra cosa.** El caso
     que costó en Órdenes de Trabajo es el desplegable de estado
     (`SelectorEstadoFila`): despliega sus opciones y además abre un
     `alert-dialog` de confirmación para `Facturado` y `Cancelada`, y las dos
     superficies se portan a `document.body`. El envoltorio va alrededor del
     componente entero, no de su disparador. Un icono pequeño es el caso fácil;
     un `Select`, un `Popover` o un menú dentro de una celda son el difícil.
  3. **La red de `esClicDeLaFila` no es la garantía.** Las opciones de un
     `Select` de Base UI son `role="option"` sobre un `<div>` —fuera de la
     lista de controles nativos que descarta— y solo se salvan porque nacen en
     un portal. Eso es un detalle de implementación de Base UI, no un contrato.
  Al tocar una de estas filas se vuelve a probar la combinación completa, no
  solo el camino feliz: la lista está en la skill de convenciones, al final de
  "Fila clicable → vista → editar".
- Para dejar un elemento inalcanzable (no solo oculto) se usa `inert`, no
  `disabled`: varios componentes de Base UI pasan
  `focusableWhenDisabled: true`, así que `disabled` puede dejar un control
  invisible pero todavía enfocable con Tab. Aplicado en los encabezados de
  la barra lateral cuando está en modo icono.
- Antes de usar un componente nuevo de Base UI con overlay o portal
  (Dialog, Collapsible, etc.), verifica explícitamente qué hace al
  cerrarse: si desmonta a sus hijos o los deja montados. No asumas que se
  comporta como otro que ya usas. Dialog NO desmonta a sus hijos por
  defecto; Collapsible SÍ (su `keepMounted` es false), así que los enlaces
  de una sección cerrada de la barra no están en el DOM — y por tanto
  tampoco aparecen en el Ctrl+F del navegador.
- Un filtro de "ver inactivos" en un listado ALTERNA entre dos vistas
  excluyentes: `eq(tabla.activo, inactivos ? false : true)`. Nunca
  `inactivos ? undefined : eq(activo, true)` — eso es no poner condición, así
  que la vista de inactivos devuelve TAMBIÉN los activos y una fila
  reactivada no desaparece de ella. Y la etiqueta va como "Ver solo…", no
  "Mostrar…". Estaba mal en Materiales y en Personal (corregido el
  2026-09-21, ver la deuda técnica de abajo); los catálogos que faltan
  heredan el patrón de la skill de convenciones, así que conviene no
  recopiarlo mal.
- Un error de PostgreSQL NO se reconoce mirando `error.code`: drizzle-orm lo
  envuelve en un `DrizzleQueryError` y el `code` queda en `cause`. Usa
  `esUniqueViolado()` de core/errores-postgres.ts, que recorre la cadena de
  causas, y pásale el nombre del constraint. Los tres módulos tenían su propia
  copia mirando `error.code` a mano y las tres estaban rotas en silencio
  (corregido el 2026-09-21, ver la deuda técnica de abajo).
- Todo `try/catch` alrededor de una Server Action tiene que dejar pasar el
  `NEXT_REDIRECT` de Next — se reconoce por su `digest` — y traducir
  cualquier otro fallo no reconocido en un mensaje visible para el usuario.
  Nunca fallar en silencio: un catch que se traga el redirect deja el
  formulario colgado sin navegar y sin avisar.

## Módulo de ajustes de usuario
Se construye de forma INCREMENTAL, y el alcance de cada etapa está decidido
(2026-09-24), no pendiente de decidir:
- **Ahora: solo perfil** — nombre, dni y telefono de la propia cuenta. Las
  columnas `dni` y `telefono` de `user` ya existen (migración 0017); su
  detalle, incluido por qué llevan `input: false` y que "" debe guardarse
  como null, está en docs/spec/entidades.md, sección Usuario. Al guardar el
  nombre, la Server Action escribe el MISMO valor en `nombre_completo`
  (fuente de verdad) y en `name` (el de Better Auth), en el mismo UPDATE.
- **Pendiente: cambio de contraseña.** Espera a que el login/registro
  completo esté construido. Hoy `disableSignUp: true` y no hay flujo de
  recuperación; montar el cambio de contraseña antes dejaría una pieza
  suelta que habría que rehacer cuando ese flujo exista.
- **Fuera de alcance, por decisión explícita: gestión de roles y
  permisos.** No es "lo siguiente" ni una tarea olvidada. `user.role` sigue
  existiendo con default `'admin'` e `input: false`, y no se construye
  ninguna pantalla que lo edite hasta que alguien lo pida expresamente.
No adelantes etapas por iniciativa propia aunque parezcan pequeñas.

## Subagentes del proyecto
En `.claude/agents/` viven dos agentes especializados. No son opcionales
por capricho: cada uno concentra reglas que no están en ningún otro sitio.
- `auditor.md` — revisa código contra las reglas invariables de este
  archivo, contra docs/spec/ y contra buenas prácticas de seguridad, en
  modo estrictamente de solo lectura (no tiene Edit ni Write). Se invoca al
  completar cada checkpoint y antes de cualquier commit importante. No
  corrige: reporta qué está mal, por qué y qué regla viola.
- `arquitecto-datos.md` — diseña y modifica el esquema y las migraciones de
  Drizzle. Toda tabla, columna o relación nueva pasa por aquí, incluida la
  integración con las tablas de Better Auth. Genera migraciones (nunca SQL
  manual) y mantiene docs/spec/entidades.md sincronizado con el esquema
  real.

## Deuda técnica conocida
- RIESGO ACTIVO, NO RESUELTO (anotado 2026-09-22): **hay una sola base de
  datos de desarrollo en Neon, compartida por todo el trabajo, sin importar
  qué rama de git esté activa.** `.env.local` apunta a esa base siempre —
  cambiar de rama con `git checkout` no cambia de base de datos. Una
  migración aplicada (`npx drizzle-kit migrate`) desde una rama que
  **todavía no está fusionada en `main`** deja esas tablas viviendo en Neon
  igual, y ahí se quedan aunque esa rama nunca llegue a fusionarse todavía.
  **Cómo se descubrió:** al construir Lista de precios (Bloque 13, Parte 1)
  sobre `main`, la migración generada intentaba crear una tabla
  `correlativo` que YA EXISTÍA en Neon — aplicada minutos antes desde
  `feature/fila-clicable-ot-y-materiales-caracteristicas`, una rama con
  commits reales (`material_caracteristicas`, el correlativo genérico) que
  todavía no se había fusionado. El bloqueo no fue un error de Drizzle: fue
  que el estado de la base de datos había avanzado por delante del código
  que `main` conocía. Se resolvió fusionando esa rama primero (era
  fast-forward) y regenerando la migración nueva encima.
  **Por qué es un riesgo real y no un detalle de esa vez**: este es un
  proyecto de un solo desarrollador que trabaja con más de una rama activa
  a la vez (hoy: ramas de features en paralelo con `main`). Nada impide
  aplicar una migración desde cualquiera de ellas, y no hay ninguna señal
  en la terminal que recuerde que la base de datos ya no coincide con lo
  que `main` describe. El síntoma no es siempre un choque de nombres como
  este: también puede ser una tabla que el código de `main` no espera, una
  columna de más, o una fila con un contador ya avanzado (el correlativo,
  concretamente, es sensible a esto: reservar un número en una rama que
  luego no se fusiona dejaría un hueco).
  **Qué hacer mientras no haya una base de datos por rama** (que exigiría
  infraestructura nueva, fuera de alcance de una nota): antes de generar o
  aplicar una migración, comprobar `git log --oneline <rama-en-uso>..main`
  y a la inversa para saber si hay trabajo aplicado a Neon que `main`
  todavía no conoce; y si aparece un choque de nombres al generar una
  migración («relation ya existe» sin que el schema del repo lo explique),
  leerlo como señal de que otra rama ya tocó esa base, no como un bug de
  Drizzle.
- RESUELTO (2026-09-20): estado-formulario.ts y resultado-accion.ts
  viven ahora en core/, que es lo que esta misma nota dejaba dicho que
  había que hacer "si un módulo futuro lo necesita". Ese módulo llegó:
  modules/personal/ usa los dos tipos. Los importan
  modules/ordenes-trabajo/ y modules/personal/ desde @/core/, terreno
  neutral, y ninguno depende del otro. La regla se mantiene para lo que
  venga: cuando una segunda entidad necesite algo que hoy vive en un
  módulo, se mueve a core/ — nunca un import cruzado entre módulos.
- RESUELTO (2026-09-21): `patronParcial()` —el escape de comodines del
  buscador— estaba copiado igual en los tres `queries.ts` (ordenes-trabajo,
  personal, materiales), cada copia con una nota diciendo que se movería a
  core/ "cuando aparezca un tercer listado". Apareció, y se movió: vive en
  core/busqueda.ts y los tres lo importan. Lo que precipitó el movimiento no
  fue el conteo sino el bug de `esUniqueViolado` (arriba): allí el mismo
  patrón de tres copias dejó dos rotas en silencio durante semanas, porque un
  arreglo en una copia no llega a las otras y nada avisa de que divergieron.
  Criterio para lo que venga: a la tercera copia se mueve a core/, sin esperar
  a una cuarta.
- RESUELTO (2026-09-23): el hook de navegación de los filtros de listado
  (`components/use-filtros.ts`) llegó a estar copiado en SEIS módulos —
  ordenes-trabajo, personal, materiales, lista-precios, servicios y
  tarifario-personal— antes de unificarse. Vive ahora en
  `core/use-filtros-listado.ts` como `useFiltrosListado<F>(filtros, urlListado)`
  y los trece componentes de filtro lo importan de ahí; los seis archivos de
  módulo se eliminaron.
  **Es el caso que peor cumplió la regla de las tres copias de aquí arriba**, y
  conviene entender por qué se dejó llegar a seis en vez de fingir que no pasó:
  cada copia traía escrito su propio razonamiento de por qué no se movía
  todavía, y los razonamientos eran ciertos —no hay lógica que pueda romperse
  en silencio, solo tres líneas de navegación, y una copia divergente se vería
  al instante al pulsar el filtro, no semanas después—. El problema es que ese
  argumento no caduca solo: sirve igual para la séptima copia que para la
  cuarta, así que nunca llega el momento en que "toca". La lección no es que el
  riesgo fuera alto (no lo era), sino que **una excepción bien argumentada que
  se puede repetir indefinidamente no es una excepción, es la regla nueva** — y
  si la regla nueva es "no unificamos", eso hay que decidirlo a propósito, no
  acumularlo copia a copia.
  Antes de fusionar se compararon las seis una contra otra en vez de darlas por
  equivalentes de vista: normalizando comentarios y el nombre del tipo, las seis
  producían el mismo texto salvo un salto de línea de Prettier. Lo que cambia
  entre listados —OT combina estado, rango de fechas y búsqueda; Servicios,
  categoría y búsqueda; los otros cuatro, búsqueda e inactivos— no vivía en el
  hook sino en el tipo de filtros y en `urlListado`, que siguen siendo de cada
  módulo. Por eso `urlListado` entra como PARÁMETRO: generalizarlo obligaría a
  `core/` a conocer los parámetros de URL de todos los módulos, que es el
  acoplamiento que core/ existe para evitar.
- RESUELTO (2026-09-24): `exigirSesion()` —la verificación de sesión al
  inicio de cada Server Action— estaba copiada, byte a byte igual, en los
  siete `actions.ts` (ordenes-trabajo, personal, materiales, lista-precios,
  servicios, tarifario-personal y epps). Vive ahora en `core/sesion.ts`: la
  estrenó ajustes-usuario, que habría sido la octava copia, y el mismo día se
  retiraron las siete tras comprobar que seguían idénticas (4ff5f63). Sin
  cambio de comportamiento. La regla de uso no cambia: se llama FUERA del
  `try`, porque termina en `redirect()` (ver la convención de `try/catch`).
  Es otra instancia de la regla de las tres copias, aplicada tarde: llegó a
  siete por la misma razón que el hook de filtros de arriba.
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
- RESUELTO (2026-09-25): ya existe .env.example (solo nombres, sin valores;
  .gitignore lo excluye explícitamente de `.env*`). Antes no existía y
  DATABASE_URL_DIRECT (conexión directa de Neon para migraciones,
  distinta de la pooled de runtime) solo estaba documentada en el
  comentario de drizzle.config.ts. Ahí también está DECOLECTA_API_KEY
  (consulta de RUC del módulo Clientes). Toda variable nueva se añade
  a .env.example en el mismo cambio que la empieza a leer.
- RESUELTO (fusión Servicio + OT): la carrera del 23503 al crear una OT
  ya no existe. Nacía de la FK a servicio, que se eliminó junto con la
  tabla: una OT ya no depende de ninguna fila externa, así que no hay
  verificación previa que pueda quedar obsoleta antes del INSERT. El
  23505 sobre codigo_ot sigue traducido en actions.ts, que es el único
  que queda.
- RESUELTO (2026-09-24): las 32 columnas `timestamp` sin zona del esquema
  —las 12 de Better Auth (`user`, `session`, `account`, `verification`,
  incluidas `expires_at` y las dos `*TokenExpiresAt`), las de
  `orden_trabajo`/`ot_correlativo`, y `created_at`/`updated_at` de
  Personal, Materiales, Servicios, Lista de precios, Tarifario de
  personal, EPPs, `material_caracteristicas` y `correlativo`— pasaron a
  `timestamp({ withTimezone: true })`. Con eso, los dos ajustes de
  node-postgres en db/index.ts (el type parser que leía el valor como
  UTC, y `parseInputDatesAsUTC` para que Node escribiera también en UTC)
  quedaron sin objeto y se eliminaron: node-postgres ya parsea
  `timestamptz` bien por defecto, porque el texto que devuelve Postgres
  trae el offset explícito.
  **El riesgo real no estaba en el esquema, sino en el `ALTER COLUMN`**:
  `drizzle-kit generate` produce el cambio de tipo sin `USING` (confirmado
  leyendo su código fuente), así que Postgres hace un cast implícito que
  interpreta los valores existentes con el `TimeZone` de la sesión que
  ejecuta el `ALTER` — no necesariamente UTC. Como ninguna parte del
  repositorio fijaba esa sesión (el supuesto "Neon corre en GMT" nunca se
  verificaba en código), corregirlo a mano en el `.sql` generado habría
  chocado con la regla de "nunca se editan migraciones a mano". La salida
  fue forzar `options=-c timezone=UTC` en la cadena de conexión que usa
  drizzle-kit (`drizzle.config.ts`), no en el archivo de migración: la
  sesión queda garantizada en UTC sin tocar el SQL que generó Drizzle.
  Verificado antes de aplicar (`SHOW timezone` contra la conexión con y
  sin el `options` forzado) y después (comparando el valor crudo de varias
  filas antes/después de la migración) que ningún dato se corrió.
  **Lección para la próxima migración de tipo con semántica de zona
  horaria**: verificar el `ALTER` generado con una lectura de texto crudo
  (`columna::text`), nunca con el parser por defecto de una conexión
  suelta de `pg` — su parser para `timestamp` sin zona interpreta el valor
  con la zona horaria LOCAL del proceso que lee (no UTC), que es
  exactamente el mismo problema que este cambio resolvió para la app. Caer
  en esa trampa en el propio script de verificación (como pasó aquí, antes
  de corregirlo) parece confirmar una corrupción de datos que en realidad
  no existió.
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
  modal de crear/editar OT (Bloque 9), que es la primera pantalla real
  que usa Dialog. El caso sí era distinto, y el motivo es preciso:
  Dialog.Close llama a useButton (DialogClose.js:35) igual que el ButtonPrimitive,
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
- RESUELTO A MEDIAS, Y A PROPÓSITO (2026-09-22, Bloque 13 Parte 1):
  db/schema/ importaba DOS listas (ESTADOS_OT y MONEDAS) desde
  modules/ordenes-trabajo/constantes.ts, con la nota de que si un segundo
  módulo necesitaba un enum compartido con el esquema había que mover esas
  listas a core/. Ese segundo módulo llegó — modules/lista-precios/, cuya
  columna `moneda` usa el MISMO pgEnum que orden_trabajo.
  **Se movió MONEDAS, no ESTADOS_OT**, y la distinción es la regla que
  conviene recordar: a core/ sube lo que DOS módulos comparten, no todo lo
  que estaba al lado. MONEDAS vive ahora en core/monedas.ts y su pgEnum en
  db/schema/moneda.ts (archivo propio: dos tablas lo usan, así que ninguna
  debe parecer su dueña). ESTADOS_OT se queda en el módulo porque es del
  ciclo de vida de la OT y de nadie más — db/schema/orden-trabajo.ts lo
  sigue importando de ahí, y esa dirección invertida sigue siendo correcta
  mientras haya un solo consumidor.
  El tipo en PostgreSQL se sigue llamando `moneda`: el movimiento fue de
  organización de archivos y NO generó migración. Se verificó
  explícitamente que `drizzle-kit generate` no emitiera nada sobre el enum.
  En el mismo cambio y por la misma regla, `dinero.ts` (aCentimos,
  aMontoDecimal, formatearMonto) pasó de modules/ordenes-trabajo/ a
  core/dinero.ts. `PRECIO_MAXIMO_CENTIMOS` NO viajó con él: es un límite de
  negocio de cada entidad, no una conversión compartida, así que cada módulo
  declara el suyo.
- RESUELTO (2026-09-25): había DOS implementaciones del mismo upsert de
  correlativo — `core/correlativo.ts` (tabla `correlativo`, clave de texto,
  sin año) y `modules/ordenes-trabajo/correlativo.ts` (tabla
  `ot_correlativo`, PK `anio`, reinicia cada enero). Al llegar Oportunidades,
  segundo consumidor de un correlativo anual, se unificaron:
  `reservarCorrelativoAnual(tx, clave, anio, inicial)` vive en
  core/correlativo.ts y reserva sobre la misma tabla `correlativo` con la
  clave `"<clave>:<año>"` (OT: `"ordenes-trabajo:2026"`). Sin cambio de
  estructura.
  Lo que frenaba la unificación era mover FILAS existentes, que
  `drizzle-kit generate` no hace (solo DDL). Se resolvió con la migración
  0020, una migración de **datos** escrita sobre el archivo vacío de
  `drizzle-kit generate --custom` — **única excepción a la regla invariable
  6 hasta hoy, aprobada explícitamente**; no es precedente para escribir SQL
  a mano sin esa aprobación. Copia el `ultimo` de cada año de
  `ot_correlativo` y no retrocede nunca un contador (`GREATEST`).
  `ot_correlativo` quedó sin uso pero sigue en la base y en
  db/schema/orden-trabajo.ts (quitar la definición emitiría un DROP): se
  borra en un cambio aparte, cuando se confirme que ninguna base sigue sin la
  0020. **Orden al desplegar:** aplicar la 0020 en cada base inmediatamente
  al desplegar este código. Si se crea una OT con el código nuevo antes de
  la 0020, o con el viejo después, el contador queda atrasado y la creación
  de OT falla por el UNIQUE de `codigo_ot` (no emite un código repetido);
  se arregla resincronizando la fila al mayor correlativo del año.
  `CLAVE_CORRELATIVO_OT` no se renombra nunca (ver su comentario).
- La suite de tests está apenas empezada, pero existe y corre: no es una
  carpeta vacía. `npm test` ejecuta @playwright/test contra
  playwright.config.ts y hoy son DOS pruebas de humo reales, las dos en
  tests/humo.spec.ts y las dos en verde (verificado el 2026-09-21):
  que /login renderiza y pide correo y contraseña, y que /ordenes-trabajo
  redirige a /login sin sesión.
  Cuidado con sobrevender lo que cubren, que es muy poco: la única
  pantalla que se renderiza de verdad es /login. Ninguna prueba entra a
  una pantalla protegida —no hay forma de automatizar el login sin meter
  credenciales en el repositorio (regla 8), y sembrar una sesión de prueba
  está sin decidir—, así que nada del comportamiento autenticado está
  cubierto. Siguen faltando las pruebas de unidad, que son las que de
  verdad importan aquí (correlativo.ts y lib/fecha.ts — ver abajo).
  Todo lo demás que se ha verificado hasta hoy se comprobó con scripts
  temporales, escritos para el momento y borrados después — la reserva
  concurrente del correlativo, el UNIQUE de personal.dni rechazando
  duplicados en la base real, y el cálculo de edad contra tres zonas
  horarias del proceso. Las tres pasaron, pero ninguna quedó como
  protección: nada de eso vuelve a ejecutarse solo cuando alguien toque
  ese código mañana, y el fallo que evitan no se manifiesta como un
  error de compilación ni de lint, sino como un dato incorrecto que
  nadie mira.
  Con el runner ya montado, automatizarlas cuesta bastante menos que
  antes: lo que queda es escribirlas. Sigue sin ser urgente mientras el
  esquema y las pantallas se muevan tanto como hoy, pero las dos
  primeras cuando se haga son correlativo.ts (dos creaciones
  simultáneas no pueden recibir el mismo número, y la transacción tiene que revertir la
  reserva) y lib/fecha.ts (calcularEdad en los bordes del cumpleaños,
  inicioDelDia/inicioDelDiaSiguiente en los filtros): son las piezas
  más fáciles de romper sin darse cuenta, porque las dos dependen de
  concurrencia y de zonas horarias, que es justo lo que no se ve
  probando a mano en el navegador.
  Ojo al escribirlas: calcularEdad no admite un "hoy" inyectado, así
  que probar el borde exacto de un cumpleaños exige o mockear el reloj
  o refactorizar la función para recibir la fecha de referencia. Lo
  segundo es más limpio y es el momento de hacerlo.
- RESUELTO (2026-09-21): la traducción de los errores de UNIQUE estaba rota
  en los tres módulos y nadie lo había notado. `esDniDuplicado` (personal),
  `esCodigoDuplicado` (ordenes-trabajo) y su gemelo recién escrito en
  materiales comprobaban `(error as {code}).code === "23505"`, que NUNCA se
  cumple: drizzle-orm 0.45 envuelve el error de `pg` en un `DrizzleQueryError`
  con el mensaje "Failed query: …" y deja el error original en `cause`, que es
  donde vive el `code` y también el `constraint`.
  El dato nunca corrió peligro —el UNIQUE de la base sí rechazaba el
  duplicado— pero el usuario veía "No se pudo guardar. Intenta de nuevo." en
  vez de "ese DNI ya existe". Invisible para tsc y para el lint: los tipos
  eran correctos, la rama simplemente no se tomaba nunca.
  Salió al probar contra la base real el UNIQUE nuevo de
  `materiales.codigo_interno`; probar solo que la base rechaza el duplicado no
  habría bastado, hacía falta comprobar que la traducción se dispara.
  Ahora la comprobación vive en core/errores-postgres.ts (`esUniqueViolado`),
  recorre la cadena de `cause` y acepta el nombre del constraint para no
  confundir el choque de una columna con el de otra. Los tres módulos la usan.
  Lección para lo que venga: un error de una librería que envuelve al de otra
  no se reconoce de memoria — se imprime una vez contra la base real y se mira
  qué trae de verdad.
- RESUELTO (2026-09-21): el filtro de inactivos mostraba de más, en los dos
  módulos que lo tienen. La condición era
  `inactivos ? undefined : eq(activo, true)`: con la bandera puesta no ponía
  NINGUNA condición, así que esa vista devolvía activos e inactivos
  mezclados. Síntoma con el que se reportó: al reactivar un material seguía
  apareciendo en «Mostrar inactivos». Pero no era un problema de refresco ni
  de la acción de reactivar —la base escribía `activo = true` correctamente—
  sino de la propia consulta, que seguía trayendo esa fila; se comprobó
  viendo que una fila que NUNCA se inactivó aparecía igual en esa vista.
  La etiqueta empeoraba el diagnóstico: "Mostrar inactivos" se lee como
  "añádelos a lo que ya veo", que es justo lo que hacía la consulta, así que
  el código era coherente consigo mismo y solo chocaba con lo que el usuario
  esperaba. Ahora la consulta alterna (`eq(activo, inactivos ? false : true)`)
  y la etiqueta dice "Ver solo inactivos" / "Ver solo dados de baja".
  Dos cosas que llevarse: un `undefined` dentro de un `and(...)` desaparece
  en silencio y no es lo mismo que "no filtrar por esto" cuando la intención
  era filtrar al revés; y probar que la base guarda bien NO prueba que el
  listado enseñe lo correcto — hay que consultar el listado, no la columna.
- npm audit reporta 4 vulnerabilidades moderadas, pero las cuatro son la
  misma (GHSA-67mh-4wv8-2f99, esbuild <=0.24.2) contada una vez por cada
  eslabón de la cadena que la arrastra: drizzle-kit →
  @esbuild-kit/esm-loader (deprecado, fusionado en tsx) →
  @esbuild-kit/core-utils → esbuild@0.18.20, que queda anidado porque
  core-utils lo fija en ~0.18.20. Los otros dos esbuild del árbol
  (0.25.12 directo de drizzle-kit, 0.28.2 vía tsx) están sanos.
  No hay fix limpio: drizzle-kit@0.31.11, la última publicada, declara
  la misma dependencia deprecada, y `npm audit fix --force` degradaría a
  drizzle-kit@0.18.1 — trece versiones menores atrás, incompatible con
  drizzle-orm 0.45 y con las migraciones ya generadas. `npm audit fix`
  sin --force no toca nada de esto.
  El vector real (el dev server de esbuild respondiendo a cualquier
  origen) no aplica aquí: drizzle-kit solo usa esbuild para transpilar
  drizzle.config.ts, no levanta ese servidor. Además es devDependency,
  así que nunca llega al runtime de Vercel.
  Se deja como está a propósito. Revisar cuando Drizzle actualice y
  suelte la dependencia muerta — ya depende de tsx, que es su sucesor,
  así que soltarla es cuestión de que lo hagan. La alternativa, si
  alguna vez urge silenciarlo, es un `overrides` en package.json que
  fuerce ese esbuild anidado a ^0.25, verificando después que
  `npx drizzle-kit generate` y `check` siguen funcionando.
- El 2026-09-25 se corrigió el formato del código de Empresas (CLT-0001 →
  CLT.0001, inconsistente con el resto de los módulos) y se recreó el
  registro real de AZUMA FOODS para que quedara como CLT.0001. El id interno
  de ese registro cambió respecto al original. El contador de correlativo de
  empresas se reinició a 0; los contadores de los demás módulos no se
  tocaron.
