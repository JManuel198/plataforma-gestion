import { pgTable, text, bigint, boolean, timestamp, index } from "drizzle-orm/pg-core";
import { monedaEnum } from "./moneda";

// Cuarto catálogo maestro de los cinco que declara el menú (Bloque 11) en
// tener tabla real, después de Materiales, Lista de precios y Servicios
// (Bloque 15, Parte 1, 2026-09-23). Definida en
// `db/schema/tarifario-personal.ts`, consumida por
// `modules/tarifario-personal/` (en desarrollo en paralelo, fuera del
// alcance de este archivo).
//
// SIN RELACIÓN CON `personal` — decisión directa del cliente (2026-09-23),
// no un olvido. El borrador original de esta tabla en entidades.md preveía
// que `cargo` de Personal se autocompletara contra este catálogo; el
// cliente confirmó explícitamente que las dos tablas deben quedar
// independientes. `cargo`, aquí y en `personal`, es texto libre en ambas
// tablas, sin FK en ninguna dirección — ver la nota en la sección Personal
// de docs/spec/entidades.md y la decisión 1 de "Catálogos maestros" en
// preguntas-abiertas.md.
export const tarifarioPersonal = pgTable(
  "tarifario_personal",
  {
    // Mismo patrón que `materiales.id`, `lista_precios.id` y `servicios.id`:
    // `text` con UUID generado en la aplicación, no `serial`. Ver AGENTS.md —
    // la PK de una tabla nueva sigue la convención ya establecida por las
    // tablas de Better Auth.
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    // Formato PRS.0001 (prefijo `PRS.` + 4 DÍGITOS — OJO, a diferencia de
    // MAT./OFFT./SRV. que usan 7), autogenerado por el correlativo atómico
    // genérico de `core/correlativo.ts` con su propio ámbito
    // (`clave = "tarifario_personal"` en la tabla compartida `correlativo`).
    // Global, sin segmento de año, mismo criterio que los otros tres. El
    // usuario nunca lo escribe: lo pone siempre el backend. `UNIQUE` es la
    // red de seguridad del generador, mismo papel que `materiales.codigo_interno`,
    // `lista_precios.codigo_oferta` y `servicios.codigo`. El formateo y las
    // constantes (prefijo, dígitos, clave) viven en
    // `modules/tarifario-personal/`, no aquí.
    //
    // Con 4 dígitos el orden alfabético de `codigo` coincide con el
    // numérico solo hasta PRS.9999 — a partir de PRS.10000 un listado que
    // ordene por `codigo` (texto) daría saltos frente al orden numérico
    // real. Límite asumido a propósito, no un bug: un tarifario de cargos
    // no se espera que llegue ahí.
    codigo: text("codigo").notNull().unique(),
    cargo: text("cargo"),
    // PERIODO de tiempo (hora, día, mes, año) — NO es la `UNIDADES` de
    // `core/unidades.ts` (unidades físicas: m, und, kg...). Aquí `unidad`
    // acompaña a `costo` para decir "por hora"/"por día"/etc., un concepto
    // completamente distinto al de unidad de medida física de Materiales y
    // Lista de precios. Lista fija nueva (`PERIODOS_TARIFARIO`), en
    // `core/periodos.ts`. `text` sin CHECK ni ENUM, mismo criterio que
    // `servicios.unidad`: la restricción (si la hay) vive del lado de la
    // aplicación, no de la columna.
    unidad: text("unidad"),
    // Entero en la unidad mínima (céntimos), NUNCA float — regla invariable 2
    // de AGENTS.md. `bigint` con `mode: "number"`, mismo patrón que
    // `servicios.precio` y `orden_trabajo.precio`. El borrador original
    // hablaba de "costo por día"; esta tabla lo generaliza con la columna
    // `unidad` de arriba, así que una tarifa puede ser por hora, día, mes o
    // año — `costo` a secas no significa nada sin su `unidad`, igual que no
    // significa nada sin su `moneda`. El límite de negocio (equivalente a
    // `PRECIO_MAXIMO_CENTIMOS`) se valida en `modules/tarifario-personal/schema.ts`,
    // no en esta columna.
    costo: bigint("costo", { mode: "number" }),
    // Misma columna de moneda que exige cualquier importe del sistema (regla
    // invariable 2 de AGENTS.md): nunca un monto sin su moneda. Mismo enum
    // compartido `moneda` que `orden_trabajo.moneda`, `lista_precios.moneda`
    // y `servicios.moneda`, definido en `./moneda.ts` — ninguna tabla es su
    // dueña.
    moneda: monedaEnum("moneda"),
    // Baja lógica, no borrado — regla invariable 9, mismo criterio que
    // `materiales.activo`, `personal.activo` y `lista_precios.activo`. La
    // acción de inactivar es Parte 2 de este bloque, pero la columna entra
    // ya para no requerir una segunda migración solo por esto — mismo
    // criterio explícito que `lista_precios.activo`, y al revés que
    // `servicios`, que no la tiene (esa ausencia es pregunta abierta, no
    // este caso).
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
    // Mismo criterio que `materiales_activo_idx` y `lista_precios_activo_idx`:
    // el listado filtra por `activo` en la consulta por defecto desde la
    // Parte 1.
    index("tarifario_personal_activo_idx").on(table.activo),
  ],
);

export type TarifarioPersonal = typeof tarifarioPersonal.$inferSelect;
export type TarifarioPersonalNuevo = typeof tarifarioPersonal.$inferInsert;
