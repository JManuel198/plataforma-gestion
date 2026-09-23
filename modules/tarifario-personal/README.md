# Tarifario de personal (catálogo maestro)

Cuánto cuesta un cargo por periodo de tiempo. Cuarto catálogo maestro con
tabla real, después de Materiales, Lista de precios y Servicios (Bloque 15,
Parte 1 — esquema y CRUD; Parte 2 — buscador e inactivar/reactivar; las dos el
2026-09-23).

**No tiene ninguna relación con el módulo Personal, y eso es una decisión del
cliente, no un pendiente** (2026-09-23). El borrador original de `entidades.md`
preveía que el `cargo` de una persona se autocompletara contra este tarifario;
el cliente confirmó explícitamente que las dos tablas deben quedar
independientes. `personal.cargo` y `tarifario_personal.cargo` se llaman igual,
son los dos texto libre, y no hay FK ni validación cruzada en ninguna
dirección. Ver la decisión 1 de "Catálogos maestros" en
`docs/spec/preguntas-abiertas.md`.

## Qué hay aquí

| Archivo | Qué resuelve |
| --- | --- |
| `constantes.ts` | El formato del código `PRS.` (y el límite que asumen sus 4 dígitos), el ámbito del correlativo y `PATRON_COSTO`. No importa nada, así que viaja al cliente. |
| `codigo.ts` | `1` → `"PRS.0001"`. Solo formateo; quién decide el número es `core/correlativo.ts`. |
| `schema.ts` | Validación Zod, incluidos los dos esquemas de filtro y el del cambio de `activo`. Más estricto que la tabla, nunca al revés. |
| `filtros.ts` | El tipo `FiltrosTarifario`, `urlListado` y `hayFiltros` — la navegación por URL, sin Drizzle. |
| `queries.ts` | El listado con sus dos filtros combinados por AND, y la búsqueda de cargos para las sugerencias del modal. |
| `actions.ts` | Alta, edición, inactivar/reactivar y el envoltorio de la búsqueda de cargos. La reserva del correlativo va en la misma transacción que el INSERT. |
| `components/` | Tabla, fila clicable, modal de tres modos, vista de solo lectura, buscador, filtro de inactivos y las dos acciones de fila. La navegación de los filtros NO vive aquí: sale de `useFiltrosListado` (`core/use-filtros-listado.ts`), al que cada control le pasa el `urlListado` de `filtros.ts`. |

## Tres cosas que lo distinguen de sus hermanos

### 1. "Unidad" aquí NO es la unidad de los otros catálogos

El campo se llama igual que en Materiales, Lista de precios y Servicios, y la
columna también, pero la lista es otra: allí son **unidades físicas** (m, und,
pzs, cja, kg, lt, gal) y aquí son **periodos de tiempo** (hora, día, mes, año).

Por eso `PERIODOS_TARIFARIO` vive en `core/periodos.ts` y no como un export más
dentro de `core/unidades.ts`: los dos campos se pintan con el mismo componente
y se llaman igual en pantalla, así que la única defensa contra confundirlos es
que el import lo diga. Añadir "día" a `UNIDADES` —o "kg" aquí— no sería una
lista más completa, sería un vocabulario roto. La cabecera de `core/periodos.ts`
tiene la tabla comparativa completa.

Como en los otros tres catálogos, es **texto libre con sugerencias**: lo que no
esté en la lista se guarda igual. Los cuatro periodos no se han confirmado como
exhaustivos (¿por turno?, ¿por jornada?, ¿por semana?).

### 2. Dos campos con sugerencias, y cada uno usa un componente distinto

`cargo` y `unidad` están uno al lado del otro en el modal, los dos son texto
libre y los dos despliegan una lista mientras se escribe. Aun así no son el
mismo componente, y **lo que decide cuál va no es el aspecto sino de dónde
salen las sugerencias**:

| | `cargo` | `unidad` |
| --- | --- | --- |
| Componente | `CampoConSugerencias` | `CampoListaSugerida` |
| De dónde salen | `SELECT DISTINCT` en el servidor | una constante del código |
| Cuándo cambian | con cada tarifa que alguien crea | con un commit |
| Con el catálogo vacío | no sugiere nada | ofrece las cuatro opciones |

**La lista de cargos crece con el uso y nunca está "completa".** No existe un
catálogo cerrado de cargos válidos, así que el "catálogo" es literalmente lo ya
escrito en otras tarifas — mismo planteamiento que `proveedor` en Lista de
precios. La primera tarifa del sistema se escribe a pelo, sin sugerencias, y
tiene que ser así. Está registrado como decisión en
`docs/spec/preguntas-abiertas.md` por si alguna vez se plantea un catálogo de
cargos separado del tarifario.

