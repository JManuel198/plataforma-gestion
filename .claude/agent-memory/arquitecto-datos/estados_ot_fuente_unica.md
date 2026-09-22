---
name: estados-ot-fuente-unica
description: ESTADOS_OT unificado (2026-09-19) — db/schema/orden-trabajo.ts ahora importa el array desde modules/ordenes-trabajo/constantes.ts en vez de declararlo dos veces; MONEDAS queda deliberadamente sin tocar con el mismo problema
metadata:
  type: project
---

El 2026-09-19 se eliminó la duplicación literal de `ESTADOS_OT` (los 6
estados de la OT). Antes vivía como array `as const` idéntico en dos
archivos; ahora `modules/ordenes-trabajo/constantes.ts` es la única fuente y
`db/schema/orden-trabajo.ts` importa `ESTADOS_OT` de ahí
(`@/modules/ordenes-trabajo/constantes`) para construir
`pgEnum("ot_estado", ESTADOS_OT)`.

**Por qué así y no al revés:** decisión ya tomada por el usuario al pedir la
tarea, no discutida — `constantes.ts` sigue sin importar nada (ni siquiera
ahora Drizzle), porque necesita viajar al cliente sin arrastrar la conexión a
la base de datos. Es `db/schema/` quien depende de `modules/`, nunca al
revés. No hay ciclo: `constantes.ts` → nada; `db/schema/orden-trabajo.ts` →
`constantes.ts`.

**Consecuencia en el chequeo de compilación:** `_estadoCoincide` en
`modules/ordenes-trabajo/schema.ts` se eliminó (ya no puede haber divergencia
si solo hay una lista). `_monedaCoincide` se mantuvo intacto — ver
[[monedas-sigue-duplicada]] — y su comentario ahora aclara explícitamente que
solo aplica a `MONEDAS`, para que nadie lea "el chequeo de al lado" y crea
que también cubre `estado`.

**Migración:** `npx drizzle-kit generate` dio "No schema changes, nothing to
migrate" — el enum de Postgres es bit a bit igual, solo cambió de dónde viene
el array en TypeScript. No hizo falta generar ni aplicar nada.

**RESUELTO (2026-09-22, Bloque 13 Parte 1):** `MONEDAS` ya no está duplicada.
El usuario la movió a `core/monedas.ts` (junto con los helpers de dinero a
`core/dinero.ts`) antes de pedir la tabla `lista_precios` — segundo módulo
que necesita el enum, así que aplicó la regla ya anotada en la deuda técnica
de AGENTS.md ("si un segundo módulo necesita un enum compartido, mover a
core/"). Yo (arquitecto-datos) separé además `monedaEnum` de
`orden-trabajo.ts` a su propio `db/schema/moneda.ts`, porque ahora dos
TABLAS (`orden_trabajo` y `lista_precios`) lo usan — verificado que ese
movimiento no genera ningún DDL nuevo (el tipo en Postgres se queda igual).
Ver [[lista-precios-tabla]].

Ver también [[fusion-servicio-ot]] (de donde salió `ESTADOS_OT` con sus 6
valores) y [[feedback_generar_no_aplicar]].
