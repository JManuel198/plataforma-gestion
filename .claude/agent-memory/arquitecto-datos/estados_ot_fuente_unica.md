---
name: estados-ot-fuente-unica
description: ESTADOS_OT y MONEDAS unificados en una sola fuente (623a659, 2026-09-19) — db/schema importa los arrays en vez de declararlos; MONEDAS se mudó después a core/monedas.ts (2026-09-22)
metadata:
  type: project
---

**Corregido el 2026-09-24.** La versión anterior de esta nota decía que solo
se había unificado `ESTADOS_OT`, que `MONEDAS` quedaba "deliberadamente sin
tocar" con el mismo problema, que `_monedaCoincide` seguía vivo y que había
"6 estados". Contra el repositorio, las cuatro cosas eran falsas: el commit
`623a659` (2026-09-19), el mismo que creó esta nota, unificó las DOS listas y
eliminó los DOS chequeos; y hoy son 7 estados. También enlazaba a una nota
`monedas-sigue-duplicada` que no existe. Lo de abajo está verificado contra
`git show 623a659` y el código actual.

**Qué hizo `623a659`.** Antes, `ESTADOS_OT` y `MONEDAS` vivían como array
literal `as const` en dos archivos a la vez: `db/schema/orden-trabajo.ts` y
`modules/ordenes-trabajo/constantes.ts`. Desde ese commit, `constantes.ts` es
la única fuente de los dos y `db/schema/orden-trabajo.ts` los importa para
construir `pgEnum("ot_estado", ESTADOS_OT)` y `pgEnum("moneda", MONEDAS)`.

**Por qué así y no al revés:** decisión ya tomada por el usuario al pedir la
tarea, no discutida — `constantes.ts` no importa nada (ni siquiera Drizzle),
porque tiene que viajar al cliente sin arrastrar la conexión a la base de
datos. Es `db/schema/` quien depende de `modules/`, nunca al revés. No hay
ciclo.

**Los chequeos de compilación.** `_estadoCoincide` y `_monedaCoincide`, en
`modules/ordenes-trabajo/schema.ts`, se eliminaron los dos en ese mismo
commit: con una sola lista ya no hay nada que atar. El comentario que los
sustituye explica además que ni siquiera cubrían el caso peligroso (un valor
que faltara respecto al enum de la base).

**Migración:** ninguna. El enum de Postgres quedó bit a bit igual; solo cambió
de dónde sale el array en TypeScript.

**Después (2026-09-22, Bloque 13 Parte 1, commit `0d1a3d4`):** `MONEDAS` se
mudó a `core/monedas.ts` (y los helpers de dinero a `core/dinero.ts`) porque
un segundo módulo, Lista de precios, necesitaba el mismo enum — regla de
`AGENTS.md`: lo que comparten dos módulos sube a `core/`. Yo
(arquitecto-datos) separé además `monedaEnum` a su propio
`db/schema/moneda.ts`, porque desde entonces lo usan varias tablas. Verificado
en su momento que ese movimiento no generó DDL. `ESTADOS_OT` se quedó en
`modules/ordenes-trabajo/constantes.ts`: solo lo usa la OT. Ver
[[lista-precios-tabla]].

**Estado al escribir (2026-09-24), verificar antes de usar:** `ESTADOS_OT`
tiene 7 valores — Pendiente, Aceptada, En ejecución, Pausada, Finalizada,
Facturado, Cancelada. `Aceptada` entró el 2026-09-20 (commit `b2e356e`,
migración `0007_kind_thunderbolts.sql`). No copies el número de aquí:
cuéntalo en `modules/ordenes-trabajo/constantes.ts`.

Ver también [[fusion-servicio-ot]] (de donde salió la lista original) y
[[feedback_generar_no_aplicar]].
