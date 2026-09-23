import { pgTable, text, bigint, timestamp } from "drizzle-orm/pg-core";
import { monedaEnum } from "./moneda";

// Quinto y último catálogo maestro de los cinco que declara el menú (Bloque
// 11) en tener tabla real, después de Materiales, Lista de precios, Servicios
// y Tarifario de personal (Bloque 16, Parte 1, 2026-09-23). Definida en
// `db/schema/epps.ts`, consumida por `modules/epps/` (en desarrollo en
// paralelo, fuera del alcance de este archivo).
export const epps = pgTable("epps", {
  // Mismo patrón que `materiales.id`, `lista_precios.id`, `servicios.id` y
  // `tarifario_personal.id`: `text` con UUID generado en la aplicación, no
  // `serial`. Ver AGENTS.md — la PK de una tabla nueva sigue la convención ya
  // establecida por las tablas de Better Auth.
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  // Formato EPP.000001 (prefijo `EPP.` + 6 DÍGITOS — OJO, ni 7 como
  // MAT./OFFT./SRV. ni 4 como PRS.), autogenerado por el correlativo atómico
  // genérico de `core/correlativo.ts` con su propio ámbito
  // (`clave = "epps"` en la tabla compartida `correlativo`) — global, sin
  // segmento de año, mismo criterio que los otros cuatro. El usuario nunca lo
  // escribe: lo pone siempre el backend. `UNIQUE` es la red de seguridad del
  // generador, mismo papel que `materiales.codigo_interno`,
  // `lista_precios.codigo_oferta`, `servicios.codigo` y
  // `tarifario_personal.codigo`. El formateo y las constantes (prefijo,
  // dígitos, inicial, clave) viven en `modules/epps/constantes.ts`, no aquí.
  //
  // Con 6 dígitos el orden alfabético de `codigo` coincide con el numérico
  // solo hasta EPP.999999 — a partir de EPP.1000000 diverge, mismo fenómeno
  // ya documentado para los correlativos de 7 y de 4 dígitos. Límite asumido
  // a propósito, no un bug: un catálogo de EPPs no se espera que llegue ahí.
  codigo: text("codigo").notNull().unique(),
  descripcion: text("descripcion"),
  // Unidad de medida FÍSICA (m, und, pzs, cja, kg, lt, gal) — texto libre con
  // sugerencias de `core/unidades.ts`, mismo criterio que `materiales.unidad`,
  // `lista_precios.unidad` y `servicios.unidad`. OJO, NO CONFUNDIR: esta NO es
  // la lista de periodos de tiempo de `tarifario_personal.unidad`
  // (`core/periodos.ts`, hora/día/mes/año) — mismo nombre de columna,
  // concepto completamente distinto, es el error fácil al copiar del
  // catálogo de al lado. Sin CHECK ni ENUM en la base.
  unidad: text("unidad"),
  // Entero en la unidad mínima (céntimos), NUNCA float — regla invariable 2
  // de AGENTS.md. `bigint` con `mode: "number"`, mismo patrón que
  // `servicios.precio`, `tarifario_personal.costo` y `orden_trabajo.precio`.
  // Campo DIRECTO, no derivado, igual que `servicios.precio` y al contrario
  // que `lista_precios.precio` (que se calcula de `precio_lista × descuento`).
  // El límite de negocio (equivalente a `PRECIO_MAXIMO_CENTIMOS`) se valida en
  // `modules/epps/schema.ts`, no en esta columna.
  precio: bigint("precio", { mode: "number" }),
  // Misma columna de moneda que exige cualquier importe del sistema (regla
  // invariable 2 de AGENTS.md): nunca un monto sin su moneda. Mismo enum
  // compartido `moneda` que `orden_trabajo.moneda`, `lista_precios.moneda`,
  // `servicios.moneda` y `tarifario_personal.moneda`, definido en
  // `./moneda.ts` — ninguna tabla es su dueña.
  moneda: monedaEnum("moneda"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  // SIN COLUMNA `activo` — a diferencia de `servicios`, aquí NO es una
  // pregunta abierta: es un encargo explícito de que no aplica a este
  // catálogo. Mismo resultado en la tabla (ninguna de las dos tiene la
  // columna), motivo distinto: en Servicios, inactivar/reactivar no está
  // confirmado con el cliente todavía (pregunta abierta en
  // preguntas-abiertas.md); aquí, directamente no aplica. Si eso cambiara
  // más adelante, el camino es una migración nueva con
  // `activo boolean DEFAULT true NOT NULL`, mismo patrón que las demás.
  //
  // Todas las columnas de negocio (`descripcion`, `unidad`, `precio`,
  // `moneda`) quedan nullable aquí, igual que en el resto de catálogos: el
  // Zod de `modules/epps/schema.ts` puede ser más estricto que la columna,
  // nunca al revés.
  //
  // SIN ÍNDICES: no hay columna `activo` que filtrar ni FK que sostenga un
  // JOIN.
});

export type Epp = typeof epps.$inferSelect;
export type EppNuevo = typeof epps.$inferInsert;
