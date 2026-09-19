---
name: fusion-servicio-ot
description: Fusión de Servicio en Orden de Trabajo (2026-09-19) — por qué la tabla servicio desapareció, dónde quedó moneda, y el bug de orden de sentencias que dejó drizzle-kit en la migración 0004
metadata:
  type: project
---

El 2026-09-19 el cliente confirmó que Servicio y Orden de Trabajo son la
misma entidad para él. `orden_trabajo` absorbió todo: `codigo_revision`
(pasó de `NOT NULL` en Servicio a nullable en OT, mismo criterio que
`codigo_oc`), `precio`/`moneda` (mismo patrón bigint que [[precio-bigint]],
ambos `NOT NULL`) y `comentarios`. Se eliminó `servicio_id` (y su FK
`ON DELETE RESTRICT`) y la tabla `servicio` completa (0 filas). El enum
`moneda` se movió de `servicio.ts` a `orden-trabajo.ts` porque ahí es donde
ahora vive quien lo usa.

**Por qué:** decisión de negocio del cliente, no técnica — para él nunca
fueron dos cosas. Documentado como fuente en
`docs/spec/preguntas-abiertas.md`, sección "Fusión Servicio + OT
(2026-09-19)".

**Enum de estado — drizzle-kit hizo algo mejor de lo esperado.** La tarea
pedía "recrear el tipo" (DROP/CREATE) para pasar de 5 a 6 estados. Como los
5 valores viejos son subconjunto ordenado de los 6 nuevos (solo se inserta
`Facturado` antes de `Cancelada`), drizzle-kit generó
`ALTER TYPE "ot_estado" ADD VALUE 'Facturado' BEFORE 'Cancelada'` en vez de
recrear el tipo. Es correcto y más seguro (Postgres 12+ permite `ADD VALUE`
dentro de una transacción mientras no se use el valor nuevo en la misma
transacción) — no es un defecto, solo diverge de lo que se esperaba en la
instrucción original. Si el próximo cambio de estados SÍ elimina un valor
existente, ahí sí hace falta recrear el tipo (y solo es seguro si ninguna
fila usa ese valor).

**Bug real encontrado en la migración generada originalmente en un solo
archivo (0004_pink_sir_ram.sql, descartado) — IMPORTANTE para la próxima vez
que se fusione un DROP TABLE con un DROP CONSTRAINT explícito en la misma
migración:** drizzle-kit ordenó las sentencias así:
1. `DROP TABLE "servicio" CASCADE` (esto ya elimina en cascada la FK
   `orden_trabajo_servicio_id_servicio_id_fk`, porque CASCADE en DROP TABLE
   se lleva también los FK de otras tablas que apuntan a la tabla borrada)
2. `ALTER TABLE "orden_trabajo" DROP CONSTRAINT
   "orden_trabajo_servicio_id_servicio_id_fk"` — **esto falla en tiempo de
   aplicación** porque el constraint ya no existe (lo borró el CASCADE del
   paso 1). Sin `IF EXISTS`.

**Solución aplicada (2026-09-19):** partir en dos migraciones generadas por
separado, ambas por `drizzle-kit generate`, nunca a mano:
- **Migración A** (`0004_elite_wind_dancer.sql`): todo lo que toca
  `orden_trabajo` — `ALTER TYPE ot_estado ADD VALUE`, `DROP CONSTRAINT` del
  FK a `servicio` (aquí SÍ hace falta explícito, porque todavía no existe
  ningún CASCADE que lo adelante), `DROP INDEX`, `DROP COLUMN servicio_id`,
  y las 4 columnas nuevas (`codigo_revision`, `precio`, `moneda`,
  `comentarios`).
- **Migración B** (`0005_smiling_sway.sql`): solo `DROP TABLE "servicio"
  CASCADE` + `DROP TYPE "servicio_estado"`. El `CASCADE` queda vacío/inerte
  (ya no hay nada que dependa de `servicio`), pero no es un problema.

**Cómo se generó la migración A sin arrastrar cambios sobre `servicio`:**
se restauró `db/schema/servicio.ts` desde `git show HEAD:...` como estado
*intermedio* (nunca se commiteó así), pero con un cambio clave: su
`monedaEnum` ya NO se declaraba localmente (`pgEnum("moneda", MONEDAS)`)
sino que se importaba desde `./orden-trabajo`, donde había quedado tras la
fusión. Si se hubieran declarado dos `pgEnum("moneda", ...)` en archivos
distintos, drizzle-kit habría interpretado que hay dos tipos con el mismo
nombre en conflicto. Con esa única fuente, `servicio` quedó bit-a-bit igual
a la última migración aplicada, así que el diff de la migración A no tocó
`servicio` ni `servicio_estado` en absoluto. Después de generar A, se borró
`servicio.ts` otra vez y se quitó su export de `index.ts` (estado final) y
recién ahí se generó B. **Lección:** para separar en N migraciones un
cambio que toca varias tablas a la vez, se puede generar en pasos
reconstruyendo temporalmente el schema.ts de la tabla que "todavía no debe
cambiar" a partir de git, siempre que los tipos/enums compartidos con la
tabla que sí cambia se importen desde una única fuente — nunca declararlos
dos veces.

**Cómo se resolvieron los prompts interactivos de columnsResolver sin TTY
real:** `npx drizzle-kit generate` pregunta (con un menú de flechas) si una
columna nueva es "creada" o "renombrada desde" una columna eliminada, cuando
en el mismo `generate` una tabla pierde columnas y otra (o la misma) gana
columnas de tipo compatible. No acepta stdin no-TTY ("Interactive prompts
require a TTY"). Se resolvió con Python + `pexpect` (spawmear el proceso en
un pty real) enviando `\r` cada vez que aparece el texto "created or
renamed": la opción por defecto (primera, resaltada con `❯`) es siempre
"+ crear columna", nunca el rename — justo lo que se quería (los campos
absorbidos de Servicio no son renombres de `servicio_id`, son columnas
nuevas). Sirve como receta para la próxima vez que un `generate` mezcle
drops y adds en la misma tabla y se necesite ejecutar sin terminal
interactivo.

**No se pudo verificar el conteo de filas de `orden_trabajo` antes de
aplicar** (un script de Node para consultarlo vía `pg` fue bloqueado por el
clasificador de auto mode). La migración agrega `precio`/`moneda` como
`NOT NULL` sin default — si `orden_trabajo` ya tuviera filas, esa migración
fallaría al aplicarse. Reportado explícitamente al usuario como riesgo no
verificado, no asumido en silencio.

Ver también [[precio-bigint]], [[ot_correlativo]].
