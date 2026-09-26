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
- Instalados hoy: `alert-dialog`, `avatar`, `badge`, `button`, `card`, `collapsible`,
  `combobox`, `dialog`, `input`, `input-group`, `label`, `select`, `separator`,
  `sheet`, `sidebar`, `skeleton`, `sonner`, `switch`, `table`, `textarea`,
  `tooltip`. Cualquier otro hay que agregarlo. `collapsible` entró en el Bloque
  11, para plegar las secciones de la barra lateral. `combobox` (con su
  dependencia `input-group`) entró con el formulario de Empresas (2026-09-25),
  para el país: se usa SOLO a través de `CampoPais` (ver "El cuarto" más abajo).
  `avatar` entró con los ajustes de usuario (2026-09-24) y se usa SOLO a través
  de `AvatarIniciales` (`core/components/avatar-iniciales.tsx`): iniciales,
  sin `AvatarImage` — no hay subida de fotos ni storage.
  Los cinco últimos en llegar (`sidebar` y sus dependencias `separator`,
  `sheet`, `skeleton`, `tooltip`, más el hook `hooks/use-mobile.ts`) entraron
  de una sola vez con `npx shadcn@latest add sidebar`, para la barra lateral
  del layout protegido.
- **No existe un primitivo `Form`/`FormField`/`Field` en este proyecto**, y no
  hace falta: el patrón de formulario es el de abajo, con un `<form>` nativo. No lo instales para "seguir la convención de shadcn" — la convención
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
  (`SidebarFooter`). El bloque del usuario (avatar de iniciales, nombre y
  correo) es un `SidebarMenuButton size="lg"` que enlaza a `/ajustes` —la
  página de ajustes de usuario—, no un menú desplegable: hay un solo destino.
  `/ajustes` no está en `MENU` (no es un módulo del negocio), así que las migas
  de pan no muestran nada en esa pantalla. La sesión se lee en el Server Component del layout y
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
  lleva `name` y `defaultValue`. Sin `useState` por campo, sin librería de
  formularios.
- **El envío va por `onSubmit`, NUNCA por `<form action={...}>`.** Con `action`,
  React 19 restablece los campos no controlados al terminar la acción, también
  cuando el servidor devuelve errores: el usuario pierde lo que escribió justo
  cuando tiene que corregirlo. Estuvo así en los siete módulos hasta el
  rediseño de 2026-09-24 (se vio al probar un error de validación). La forma
  correcta:
  ```tsx
  <form
    onSubmit={(evento) => {
      evento.preventDefault();
      const datos = new FormData(evento.currentTarget);
      startTransition(() => accion(datos)); // o alEnviar(datos) en los modales
    }}
  >
  ```
  Con `useActionState`, su `accion` hay que llamarla dentro de una transición
  (`startTransition`), que es lo que antes hacía por nosotros el `action` del
  `<form>`. Referencia: `formulario-orden-trabajo.tsx` y cualquier `dialogo-*.tsx`.
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
  directo. Se hace importando `exigirSesion()` de `core/sesion.ts`, nunca con
  una copia local.
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
  la navegación compartida sale de `useFiltrosListado` (**`core/use-filtros-listado.ts`**,
  importado, nunca copiado): recibe los filtros y el `urlListado` del módulo, y
  devuelve `navegar` y `navegando`. Hasta el 2026-09-23 era un
  `components/use-filtros.ts` copiado en cada módulo — seis copias idénticas —
  y se unificó por la regla de las tres copias. En la consulta
  se unen con `and(...)`, que ignora los `undefined`. Ojo: el hook tiene que
  llamarse `useAlgo` aunque el resto del módulo esté en español —
  `react-hooks/rules-of-hooks` reconoce los hooks por ese prefijo.
