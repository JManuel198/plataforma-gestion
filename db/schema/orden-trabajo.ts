import { pgEnum, pgTable, text, integer, bigint, timestamp, index } from "drizzle-orm/pg-core";
import { ESTADOS_OT, MONEDAS } from "@/modules/ordenes-trabajo/constantes";

// Fusión Servicio + OT: el cliente confirmó que son la misma entidad para él
// y que `orden_trabajo` absorbe todo (ver docs/spec/preguntas-abiertas.md).
// La tabla `servicio` y su enum `servicio_estado` desaparecen; `moneda` se
// muda aquí porque `orden_trabajo.precio` es ahora quien la necesita.
//
// Igual que `ESTADOS_OT` (abajo), la lista NO vive aquí:
// `modules/ordenes-trabajo/constantes.ts` es la fuente de verdad única, porque
// el formulario la necesita en el cliente y ese archivo no arrastra Drizzle.
// Aquí solo se importa para construir el `pgEnum` — nunca declares un segundo
// array literal con estos mismos valores.
export const monedaEnum = pgEnum("moneda", MONEDAS);

// Seis estados: los cinco de ejecución en campo que ya tenía la OT, más
// `Facturado` (tomado de los estados de Servicio) para poder cerrar el
// ciclo comercial ahora que no existe una tabla Servicio aparte. Lista
// propuesta, pendiente de confirmar con el cliente — supuesto nuevo en
// docs/spec/preguntas-abiertas.md. Se guardan con la misma grafía que ve el
// usuario.
//
// La lista en sí YA NO vive aquí: `modules/ordenes-trabajo/constantes.ts` es
// la fuente de verdad única (la necesita el formulario en el cliente, sin
// arrastrar Drizzle). Aquí solo se importa para construir el `pgEnum` —
// nunca declares un segundo array literal con estos mismos valores.
export const otEstadoEnum = pgEnum("ot_estado", ESTADOS_OT);

export const ordenTrabajo = pgTable(
  "orden_trabajo",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    // Formato OT.CCM.AAAA.NNNN, autogenerado — el usuario nunca lo escribe.
    // `CCM` es constante del proyecto y vive en
    // modules/ordenes-trabajo/constantes.ts, no aquí.
    //
    // UNIQUE es la red de seguridad del correlativo (ver `otCorrelativo`
    // abajo): aunque un error futuro se salte el contador, la base de datos
    // no deja entrar dos OT con el mismo código.
    codigo_ot: text("codigo_ot").notNull().unique(),
    // Ya no se "copia a mano desde el Servicio": la OT es autónoma, no nace
    // de otra tabla (fusión Servicio + OT, confirmada por el cliente).
    codigo_cotizacion: text("codigo_cotizacion").notNull(),
    // Ex `servicio.codigo_revision`. Ahí era `NOT NULL`; aquí queda nullable
    // a propósito, con el mismo criterio que `codigo_oc` (llega después del
    // registro) — decisión explícita de esta fusión, no un descuido.
    codigo_revision: text("codigo_revision"),
    asunto: text("asunto").notNull(),
    // Nullable por el mismo criterio que `servicio.codigo_oc`: la orden de
    // compra suele llegar después del registro (supuesto 1 de
    // preguntas-abiertas.md).
    codigo_oc: text("codigo_oc"),
    // Texto libre mientras no exista pantalla propia de Clientes (Fase 5).
    cliente: text("cliente").notNull(),
    // Ex `servicio.precio` / `servicio.moneda`. Entero en la unidad mínima
    // (céntimos), nunca float — regla 2 de AGENTS.md — y siempre con su
    // columna de moneda al lado. Mismo `bigint` con `mode: "number"` que
    // tenía Servicio: la columna en Postgres es de 8 bytes, pero Drizzle la
    // mapea a `number` de JS para no arrastrar `BigInt` por el código
    // (dinero.ts, formularios, `JSON.stringify` en las acciones). El techo
    // real pasa a ser `Number.MAX_SAFE_INTEGER`; el límite de negocio se
    // valida en el `schema.ts` del módulo (ver `PRECIO_MAXIMO_CENTIMOS` de
    // Servicio como precedente). `NOT NULL` porque toda OT es ahora también
    // el registro comercial que antes era el Servicio.
    precio: bigint("precio", { mode: "number" }).notNull(),
    moneda: monedaEnum("moneda").notNull(),
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
    // Ex `servicio.comentarios`. Texto libre, nullable, mismo patrón.
    comentarios: text("comentarios"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("orden_trabajo_estado_idx").on(table.estado)],
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
