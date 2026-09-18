---
name: shadcn-conventions
description: Convenciones de formularios, tablas y componentes shadcn/ui para plataforma-gestion — Server Actions con useActionState + Zod en el servidor, tablas, filtros por URL, confirmación antes de desactivar, formato de fechas con dayjs y de montos en céntimos. Úsalo al construir cualquier pantalla CRUD (crear, editar, listar): Servicios, Órdenes de Trabajo, y las que sigan.
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
- Instalados hoy: `badge`, `button`, `card`, `dialog`, `input`, `label`,
  `select`, `sonner`, `table`, `textarea`. Cualquier otro hay que agregarlo.
- **No existe un primitivo `Form`/`FormField`/`Field` en este proyecto**, y no
  hace falta: el patrón de formulario es el de abajo, con `<form action={...}>`
  nativo. No lo instales para "seguir la convención de shadcn" — la convención
  de este proyecto es la que está documentada aquí.
- El estilo instalado es `base-nova`, así que los componentes de
  `components/ui/` envuelven **Base UI** (`@base-ui/react`), no Radix. Eso
  cambia dos cosas en la práctica: para que un botón sea un enlace se usa
  `render={<Link href="..." />}` (no `asChild`), y `Select` acepta `name` y
  publica un input oculto, así que funciona dentro de un `<form>` sin estado
  controlado.

## Formularios

**Patrón estándar: Server Action + `useActionState`, validado con Zod en el
servidor.** La referencia a copiar es
`modules/servicios/components/formulario-servicio.tsx` junto con
`modules/servicios/actions.ts` y `modules/servicios/schema.ts`.

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
  directo. Ver `exigirSesion()` en `modules/servicios/actions.ts`.
- Mientras el envío está en curso, el botón de submit se deshabilita con el
  tercer valor de `useActionState` (`disabled={enviando}`) — sin spinner
  custom.
- **Montos**: el input muestra el monto en decimal ("150.50") y el schema lo
  convierte a entero en céntimos con `.transform()` antes de que llegue a la
  base de datos (regla 2 de AGENTS.md). La conversión vive en el schema y en
  `modules/<entidad>/dinero.ts`, nunca repartida entre componentes, y nunca
  multiplicando por 100 en coma flotante. Para mostrar, se divide entre 100 de
  vuelta.
- **Campos automáticos** (fecha de creación, correlativos) no aparecen en el
  formulario ni en el schema de creación: los pone la base de datos o el
  backend.

## Tablas y listas

- `components/ui/table` para cualquier listado — nunca un grid armado con
  `<div>`.
- El filtro (por estado, por cliente) se resuelve en la **consulta del
  servidor**, no filtrando en el cliente un arreglo ya traído completo. El
  filtro vive en el `searchParams` de la URL, para que sea compartible y
  sobreviva un refresh. Ver `modules/servicios/components/filtro-estado.tsx`
  con `modules/servicios/queries.ts`.
- Todo valor que venga de `searchParams` se valida con Zod antes de usarse. El
  patrón es `.optional().catch(undefined)`: un parámetro inventado, repetido o
  ausente no debe reventar la pantalla, solo ignorarse.
- Lista vacía: un mensaje simple en un recuadro punteado, como el de
  `tabla-servicios.tsx` ("No hay servicios que mostrar."), sin skeletons ni
  spinners elaborados — es una herramienta interna de un solo usuario, no
  necesita ese nivel de pulido todavía.

## Acciones destructivas

- "Eliminar" casi nunca existe de verdad en este proyecto — es desactivar o
  mover a un estado final (`Rechazado`, `Finalizado`). No se borran filas que
  otra tabla pueda referenciar.
- Para confirmar antes de desactivar, usa `alert-dialog` — **todavía no está
  instalado**; agrégalo con `npx shadcn@latest add alert-dialog` la primera vez
  que haga falta. Nunca el `confirm()` nativo del navegador, que además bloquea
  la página.

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
  (`/servicios?aviso=creado`) y un Client Component lo dispara al montar y
  limpia el parámetro con `router.replace` para que un refresh no lo repita.
  El valor de `?aviso=` se valida con Zod como cualquier otro `searchParam`.
  Ver `modules/servicios/components/aviso-toast.tsx`.

## Estructura

- Todo componente de una entidad vive en `modules/<entidad>/components/`, junto
  a su `schema.ts` y `actions.ts` — nunca suelto en una carpeta compartida
  genérica.
- El módulo de Servicios es la referencia completa del reparto de archivos:
  `constantes.ts` (listas sin imports, seguras para el cliente), `dinero.ts`
  (conversión de montos), `schema.ts` (Zod), `estado-formulario.ts` (tipo del
  estado de `useActionState`), `actions.ts` (`"use server"`), `queries.ts`
  (lecturas) y `components/`.
- Las pantallas viven en `app/(protegido)/<entidad>/` y solo arman la página:
  leen datos con `queries.ts` y pasan la Server Action al formulario. La lógica
  no vive en `app/`.
