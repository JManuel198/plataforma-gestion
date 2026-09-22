import { pgTable, text, integer, timestamp, index } from "drizzle-orm/pg-core";
import { materiales } from "./materiales";

/**
 * Características técnicas de un material — una lista de líneas de texto
 * libre ("resistente al agua", "IP65", "incluye batería", etc.), cada una en
 * su propia fila, ordenadas.
 *
 * Es específica de Materiales, no un patrón compartido: no hay ninguna otra
 * tabla hoy que necesite una lista de líneas de texto colgando de un
 * registro, así que esto vive en su propio archivo en vez de generalizarse
 * en core/.
 *
 * EXCEPCIÓN DELIBERADA A LA REGLA INVARIABLE 9 de AGENTS.md ("ningún
 * registro se borra en operación normal — se desactiva"). Esta tabla SÍ
 * permite DELETE real y, a propósito, no lleva columna `activo`.
 *
 * La razón, para que nadie la lea como un descuido: una característica no es
 * una entidad de negocio independiente como Cliente, Personal o un propio
 * Material — es metadata descriptiva que solo existe colgando de su
 * material, y nada más en el sistema la referencia (ninguna FK apunta a
 * `material_caracteristicas`). Quitar una característica de la lista ES la
 * operación que el usuario quiere hacer; no hay un "estado inactivo" que
 * signifique algo aparte de "ya no está en la lista".
 *
 * Compárese con la otra excepción ya razonada en el esquema, la de
 * `orden_trabajo` (ver AGENTS.md, regla 9, y la ficha "Orden de Trabajo" en
 * docs/spec/entidades.md): ahí tampoco hay columna `activo`, pero porque el
 * propio enum `estado` ya llega a `Cancelada` y cumple ese papel — sigue
 * habiendo una bandera, solo que es una que ya existía por otro motivo. Aquí
 * no hay ningún enum ni bandera equivalente: simplemente no hace falta
 * ninguna, porque la fila deja de tener sentido en el momento en que el
 * usuario decide borrarla.
 *
 * Si algún día otra tabla llegara a referenciar una característica (una FK
 * apuntando a `material_caracteristicas.id`), esta excepción deja de ser
 * válida y hay que revisarla — en ese momento una característica pasaría a
 * comportarse como una entidad con vida propia, no como metadata desechable,
 * y correspondería añadir la baja lógica como al resto del esquema.
 */
export const materialCaracteristicas = pgTable(
  "material_caracteristicas",
  {
    // Mismo patrón que el resto de tablas nuevas del esquema: `text` con
    // UUID generado en la aplicación, no `serial` — sigue la convención ya
    // establecida por las tablas de Better Auth (ver AGENTS.md).
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    // `onDelete: "cascade"`: si el material desaparece de verdad (DELETE
    // real, no baja lógica — Materiales sí usa `activo`, ver
    // db/schema/materiales.ts), sus características no tienen sentido sin
    // él. Es coherente con la excepción de arriba: son metadata del
    // material, no entidades con vida propia fuera de él.
    material_id: text("material_id")
      .notNull()
      .references(() => materiales.id, { onDelete: "cascade" }),
    texto: text("texto").notNull(),
    // Posición de ENTRADA, no un campo de negocio que el usuario elija:
    // entero base 0 que la aplicación asigna según el orden en que se
    // escribieron las características en el formulario, para que al
    // reabrir el modal aparezcan en el mismo orden. El usuario no ve ni
    // edita este número directamente.
    orden: integer("orden").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [
    index("material_caracteristicas_material_id_idx").on(table.material_id),
  ],
);

export type MaterialCaracteristica = typeof materialCaracteristicas.$inferSelect;
export type MaterialCaracteristicaNueva = typeof materialCaracteristicas.$inferInsert;
