---
name: proyecto-checkpoint-migracion-pendiente
description: Qué revisar cuando se audita un checkpoint con una migración de Drizzle generada pero aún no aplicada contra la base de datos real
metadata:
  type: project
---

Patrón visto el 2026-09-18 auditando el cambio de `servicio.precio` de
`integer` a `bigint` (migración `0002_fair_franklin_storm.sql` generada, no
aplicada — confirmado contra Neon por el usuario). En este tipo de checkpoint
la desincronización entre el esquema de Drizzle y la BD real es intencional
y no es en sí un hallazgo, pero sí hay que revisar dos ventanas de riesgo
reales:

- **Antes de aplicar la migración**: si el schema de Zod ya valida un rango
  más amplio que el que la columna real todavía acepta (ej. `bigint` en
  Drizzle pero `integer` en Postgres), un INSERT/UPDATE con un valor dentro
  del rango nuevo pero fuera del viejo revienta con un error crudo de
  Postgres ("value out of range for type integer") en vez de un mensaje de
  Zod. Vale la pena decirlo explícitamente aunque no sea una violación de
  regla — es justo el tipo de cosa que un checkpoint pre-aplicación necesita
  saber.
- **Después de aplicar la migración**: para `bigint` con `mode: "number"`,
  confirmar en `node_modules/drizzle-orm/pg-core/columns/bigint.*`
  (`PgBigInt53.mapFromDriverValue`) que la lectura convierte con `Number()`
  tanto si el driver `pg` devuelve el valor como string (comportamiento
  default para OID 20) como si lo devuelve como number — así que no hace
  falta un type parser custom en `db/index.ts` para que la lectura funcione,
  siempre que el valor se mantenga por debajo de `Number.MAX_SAFE_INTEGER`.

Ver también [[proyecto-patrones-establecidos]] para el precedente de
`bigint` + `mode: "number"` como forma aceptada de subir un techo de dinero
sin arrastrar `BigInt` por el resto del código.

**Ojo con documentación normativa que queda desactualizada por este tipo de
cambio**: `.claude/agents/arquitecto-datos.md` seguía diciendo "los montos se
guardan como `integer`" después de que `servicio.precio` pasara a `bigint`
por una necesidad real de negocio — nadie actualizó esa línea en el mismo
commit. Revisar ese archivo (y `.claude/skills/*/SKILL.md`) en cada auditoría
que toque un tipo de columna de dinero, no solo `docs/spec/`.
