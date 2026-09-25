import { pgTable, text, integer, timestamp } from "drizzle-orm/pg-core";

/**
 * Contador genérico de correlativos. Nació para los GLOBALES, sin segmento
 * de año; desde el 2026-09-25 lleva también los ANUALES, con una clave por
 * año (`"ordenes-trabajo:2026"`): ver `reservarCorrelativoAnual` en
 * core/correlativo.ts. Con eso reemplazó a `otCorrelativo`
 * (`db/schema/orden-trabajo.ts`), que quedó sin uso.
 *
 * Nace en el Bloque 12, Parte 3 (2026-09-22) porque Materiales
 * necesita autogenerar `codigo_interno` con el formato `MAT.0000001` —
 * correlativo de 7 dígitos, global, que nunca reinicia — y ese "nunca
 * reinicia" es justo lo que `ot_correlativo` NO modela: su PK es
 * `anio integer`, literalmente el año, porque el correlativo de OT sí
 * reinicia cada enero. Forzar un año falso ahí para reusar esa tabla habría
 * ensuciado lo que ya funciona; en cambio esta tabla generaliza el ÁMBITO del
 * contador a una clave de texto (`"materiales"` hoy, cualquier otro catálogo
 * mañana) y deja el año fuera del modelo.
 *
 * POR QUÉ NO ES UNA `sequence` DE POSTGRESQL — mismo motivo que
 * `ot_correlativo`, repetido aquí porque es fácil de "simplificar" sin darse
 * cuenta del costo: las secuencias no revierten con la transacción. Si el
 * INSERT del material (o de lo que sea que consuma este número) falla, una
 * `sequence` ya entregó el número y deja un hueco permanente en la
 * numeración — que en un código que el cliente lee como identificador
 * comercial es exactamente lo que no se quiere. El upsert de abajo, en
 * cambio, vive dentro de la misma transacción que ese INSERT.
 *
 * LA RESERVA Y EL INSERT VAN EN LA MISMA TRANSACCIÓN, por la misma razón:
 *
 *   INSERT INTO correlativo (clave, ultimo)
 *   VALUES ($clave, $inicial)
 *   ON CONFLICT (clave) DO UPDATE SET ultimo = correlativo.ultimo + 1
 *   RETURNING ultimo;
 *
 * PostgreSQL toma el lock de la fila de esa `clave` mientras ejecuta la
 * sentencia: una segunda alta simultánea espera a que la primera cierre su
 * transacción, en vez de leer un valor obsoleto y repetir el número. Si el
 * INSERT que sigue falla y la transacción revierte, este upsert revierte con
 * él y el número queda libre para el siguiente intento — sin huecos.
 *
 * `clave` es la PK (no `anio`, a propósito — ver arriba) y el
 * `ON CONFLICT (clave)` depende de que ese índice único exista.
 *
 * Detalle al implementar (mismo que en `ot_correlativo`): el `$onUpdate` de
 * `updated_at` es de Drizzle, no de la base de datos — un `onConflictDoUpdate`
 * escrito a mano no lo dispara. Hay que incluir `updatedAt: sql\`now()\`` en
 * el propio `set` si se quiere que refleje la última reserva (ver
 * `core/correlativo.ts`, que ya lo hace).
 *
 * `ot_correlativo` se consolidó aquí el 2026-09-25: la migración de datos
 * 0020 copió su contador de cada año a la fila `"ordenes-trabajo:<año>"`.
 */
export const correlativo = pgTable("correlativo", {
  // El ÁMBITO del contador, no un año: "materiales" hoy, y cualquier otro
  // catálogo que necesite su propio correlativo global mañana (una fila por
  // ámbito, nunca una tabla nueva por catálogo).
  clave: text("clave").primaryKey(),
  // Último número entregado en ese ámbito. Se guarda el número entregado, no
  // el siguiente a entregar: `RETURNING ultimo` devuelve directamente el
  // valor que se formatea con padStart.
  ultimo: integer("ultimo").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export type Correlativo = typeof correlativo.$inferSelect;