La búsqueda **no filtra por `activo`**, a propósito: el cargo de una tarifa
inactivada sigue siendo un cargo real que se usó, y esconderlo provocaría el
tecleo divergente que las sugerencias vienen a evitar.

### 3. El código tiene CUATRO dígitos, no siete

`PRS.0001`, frente a `MAT.0000001`, `OFFT.0000001` y `SRV.0000001`. Es el
formato del encargo y encaja con el tamaño real del catálogo (los cargos de una
empresa son decenas), pero asume un límite que conviene conocer: el listado
ordena por `codigo`, que es texto, y eso equivale al orden numérico solo
mientras todos los códigos tengan el mismo ancho. Se cumple hasta `PRS.9999`;
`PRS.10000` tendría cinco dígitos y caería entre `PRS.0999` y `PRS.1000`.
Límite asumido, no bug. Ver `PREFIJO_TARIFA` en `constantes.ts`.

## Los dos buscadores de este módulo no son el mismo

Se parecen en pantalla y buscan sobre la misma tabla, así que conviene no
confundirlos:

| | `BuscadorTarifas` | `CampoConSugerencias` (campo Cargo) |
| --- | --- | --- |
| Qué hace | filtra la tabla: se ven menos filas | rellena un campo del formulario |
| Dónde vive el estado | `searchParams` (la URL) | estado local del modal |
| Qué columnas mira | `codigo`, `cargo`, `unidad` | solo `cargo`, con `DISTINCT` |
| Filtra por `activo` | sí — alterna entre activas e inactivas | **no**, a propósito |

Lo de `activo` es la diferencia que más fácil se rompe: el listado tiene que
respetar la vista elegida, pero las sugerencias no, porque el cargo de una
tarifa inactivada sigue siendo un cargo real que se usó y esconderlo provocaría
justo el tecleo divergente que las sugerencias vienen a evitar. Mismo criterio
que `buscarProveedores` en Lista de precios.

## El buscador incluye `unidad`, a diferencia de Materiales

Materiales y Lista de precios dejan `unidad` fuera de su buscador — "un puñado
de valores repetidos… traería medio catálogo". Aquí sí entra, junto con
`codigo` y `cargo`, y es deliberado por dos razones: esta tabla tiene TRES
columnas de texto en total, así que excluir una dejaría el buscador cubriendo
dos tercios del vocabulario; y aquí `unidad` discrimina de verdad, porque son
periodos de tiempo — buscar "mes" es la pregunta «¿qué cargos tengo tarifados
por mes?», no el "UND" que traería medio catálogo de Materiales. Mismo
razonamiento que llevó a Servicios a incluirla.

Los números (`costo`) y `moneda` quedan fuera: "150" casando con 1.50, 150 y
2150 no ayuda a nadie, y con dos monedas buscar "PEN" parte la tabla por la
mitad sin responder nada.

## Inactivar y reactivar

Regla invariable 9: nada se borra, se desactiva. `cambiarActivoTarifa` es una
Server Action **propia y mínima** que escribe solo la columna `activo` — nunca
`editarTarifaEnModal`, que sobrescribiría campos que el listado ni siquiera
muestra.

**Inactivar se confirma con `alert-dialog`; reactivar no.** Inactivar saca la
tarifa del tarifario vigente y se confunde con borrar; reactivar no destruye ni
esconde nada, y confirmarlo también entrenaría a aceptar sin leer, que es lo que
dejaría el otro aviso sin valor.

**El botón de inactivar es lo que obliga a tener el filtro "Ver solo
inactivos"** (esa etiqueta exacta, nunca "Mostrar inactivos"). Sin él la fila
desaparecería sin vuelta atrás posible desde la interfaz y el botón de reactivar
no tendría cómo mostrarse nunca. El filtro **alterna entre dos vistas
excluyentes** (`eq(activo, inactivos ? false : true)`), nunca
`inactivos ? undefined : eq(activo, true)` — ese fue un bug real en Materiales y
Personal (deuda técnica de `AGENTS.md`, 2026-09-21), donde la vista de inactivos
devolvía también las activas.

## Lo que falta

Nada planeado. El módulo tiene ya lo que tienen Materiales y Lista de precios:
CRUD, buscador, fila clicable → vista → editar, y baja lógica con su filtro.

Lo que sigue abierto no es trabajo pendiente sino preguntas al cliente: si los
cargos merecen un catálogo propio separado del tarifario (decisión 19) y si los
cuatro periodos de `PERIODOS_TARIFARIO` son exhaustivos (decisión 20), las dos
en `docs/spec/preguntas-abiertas.md`.
