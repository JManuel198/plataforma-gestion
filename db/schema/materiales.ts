import { pgTable, text, boolean, timestamp, index } from "drizzle-orm/pg-core";

// Primer catálogo maestro de los cinco que declara el menú (Bloque 11):
// Materiales, Lista de precios, Servicios, Tarifario de personal y EPPs. Los
// otros cuatro siguen sin tabla — ver la sección "BORRADOR — Catálogos
// maestros" de docs/spec/entidades.md.
//
// Los campos de este catálogo siguen sin confirmar con el cliente en su
// mayoría (ver "Catálogos maestros" en docs/spec/preguntas-abiertas.md), con
// una excepción confirmada en el Bloque 12, Parte 2: la unicidad de
// `codigo_interno` (ver el comentario de esa columna). Fuera de eso, a
// diferencia de `personal` o `orden_trabajo`, aquí no hay ningún otro
// `.notNull()` sobre un campo de negocio ni ningún otro `.unique()`: inventar
// una obligación o una restricción que nadie pidió es peor que dejarla
// abierta y endurecerla después con una migración. Solo llevan `.notNull()`
// las columnas cuyo propio comportamiento lo exige (`id`, `activo`, las de
// auditoría) — nunca una decisión de negocio no confirmada.
//
// `fecha_activacion` existió como columna `date` propia (Bloque 12, Parte 2)
// y se eliminó en el Bloque 12, Parte 3 (2026-09-22): la tabla seguía vacía,
// sin datos que perder, y la fecha que se muestra en la interfaz (tabla y
// vista de detalle) es simplemente `created_at` — no hacía falta una segunda
// columna de negocio para lo mismo. No hay columna de reemplazo.
export const materiales = pgTable(
  "materiales",
  {
    // Mismo patrón que `personal.id` y `orden_trabajo.id`: `text` con UUID
    // generado en la aplicación, no `serial`. Ver AGENTS.md — la PK de una
    // tabla nueva sigue la convención ya establecida por las tablas de
    // Better Auth, no se mezcla con `serial`.
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    // El código que usa la empresa internamente, distinto del código de
    // fábrica de abajo. `.unique()` confirmado por el cliente (Bloque 12,
    // Parte 2): dos materiales no pueden compartir código interno. La
    // garantía real es este UNIQUE de la base, no la validación del
    // formulario — mismo razonamiento que `personal.dni`. Sigue sin ser
    // `.notNull()`: solo se confirmó la unicidad, no la obligatoriedad, y en
    // Postgres eso es coherente (varias filas con NULL no chocan entre sí
    // bajo un UNIQUE).
    codigo_interno: text("codigo_interno").unique(),
    descripcion: text("descripcion"),
    marca: text("marca"),
    modelo: text("modelo"),
    // El código del fabricante — no el interno de la empresa (de ahí arriba).
    codigo_fabrica: text("codigo_fabrica"),
    // Unidad de medida. Texto libre, sin catálogo cerrado: no se confirmó si
    // "UND", "und" y "Unidad" deben tratarse como el mismo valor.
    unidad: text("unidad"),
    // Única columna de este catálogo que sí lleva `.notNull()`: la baja
    // lógica en sí (regla invariable 9) no es una regla de negocio del
    // material, es la política general del proyecto de nunca borrar filas
    // que otra tabla pueda referenciar en el futuro (p.ej. una futura
    // relación desde `lista_precios.material`). Mismo criterio que
    // `personal.activo`: no hay un enum de estado propio que ya cumpla ese
    // papel, así que la bandera es la forma correcta, no la excepción.
    activo: boolean("activo").default(true).notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at")
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  // Mismo criterio que `personal_activo_idx` y `orden_trabajo_estado_idx`:
  // el listado (`modules/materiales/queries.ts`) filtra por `activo` en la
  // consulta por defecto.
  (table) => [index("materiales_activo_idx").on(table.activo)],
);

export type Material = typeof materiales.$inferSelect;
export type MaterialNuevo = typeof materiales.$inferInsert;
