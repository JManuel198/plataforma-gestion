---
name: lista-precios-tabla
description: Diseño de lista_precios (Bloque 13, Parte 1, 2026-09-22) — por qué precio no es columna, FK a materiales, correlativo genérico por ámbito
metadata:
  type: project
---

Segundo catálogo maestro con tabla real, después de [[materiales_tabla]].
Archivos: `db/schema/lista-precios.ts` y `db/schema/moneda.ts` (nuevo,
`monedaEnum` movido fuera de `orden-trabajo.ts`). **Migración real:
`0012_fat_lionheart.sql`** — un `CREATE TABLE lista_precios` con su UNIQUE de
`codigo_oferta`, el CHECK de `descuento`, la FK a `materiales` y dos índices.
No crea la tabla `correlativo`.

**Corregido el 2026-09-24 — esta nota contradecía al repositorio.** Decía
que la migración era `0010_many_psylocke.sql` (generada, no aplicada) y que
en ella nacía la tabla `correlativo` con PK `ambito`. Nada de eso existe:
`0010` es `0010_open_newton_destine.sql`, que crea `correlativo` con PK
`clave` (y quita `materiales.fecha_activacion`), tal como describe
[[correlativo_generico]]. Lo que pasó, según la deuda técnica de `AGENTS.md`:
Lista de precios se empezó sobre `main` mientras una rama sin fusionar
(`feature/fila-clicable-ot-y-materiales-caracteristicas`) ya había aplicado a
Neon su propia `correlativo`; la primera migración de Lista de precios chocó
con esa tabla, se fusionó la rama primero y la migración se regeneró encima,
ya como `0012`. Esta nota entró en el mismo commit que `0012`
(`0d1a3d4`), pero describía la versión anterior de la migración, y nadie la
contrastó con el archivo que se estaba commiteando.

**Confirmado el 2026-09-24:** `0012_fat_lionheart` está aplicada en Neon. Se comparó `drizzle.__drizzle_migrations` fila por fila con `db/migrations/meta/_journal.json`: las 16 entradas del journal tienen su fila, sin filas de más ni de menos, en el mismo orden, y en cada una coinciden `created_at` con el `when` del journal y `hash` con el SHA-256 del `.sql` (así que el archivo no se editó después de aplicarse). Esta en concreto es la fila `id` 13 (`created_at` `1790103389405`). La tabla `lista_precios`, además, se consultó en Neon el 2026-09-22 (ver [[unidad_texto_libre_unificado]]).

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
sin confirmar. Migración regenerada in-place en vez de apilar otra que la corrigiera —
criterio: mientras una migración no se aplicó a la base real, regenerarla es
más limpio que encadenar una que la corrige. `unidad` es `text`, NO pgEnum.
Al principio se restringía en el Zod a una lista cerrada; desde el
2026-09-22 es texto libre con sugerencias, y la lista (hoy siete valores)
vive en `core/unidades.ts` — ver [[unidad_texto_libre_unificado]]. El día que
se confirme una lista cerrada, pgEnum como `otEstadoEnum`, y en las dos
tablas a la vez.

**Correlativo `OFFT.0000001` (7 dígitos, global, sin año)** — reusa la
tabla `correlativo` que ya existía (creada en `0010`, PK `clave`, ver
[[correlativo_generico]]) con la clave `"lista_precios"`
(`CLAVE_CORRELATIVO_OFERTA` en `modules/lista-precios/constantes.ts`). No fue
el primer ámbito: el primero es `"materiales"`, y la lista de ámbitos vigente
está en la ficha "Correlativo genérico" de `docs/spec/entidades.md`.
`ot_correlativo` NO se plegó en esa tabla — deuda técnica documentada en el
propio comentario de `correlativo.ts` y en entidades.md: unificarlas exige
migración de DATOS (ot_correlativo ya tiene filas), y `drizzle-kit generate`
solo hace DDL. Ver [[ot_correlativo]] para el mecanismo original.

**Movimiento de `monedaEnum`:** de `orden-trabajo.ts` a `db/schema/moneda.ts`
propio, porque ahora dos tablas lo comparten. Verificado que el movimiento no
generó NINGÚN DDL en la migración (el enum sigue llamándose `moneda` en
Postgres) — solo reorganización de archivos TS. `MONEDAS` y los helpers de
dinero ya habían sido movidos a `core/monedas.ts` y `core/dinero.ts` por el
usuario antes de este bloque (no por mí).
