---
name: correlativo-generico
description: Tabla correlativo (clave text PK) para códigos globales sin año; por qué no generaliza ot_correlativo y cómo Materiales la usa para codigo_interno
metadata:
  type: project
---

Bloque 12, Parte 3 (2026-09-22): dos cambios de esquema, decididos por
Manuel, no propuestos por el agente.

**Cambio A — se eliminó `materiales.fecha_activacion`.** La tabla seguía en
0 filas (verificado dos veces: antes de generar la migración y otra vez
contra Neon con `DATABASE_URL_DIRECT` antes de aplicarla), así que no hubo
pérdida de datos real. Sin columna de reemplazo: la fecha que muestra la
interfaz (tabla y vista de detalle) pasa a ser simplemente `created_at`. Esto
revierte parte de lo que quedó registrado en [[materiales_tabla]] como
"confirmado en Parte 2" — el significado de `fecha_activacion` se había
confirmado, pero la columna en sí se decidió innecesaria una parte después.
Lección: una decisión "confirmada" en una entidad puede seguir cambiando de
opinión más adelante; no asumir que Parte N es la última palabra.

**Cambio B — tabla nueva `correlativo` (`db/schema/correlativo.ts`), no
`ot_correlativo` extendida.** `materiales.codigo_interno` pasó de manual a
autogenerado, formato `MAT.0000001` (prefijo fijo + 7 dígitos, GLOBAL, nunca
reinicia). Diseño exacto pedido por Manuel:

```ts
export const correlativo = pgTable("correlativo", {
  clave: text("clave").primaryKey(),
  ultimo: integer("ultimo").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().$onUpdate(() => new Date()).notNull(),
});
```

Por qué NO es un ALTER de `ot_correlativo`: la PK de esa tabla es `anio
integer`, literalmente el año, porque el correlativo de OT reinicia cada
enero — ver [[ot_correlativo]]. Este correlativo no tiene año y nunca
reinicia, así que generalizar exigía cambiar la PK por un ÁMBITO de texto
(`clave`), no forzar un año falso. Mismo mecanismo de reserva atómica
(upsert `ON CONFLICT (clave) DO UPDATE SET ultimo = ultimo + 1 RETURNING
ultimo` en la misma transacción que el INSERT que consume el número; mismo
motivo para no usar una `sequence` — no revierten con la transacción).
`ot_correlativo` NO se tocó ni se migró: ya tiene datos reales de OT en
producción. Documentado en el comentario de `correlativo.ts` que la
consolidación futura, si se decide, sería mover el contador de OT a una fila
de esta tabla con clave `"orden-trabajo:2026"` — hasta entonces conviven.

**Coordinación con código en paralelo.** Antes de tocar nada, Manuel ya
tenía escrito `core/correlativo.ts` (`reservarCorrelativo(tx, clave, inicial)`
+ tipo `Transaccion` movido ahí desde `modules/ordenes-trabajo/correlativo.ts`
porque una segunda entidad —Materiales— necesitaba el mismo tipo, regla de
siempre: compartido entre módulos va a `core/`) y `modules/materiales/` ya
adaptado (schema.ts, actions.ts, queries.ts, codigo.ts, constantes.ts,
fila-material.tsx, vista-material.tsx). Leer ese código ANTES de escribir
`db/schema/correlativo.ts` confirmó los nombres de columna exactos
(`clave`, `ultimo`) sin tener que adivinar — coincidían con lo que el
encargo pedía textualmente, así que no hubo fricción.

**Migración:** `db/migrations/0010_open_newton_destine.sql` — un
`CREATE TABLE correlativo` + `ALTER TABLE materiales DROP COLUMN
fecha_activacion`, generados juntos en un solo archivo (a diferencia de la
fusión Servicio+OT, aquí no hubo bug de CASCADE/DROP CONSTRAINT que forzara
partirla en dos). **Aplicada a Neon** con `npx drizzle-kit migrate` usando
`DATABASE_URL_DIRECT` (cargada con `set -a; . ./.env.local; set +a`), con
autorización explícita del encargo ("aplícala"). Verificado con `psql` antes
Y después: antes, `materiales` en 0 filas y `to_regclass('correlativo')`
vacío; después, `\d materiales` sin `fecha_activacion` y `\d correlativo`
con la forma esperada, 0 filas. Recordatorio de
[[feedback_generar_no_aplicar]]: aquí SÍ se aplicó porque el encargo lo pidió
explícitamente ("aplícala"), no por iniciativa propia — sigue sin ser el
comportamiento por defecto.

`docs/spec/entidades.md` actualizado: ficha Materiales (columna
`codigo_interno` de manual a automática, párrafo de `fecha_activacion`
reemplazado por el de `created_at`, nota de "seis campos, no siete") +
ficha nueva "Correlativo genérico (tabla de apoyo)" justo después de
"Correlativo de OT (tabla de apoyo)", mismo nivel de detalle. No se tocó
`preguntas-abiertas.md` ni nada bajo `modules/`/`core/` — llevado por Manuel
en paralelo, instrucción explícita del encargo para evitar choque de
ediciones.
