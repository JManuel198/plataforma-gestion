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

**Deliberadamente NO tocado:** `MONEDAS` sigue duplicada igual que antes
(mismo patrón, mismos dos archivos, mismo chequeo parcial). El usuario pidió
explícitamente no tocarla en esta tarea y solo reportar que tiene el mismo
problema — queda pendiente para una tarea aparte si decide unificarla
también.

Ver también [[fusion-servicio-ot]] (de donde salió `ESTADOS_OT` con sus 6
valores) y [[feedback_generar_no_aplicar]].
