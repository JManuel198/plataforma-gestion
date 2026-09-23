---
name: unidad-texto-libre-unificado
description: unidad pasa a texto libre en materiales y lista_precios (2026-09-22) — verificado sin CHECK/ENUM en Neon, no hizo falta migración
metadata:
  type: project
---

`lista_precios.unidad` dejó de restringirse a una lista cerrada vía
`z.enum(UNIDADES)` en `modules/lista-precios/schema.ts` y pasó a texto libre
con sugerencia, igualándose a `materiales.unidad` (que ya era texto libre).
Ver [[lista_precios_tabla]] para el diseño original de la tabla.

**Verificado contra Neon (2026-09-22), no solo contra el schema.ts:** ni
`lista_precios.unidad` ni `materiales.unidad` tenían CHECK ni ENUM a nivel de
Postgres — se consultó `information_schema.columns` y `pg_constraint`
directamente contra `DATABASE_URL_DIRECT`. Los únicos enums en la base son
`moneda` y `ot_estado`. La restricción de `lista_precios.unidad` vivía
ENTERAMENTE en el Zod, nunca en la columna (que siempre fue `text` plano
desde la migración 0012). Por eso este cambio no generó ninguna migración:
no había nada que quitar de la base — regla invariable 6 de AGENTS.md
(`drizzle-kit generate`, nunca SQL manual) no aplicaba porque no hubo DDL.

**Detalle de infraestructura para la próxima vez que haga falta un script
ad-hoc contra la base:** un script en el scratchpad de `/tmp/...` no resuelve
`import pg from "pg"` — Node ESM busca `node_modules` subiendo desde la
ubicación del propio archivo, no desde el cwd, y `NODE_PATH` no aplica a
ESM. Hubo que copiar el script temporalmente a la raíz del proyecto
(`.tmp-check-unidad.mjs`), ejecutarlo con `node` ahí, y borrarlo después —
nunca se hizo `git add`, así que no ensució el árbol.

**`UNIDADES` se movió a `core/unidades.ts`** (antes solo en
`modules/lista-precios/constantes.ts`) porque ahora la comparten dos módulos
— mismo criterio que ya se aplicó a `MONEDAS` (ver
[[estados_ot_fuente_unica]]). Se añadió `"gal"` a la lista en este cambio
(quedó en siete valores). Ese archivo y `core/components/campo-lista-sugerida.tsx`
los creó el agente principal en paralelo, fuera de mi alcance — yo solo toqué
`docs/spec/`.

**Preguntas abiertas actualizadas, no borradas:** decisión 12 (¿misma lista
para las dos tablas?) quedó RESUELTA a favor de texto libre en ambas —
importante: se resolvió SIN responder la pregunta de fondo (si "unidad de
inventario" y "unidad de cotización" son el mismo concepto), simplemente se
bajó el nivel de restricción de Lista de precios al de Materiales en vez de
subir el de Materiales. Decisión 13 (¿son exhaustivos los valores?) sigue
abierta — un `pgEnum` sigue siendo el sitio correcto el día que el cliente
confirme una lista cerrada, y en ese momento aplicaría a las DOS tablas a la
vez, no solo a Lista de precios como se había previsto originalmente.
