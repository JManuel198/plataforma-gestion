import { pgTable, text, date, boolean, timestamp, index } from "drizzle-orm/pg-core";

// Primer catálogo maestro de los cinco que declara el menú (Bloque 11):
// Materiales, Lista de precios, Servicios, Tarifario de personal y EPPs. Los
// otros cuatro siguen sin tabla — ver la sección "BORRADOR — Catálogos
// maestros" de docs/spec/entidades.md.
//
// Los campos de este catálogo siguen sin confirmar con el cliente en su
// mayoría (ver "Catálogos maestros" en docs/spec/preguntas-abiertas.md), con
// dos excepciones confirmadas en el Bloque 12, Parte 2: la unicidad de
// `codigo_interno` y el significado de `fecha_activacion` (ver los
// comentarios de esas columnas). Fuera de eso, a diferencia de `personal` o
// `orden_trabajo`, aquí no hay ningún otro `.notNull()` sobre un campo de
// negocio ni ningún otro `.unique()`: inventar una obligación o una
// restricción que nadie pidió es peor que dejarla abierta y endurecerla
// después con una migración. Solo llevan `.notNull()` las columnas cuyo
// propio comportamiento lo exige (`id`, `activo`, las de auditoría) — nunca
// una decisión de negocio no confirmada.
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
    // `date`, NO `timestamp`, con mode "string" — regla invariable 10 de
    // AGENTS.md, mismo patrón que `personal.fecha_nacimiento`: un campo de
    // solo fecha entra y sale como `YYYY-MM-DD` literal, sin la conversión de
    // zona horaria que sí afecta a las columnas `timestamp` (ver la deuda
    // técnica de db/index.ts). Significado confirmado (Bloque 12, Parte 2):
    // es la fecha de activación del material, sujeta a una validación previa
    // que todavía no se construye (fuera de alcance por ahora). Lo que sigue
    // SIN confirmar es si admite fechas futuras (un material podría
    // registrarse antes de completar esa validación) — no se impone ningún
    // CHECK al respecto. Sigue admitiendo NULL: no se confirmó su
    // obligatoriedad, solo su significado.
    fecha_activacion: date("fecha_activacion", { mode: "string" }),
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
