# EPPs (catálogo maestro)

Catálogo de equipos de protección personal, con su precio. **Quinto y
último** de los cinco catálogos maestros que declara el menú (Bloque 11) en
tener tabla real, después de Materiales, Lista de precios, Servicios y
Tarifario de personal (Bloque 16, Parte 1, 2026-09-23; buscador de texto en
la Parte 2, mismo bloque y misma fecha). Con él ninguna de las cinco rutas
del menú es ya un placeholder.

## Qué hay aquí

| Archivo | Qué resuelve |
| --- | --- |
| `constantes.ts` | El formato del código `EPP.` (6 dígitos) y el ámbito del correlativo. No importa nada, así que viaja al cliente. |
| `codigo.ts` | `1` → `"EPP.000001"`. Solo formateo; quién decide el número es `core/correlativo.ts`. |
| `schema.ts` | Validación Zod, incluido el esquema del filtro de búsqueda. Más estricto que la tabla, nunca al revés. |
| `filtros.ts` | El tipo `FiltrosEpps` (con `pagina`), `urlListado` y `contarFiltros` — la navegación por URL, sin Drizzle. |
| `queries.ts` | El listado paginado (`LIMIT`/`OFFSET`), con su búsqueda resuelta en la consulta, y `contarResultados` (el «de N» del pie; sin filtros, el total del contador). También documenta por qué este módulo no tiene `tipos.ts`. |
| `actions.ts` | Alta y edición. La reserva del correlativo va en la misma transacción que el INSERT. |
| `components/` | Tabla, fila clicable, modal de tres modos, vista de solo lectura y buscador. |

**El hook de navegación de los filtros NO está aquí, y es lo importante de
la Parte 2.** `useFiltrosListado` se importa de `core/use-filtros-listado.ts`;
EPPs es el **séptimo** listado que lo usa y el primero que nace con él ya
unificado. Los seis anteriores tuvieron cada uno su `components/use-filtros.ts`
idéntico hasta que se fundieron el 2026-09-23 — la deuda técnica de AGENTS.md
cuenta por qué se dejó llegar a seis copias y por qué no debe haber una
séptima. Lo propio de este módulo es `FiltrosEpps` y `urlListado`, que es justo
lo que el hook recibe como segundo argumento.

## Tres cosas que distinguen a este módulo de sus hermanos

1. **El correlativo usa SEIS dígitos** (`EPP.000001`), un ancho propio: `MAT.`,
   `OFFT.` y `SRV.` usan 7 y `PRS.` usa 4. La tabla `correlativo` no impone
   ninguno — el ancho es una constante por ámbito. Con `padStart(6, "0")` el
   orden alfabético del código coincide con el numérico hasta `EPP.999999`;
   pasado ese techo divergirían, igual que le pasa a `PRS.` a partir de
   `PRS.9999`. Se acepta a propósito.
2. **`unidad` es la lista FÍSICA, no la de periodos.** Usa `core/unidades.ts`
   (m, und, pzs, cja, kg, lt, gal), la misma que Materiales, Lista de precios
   y Servicios — **no** `core/periodos.ts` (hora, día, mes, año), que es lo
   que usa el Tarifario de personal en su campo del mismo nombre. Las dos
   columnas se llaman `unidad` y las dos son `text`, así que nada en el tipo
   avisaría de la confusión: es el error fácil al copiar del catálogo de al
   lado. Y es texto libre con sugerencias, no un `Select` (decisión 12 de
   "Catálogos maestros", cerrada el 2026-09-22).
3. **No hay columna `activo`, así que no hay inactivar ni reactivar** — y por
   tanto tampoco equis en la fila, ni filtro «Ver solo inactivos», ni dato
   "Situación" en la vista. Es el segundo catálogo sin ella después de
   Servicios, **pero por un motivo distinto, y la diferencia conviene no
   perderla**: en Servicios la columna falta porque inactivar está sin
   confirmar con el cliente (decisión 16, pregunta abierta — podría llegar).
   Aquí el encargo dice directamente que la baja lógica **no aplica** a este
   catálogo. Mismo resultado en la tabla, motivo distinto.

## El buscador cubre las tres columnas de texto

`codigo`, `descripcion` y `unidad`, ninguna fuera — misma decisión que
Servicios y Tarifario de personal, y por el mismo motivo: con solo tres
columnas de texto en total, excluir una dejaría el buscador cubriendo dos
tercios del vocabulario. `precio` y `moneda` quedan fuera, como en el resto
de catálogos.

**Ojo al copiar el argumento de Tarifario, que aquí no encaja del todo.**
Allí `unidad` son periodos de tiempo y discrimina de verdad («¿qué cargos
tengo tarifados por mes?»); aquí es la lista física (und, par, cja…) y se
parece más al caso de Materiales, donde un "und" repetido trae media tabla.
Entra igualmente porque con tres columnas el coste de incluirla es un
resultado ancho de vez en cuando, y el de excluirla es que el usuario no
encuentre lo que sí escribió. Si el catálogo crece y "und" se vuelve ruido,
sacarla es quitar un `ilike` de `queries.ts` y una palabra del `placeholder`.

## `precio` es un dato directo, no derivado

Igual que en Servicios, y esa es la diferencia de fondo con Lista de precios,
donde `precio` no existe como columna porque se calcula a partir de
`precio_lista` y `descuento`. Aquí es el precio del equipo: un solo número
que alguien fija, guardado en céntimos como entero (regla invariable 2).
