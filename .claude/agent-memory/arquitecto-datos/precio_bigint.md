---
name: precio-bigint
description: Por qué la columna precio es bigint con mode "number" y cómo se fijó PRECIO_MAXIMO_CENTIMOS (decidido en servicio.precio, hoy vive en orden_trabajo.precio)
metadata:
  type: project
---

La columna de dinero pasó de `integer` a `bigint` el 2026-09-18 (migración
`db/migrations/0002_fair_franklin_storm.sql`). Se decidió sobre
`servicio.precio`; esa tabla se eliminó el 2026-09-19 al fusionarse Servicio
y OT, y la columna se conservó tal cual en **`orden_trabajo.precio`** (ver
[[fusion-servicio-ot]]). Todo lo de abajo sigue vigente, solo cambió dónde
vive. Resuelve el supuesto 3 de `docs/spec/preguntas-abiertas.md`.

**Decisión de modelado: `bigint("precio", { mode: "number" })`, no
`mode: "bigint"`.**

Por qué: todo el código existente (`modules/ordenes-trabajo/dinero.ts`,
`schema.ts`, el formulario) trabaja con `number` de JS. Usar
`mode: "bigint"` habría obligado a propagar `BigInt` por `aCentimos`,
`aMontoDecimal`, `formatearMonto`, el JSX del formulario y cualquier
`JSON.stringify` en las acciones (BigInt no es serializable a JSON sin
un replacer). `mode: "number"` mapea a la clase interna `PgBigInt53` de
Drizzle — el propio nombre confirma que el límite real deja de ser el de
Postgres (2^63-1) y pasa a ser `Number.MAX_SAFE_INTEGER` (2^53-1).

**`PRECIO_MAXIMO_CENTIMOS` (en `modules/ordenes-trabajo/schema.ts`, NO en
`constantes.ts` — el usuario tiende a asumir que está en `constantes.ts`,
verificar siempre antes de asumir) se fijó en `99_999_999_999_999`, no en
`Number.MAX_SAFE_INTEGER` directamente.**

Por qué: la regex de `montoSchema` (`/^\d{1,12}([.,]\d{1,2})?$/`) ya limita
el monto que el usuario puede escribir a 12 dígitos enteros + 2 decimales.
El máximo que esa regex puede producir en céntimos es exactamente
`99_999_999_999_999` (= 999 999 999 999.99 de monto). Si se sube
`PRECIO_MAXIMO_CENTIMOS` por encima de eso (p.ej. a `Number.MAX_SAFE_INTEGER`
directamente) sin tocar la regex, la regex — no la constante — pasa a ser el
límite efectivo: el usuario nunca llega a ver el mensaje amigable del
`refine` ("El precio no puede pasar de X"), sino el mensaje genérico de
formato, y ese mensaje genérico no dice cuál es el techo real. Verificado
con ejecución real (`node --experimental-strip-types` sobre una copia de
`dinero.ts` en el scratchpad, reescribiendo el import de `Moneda` a un tipo
local para no pelear con el resolver de `@/`): `aCentimos("999999999999.99")
=== 99_999_999_999_999` exacto, ida y vuelta con `aMontoDecimal` exacta, y
margen de ~89x frente a `Number.MAX_SAFE_INTEGER` (sin riesgo de pérdida de
precisión en la conversión string→céntimos).

**Regla general si esto se vuelve a tocar:** el techo de dígitos de la regex
de `montoSchema` y `PRECIO_MAXIMO_CENTIMOS` son el mismo límite expresado de
dos formas (patrón de texto vs. número) — nunca se cambia uno sin el otro.

La tabla `servicio` tenía 0 filas al momento del cambio, así que no hubo
riesgo de pérdida de datos con este `ALTER COLUMN ... SET DATA TYPE bigint`.
