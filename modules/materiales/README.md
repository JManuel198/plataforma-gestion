# modules/materiales/

Primer catálogo maestro construido de los cinco que declara el menú
(Materiales, Lista de precios, Servicios, Tarifario de personal, EPPs).
Los otros cuatro ya están construidos también, cada uno en su propio
módulo: `modules/lista-precios/`, `modules/servicios/`,
`modules/tarifario-personal/` y `modules/epps/`.

**La mayoría de sus campos sigue sin confirmar con el cliente** — ver
`docs/spec/entidades.md` y la sección "Catálogos maestros" de
`docs/spec/preguntas-abiertas.md`. Por eso aquí no hay reglas de negocio
inventadas: ni catálogo cerrado de unidades ni obligatoriedad en la base.
Solo "requerido" en el formulario donde el propio campo lo hace evidente.

Dos cosas SÍ están confirmadas y ya aplicadas:
- **`codigo_interno` se genera solo.** Formato `MAT.0000001`, reservado con
  el correlativo de `core/correlativo.ts` (ver `codigo.ts`); el usuario no lo
  escribe y el formulario no lo envía. El `UNIQUE` de la tabla se queda como
  red de seguridad del generador: si salta, `actions.ts` lo traduce en un
  mensaje general del formulario (no debajo de un campo, que ya no existe),
  porque significa que el contador y la tabla se descuadraron. (Decisión 11
  de "Catálogos maestros" en `preguntas-abiertas.md`.)
- **Como máximo 3 características técnicas por material.** La interfaz no
  ofrece una cuarta línea y `schema.ts` lo vuelve a validar en el servidor.
  (Ficha de Materiales en `docs/spec/entidades.md`.)

- `schema.ts` — validaciones Zod. Todo lo que llega del formulario pasa por
  aquí antes de tocar la base (regla 1 de AGENTS.md).
- `tipos.ts` — el tipo que consume el formulario para precargarse.
- `constantes.ts` — las constantes del código interno: prefijo `MAT`,
  dígitos, correlativo inicial y clave del contador.
- `codigo.ts` — arma el código visible (`formatearCodigoMaterial`: `1` →
  `MAT.0000001`) a partir del número reservado.
- `queries.ts` — lecturas: el listado paginado (`LIMIT`/`OFFSET`, con la
  paginación común de `core/paginacion.ts`), `contarResultados` (el «de N» del
  pie) y `contarMateriales` (el contador «42 materiales activos»).
- `actions.ts` — Server Actions de crear, editar, inactivar/reactivar
  (`cambiarActivoMaterial`) y el buscador de selección que usa Lista de
  precios (`buscarMaterialesParaSeleccionAction`). Verifican sesión.
- `filtros.ts` — los filtros del listado y cómo se escriben en la URL. Sin
  Drizzle, para que lo usen tanto el servidor como los controles cliente.
- `components/`:
  - `tabla-materiales.tsx` — el listado (servidor).
  - `fila-material.tsx` — una fila clicable con su modal.
  - `dialogo-material.tsx` — el modal de alta, consulta y edición.
  - `vista-material.tsx` — el modo "viendo" del modal, en solo lectura.
  - `campos-material.tsx` — los campos del formulario.
  - `caracteristicas-material.tsx` — el editor de características técnicas
    (tabla hija `material_caracteristicas`).
  - `acciones-material.tsx` — los iconos de la fila (editar, inactivar o
    reactivar).
  - `buscador-materiales.tsx` y `filtro-inactivos.tsx` — los filtros del
    listado: envoltorios finos de `BuscadorListado` y `FiltroSoloInactivos`
    (core/components/), a los que pasan la `urlListado` de este módulo.

Tabla en `db/schema/materiales.ts`. Pantalla en
`app/(protegido)/materiales/page.tsx` — ruta plana a propósito: el encabezado
"Catálogos maestros" del menú es solo una etiqueta y nunca entra en la URL
(ver la convención en AGENTS.md).

**Parte 2 (hecha):** buscador, filtro de inactivos y las dos acciones de
fila. La fila sigue el patrón compartido de `core/fila-clicable.tsx`: clic en
la fila abre la vista de solo lectura y, desde ahí, se pasa a editar en el
mismo modal. Además lleva dos iconos (lápiz para ir directo a editar, equis
para inactivar) dentro de `SinPropagacion`, y ninguna lupa de detalle porque
ese papel ya lo cumple la fila. Los otros cuatro catálogos usan la misma fila
clicable; en los iconos, Lista de precios y Tarifario de personal (con
`activo`) llevan los dos, y Servicios y EPPs (sin `activo`) solo el lápiz.
Está documentado en `.claude/skills/shadcn-conventions/SKILL.md`,
secciones "Fila clicable → vista → editar" y "Catálogos maestros"; si
cambias algo aquí, cámbialo también allí.

El escape de comodines del buscador ya no vive aquí: `patronParcial()` se
movió a `core/busqueda.ts` y lo importan los siete listados. Si añades una
búsqueda nueva, impórtalo de ahí — nunca lo copies otra vez.
