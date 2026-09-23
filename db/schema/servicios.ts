import { pgTable, text, bigint, timestamp } from "drizzle-orm/pg-core";
import { monedaEnum } from "./moneda";

// Tercer catálogo maestro de los cinco que declara el menú (Bloque 11) en
// tener tabla real, después de Materiales y Lista de precios (Bloque 14,
// Parte 1, 2026-09-23). Definida en `db/schema/servicios.ts`, consumida por
// `modules/servicios/` (en desarrollo en paralelo, fuera del alcance de este
// archivo).
//
// OJO CON EL NOMBRE: esta tabla NO es la entidad `Servicio` que se fusionó en
// `orden_trabajo` el 2026-09-19 (ver la sección "Servicio — fusionada en
// Orden de Trabajo" al principio de docs/spec/entidades.md, y la decisión 7
// de "Catálogos maestros" en preguntas-abiertas.md sobre la colisión de
// nombre en la ruta `/servicios`). Aquella era el ciclo de vida completo de
// un trabajo (estado, responsable, fechas); esta es un catálogo de precios
// fijos reutilizables, sin estado ni ciclo de vida propio — la entidad que
// `docs/spec/alcance-v2-servicios-ot.md` difería a su sección 5.
export const servicios = pgTable("servicios", {
  // Mismo patrón que `materiales.id`, `lista_precios.id`, `personal.id` y
  // `orden_trabajo.id`: `text` con UUID generado en la aplicación, no
  // `serial`. Ver AGENTS.md — la PK de una tabla nueva sigue la convención ya
  // establecida por las tablas de Better Auth.
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  // Formato SRV.0000001 (prefijo `SRV.` + 7 dígitos), autogenerado por el
  // correlativo atómico genérico de `core/correlativo.ts` con su propio
  // ámbito (`clave = "servicios"` en la tabla compartida `correlativo`) —
  // global, sin segmento de año, mismo criterio que `MAT.` (materiales) y
  // `OFFT.` (lista_precios). El usuario nunca lo escribe: lo pone siempre el
  // backend. `UNIQUE` es la red de seguridad del generador, mismo papel que
  // `materiales.codigo_interno` y `lista_precios.codigo_oferta`: aunque un
  // error futuro se saltara el contador, la base no deja entrar dos filas
  // con el mismo código. El formateo y las constantes (prefijo, dígitos,
  // clave) viven en `modules/servicios/`, no aquí.
  codigo: text("codigo").notNull().unique(),
  servicio: text("servicio"),
  // A propósito `text`, NO un `pgEnum` — mismo criterio que
  // `lista_precios.unidad` frente a `ot_estado`/`moneda`: un `pgEnum` exige
  // una migración para añadir o quitar un valor, y aquí la lista (alquiler,
  // fabricación, consultoría, alimentación, otros) es un borrador que nadie
  // ha confirmado como exhaustivo — pregunta abierta en
  // docs/spec/preguntas-abiertas.md. La lista fija vive del lado de la
  // aplicación, en `modules/servicios/constantes.ts`
  // (`CATEGORIAS_SERVICIO`), fuera del alcance de este archivo. El día que
  // el cliente la cierre, el sitio correcto es un `pgEnum` construido desde
  // esa constante, igual que `otEstadoEnum` se construye desde `ESTADOS_OT`.
  categoria: text("categoria"),
  // Unidad de medida. Texto libre con sugerencias, igual que
  // `materiales.unidad` y `lista_precios.unidad` desde la unificación del
  // 2026-09-22 (ver esa ficha en entidades.md) — sin CHECK ni ENUM aquí, la
  // restricción (si la hay) vive del lado de la aplicación.
  unidad: text("unidad"),
  // Entero en la unidad mínima (céntimos), NUNCA float — regla invariable 2
  // de AGENTS.md. `bigint` con `mode: "number"`, idéntico patrón que
  // `orden_trabajo.precio` y `lista_precios.precio_lista`: la columna en
  // Postgres es de 8 bytes; Drizzle la mapea a `number` de JS para no
  // arrastrar `BigInt` por el código (core/dinero.ts, formularios,
  // `JSON.stringify` en las Server Actions).
  //
  // A DIFERENCIA DE `lista_precios.precio_lista`, este SÍ es el precio final
  // — un campo directo, no derivado. Este catálogo no tiene columnas
  // `precio_lista`/`descuento` de las que calcularlo: el razonamiento de "el
  // precio se deriva" que aplica a Lista de precios (ver esa ficha) NO
  // aplica aquí. El límite de negocio (equivalente a `PRECIO_MAXIMO_CENTIMOS`
  // de la OT y de Lista de precios) se valida en `modules/servicios/schema.ts`,
  // no en esta columna.
  precio: bigint("precio", { mode: "number" }),
  // Misma columna de moneda que exige cualquier importe del sistema (regla
  // invariable 2 de AGENTS.md): nunca un monto sin su moneda. Mismo enum
  // compartido `moneda` que `orden_trabajo.moneda` y `lista_precios.moneda`,
  // definido en `./moneda.ts` — ninguna tabla es su dueña.
  moneda: monedaEnum("moneda"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at")
    .defaultNow()
    .$onUpdate(() => /* @__PURE__ */ new Date())
    .notNull(),
  // SIN COLUMNA `activo`, A PROPÓSITO. No es un descuido de la regla
  // invariable 9 (baja lógica en vez de borrado): es que inactivar/reactivar
  // este catálogo no está confirmado con el cliente todavía, y añadir la
  // columna antes de saber si hace falta presupone una respuesta que no
  // existe — pregunta abierta en docs/spec/preguntas-abiertas.md. Mientras
  // tanto, este catálogo NO cumple la regla 9 por ausencia de mecanismo, no
  // porque se haya decidido que no aplica. Contrasta con `lista_precios`,
  // donde `activo` sí entró de antemano en su primera migración.
  //
  // Todas las columnas de negocio (`servicio`, `categoria`, `unidad`,
  // `precio`, `moneda`) quedan nullable aquí, igual que en Materiales y
  // Lista de precios: el Zod de `modules/servicios/schema.ts` puede ser más
  // estricto que la columna, nunca al revés.
  //
  // SIN ÍNDICES: no hay columna `activo` que filtrar ni FK que sostenga un
  // JOIN — a diferencia de `lista_precios_activo_idx` y
  // `lista_precios_material_id_idx`, no hay caso real hoy que justifique uno.
});

export type Servicio = typeof servicios.$inferSelect;
export type ServicioNuevo = typeof servicios.$inferInsert;
