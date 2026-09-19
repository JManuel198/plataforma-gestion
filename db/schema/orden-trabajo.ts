import { pgEnum, pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";

import { servicio } from "./servicio";

// Los cinco estados propuestos en docs/spec/alcance-v2-servicios-ot.md
// (Fase 3). Son de ejecución en campo, a propósito distintos de los de
// Servicio, que son administrativos/comerciales. El cliente autorizó esta
// lista como propuesta temporal; queda pendiente de validación definitiva
// (sección 6 del alcance). Se guardan con la misma grafía que ve el usuario.
export const ESTADOS_OT = [
  "Pendiente",
  "En ejecución",
  "Pausada",
  "Finalizada",
  "Cancelada",
] as const;

export const otEstadoEnum = pgEnum("ot_estado", ESTADOS_OT);

export const ordenTrabajo = pgTable(
  "orden_trabajo",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    // Única dependencia real con Servicio. El resto de los campos que se ven
    // repetidos (cotización, OC, cliente) se escriben a mano y NO se
    // sincronizan — decisión cerrada del alcance v2, para ir rápido ahora.
    // Teniendo la relación guardada, sincronizarlos después es un cambio
    // contenido, no una reconstrucción.
    //
    // `onDelete: "restrict"` explícito: los servicios no se borran nunca
    // (supuesto 4 de docs/spec/preguntas-abiertas.md — se cierran pasando a
    // `Rechazado`), así que el comportamiento correcto si alguien intenta
    // borrar uno con OT colgando es que la base de datos lo impida. Se
    // escribe aunque PostgreSQL ya haga NO ACTION por defecto, porque aquí
    // la intención importa: nunca `cascade`, que silenciosamente se llevaría
    // las OT por delante.
    servicio_id: text("servicio_id")
      .notNull()
      .references(() => servicio.id, { onDelete: "restrict" }),
    // Formato OT.CCM.AAAA.NNNN, autogenerado — el usuario nunca lo escribe.
    // `CCM` es constante del proyecto y vive en
    // modules/ordenes-trabajo/constantes.ts, no aquí.
    //
    // UNIQUE es la red de seguridad del correlativo (ver `otCorrelativo`
    // abajo): aunque un error futuro se salte el contador, la base de datos
    // no deja entrar dos OT con el mismo código.
    codigo_ot: text("codigo_ot").notNull().unique(),
    // Copiado a mano desde el Servicio, a propósito NO sincronizado.
    codigo_cotizacion: text("codigo_cotizacion").notNull(),
    asunto: text("asunto").notNull(),
    // Nullable por el mismo criterio que `servicio.codigo_oc`: la orden de
    // compra suele llegar después del registro (supuesto 1 de
    // preguntas-abiertas.md).
    codigo_oc: text("codigo_oc"),
    // Texto libre mientras no exista pantalla propia de Clientes (Fase 5).
    cliente: text("cliente").notNull(),
    // No hay columna `activo`: `Cancelada` ya cumple ese papel. Es una
    // excepción consciente al patrón general de "desactivar, no borrar" —
    // el estado ya lo implementa, una segunda bandera sería redundante y
    // se desincronizaría.
    estado: otEstadoEnum("estado").notNull().default("Pendiente"),
    // Automática: nunca se pide al usuario, se pone sola al crear.
    fecha_creacion: timestamp("fecha_creacion").defaultNow().notNull(),
    // Texto libre: no existe tabla de Personal todavía (diferido, sección 5
    // del alcance). Nullable porque el técnico a cargo puede asignarse
    // después de abrir la OT — el documento no dice si es obligatorio
    // (supuesto 6 de preguntas-abiertas.md). Si el negocio confirma que sí,
    // se exige primero en el Zod de modules/ordenes-trabajo/schema.ts y solo
    // después se endurece la columna con una migración.
    responsable: text("responsable"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    index("orden_trabajo_estado_idx").on(table.estado),
    index("orden_trabajo_servicio_id_idx").on(table.servicio_id),
  ],
);

/**
 * Contador del correlativo anual de la OT (el `NNNN` de OT.CCM.AAAA.NNNN).
 *
 * POR QUÉ EXISTE ESTA TABLA — no la quites al refactorizar.
 *
 * El correlativo reinicia cada año empezando en 0001. La forma obvia de
 * calcularlo —`SELECT MAX(...) + 1 FROM orden_trabajo`— tiene una condición
 * de carrera: dos OT creadas casi a la vez leen el mismo máximo y generan el
 * mismo código. No es teórico, basta con dos pestañas.
 *
 * La estrategia es un contador por año con incremento atómico. La reserva del
 * número se hace en UNA SOLA sentencia:
 *
 *   INSERT INTO ot_correlativo (anio, ultimo)
 *   VALUES ($anio, 1)
 *   ON CONFLICT (anio) DO UPDATE SET ultimo = ot_correlativo.ultimo + 1
 *   RETURNING ultimo;
 *
 * En PostgreSQL esa sentencia toma el lock de la fila del año: una segunda
 * creación simultánea espera a que la primera termine su transacción en vez
 * de leer un valor obsoleto. El primer INSERT del año devuelve 1 → `0001`.
 *
 * Esa sentencia y el INSERT de la orden de trabajo van dentro de la MISMA
 * transacción (`db.transaction(...)` en modules/ordenes-trabajo/): si la OT
 * falla, el número no se consume y no quedan huecos en la numeración.
 *
 * Nota: por eso no se usa una `sequence` de PostgreSQL — las secuencias no
 * revierten con la transacción (dejarían huecos) y reiniciarlas cada año
 * exigiría un ALTER programado.
 *
 * `anio` es la PK: una fila por año, y el ON CONFLICT (anio) depende de que
 * ese índice único exista.
 *
 * Detalle al implementar: el `$onUpdate` de `updated_at` es de Drizzle, no de
 * la base de datos — un upsert escrito a mano (o un `onConflictDoUpdate`) no
 * lo dispara. Hay que incluir `updated_at = now()` en el propio SET si se
 * quiere que refleje la última reserva.
 */
export const otCorrelativo = pgTable("ot_correlativo", {
  anio: integer("anio").primaryKey(),
  // Último número entregado ese año. Se guarda el número entregado, no el
  // siguiente a entregar: `RETURNING ultimo` devuelve directamente el valor
  // que se formatea con padStart(4, "0").
  ultimo: integer("ultimo").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
});

export type OrdenTrabajo = typeof ordenTrabajo.$inferSelect;
export type OrdenTrabajoNueva = typeof ordenTrabajo.$inferInsert;
export type OtCorrelativo = typeof otCorrelativo.$inferSelect;
