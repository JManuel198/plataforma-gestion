---
name: lista-precios-tabla
description: Diseño de lista_precios (Bloque 13, Parte 1, 2026-09-22) — por qué precio no es columna, FK a materiales, correlativo genérico por ámbito
metadata:
  type: project
---

Segundo catálogo maestro con tabla real, después de [[materiales_tabla]].
Archivos: `db/schema/lista-precios.ts`, `db/schema/correlativo.ts`,
`db/schema/moneda.ts` (nuevo, `monedaEnum` movido fuera de
`orden-trabajo.ts`). Migración `0010_many_psylocke.sql` (generada, NO
aplicada — pendiente de confirmación del usuario).

**`precio` no es columna, se deriva:** `precio_lista × (1 − descuento/100)`,
calculado siempre en `modules/lista-precios/` (backend). Mismo principio que
`edad` en Personal. Resuelve decisión 4 de "Catálogos maestros" en
preguntas-abiertas.md.

**`material_id` es FK real (NOT NULL, sin onDelete → NO ACTION por
defecto)**, no texto libre. Resuelve decisión 3. Es la FK que hace real el
aviso ya escrito en el comentario de `cambiarActivoMaterial`
(modules/materiales/actions.ts) sobre filas de precios señalando un material
inactivado.

**Tipos elegidos:** `cantidad` numeric(14,3) mode string (fracciones de m/kg),
`descuento` numeric(5,2) mode string DEFAULT '0' NOT NULL con CHECK 0-100 (a
diferencia de `fecha_activacion` de Materiales, aquí el rango SÍ vino dado
explícito en el encargo). `precio_lista` bigint mode number idéntico a
`orden_trabajo.precio`.

**`descuento` es NOT NULL — corrección pedida por el coordinador tras la
primera versión (que lo dejó nullable como el resto).** Motivo: a diferencia
de `proveedor`/`unidad`/`cantidad`/`precio_lista` donde NULL = "no sé" es
legítimo, en `descuento` "sin descuento" ya tiene representación exacta (`0`)
— dejarlo nullable crea dos formas de decir lo mismo. Y como `precio` se
DERIVA de `descuento`, NULL ahí no es "desconocido" sino "incalculable"
(forzaría un `?? "0"` en el cálculo). Mismo criterio que `activo` NOT NULL en
Materiales: lo exige el comportamiento de la tabla, no una regla de negocio
sin confirmar. Migración regenerada in-place (0010, no se había aplicado
todavía) en vez de apilar una 0011 — criterio: mientras una migración no se
aplicó a la base real, regenerarla es más limpio que encadenar una que la
corrige. `unidad` es `text`, NO pgEnum — la lista de
6 valores (m/und/pzs/cja/kg/lt) es borrador sin confirmar, vivirá en
`modules/lista-precios/constantes.ts`; el día que se confirme, pgEnum como
`otEstadoEnum`.

**Correlativo `OFFT.0000001` (7 dígitos, global, sin año)** — tabla nueva
`correlativo` (PK `ambito` text, no `anio` int), mismo upsert atómico que
`ot_correlativo` pero generalizado. Ámbito único hoy: `"lista_precios"`.
`ot_correlativo` NO se plegó en esta tabla — deuda técnica documentada en el
propio comentario de `correlativo.ts` y en entidades.md: unificarlas exige
migración de DATOS (ot_correlativo ya tiene filas), y `drizzle-kit generate`
solo hace DDL. Ver [[ot_correlativo]] para el mecanismo original.

**Movimiento de `monedaEnum`:** de `orden-trabajo.ts` a `db/schema/moneda.ts`
propio, porque ahora dos tablas lo comparten. Verificado que el movimiento no
generó NINGÚN DDL en la migración (el enum sigue llamándose `moneda` en
Postgres) — solo reorganización de archivos TS. `MONEDAS` y los helpers de
dinero ya habían sido movidos a `core/monedas.ts` y `core/dinero.ts` por el
usuario antes de este bloque (no por mí).
