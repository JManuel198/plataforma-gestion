import { pgTable, text, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { empresas } from "./empresas";

// Segunda tabla del grupo CRM (Bloque 3, Contactos — 2026-09-25). Todo
// contacto es una persona de una empresa: la relación es una FK real contra
// `empresas`, mismo patrón que `lista_precios.material_id` → `materiales`.
//
// Sin código autogenerado (a diferencia de `empresas.codigo` o
// `materiales.codigo_interno`): este módulo no lo necesita, así que no
// consume el correlativo.
export const contactos = pgTable(
  "contactos",
  {
    // Mismo patrón que el resto de tablas: `text` con UUID generado en la
    // aplicación, no `serial`.
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    // `NOT NULL`: un contacto sin empresa no existe en este modelo. Sin
    // `onDelete`: el `NO ACTION` por defecto es la protección correcta porque
    // `empresas` nunca se borra de verdad (regla invariable 9) — mismo
    // razonamiento que `lista_precios.material_id`.
    //
    // La FK NO mira `empresas.activo`, a propósito: un contacto puede seguir
    // asociado a una empresa dada de baja (hay historial con ella). Dar de
    // baja una empresa es un UPDATE, que no dispara la FK. Mostrarla marcada
    // como inactiva es cosa de la interfaz, no de la base.
    empresa_id: text("empresa_id")
      .notNull()
      .references(() => empresas.id),
    // Único campo de negocio obligatorio.
    nombre: text("nombre").notNull(),
    cargo: text("cargo"),
    // SIN UNIQUE, por decisión confirmada (2026-09-25): el mismo correo puede
    // repetirse entre contactos — p.ej. un buzón genérico (ventas@…) que
    // comparten varias personas de una empresa.
    correo: text("correo"),
    // Sin CHECK de formato: `+51 000 000 000` es solo la sugerencia visual
    // del formulario, no una regla de la base.
    celular: text("celular"),
    // Baja lógica — regla invariable 9, mismo patrón exacto que
    // `empresas.activo`, `materiales.activo` y `personal.activo`.
    activo: boolean("activo").default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    // Mismo criterio que `empresas_activo_idx`: el listado filtra por
    // `activo` en la consulta por defecto.
    index("contactos_activo_idx").on(table.activo),
    // Postgres no indexa solo el lado que referencia de una FK. Este índice
    // sirve al JOIN del listado contra `empresas` y al conteo de contactos
    // por empresa (la columna Contactos del listado de Empresas) — mismo
    // papel que `lista_precios_material_id_idx`.
    index("contactos_empresa_id_idx").on(table.empresa_id),
  ],
);

export type Contacto = typeof contactos.$inferSelect;
export type ContactoNuevo = typeof contactos.$inferInsert;
