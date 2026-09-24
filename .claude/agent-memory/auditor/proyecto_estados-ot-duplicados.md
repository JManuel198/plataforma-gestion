---
name: proyecto-estados-ot-duplicados
description: RESUELTO — ESTADOS_OT (y MONEDAS) estuvieron duplicados entre db/schema/ y modules/ordenes-trabajo/ tras la fusión Servicio+OT; se unificaron en 623a659 (2026-09-19). Queda como lección, no como deuda
metadata:
  type: project
---

**RESUELTO en el commit `623a659` (2026-09-19), el mismo que creó esta nota.**
Hasta el 2026-09-24 esta nota seguía describiendo la duplicación como vigente;
se corrigió verificándola contra `git show 623a659` y el código actual.

**Qué pasaba.** Tras la fusión Servicio+OT (`7ca1e37`), `ESTADOS_OT` y `MONEDAS`
estaban escritos como array literal en dos sitios: `db/schema/orden-trabajo.ts`
(de donde salen los enums reales de PostgreSQL) y
`modules/ordenes-trabajo/constantes.ts` (de donde salen el Zod y las opciones
de los `Select`). Los chequeos de compilación `_estadoCoincide` y
`_monedaCoincide` solo detectaban un valor inventado de más en `constantes.ts`,
no uno que faltara respecto al enum de la base.

**Cómo quedó.** `constantes.ts` es la única fuente y `db/schema/` importa de ahí
(la dirección es esa, y no al revés, porque `constantes.ts` viaja al cliente y
no puede arrastrar Drizzle). Los dos chequeos se eliminaron. Después, el
2026-09-22, `MONEDAS` se mudó a `core/monedas.ts` y su `pgEnum` a
`db/schema/moneda.ts`, porque la comparten varias tablas; `ESTADOS_OT` sigue en
el módulo de OT.

**Cómo aplicar hoy:** si un cambio toca `ESTADOS_OT`/`ot_estado` o `MONEDAS`,
comprobar que `db/schema/` sigue importando el array en vez de redefinirlo — que
no reaparezca un segundo literal. Es una comprobación de regresión, no una
deuda abierta.

**La lección que sí sigue viva:** la nota se escribió describiendo el estado de
antes del commit y nadie la releyó después. Un "X sigue duplicado" guardado en
memoria caduca solo; se verifica contra el código antes de reportarlo como
hallazgo.

**Estado al escribir (2026-09-24), verificar antes de usar:** `ESTADOS_OT` tiene
7 valores (Pendiente, Aceptada, En ejecución, Pausada, Finalizada, Facturado,
Cancelada). La versión anterior de esta nota decía 6: `Aceptada` entró el
2026-09-20 (`b2e356e`). Cuéntalos en `modules/ordenes-trabajo/constantes.ts`,
no aquí.

Ver también [[proyecto-patrones-establecidos]] y
[[proyecto-checkpoint-migracion-pendiente]] (mismo tipo de deuda: documentación
o memoria que queda desactualizada sin que ninguna herramienta avise).