- **Búsqueda de texto**: `ILIKE '%…%'` en el servidor, con `or(...)` entre las
  columnas buscables. El texto del usuario pasa SIEMPRE por `patronParcial`
  de **`core/busqueda.ts`** —importado, nunca copiado—, que escapa `\`, `%` y
  `_`; sin eso, un `%` escrito en el buscador actúa como comodín. Estuvo
  duplicado en los tres módulos hasta el 2026-09-21; se unificó en `core/`
  tras comprobar lo que cuesta esa duplicación (ver `errores-postgres.ts`). El input lleva su propio estado local y navega
  con `router.replace` tras una pausa de tecleo, para no llenar el historial.
- **Filtros por fecha**: los dos extremos son inclusivos para el usuario. Se
  traducen a `>=` contra `inicioDelDia(desde)` y `<` contra
  `inicioDelDiaSiguiente(hasta)` (`lib/fecha.ts`), nunca comparando contra el
  texto `YYYY-MM-DD` pelado: las columnas son `timestamptz` y el corte
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
- **Lista vacía**: `EstadoVacio` (`core/components/estado-vacio.tsx`), con un
  mensaje distinto según el motivo —búsqueda sin resultados, filtros sin
  resultados, vista de inactivos vacía, todo dado de baja o catálogo vacío— y
  la acción que corresponde (limpiar filtros o crear el primero). Sin
  skeletons ni spinners elaborados.
- **Anatomía de un listado** (desde la implementación de los mockups,
  2026-09-24; guía visual en `docs/diseno/`). Todo sale de `core/`, importado,
  nunca copiado; la referencia completa es `app/(protegido)/lista-precios/page.tsx`:
  - `CabeceraListado`: título, descripción opcional y el botón de alta.
  - Barra de filtros: `BuscadorListado` (envuelto por un `buscador-*.tsx` del
    módulo que solo pasa `urlListado` y el placeholder), el filtro propio del
    módulo, y `LimpiarFiltros` con el número que devuelve `contarFiltros` de
    `modules/<entidad>/filtros.ts`. A la derecha, `ContadorRegistros`: con
    `activo`, «N activos» o «N inactivos» según la vista; sin `activo` (EPPs,
    Servicios, OT), el total registrado.
  - Tabla dentro de `MarcoTabla` (`core/components/tabla-listado.tsx`), con
    `CLASE_FILA`/`CLASE_CABECERA`, códigos con `CLASE_CODIGO` y montos con
    `CLASE_CIFRA`. Columnas fijas con `CELDA_FIJA_INICIO` (código) y
    `CELDA_FIJA_FIN` / `CELDA_FIJA_ANTES_DEL_FIN` (acciones y situación o
    estado) solo cuando la tabla es ancha; Personal, estrecha, no las usa. Una
    celda fija necesita fondo propio, que ya ponen esas clases.
  - **Paginación en el servidor**: `?pagina=` validado con `paginaSchema`,
    `calcularPaginacion(total, pagina)` de `core/paginacion.ts` (ajusta una
    página fuera de rango a la última) y `PaginacionListado` como pie del
    marco. En `queries.ts`, `condicionesListado(filtros)` se comparte entre
    `contarResultados` y el listado —si divergen, el pie miente—, y el
    `orderBy` lleva un desempate único para que ninguna fila salte de página.
    Cambiar cualquier filtro vuelve a la página 1: lo hace
    `useFiltrosListado`, no cada control.

## Fila clicable → vista → editar

**Este es EL estándar de todo listado que abra su registro: los catálogos
maestros que existen y los que vengan, y cualquier otro listado con el mismo
gesto.** No es una variante de Materiales ni algo a decidir por módulo — un
listado nuevo lo hereda entero, y desviarse de él se justifica en el propio
archivo.

Vive en **`core/`**, no en ningún módulo: `core/fila-clicable.tsx` (estado y
comportamiento) y `core/vista-detalle.tsx` (cómo se pinta en solo lectura).
Está por la misma regla que `core/busqueda.ts` y `core/errores-postgres.ts` —
lo usan varios módulos y ninguno puede importar de otro.

Aplicado ya en los nueve listados que existen (los dos de Servicios y EPPs
son los fáciles: un solo control en la fila):

| Listado | Fila | Vista | Modal | Lo interactivo de la fila |
| --- | --- | --- | --- | --- |
| Materiales | `fila-material.tsx` | `vista-material.tsx` | `dialogo-material.tsx` | lápiz + equis (+ su `alert-dialog`) |
| Lista de precios | `fila-lista-precio.tsx` | `vista-lista-precio.tsx` | `dialogo-lista-precio.tsx` | lápiz + equis (+ su `alert-dialog`), en `AccionesPrecio` |
| Tarifario de personal | `fila-tarifa.tsx` | `vista-tarifa.tsx` | `dialogo-tarifa.tsx` | lápiz + equis (+ su `alert-dialog`), en `AccionesTarifa` |
| Personal | `fila-persona.tsx` | `vista-persona.tsx` | `dialogo-persona.tsx` | "Editar" + `BotonBaja` (+ su `alert-dialog`) |
| Órdenes de Trabajo | `fila-orden-trabajo.tsx` | `vista-orden-trabajo.tsx` | `dialogo-orden-trabajo.tsx` | **`SelectorEstadoFila`** (+ su desplegable y su `alert-dialog`) + lápiz |
| Servicios | `fila-servicio.tsx` | `vista-servicio.tsx` | `dialogo-servicio.tsx` | solo el lápiz — sin columna `activo`, ver más abajo |
| EPPs | `fila-epp.tsx` | `vista-epp.tsx` | `dialogo-epp.tsx` | solo el lápiz — sin columna `activo`, ver más abajo |
| Empresas (Clientes) | `fila-empresa.tsx` | `vista-empresa.tsx` | `dialogo-empresa.tsx` | lápiz + equis (+ su `alert-dialog`), en `AccionesEmpresa`; el modal lleva además un `Select` y un combobox (portales) — ver `CampoPais` |
| Contactos | `fila-contacto.tsx` | `vista-contacto.tsx` | `dialogo-contacto.tsx` | lápiz + equis (+ su `alert-dialog`), en `AccionesContacto`; el modal lleva un `BuscadorSeleccion` de empresa (en el flujo, sin portal) |

La máquina de estados se importa, nunca se copia.

- **Tres modos, un solo modal.** `ModoDetalle` es `"cerrado" | "viendo" |
  "editando"`, y los tres los lleva `useControlDetalle()`, que monta LA FILA
  (no el modal): en la fila hay dos disparadores —el clic abre en "viendo", el
  lápiz en "editando"— para un único `Dialog`. El botón "Editar" de la vista
  solo cambia el modo: no cierra ni vuelve a abrir, así que no hay parpadeo ni
  foco perdido. Nada de un booleano `abierto` más otro `editando`, que admite
  el estado imposible "cerrado pero editando".
- El modal acepta `control` (lo pasa la fila) **o** `disparador` (un
  `DialogTrigger` propio, que es lo que usa el "Nuevo …" de la cabecera, un
  Server Component que no puede pasar estado). Cuando no le dan `control`, se
  monta el suyo y nunca pasa por "viendo".
- **La fila sigue siendo un `<tr>`.** `propsFilaClicable(alAbrir)` le añade
  `tabIndex={0}`, `aria-haspopup="dialog"` y Enter/Espacio (con
  `preventDefault()` en Espacio, o la página salta). **Nunca** se envuelve en
  un `<button>` ni se cambia por un `<div role="button">`: eso le quita a la
  tabla el `role="row"`, la cuenta de filas y la relación con los encabezados.
  El foco se marca con `outline`, no con el `ring` de shadcn: el anillo es un
  `box-shadow` y sobre un `<tr>` con `border-collapse: collapse` (lo que impone
  el preflight de Tailwind) no se pinta de forma fiable.
- **Todo lo interactivo de la fila va dentro de un `SinPropagacion`**, EL MODAL
  Y LOS `alert-dialog` INCLUIDOS. Sin eso, el clic en la equis de inactivar
  burbujea hasta el `onClick` de la fila y abre la vista encima de la
  confirmación. Es un envoltorio, no un `stopPropagation` suelto por
  componente, para que la regla se vea de un vistazo y se copie entera.
  **El motivo de incluir al modal no se ve venir**: el contenido de un `Dialog`
  se porta a `document.body`, pero los eventos de React burbujean por el árbol
  de COMPONENTES, no por el DOM — un clic en "Cancelar" dentro del diálogo
  llega igualmente al `onClick` del `<tr>`.
  Sin `className` sale como `display: contents` y no toca el layout; con
  `className` hace además de contenedor (la fila de botones de acción le pasa
  sus clases de flex en vez de anidar otro `<div>`).
- **`propsFilaClicable` trae una red de seguridad, que no sustituye al
  envoltorio.** `esClicDeLaFila()` descarta lo que no está dentro del `<tr>` en
  el DOM (portales) y lo que nace en un control nativo
  (`button, a, input, select, textarea, label, [role="button"]`), para que
  olvidar el `SinPropagacion` no se convierta en un bug silencioso — nada en
  `tsc` ni en el lint avisaría. Lo que esa lista NO cubre es un control con
  `role="switch"` o `role="checkbox"` pintado sobre un `<span>`/`<div>`: ahí el
  envoltorio vuelve a ser lo único que corta la propagación. Por eso la regla
  sigue siendo envolver, no confiar en la lista.
- **Un control compuesto en línea es el caso que más se escapa, y OT es el
  ejemplo.** La celda de estado de `fila-orden-trabajo.tsx` no es un botón: es
  un `Select` editable en el sitio que despliega sus siete opciones **y** abre
  un `alert-dialog` de confirmación para `Facturado` y `Cancelada`. Son TRES
  superficies —disparador, desplegable, diálogo— y las dos últimas se portan a
  `document.body`, así que el envoltorio tiene que ir alrededor del COMPONENTE
  ENTERO, no del disparador. Y aquí la red de seguridad no alcanza: las
  opciones de Base UI son `role="option"` sobre un `<div>`, que no está en la
  lista de `esClicDeLaFila`; solo se salvan por el criterio del portal, que es
  un detalle de implementación del que no conviene depender. Regla práctica:
  **si dentro de la fila hay algo que abre otra cosa, envuélvelo entero y
  pruébalo con el desplegable abierto**, no solo cerrado.
- **Un módulo puede tener más de un `SinPropagacion` por fila.** OT lleva dos
  —uno en la celda de estado y otro en la de acciones— en vez de uno grande:
  cada celda envuelve lo suyo. Es lo mismo para la propagación y deja el
  envoltorio pegado a lo que protege.
- La vista de solo lectura se arma con `ListaDatos` + `Dato` de
  `core/vista-detalle.tsx`: un `<dl>`, para que un lector de pantalla anuncie
  "Marca: Bosch" y no dos textos sueltos. `Dato` pasa el texto por `oVacio()`
  —el guion de "no tiene", que también usan las celdas de la tabla— y acepta
  `children` cuando el valor no es texto (un `Badge` de situación).
- Enseña las mismas columnas que el formulario y en el mismo orden, más lo que
  el formulario no edita (la situación activo/inactivo). Si un chip ya existe
  en la tabla, aquí se usa **la misma variante**: es el mismo dato.
- **Lo calculado se sigue calculando en el servidor y baja como prop.** La
  fila pasa a ser un Client Component, pero eso no debe arrastrar al cliente
  cuentas que dependen de "hoy": `TablaPersonal` llama a `calcularEdad`
  (lib/fecha.ts) y le pasa `edad` a `FilaDePersona`, que a su vez se la pasa al
  modal. Hacerlo en el navegador metería dayjs con sus plugins de utc/timezone
  en el bundle, dejaría el número a merced del reloj del equipo y podría
  desajustar la hidratación si servidor y cliente caen a distinto lado de la
  medianoche. Formatear una columna `date` (un `YYYY-MM-DD` literal) sí puede
  hacerse en el cliente: no depende de "hoy" ni de la zona.
- **Lo que cambia de un listado a otro es solo el envoltorio.** Personal usa
  botones con texto ("Editar", "Dar de baja") en vez de los iconos de los
  catálogos —decisión ya tomada por el ancho de cada tabla— y el papel de
  atajo a edición lo hace ahí el botón "Editar". OT vuelve al lápiz, por ser
  la tabla más ancha del proyecto (once columnas), y no lleva equis de
  inactivar: ese papel lo cumple el estado `Cancelada` (regla invariable 9).
  El patrón no obliga a unificar eso: obliga a los tres modos, al `<tr>`
  accionable y al `SinPropagacion`.

**Al aplicarlo a un listado nuevo, se comprueba en el navegador —no se da por
sentado— que:**

1. El clic en la fila, fuera de cualquier control, abre la vista.
2. Cada control de la fila hace lo suyo y **no** abre además la vista. Uno por
   uno, incluidos los que despliegan o confirman: abrir el desplegable, elegir
   una opción, y cancelar y confirmar el diálogo.
3. El atajo a edición (lápiz o botón) abre el formulario directamente, sin
   pasar por la vista.
4. El botón "Editar" de la vista cambia a edición en el mismo modal.
5. Cerrar el modal por cualquier vía lo deja en "cerrado": volver a la fila
   abre otra vez la vista, no la edición de antes.
6. La consola no suelta avisos — sobre todo los de `useControlled` de Base UI,
   que salen cuando un `defaultValue` cambia bajo un campo que sigue montado.

## Elegir un registro dentro de un formulario (BuscadorSeleccion)

**No lo confundas con el buscador de un listado. Son dos cosas distintas que
se parecen en pantalla.**

| | Buscador de listado | `BuscadorSeleccion` |
|---|---|---|
| Qué hace | Filtra la tabla: se ven menos filas | Elige UNA fila y la mete en un formulario |
| Dónde vive el estado | `searchParams` (la URL) | Estado local del componente |
| Ejemplo | `BuscadorMateriales` | El material en el modal de Lista de precios |

El de selección **nunca toca la URL**, y no es un detalle: lo que alguien
teclea a medio rellenar un modal no es estado de la aplicación que merezca
compartirse por enlace ni recuperarse con el botón Atrás — y además navegar
cerraría el modal.

El componente es `core/components/buscador-seleccion.tsx`, **genérico en las
dos direcciones**: en qué busca (lo decide la Server Action que recibe) y en
qué muestra (`principalDe` / `secundarioDe`). No sabe qué es un material.

- **La búsqueda la hace SIEMPRE el servidor.** `buscarAction` es una Server
  Action; el componente nunca recibe el catálogo entero para filtrarlo en
  memoria (regla 1 de AGENTS.md). La consulta va en el `queries.ts` del módulo
  dueño de los datos y se expone con un envoltorio mínimo en su `actions.ts`
  —con `exigirSesion()` y Zod, como cualquier otra action— porque la invoca un
  Client Component.
- **La consulta pone un `LIMIT`**, porque la lista se pinta entera.
  `buscarMaterialesParaSeleccion` usa 10.
- **Qué registros ofrece lo decide la regla de negocio de cada caso, y la
  consulta la aplica.** Material: solo activos — un material inactivo está
  fuera del catálogo vigente y no puede ser el de una oferta nueva (lo ya
  creado sobre uno que luego se inactiva no se toca). Empresa en Contactos
  (2026-09-25): TODAS, activas e inactivas, por decisión confirmada — un
  contacto puede pertenecer a una empresa dada de baja y al editarlo la suya
  tiene que seguir elegible. Para ese segundo caso el componente acepta
  `inactivoDe` (+ `etiquetaInactivo`): el resultado se pinta atenuado y con el
  `BadgeSituacion` gris, en la lista y en la tarjeta del elegido, para que
  asociar un registro de baja sea siempre una decisión a la vista. Si la
  consulta ya filtra por `activo`, no se pasa.
- **Si la acción es del propio módulo, se importa directa.** El selector de
  empresa lee la tabla `empresas` con `buscarEmpresasParaSelector`
  (`core/selector-empresas.ts`, compartida desde el 2026-09-25 con el parámetro
  `incluirInactivas`), no código de `modules/clientes/`. Contactos y
  Oportunidades la envuelven cada uno en su `listarEmpresasParaSelectorAction`,
  que se importa en `campos-contacto.tsx` / `campos-oportunidad.tsx`, igual que
  `buscarProveedoresAction`. El rodeo por prop de la página (abajo) es solo
  para cuando la búsqueda vive en OTRO módulo.
- **Un campo que depende de la selección** (el contacto de una oportunidad, que
  se habilita al elegir empresa y se vacía si cambia): se recarga en el
  `onSeleccionar`, no en un `useEffect` que mire la empresa, con un turno
  (`useRef`) para que solo escriba la respuesta de la última empresa, y su
  fallo se muestra. Ver `modules/oportunidades/components/campos-oportunidad.tsx`.
- **Cómo lo recibe un módulo que no es dueño de esos datos** — el caso
  importante: `modules/lista-precios/` NO importa de `modules/materiales/`. La
  acción llega como **prop desde la página**
  (`app/(protegido)/lista-precios/page.tsx`), que es la capa de composición y
  el único sitio que conoce a los dos módulos. El módulo consumidor solo
  declara la FORMA que necesita (`MaterialElegible` en su `tipos.ts`) y
  TypeScript comprueba la compatibilidad estructural. Así, si el módulo dueño
  renombra una columna, el error sale en `app/`, que es donde hay contexto
  para arreglarlo.
- **El componente pinta su propio `<input type="hidden">`** con el `name` que
  se le pase, para que el valor elegido entre en el `FormData` sin que quien
  lo monta tenga que acordarse.
- **Dos detalles que parecen de más y no lo son**: cada búsqueda se numera con
  un `ref` y solo la última puede escribir el resultado (dos consultas en
  vuelo pueden volver en orden distinto al que salieron, y el retardo de
  tecleo NO evita eso); y el fallo de red se muestra, nunca se traga — si no,
  el usuario lee "Ningún resultado" y concluye que el registro no existe.
- Los resultados son **botones normales en una lista**, no un `listbox` con
  `role="option"`: un listbox de verdad exige navegación con flechas y
  `aria-activedescendant`, y anunciarlo sin implementarlo es peor que no
  anunciarlo.

**Un formulario que depende de una selección se muestra en dos fases.** En el
modal de Lista de precios, antes de elegir material solo se ven el código
(deshabilitado) y el buscador; el resto **se desmonta**, no se deshabilita —
un formulario lleno de campos grises se lee como "está roto", uno corto se lee
como "faltas tú".

### Su hermano: `CampoConSugerencias` (texto libre con sugerencias)

`core/components/campo-con-sugerencias.tsx`. Se parece en pantalla y comparte
el motor (`core/components/busqueda-remota.ts`), pero **significa lo
contrario** y elegir mal rompe el formulario:

| | `BuscadorSeleccion` | `CampoConSugerencias` |
|---|---|---|
| Qué vale como valor | solo un registro existente | lo que el usuario escriba |
| Si no hay resultados | no se puede continuar | se guarda lo tecleado |
| Qué se envía | la clave del elegido, en un `input` oculto | el texto mismo (el input lleva el `name`) |
| Su caso | Material (existe o no existe) | Proveedor en Lista de precios |

**El criterio es si los datos tienen tabla.** Material la tiene, así que solo
vale uno de verdad. Proveedor NO: el "catálogo" es un `SELECT DISTINCT` sobre
la propia columna, así que con la tabla vacía no hay nada que sugerir y un
selector estricto dejaría la primera fila del sistema sin poder guardarse. Las
sugerencias existen para evitar la disgregación por tecleo ("Ferretería Lima"
vs "ferreteria lima"), no para cerrar la lista.

- Ahí el input va **controlado**, rompiendo la convención de campos no
  controlados, porque pulsar una sugerencia tiene que escribir en la caja. A
  cambio no hay input oculto: lo que se ve es lo que se envía.
- Ningún mensaje suyo dice "no existe" — dice "se guardará tal como lo
  escribas". Si dijera lo primero, el usuario se quedaría esperando a
  encontrar algo que no tiene por qué existir.
- La consulta **no filtra por `activo`**: el proveedor de una oferta
  inactivada sigue siendo un proveedor real, y esconderlo provoca justo el
  tecleo divergente que esto evita.

**El motor de los dos está en `busqueda-remota.ts`, y se importa, nunca se
copia.** Lo que comparten son los tres detalles que no avisan cuando faltan:
la pausa de tecleo, el turno de cada consulta (dos respuestas pueden volver
desordenadas; el retardo NO lo evita) y el fallo de red visible. Era la
tercera vez que ese patrón iba a copiarse en este repositorio — ver
`esUniqueViolado` y `patronParcial`.

### El tercero: `CampoListaSugerida` (lista fija, en memoria)

`core/components/campo-lista-sugerida.tsx`. Es el caso de `unidad` en
Materiales, Lista de precios y Servicios: un input de texto que al enfocarse o
al hacer clic despliega una lista fija (`UNIDADES`, en `core/unidades.ts`) y la
filtra en vivo mientras se teclea. **También es el caso de `unidad` en el
Tarifario de personal, pero con OTRA lista** — ver el aviso al final de este
apartado.

**NO lo fusiones con `CampoConSugerencias` por parecido superficial** — es la
confusión que este apartado existe para evitar. En pantalla son casi lo
mismo; lo que cambia es **de dónde salen las sugerencias**, y eso decide todo
lo demás:

| | `CampoConSugerencias` | `CampoListaSugerida` |
|---|---|---|
| De dónde salen | `SELECT DISTINCT` en el servidor | una constante del código |
| Cuándo cambian | con cada alta que hace un usuario | con un commit |
| Dónde se filtran | en el servidor, en cada consulta | en memoria, `.filter()` |
| Pausa de tecleo | imprescindible | no tiene sentido |
| Turno de respuestas | imprescindible | no existe |
| Puede fallar | sí, es red — y se muestra | no |
| Con el campo vacío | no sugiere nada | ofrece la lista entera |
| Su caso | Proveedor | Unidad |

**Por eso NO reutiliza `busqueda-remota.ts`, y no es una excepción a la regla
de "el motor se importa, nunca se copia": es que no hay motor que compartir.**
Ese hook resuelve tres problemas que solo existen cuando la respuesta viaja
por la red. Con siete cadenas ya presentes en el bundle, montarlo encima
obligaría a envolver el array en una promesa falsa y a esperar 300 ms para
enseñar algo que ya está en memoria. Nada se copió de él: no hay pausa, ni
turno, ni estado de fallo.

**La regla para elegir entre los tres, en una línea: la fuente de los datos
decide el componente, no su aspecto.**

- El valor TIENE que existir como registro → `BuscadorSeleccion`.
- El catálogo vive en el servidor y cambia solo → `CampoConSugerencias`.
- El catálogo vive en el código y cambia con un commit → `CampoListaSugerida`.
- El catálogo vive en el código Y el valor tiene que ser uno de la lista →
  `CampoPais` (el cuarto, abajo).

### El cuarto: `CampoPais` (lista fija, valor cerrado)

`modules/clientes/components/campo-pais.tsx`, sobre `modules/clientes/paises.ts` (249 códigos ISO
3166-1 alfa-2 con nombre en español). Es el combobox de Base UI instalado con
shadcn (`components/ui/combobox.tsx`). Se distingue de `CampoListaSugerida`
por lo que se GUARDA: allí el texto tecleado; aquí el código del país elegido,
en un input oculto que el propio combobox publica (`itemToStringValue`). El
Zod del módulo valida el código contra `CODIGOS_PAIS`.

- **La lista va en un portal**, al revés que `CampoListaSugerida`: 249 países
  no caben empujando el formulario. Dentro de una fila clicable eso significa
  que el modal tiene que ir, como siempre, dentro del `SinPropagacion`
  (verificado: elegir un país desde el modo "editando" de una fila no cambia el
  modo del modal).
- **`autoHighlight` es obligatorio.** Sin él, teclear "chi" + Enter no
  resaltaba ningún país y Enter enviaba el formulario entero (visto en el
  navegador). Con él, Enter elige la primera coincidencia — la misma regla que
  `CampoListaSugerida`: Enter con la lista abierta no envía.
- El filtro ignora tildes: "peru" encuentra "Perú".

### Rellenar un formulario no controlado desde el servidor (consulta de RUC)

`modules/clientes/components/campos-empresa.tsx`. La consulta de RUC tiene que
escribir en campos no controlados sin convertirlos en controlados. La salida:
al volver la respuesta, leer lo que el formulario tiene EN ESE MOMENTO
(`new FormData(form)`), aplicarle los datos del servidor y volver a montar los
campos con esos valores como `defaultValue` (cambiando su `key`). Se conserva
lo que el usuario escribió en los campos que la consulta no toca, los campos
siguen editables, y `Select`/combobox arrancan limpios en vez de avisar de un
`defaultValue` que cambia bajo un componente montado. Una respuesta que llega
cuando el valor consultado ya cambió se descarta.

Detalles suyos que parecen de más y no lo son:

- **La lista se pinta en el flujo, no en una capa flotante ni en un portal.**
  El cuerpo de los modales está en `overflow-y-auto`, así que un desplegable
  posicionado en absoluto se recortaría contra ese borde.
- **`onMouseDown` con `preventDefault` en cada sugerencia**, o el `blur` del
  input cerraría la lista antes de que llegara el `click` y no se podría
  elegir nunca.
- **El `onBlur` va en el contenedor y mira `relatedTarget`**, para que salir
  con Tab cierre la lista pero moverse dentro de ella no.
- **Escape lleva `stopPropagation`**: sin él llegaría al Dialog y cerraría el
  modal entero con lo que el usuario llevara escrito. Enter con la lista
  abierta la cierra y **no envía** el formulario.
- **La lista no valida nada.** Si algún día hay que cerrar el conjunto, el
  sitio es el Zod del módulo y un `CHECK` en la columna — una comprobación
  que solo viva en el cliente no es una comprobación (regla 1 de AGENTS.md).

**OJO: hay DOS campos "Unidad" en el proyecto y NO son la misma lista**
(Bloque 15, 2026-09-23). Es la confusión más fácil de cometer aquí, porque
todo lo visible coincide: el mismo componente, la misma etiqueta "Unidad", la
misma columna `unidad` y el mismo trato de texto libre.

| | Materiales, Lista de precios, Servicios | Tarifario de personal |
|---|---|---|
| Constante | `UNIDADES` | `PERIODOS_TARIFARIO` |
| Archivo | `core/unidades.ts` | `core/periodos.ts` |
| Qué mide | cantidad física | tiempo |
| Valores | m, und, pzs, cja, kg, lt, gal | hora, día, mes, año |
| Qué responde | "¿en qué se mide esta cosa?" | "¿por cuánto tiempo es este costo?" |

Viven en archivos separados justamente para que el `import` sea lo que las
distinga. **Nunca añadas un periodo a `UNIDADES` ni una unidad física a
`PERIODOS_TARIFARIO`**: no harías una lista más completa, romperías el
vocabulario de las dos pantallas a la vez. Si un catálogo nuevo necesita una
tercera lista, es un archivo más en `core/`, no un valor colado en una de
estas dos.

**El Tarifario es además el primer módulo que monta los DOS componentes de
sugerencias juntos**, uno al lado del otro en el mismo modal:
`CampoConSugerencias` para `cargo` (sale de un `SELECT DISTINCT` sobre la
propia tabla — no hay catálogo de cargos, igual que no hay tabla de
proveedores) y `CampoListaSugerida` para `unidad`. Se parecen en pantalla y no
son intercambiables: la regla de arriba —**la fuente de los datos decide el
componente, no su aspecto**— es exactamente lo que separa a esos dos campos.
Ver `modules/tarifario-personal/components/campos-tarifa.tsx`.

**`unidad` es texto libre en los dos catálogos, y es una decisión, no un
descuido** (2026-09-22). Antes Lista de precios la restringía con
`z.enum(UNIDADES)` y Materiales no restringía nada. Se unificó bajando Lista
de precios al nivel de Materiales: `UNIDADES` subió a `core/unidades.ts` y
pasó de ser restricción a ser sugerencia. Se puede guardar "rollo". El
porqué, y qué haría falta para cerrarla algún día, está en
`docs/spec/entidades.md` y en las decisiones 12 y 13 de
`docs/spec/preguntas-abiertas.md`.

## Valores calculados que se muestran en vivo

El precio de Lista de precios (`precio_lista × (1 − descuento/100)`) se
actualiza mientras se teclea. Eso convive con la regla invariable 1 ("el
frontend nunca calcula totales, descuentos ni impuestos") **solo si se hace
así**:

1. **Una sola implementación del cálculo**, en un archivo del módulo sin
   imports de servidor (`modules/lista-precios/precio.ts`). El listado del
   servidor y la vista previa del modal llaman a la MISMA función. Lo que la
   regla prohíbe es que el frontend tenga su propio cálculo, capaz de divergir
   sin que nada avise — que es exactamente cómo se rompieron `esUniqueViolado`
   y `patronParcial` cuando estaban copiados.
2. **El valor calculado no se envía ni se guarda**: el campo no lleva `name`,
   así que no entra en el `FormData`, y no hay columna donde escribirlo.
3. **No es un `<input readOnly>`**, que se lee como "editable pero bloqueado".
   Es un `<output>`: el resultado de una cuenta.
4. **La validación del texto a medio escribir usa los MISMOS patrones que el
   Zod** (`PATRON_PRECIO_LISTA`, `PATRON_DESCUENTO` en `constantes.ts`). Si el
   formulario diera por bueno algo que el servidor rechaza, el usuario vería
   un precio en pantalla y un error al guardar, sin saber cuál miente.
5. **Los campos siguen siendo no controlados** (`defaultValue`, sin `value`).
   El `onChange` solo copia el texto a un estado que alimenta la vista previa;
   lo que se envía sigue saliendo del DOM.

Si el cálculo se complica (IGV, descuentos encadenados, escalas por cantidad),
la respuesta NO es duplicarlo en el cliente: es que el modal deje de
previsualizar en vivo y le pida el valor al servidor.

## Catálogos maestros

Los cinco catálogos que declara el menú (Materiales, Lista de precios,
Servicios, Tarifario de personal, EPPs) comparten forma. **Materiales
(`modules/materiales/`) es la referencia**: el que venga después se copia de
ahí, no se reinventa.

**Lista de precios ya lo heredó entero** (Bloque 13, Parte 2, 2026-09-22):
buscador de tabla, filtro «Ver solo inactivas», inactivar con `alert-dialog`
y fila clicable. Sirve de segundo ejemplo de que el patrón se importa sin
retocarlo — lo único propio suyo es qué columnas busca y que el texto del
diálogo habla de "la lista de precios vigente" en vez de "el catálogo".

**Tarifario de personal es el tercero que lo hereda entero** (Bloque 15, Parte
2, 2026-09-23): buscador de tabla, filtro «Ver solo inactivos» con esa etiqueta
exacta, inactivar con `alert-dialog` y fila clicable. Confirma que el patrón se
importa sin retocarlo — lo propio suyo es qué columnas busca (`codigo`, `cargo`
y `unidad`, las tres de texto) y que el diálogo habla de "el tarifario" en vez
de "el catálogo". Tiene además un detalle que no se ve en los otros y conviene
conocer antes de copiarlo: **el buscador de la tabla filtra por `activo` y el
buscador del modal NO**, deliberadamente — el cargo de una tarifa inactivada
sigue siendo un cargo real que se usó, así que esconderlo de las sugerencias
provocaría el tecleo divergente que esas sugerencias vienen a evitar. Mismo
criterio que `buscarProveedores` en Lista de precios.

**EPPs cierra los cinco** (Bloque 16, Parte 1, 2026-09-23): con él ninguna de
las cinco rutas del menú es ya un placeholder. Hereda la fila clicable y el modal
de tres modos, y **se parece a Servicios en la forma pero no en el motivo** — lo
propio suyo es que su correlativo usa **6 dígitos** (`EPP.000001`; los otros usan
7 o 4, y la tabla `correlativo` no impone ninguno) y que **su `unidad` es la
lista física de `core/unidades.ts`, no la de periodos de `core/periodos.ts`** que
usa el Tarifario en su campo del mismo nombre. Las dos columnas se llaman
`unidad` y las dos son `text`: nada en el tipo avisa de la confusión, así que al
copiar del catálogo de al lado hay que mirar de cuál se copia.

Su **Parte 2** (misma fecha) añadió el buscador sobre `codigo`, `descripcion` y
`unidad`, y deja el ejemplo más limpio de la regla del hook: **EPPs es el
séptimo listado que usa `useFiltrosListado` y el primero que nace con él ya en
`core/`**, así que no tiene —ni debe tener— un `components/use-filtros.ts`
propio. Lo del módulo es `FiltrosEpps` y `urlListado` en su `filtros.ts`, que es
lo que el hook recibe como segundo argumento. Es además **el listado más simple
del proyecto: un solo filtro**, sin «Ver solo inactivos» (no hay columna
`activo`) y sin filtro de lista cerrada (no hay columna de ese tipo). Aun con un
único filtro conserva su `urlListado` en vez de escribir la URL a mano en el
buscador — ahorrarlo hoy obligaría a reescribir el control el día que entre un
segundo filtro, que es justo lo que `urlListado` evita en los otros seis.

**OJO: dos de las reglas de abajo —"dos iconos por fila" y "el botón de
inactivar obliga a tener el filtro Ver solo inactivos"— presuponen que el
catálogo tiene columna `activo`, y no todos la tienen.** Cuando se escribieron,
los dos catálogos con tabla real la tenían y la condición no se veía. **Servicios
(Bloque 14, Parte 1, 2026-09-23) es el primero que no**: inactivar no está
confirmado para ese catálogo y la columna no se creó, así que su fila lleva **un
solo icono** (el lápiz, inline en `fila-servicio.tsx`, sin `acciones-*.tsx`
propio porque un archivo para un botón es ceremonia) y **no tiene filtro de
inactivos** — no porque falte, sino porque no hay nada que filtrar. Lo mismo vale
para su `vista-*.tsx`, que no pinta el dato "Situación". **EPPs (Bloque 16) es el
segundo sin `activo`** y se comporta igual —un solo icono, sin filtro, sin
"Situación"—, pero por un motivo distinto que conviene no fundir con el
anterior: en Servicios la columna falta porque inactivar está **sin confirmar**
con el cliente (decisión 16, podría llegar); en EPPs el encargo dice que la baja
lógica **no aplica**. Mismo resultado en pantalla, decisión distinta detrás. Si
construyes un catálogo nuevo copiando de cualquiera de los dos, no busques lo que
no está; si lo copias de Materiales, Lista de precios o Tarifario y tu catálogo
**sí** tiene `activo`, las dos reglas aplican enteras. El porqué de cada caso
está en las decisiones 6 (EPPs) y 16 (Servicios) de "Catálogos maestros" en
`docs/spec/preguntas-abiertas.md`.

- **Dos iconos de acción por fila, no tres** —con `activo`; sin él, solo el
  lápiz (ver el aviso de arriba). Lápiz (`PencilIcon`) para editar y equis
  (`XIcon`) para inactivar. **No hay lupa de "ver detalle"**: la vista de solo
  lectura se abre haciendo clic en la fila (ver "Fila clicable → vista →
  editar" más arriba, que es obligatorio en todo catálogo, tenga `activo` o
  no), así que un tercer icono sería un botón de más para lo que ya hace la
  fila entera. El lápiz se queda como atajo directo a edición.
- El componente es `components/acciones-material.tsx`. Los dos botones son
  `BotonAccionFila` (`core/components/boton-accion-fila.tsx`): un `Button`
  `ghost` `icon-sm` con su nombre en un `sr-only` (lo que lee un lector de
  pantalla) **y** en un `Tooltip` de shadcn —ya no el `title` nativo—. La
  equis se llama "Dar de baja" y lleva `destructiva`. Un icono suelto sin las
  dos cosas es inaccesible. Iconos y no texto —al revés que Personal, que usa palabras—
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
- **El botón de inactivar obliga a tener el filtro "Ver solo inactivos"**
  (`components/filtro-inactivos.tsx`, que solo envuelve a
  `FiltroSoloInactivos` de `core/components/` con la `urlListado` del módulo). La obligación es del BOTÓN, no del
  catálogo: sin columna `activo` no hay botón, y entonces tampoco hay filtro que
  echar en falta (caso de Servicios — ver el aviso al principio de esta
  sección). Sin él la fila desaparece sin vuelta
  atrás posible desde la interfaz, y el botón de reactivar no tendría cómo
  mostrarse nunca: inactivar sería un borrado irreversible de cara al usuario
  aunque no lo sea en la base.
- **Ese filtro ALTERNA entre dos vistas excluyentes, no acumula.** Sin marcar
  se ven los activos; marcado, SOLO los inactivos. En la consulta es
  `eq(tabla.activo, inactivos ? false : true)` — **nunca**
  `inactivos ? undefined : eq(activo, true)`, que es no poner condición y
  devuelve todo. Ese fue un bug real (2026-09-21) en Materiales y en Personal:
  al reactivar una fila seguía a la vista, porque la consulta la seguía
  trayendo. La etiqueta tiene que decir "Ver solo…" y no "Mostrar…": con
  "Mostrar" el usuario espera que se sumen a los activos, y entonces la
  pantalla contradice a la consulta hagas lo que hagas.
- **Un solo buscador para varias columnas**, no una caja por campo: quien busca
  escribe lo que recuerda sin saber en qué columna cae. Se resuelve con
  `or(ilike(...))` en el servidor (ver la sección Tablas y listas). En
  Materiales cubre `codigo_interno`, `descripcion`, `marca` y `modelo`, y
  deja fuera `unidad` —un puñado de valores repetidos que traería medio
  catálogo— y `codigo_fabrica`.
  **Una columna buscable puede vivir en otra tabla**: Lista de precios busca
  en `codigo_oferta`, `proveedor` y la `descripcion` del material, que sale
  del `innerJoin` contra `materiales` que la consulta ya hacía para pintarla.
  Eso no es un caso especial del buscador, es la razón de que el filtro se
  resuelva en la consulta y no en memoria. Fuera quedan los números
  (`cantidad`, `precio_lista`, `descuento`): una coincidencia parcial donde
  "150" casa con 1.50, 150 y 2150 no ayuda a nadie.
- El reparto de archivos del módulo es el de siempre (`schema.ts`, `tipos.ts`,
  `queries.ts`, `actions.ts`, `filtros.ts`, `components/`). **Ya NO hay un
  `components/use-filtros.ts` por módulo**: la navegación de los filtros la pone
  `useFiltrosListado` de `core/use-filtros-listado.ts`, y lo propio del módulo
  —qué campos lleva y cómo se escriben en la URL— sigue en su `filtros.ts`
  (`urlListado`, que se le pasa al hook como segundo argumento). Un listado
  nuevo NO escribe ese archivo: importa el hook.

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
