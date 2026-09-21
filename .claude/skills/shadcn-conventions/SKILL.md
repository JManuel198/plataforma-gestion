---
name: shadcn-conventions
description: Convenciones de formularios, tablas y componentes shadcn/ui para plataforma-gestion — Server Actions con useActionState + Zod en el servidor, tablas, filtros por URL, confirmación antes de desactivar, formato de fechas con dayjs y de montos en céntimos. Úsalo al construir cualquier pantalla CRUD (crear, editar, listar): Órdenes de Trabajo, y las que sigan.
paths: modules/**, components/**, app/**
---

# Convenciones de UI — plataforma-gestion

Describe lo que este repositorio usa de verdad. Si instalas algo nuevo o
cambias un patrón, actualiza este archivo en el mismo cambio.

## Componentes

- Todo lo visual sale de `components/ui/` (shadcn/ui + Tailwind). Si falta un
  primitivo, instálalo con `npx shadcn@latest add <componente>` — nunca lo
  construyas a mano, y nunca escribas CSS custom sin justificarlo en el propio
  archivo (regla 5 de AGENTS.md).
- Instalados hoy: `alert-dialog`, `badge`, `button`, `card`, `collapsible`,
  `dialog`, `input`, `label`, `select`, `separator`, `sheet`, `sidebar`,
  `skeleton`, `sonner`, `table`, `textarea`, `tooltip`. Cualquier otro hay que
  agregarlo. `collapsible` entró en el Bloque 11, para plegar las secciones de
  la barra lateral.
  Los cinco últimos en llegar (`sidebar` y sus dependencias `separator`,
  `sheet`, `skeleton`, `tooltip`, más el hook `hooks/use-mobile.ts`) entraron
  de una sola vez con `npx shadcn@latest add sidebar`, para la barra lateral
  del layout protegido.
- **No existe un primitivo `Form`/`FormField`/`Field` en este proyecto**, y no
  hace falta: el patrón de formulario es el de abajo, con `<form action={...}>`
  nativo. No lo instales para "seguir la convención de shadcn" — la convención
  de este proyecto es la que está documentada aquí.
- El estilo instalado es `base-nova`, así que los componentes de
  `components/ui/` envuelven **Base UI** (`@base-ui/react`), no Radix. Eso
  cambia dos cosas en la práctica:
  - **Un enlace con aspecto de botón NO se hace con `Button`** — ni con
    `asChild` (que es de Radix y aquí no existe), ni con
    `render={<Link href="..." />}`. Se pone la clase sobre el `Link` plano:
    `<Link href="..." className={buttonVariants({ variant: "outline", size: "sm" })}>`,
    importando `buttonVariants` de `@/components/ui/button`.
    La razón es concreta, no estética: cuando el elemento renderizado no es un
    `<button>` nativo, Base UI le aplica `role="button"`
    (`@base-ui/react/internals/use-button/useButton.js`, donde hace
    `isNativeButton ? { type: 'button' } : { role: 'button' }`). Ese `role`
    pisa la semántica nativa del `<a>`: para un lector de pantalla deja de
    anunciarse como enlace, y el usuario pierde las acciones propias de un
    enlace (abrir en pestaña nueva, copiar dirección) además de la activación
    con Enter que se espera de él.
    El botón de envío de un formulario sí es un botón de verdad y se queda
    como `<Button type="submit">`.
    **La regla de verdad, precisada dos veces ya**: no es "nunca `render`",
    ni "nunca en componentes con `useButton`". Es que **el elemento que se
    renderiza al final tiene que coincidir con lo que declara la prop
    `nativeButton`**, que vale `true` por defecto. En `useButton.js:183` la
    rama es `isNativeButton ? { type: 'button' } : { role: 'button', ... }`,
    y en modo desarrollo avisa por consola cuando no coinciden. De ahí salen
    los tres casos vistos:
    - `Button` + `render={<Link/>}` → sale un `<a>` con el flag en `true`:
      **mal**, el `role` pisa la semántica del enlace. Este es el bug que se
      corrigió en los Links de navegación.
    - `SidebarMenuButton` + `render={<Link/>}` → ese componente no pasa por
      `useButton`, solo por `useRender`: **bien**, sale un `<a>` limpio (ver
      `components/barra-lateral.tsx`, donde además da gratis el tooltip de la
      barra colapsada).
    - `Dialog.Close`/`DialogTrigger` + `render={<Button/>}` → sí pasa por
      `useButton`, pero el `Button` renderiza un `<button>` nativo y el flag
      es `true`: **bien**, solo añade `type="button"`. Verificado al montar
      el modal de OT.

    Antes de dar por bueno o por prohibido un `render`, mira qué elemento
    acaba en el DOM, no qué componente lo envuelve.
  - `Select` acepta `name` y publica un input oculto, así que funciona dentro
    de un `<form>` sin estado controlado.

## Color y tema

- El tema es **verde corporativo sobre neutros**, y vive entero en las
  variables de `app/globals.css`. **Ningún componente lleva una clase de color
  suelta** (nada de `bg-green-700`): si hace falta un color nuevo, se agrega un
  token ahí y se usa por su nombre.
- El verde de marca es `--primary` (`oklch(0.512 0.115 158.3)`, ≈ `#0F7A4D`),
  desaturado a propósito para que no compita con los colores que sí significan
  algo. Se ve en botones primarios, `--ring` (el anillo de foco de todos los
  campos) y el módulo activo de la barra (`--sidebar-accent` +
  `--sidebar-accent-foreground`). `--accent` es la versión clara (`#ECFDF5`)
  para fondos sutiles.
- **Los colores de estado NO siguen a la marca.** `--success`, `--info` y
  `--destructive` son la distinción entre los siete estados de una OT y se
  eligen por legibilidad entre ellos, no por identidad visual. Cambiar el verde
  de marca no debe tocarlos nunca.
- Por eso existe **`--chip-neutral`**: la variante `default` del Badge tiraba de
  `--primary`, y `variantePorEstado` le da esa variante a `En ejecución`, que
  con el primario en verde chocaba con `Facturado` (`--success`). Ese token vale
  lo que valía `--primary` antes del tema verde. Si ves `bg-primary` en
  `badge.tsx`, es una regresión.
- Todo cambio de color se comprueba contra **WCAG AA** (4.5:1 en texto de
  cuerpo, 3:1 en texto grande y componentes) **antes** de aplicarlo, en claro y
  en oscuro. El modo oscuro no reusa el mismo verde: sube a
  `oklch(0.7 0.13 158.3)` (≈ `#49B77F`) con texto oscuro encima, porque el de
  marca sobre fondo casi negro no llega a 4.5:1.

## Navegación

- La navegación entre módulos vive en la **barra lateral izquierda**
  (`components/barra-lateral.tsx`), montada por `app/(protegido)/layout.tsx`.
  No hay cabecera de navegación: la única cabecera que queda es una franja con
  el `SidebarTrigger`, que en móvil es lo que abre el cajón.
- **Agregar una entrada es agregarla al array `MENU`** de `barra-lateral.tsx`.
  No se toca el layout. `MENU` es una lista de secciones
  (`{ encabezado?, enlaces }`) y cada enlace es `{ href, etiqueta, Icono }`,
  con iconos de `lucide-react`. Hasta el Bloque 11 era un array plano llamado
  `MODULOS`; las secciones entraron con SSOMA y Catálogos maestros. Ese array
  terminará en `config/clientes/*.json` ("módulos activos") cuando exista el
  primer archivo de cliente.
- **`encabezado` es solo una etiqueta visual y nunca entra en ninguna URL.**
  Personal está bajo "SSOMA" pero vive en `/personal`, y los catálogos son
  rutas planas (`/materiales`, `/lista-precios`, …), no
  `/catalogos-maestros/...`. Prohibido derivar un `href` del texto de un
  encabezado. El porqué y cómo revertirlo, en el comentario de `MENU` y en la
  sección Convenciones de AGENTS.md.
- Las secciones se arman con `SidebarGroup` + `SidebarGroupLabel`, **no** con
  `SidebarMenuSub`: el submenú lleva `group-data-[collapsible=icon]:hidden`,
  así que al colapsar la barra desaparecerían sus enlaces. Con grupos solo se
  desvanece el encabezado.
- **Una sección con `encabezado` es desplegable**: el encabezado es el
  `CollapsibleTrigger` (`SidebarGroupLabel render={<CollapsibleTrigger />}`,
  que sale como `<button>` nativo y por tanto respeta la regla de `render` de
  arriba). El estado vive en cada sección, así que son independientes; arranca
  abierta y no se persiste.
- **Hay DOS ejes de colapso y se cruzan.** El de la barra entera
  (`collapsible="icon"`) y el de cada sección. En modo icono el encabezado se
  desvanece, así que una sección cerrada dejaría sus enlaces inalcanzables: por
  eso en modo icono el panel se fuerza abierto (`modoIcono || abierta`) y el
  encabezado va `inert` — no basta `disabled`, porque el trigger de Base UI usa
  `focusableWhenDisabled: true`. En móvil no aplica (`&& !isMobile`): dentro
  del `Sheet` nunca hay `data-collapsible="icon"`. Si tocas uno de los dos
  ejes, prueba la combinación: cerrar una sección, colapsar la barra a iconos,
  y volver a expandirla.
- Plegar una sección es **estado visual y nada más**: no toca la URL. Si algún
  día tiene que sobrevivir a una recarga, va en cookie o `localStorage` (como
  `sidebar_state` para la barra entera), nunca en `searchParams`.
- La sección activa se marca comparando `usePathname()` con `href`, contando
  también las rutas hijas (`/ordenes-trabajo/nueva` marca Órdenes de Trabajo).
- Una sección del menú que todavía no está construida apunta a un `page.tsx`
  que solo renderiza `PantallaProximamente`
  (`components/pantalla-proximamente.tsx`) — así el enlace no lleva a un 404.
  Al implementarla de verdad, ese `page.tsx` deja de importarla.
- El nombre del usuario y `BotonCerrarSesion` van en el **pie de la barra**
  (`SidebarFooter`). La sesión se lee en el Server Component del layout y
  llega a la barra por prop — la barra es cliente solo por `usePathname()`.
- `hooks/use-mobile.ts` está **modificado respecto al catálogo**: la versión
  original hace `setState` dentro de un `useEffect` y el lint del proyecto lo
  rechaza (`react-hooks/set-state-in-effect`, error). Se reescribió con
  `useSyncExternalStore`. Si se reinstala con `--overwrite`, hay que volver a
  aplicarlo.

## Formularios

**Patrón estándar: Server Action + `useActionState`, validado con Zod en el
servidor.** La referencia a copiar es
`modules/ordenes-trabajo/components/formulario-orden-trabajo.tsx` junto con
`modules/ordenes-trabajo/actions.ts` y `modules/ordenes-trabajo/schema.ts`.

- El formulario es un Client Component con campos **no controlados**: cada uno
  lleva `name` y `defaultValue`, y el envío va por `<form action={accion}>`.
  Sin `useState` por campo, sin librería de formularios.
- `const [estado, accion, enviando] = useActionState(guardarAction, estadoFormularioInicial)`.
  La Server Action llega como prop desde el Server Component de la página; el
  nombre de la prop termina en `Action` (convención de Next).
- Un schema de Zod por entidad en `modules/<entidad>/schema.ts`. La Server
  Action hace `safeParse(Object.fromEntries(formData))` **antes** de tocar la
  base de datos. Es la única línea de defensa real: no se duplica la validación
  en el cliente (regla 1 de AGENTS.md — toda regla de negocio vive en el
  backend). Los atributos nativos `required` del input son solo comodidad de
  UX, nunca una garantía.
- Los errores vuelven por campo, con `z.flattenError(resultado.error).fieldErrors`,
  y se muestran **debajo del campo que los causó** — nunca en un `alert()` ni
  solo en consola. El campo además marca `aria-invalid`.
- El objeto de estado del formulario (`EstadoFormulario`,
  `estadoFormularioInicial`) vive en su propio archivo, **no** en `actions.ts`:
  un archivo con `"use server"` solo puede exportar funciones asíncronas, y
  exportar un objeto ahí rompe el build.
- Toda Server Action **re-verifica la sesión dentro de la función**, no solo
  confía en que el layout protegió la ruta: una action es invocable con un POST
  directo. Ver `exigirSesion()` en `modules/ordenes-trabajo/actions.ts`.
- Mientras el envío está en curso, el botón de submit se deshabilita con el
  tercer valor de `useActionState` (`disabled={enviando}`) — sin spinner
  custom.
- **Montos**: el input muestra el monto en decimal ("150.50") y el schema lo
  convierte a entero en céntimos con `.transform()` antes de que llegue a la
  base de datos (regla 2 de AGENTS.md). La conversión vive en el schema y en
  `modules/<entidad>/dinero.ts`, nunca repartida entre componentes, y nunca
  multiplicando por 100 en coma flotante. Para mostrar, se divide entre 100 de
  vuelta.
- **Campos automáticos** (fecha de creación, correlativos) no se piden nunca:
  los pone la base de datos o el backend, y no están en el schema de creación.
  Pueden *mostrarse* en el formulario de creación si el usuario espera verlos,
  siempre sin posibilidad de escribirlos: el correlativo, como texto
  deshabilitado y sin `name` (no hay número que enseñar hasta guardar); la
  fecha, como `<input type="date">` con `readOnly` — el valor que llegue al
  servidor se descarta igual al validar. Ver
  `formulario-orden-trabajo.tsx`, bloque "Campos automáticos".

## Tablas y listas

- `components/ui/table` para cualquier listado — nunca un grid armado con
  `<div>`.
- El filtro (por estado, por texto, por fecha) se resuelve en la **consulta
  del servidor**, no filtrando en el cliente un arreglo ya traído completo. El
  filtro vive en el `searchParams` de la URL, para que sea compartible y
  sobreviva un refresh. Ver
  `modules/ordenes-trabajo/components/filtro-estado.tsx` con
  `modules/ordenes-trabajo/queries.ts`.
- Todo valor que venga de `searchParams` se valida con Zod antes de usarse. El
  patrón es `.optional().catch(undefined)`: un parámetro inventado, repetido o
  ausente no debe reventar la pantalla, solo ignorarse.
- **Varios filtros a la vez**: se combinan, no se pisan. Cada control recibe
  los filtros completos y navega con `{ ...filtros, loQueCambia }`; la URL la
  construye una sola función (`urlListado` en `modules/<entidad>/filtros.ts`) y
  la navegación compartida vive en un hook (`use-filtros.ts`). En la consulta
  se unen con `and(...)`, que ignora los `undefined`. Ojo: el hook tiene que
  llamarse `useAlgo` aunque el resto del módulo esté en español —
  `react-hooks/rules-of-hooks` reconoce los hooks por ese prefijo.
- **Búsqueda de texto**: `ILIKE '%…%'` en el servidor, con `or(...)` entre las
  columnas buscables. Escapa `\`, `%` y `_` del texto del usuario antes de
  armar el patrón (`patronParcial` en `queries.ts`), o un `%` escrito en el
  buscador actúa como comodín. El input lleva su propio estado local y navega
  con `router.replace` tras una pausa de tecleo, para no llenar el historial.
- **Filtros por fecha**: los dos extremos son inclusivos para el usuario. Se
  traducen a `>=` contra `inicioDelDia(desde)` y `<` contra
  `inicioDelDiaSiguiente(hasta)` (`lib/fecha.ts`), nunca comparando contra el
  texto `YYYY-MM-DD` pelado: las columnas son `timestamp` en UTC y el corte
  tiene que hacerse en la zona del negocio.
- **Crear o editar sin salir del listado (el modal de OT)**: el formulario
  vive en un `Dialog` sobre la tabla (`dialogo-orden-trabajo.tsx`) y las
  pantallas propias siguen existiendo. Eso obliga a dos remates de la misma
  Server Action: el núcleo (sesión, Zod, escritura, `revalidatePath`) devuelve
  `{ ok: true }` o el error, y encima hay un envoltorio que termina en
  `redirect()` —para la pantalla— y otro que simplemente devuelve —para el
  modal. Nunca se duplica la validación: ver `guardarOtNueva` y sus dos
  remates en `actions.ts`.
  El modal **no usa `useActionState`** aunque sea el patrón estándar: necesita
  reaccionar al resultado (cerrar, avisar, refrescar), y leerlo con
  `useActionState` obligaría a un `useEffect` con `setState`, que el lint
  rechaza. Usa `useTransition` y maneja el resultado donde se produce, igual
  que el cambio de estado en línea.
  Los campos se comparten entre pantalla y modal en un componente sin `<form>`
  (`campos-orden-trabajo.tsx`): lo único que cambia entre los dos envoltorios
  es cómo se envía y a dónde se va después.
- **Editar un campo desde la propia fila** (el Select de estado en
  `selector-estado-fila.tsx`): Server Action **propia y mínima**, que escribe
  solo esa columna — nunca la acción de guardar el formulario entero, que
  sobrescribiría campos que el listado no muestra. La acción recibe argumentos
  sueltos en vez de `FormData`, devuelve un `ResultadoAccion`
  (`{ ok: true } | { ok: false, mensaje }`) en vez de un `EstadoFormulario`, y
  el componente pinta el cambio con `useOptimistic` + `useTransition`, avisa
  con un toast y llama a `router.refresh()` para traer la fila real sin
  recargar la pantalla. Si el valor elegido exige confirmación, nada de eso
  arranca hasta que el usuario acepte el `alert-dialog` (ver más abajo).
- Lista vacía: un mensaje simple en un recuadro punteado, como el de
  `tabla-ordenes-trabajo.tsx` ("No hay órdenes de trabajo que mostrar."), sin
  skeletons ni
  spinners elaborados — es una herramienta interna de un solo usuario, no
  necesita ese nivel de pulido todavía.

## Catálogos maestros

Los cinco catálogos que declara el menú (Materiales, Lista de precios,
Servicios, Tarifario de personal, EPPs) comparten forma. **Materiales
(`modules/materiales/`) es la referencia**: el que venga después se copia de
ahí, no se reinventa.

- **Dos iconos de acción por fila, no tres.** Lápiz (`PencilIcon`) para editar
  y equis (`XIcon`) para inactivar. **No hay lupa de "ver detalle"** y es
  deliberado: una fila de catálogo cabe entera en la tabla, así que una
  pantalla de solo lectura no enseñaría nada nuevo — y el modal de edición ya
  sirve para mirar, porque se cierra sin guardar. Añadir la lupa sería una
  pantalla más que mantener a cambio de nada.
- El componente es `components/acciones-material.tsx`. Los dos botones son
  `Button variant="ghost" size="icon-sm"`, cada uno con su nombre en un
  `<span class="sr-only">` (lo que lee un lector de pantalla) **y** un `title`
  (el tooltip nativo al pasar el ratón). Un icono suelto sin las dos cosas es
  inaccesible. Iconos y no texto —al revés que Personal, que usa palabras—
  porque estas tablas tienen muchas columnas y dos etiquetas por fila empujan
  el contenido.
- **Inactivar se confirma con `alert-dialog`; reactivar no.** Inactivar saca la
  fila del catálogo vigente y se confunde con borrar; reactivar no destruye ni
  esconde nada, y confirmarlo también entrenaría a aceptar sin leer. Mismo
  criterio que `BotonBaja` en Personal.
- **Nunca se borra**: la acción escribe solo `activo = false` (regla invariable
  9 de AGENTS.md), con su propia Server Action mínima —`cambiarActivoMaterial`,
  que recibe argumentos sueltos y devuelve `ResultadoAccion`—, nunca la de
  guardar el formulario entero. El texto del diálogo habla de "dejar de
  aparecer en el catálogo", no de columnas.
- **El botón de inactivar obliga a tener el filtro "Mostrar inactivos"**
  (`components/filtro-inactivos.tsx`). Sin él la fila desaparece sin vuelta
  atrás posible desde la interfaz, y el botón de reactivar no tendría cómo
  mostrarse nunca: inactivar sería un borrado irreversible de cara al usuario
  aunque no lo sea en la base.
- **Un solo buscador para varias columnas**, no una caja por campo: quien busca
  escribe lo que recuerda sin saber en qué columna cae. Se resuelve con
  `or(ilike(...))` en el servidor (ver la sección Tablas y listas). En
  Materiales cubre `codigo_interno`, `descripcion`, `marca` y `modelo`, y
  deja fuera `unidad` —un puñado de valores repetidos que traería medio
  catálogo— y `codigo_fabrica`.
- El reparto de archivos del módulo es el de siempre (`schema.ts`, `tipos.ts`,
  `queries.ts`, `actions.ts`, `filtros.ts`, `components/`), más
  `components/use-filtros.ts` para la navegación de los filtros.

## Acciones destructivas

- "Eliminar" casi nunca existe de verdad en este proyecto — es desactivar o
  mover a un estado final (`Rechazado`, `Finalizado`). No se borran filas que
  otra tabla pueda referenciar.
- Para confirmar antes de una acción de cierre, usa `alert-dialog` (ya
  instalado). Nunca el `confirm()` nativo del navegador, que además bloquea la
  página. La referencia es
  `modules/ordenes-trabajo/components/selector-estado-fila.tsx`.
- **Qué se confirma y qué no**: solo lo que cierra un ciclo o significa algo
  fuera del sistema (`Facturado`, `Cancelada`). Los pasos reversibles del
  trabajo en curso se aplican directos — confirmar todo entrena al usuario a
  aceptar sin leer y deja el aviso sin valor donde sí importa.
- **Confirmar sobre un control ya cambiado** (un Select, un Switch): el control
  va **controlado** por el valor confirmado, y lo elegido se guarda aparte
  hasta que el usuario confirme. En Base UI eso alcanza — `useControlled`
  ignora el setter interno mientras venga un `value` de fuera — y además el
  segundo argumento de `onValueChange` trae un `cancel()` que rechaza el
  cambio. Cancelar no tiene entonces nada que revertir. Ojo: `cancel()` sobre
  el evento del *valor* no impide que el desplegable se cierre; son dos objetos
  de evento distintos.

## Fechas

- Formato de visualización: **`dd/MM/yyyy`**, con **`dayjs`** (ya instalado; el
  proyecto no usa `date-fns`).
- `dayjs(fecha).format("DD/MM/YYYY")` — ojo con las mayúsculas, el formato de
  dayjs no es el mismo string que el de date-fns.

## Notificaciones

- El componente es **`sonner`** (`components/ui/sonner.tsx`). El `<Toaster />`
  se monta una sola vez en `app/(protegido)/layout.tsx`; las pantallas solo
  llaman `toast.success(...)` importando `toast` de `"sonner"`.
- Confirma con un toast toda acción que haya cambiado datos (crear, editar,
  desactivar).
- **Cómo llega el toast después de un redirect**: la Server Action termina en
  `redirect()`, así que el aviso viaja en la URL destino
  (`/ordenes-trabajo?aviso=creada`) y un Client Component lo dispara al montar y
  limpia el parámetro con `router.replace` para que un refresh no lo repita.
  El valor de `?aviso=` se valida con Zod como cualquier otro `searchParam`.
  Ver `modules/ordenes-trabajo/components/aviso-toast.tsx`.

## Estructura

- Todo componente de una entidad vive en `modules/<entidad>/components/`, junto
  a su `schema.ts` y `actions.ts` — nunca suelto en una carpeta compartida
  genérica.
- El módulo de Órdenes de Trabajo es la referencia completa del reparto de
  archivos:
  `constantes.ts` (listas sin imports, seguras para el cliente), `dinero.ts`
  (conversión de montos), `schema.ts` (Zod), `estado-formulario.ts` (tipo del
  estado de `useActionState`), `actions.ts` (`"use server"`), `queries.ts`
  (lecturas) y `components/`.
- Las pantallas viven en `app/(protegido)/<entidad>/` y solo arman la página:
  leen datos con `queries.ts` y pasan la Server Action al formulario. La lógica
  no vive en `app/`.
