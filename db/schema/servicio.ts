import { pgEnum, pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";

// Los seis estados confirmados por el cliente en
// docs/spec/alcance-v2-servicios-ot.md (Fase 2). Se guardan con la misma
// grafía que ve el usuario: no hay una capa de traducción todavía.
export const ESTADOS_SERVICIO = [
  "Activado",
  "En espera",
  "En ejecución",
  "Finalizado",
  "Facturado",
  "Rechazado",
] as const;

export const MONEDAS = ["PEN", "USD"] as const;

export const monedaEnum = pgEnum("moneda", MONEDAS);
export const servicioEstadoEnum = pgEnum("servicio_estado", ESTADOS_SERVICIO);

export const servicio = pgTable(
  "servicio",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    codigo_cotizacion: text("codigo_cotizacion").notNull(),
    codigo_revision: text("codigo_revision").notNull(),
    // Texto libre a propósito: cada cliente numera sus órdenes de compra a su
    // manera. Nullable porque la OC suele llegar después del registro.
    codigo_oc: text("codigo_oc"),
    // "servicio" = la descripción del trabajo contratado, tal como la nombra
    // la especificación. La columna se llama igual que la tabla por eso.
    servicio: text("servicio").notNull(),
    // Texto libre mientras no exista pantalla propia de Clientes (Fase 5).
    cliente: text("cliente").notNull(),
    // Automática: nunca se pide al usuario, se pone sola al crear.
    fecha: timestamp("fecha").defaultNow().notNull(),
    // Entero en la unidad mínima (céntimos), nunca float — regla 2 de AGENTS.md.
    // Siempre acompañado de su moneda, una sola por registro.
    // Techo de `integer`: 2 147 483 647 céntimos = 21 474 836.47. El límite se
    // valida en modules/servicios/schema.ts (PRECIO_MAXIMO_CENTIMOS); si hace
    // falta cotizar por encima, esta columna tiene que pasar a `bigint`.
    precio: integer("precio").notNull(),
    moneda: monedaEnum("moneda").notNull(),
    estado: servicioEstadoEnum("estado").notNull().default("Activado"),
    comentarios: text("comentarios"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [index("servicio_estado_idx").on(table.estado)],
);

export type Servicio = typeof servicio.$inferSelect;
export type ServicioNuevo = typeof servicio.$inferInsert;
