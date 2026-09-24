import {
  pgTable,
  text,
  bigint,
  numeric,
  boolean,
  timestamp,
  index,
  check,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { materiales } from "./materiales";
import { monedaEnum } from "./moneda";

// Segundo catálogo maestro con tabla real, después de Materiales (Bloque 13,
// Parte 1, 2026-09-22). Resuelve las decisiones 3 y 4 de "Catálogos
// maestros" en docs/spec/preguntas-abiertas.md: `material` es una FK real
// (no texto libre) y `precio` NO es una columna (se deriva, ver abajo).
export const listaPrecios = pgTable(
  "lista_precios",
  {
    // Mismo patrón que `materiales.id`, `personal.id` y `orden_trabajo.id`:
    // `text` con UUID generado en la aplicación. Ver AGENTS.md — la PK de
    // una tabla nueva sigue la convención ya establecida, no se mezcla con
    // `serial`.
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    // Formato OFFT.0000001, autogenerado por `correlativo` (ámbito
    // "lista_precios") — el usuario nunca lo escribe. `NOT NULL` porque lo
    // pone siempre el backend, nunca queda a medio llenar. `UNIQUE` es la
    // red de seguridad del correlativo, mismo papel que
    // `orden_trabajo.codigo_ot`: aunque un error futuro se saltara el
    // contador, la base no deja entrar dos filas con el mismo código.
    codigo_oferta: text("codigo_oferta").notNull().unique(),
    // Relación real contra Materiales, no texto libre — resuelve la
    // decisión 3 de "Catálogos maestros" en preguntas-abiertas.md a favor de
    // la FK. `NOT NULL`: una fila de lista de precios sin material no tiene
    // sentido (a diferencia de `proveedor`/`unidad`/`cantidad`/`precio_lista`,
    // que sí quedan opcionales más abajo). Sin `onDelete`: el valor por
    // defecto de Drizzle/Postgres es `NO ACTION` (equivalente a RESTRICT en
    // este caso), que es la protección correcta porque Materiales nunca se
    // borra de verdad (regla invariable 9, baja lógica) — esta FK es lo que
    // vuelve real el aviso que ya deja escrito el comentario de
    // `cambiarActivoMaterial` en modules/materiales/actions.ts sobre filas
    // de precios señalando a un material inactivado (no eliminado: inactivar
    // no dispara la FK, solo un DELETE lo haría).
    material_id: text("material_id")
      .notNull()
      .references(() => materiales.id),
    // Texto libre por ahora: en la Parte 2 tendrá su propio buscador
    // (mencionado en el encargo), no una relación todavía.
    proveedor: text("proveedor"),
    // Unidad de medida. A propósito NO es un `pgEnum`, a diferencia de
    // `ot_estado`: los 6 valores propuestos (m, und, pzs, cja, kg, lt) son un
    // borrador sin confirmar con el cliente — no se sabe si son exhaustivos
    // o solo ejemplos (pregunta abierta, ver preguntas-abiertas.md). Un
    // `pgEnum` exige una migración para añadir o quitar un valor; `text` no.
    // La lista fija vive del lado de la aplicación, en
    // `modules/lista-precios/constantes.ts` (fuera del alcance de este
    // archivo). El día que se confirme como cerrada, el sitio correcto es un
    // `pgEnum` construido desde esa constante, igual que `otEstadoEnum` se
    // construye desde `ESTADOS_OT`.
    unidad: text("unidad"),
    // `numeric` con `mode: "string"`, NUNCA float — mismo razonamiento que la
    // regla invariable 2 de AGENTS.md sobre montos, aplicado aquí a una
    // cantidad: pasar por `number`/coma flotante de JS puede perder
    // precisión en una operación aritmética simple. precision 14, scale 3:
    // un material puede venderse por fracción (2.5 m, 0.75 kg), tres
    // decimales cubre eso con margen sin inventar una precisión mayor que
    // nadie pidió.
    cantidad: numeric("cantidad", { precision: 14, scale: 3, mode: "string" }),
    // Entero en la unidad mínima (céntimos), NUNCA float — regla invariable 2
    // de AGENTS.md. `bigint` con `mode: "number"`, idéntico patrón que
    // `orden_trabajo.precio` (ver su comentario en db/schema/orden-trabajo.ts):
    // la columna en Postgres es de 8 bytes, pero Drizzle la mapea a `number`
    // de JS para no arrastrar `BigInt` por el código (dinero.ts, formularios,
    // `JSON.stringify` en las Server Actions). El techo real pasa a ser
    // `Number.MAX_SAFE_INTEGER`; el límite de negocio (equivalente a
    // `PRECIO_MAXIMO_CENTIMOS` de la OT) se valida en el `schema.ts` del
    // módulo, no aquí.
    precio_lista: bigint("precio_lista", { mode: "number" }),
    // Porcentaje 0-100, NUNCA float por el mismo razonamiento que `cantidad`
    // de arriba. `numeric(5,2)`: dos decimales de porcentaje (p.ej. 12.50%)
    // es más que suficiente precisión y dentro del rango 0-100.00 caben
    // cómodos en `precision: 5`. `default("0")` porque una fila sin
    // A diferencia de `proveedor`/`unidad`/`cantidad`/`precio_lista` (donde
    // NULL significa legítimamente "todavía no se sabe" y por eso se dejaron
    // nullable, mismo criterio que Materiales), aquí NO aplica ese criterio:
    // "sin descuento" ya tiene una representación exacta y no ambigua, que es
    // `0`. Dejar la columna nullable crearía DOS formas de decir lo mismo
    // (`NULL` y `'0'`) — justo lo que evita el comentario de `textoOpcional`
    // en modules/materiales/schema.ts.
    //
    // Lo que decide `NOT NULL`, más que el argumento anterior, es que el
    // precio se DERIVA de esta columna
    // (`precio_lista × (1 − descuento / 100)`, ver el comentario al final del
    // archivo). Con `descuento` en NULL el precio de esa fila no queda
    // "desconocido", queda INCALCULABLE — la función tendría que inventarse
    // un `?? "0"`, que es exactamente la segunda representación que se quiere
    // evitar. `NOT NULL` con `DEFAULT '0'` hace que la columna nunca pueda
    // quedar en un estado donde ese cálculo no esté definido: mismo criterio
    // exacto por el que `activo` es `NOT NULL` en Materiales — no es una
    // regla de negocio sin confirmar, es el propio comportamiento de la
    // tabla el que lo exige.
    //
    // CHECK de rango 0-100: a diferencia de `fecha_activacion` de Materiales
    // (donde SÍ se evitó un CHECK porque el rango no estaba confirmado), aquí
    // el rango viene dado explícitamente — un descuento fuera de 0-100 haría
    // que el precio calculado salga negativo o mayor que el de lista, lo cual
    // no tiene sentido de negocio bajo ninguna lectura.
    descuento: numeric("descuento", { precision: 5, scale: 2, mode: "string" })
      .default("0")
      .notNull(),
    // Misma columna de moneda que exige cualquier importe del sistema (regla
    // invariable 2 de AGENTS.md): nunca un monto sin su moneda. Mismo enum
    // compartido que `orden_trabajo.moneda`, movido a `./moneda.ts` en este
    // mismo bloque para que ninguna de las dos tablas parezca la dueña.
    // Nullable, no `NOT NULL`: sigue el mismo criterio de obligatoriedad que
    // el resto de columnas de negocio de esta tabla (ver el párrafo de abajo)
    // — el Zod del módulo puede exigirla en el formulario sin que la columna
    // la fuerce.
    moneda: monedaEnum("moneda"),
    // Baja lógica, no borrado — regla invariable 9, mismo criterio que
    // `materiales.activo` y `personal.activo`. La acción de inactivar es
    // Parte 2 de este bloque, pero la columna entra ya para no requerir una
    // segunda migración solo por esto.
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
    // Mismo criterio que `materiales_activo_idx`: el listado filtra por
    // `activo` en la consulta por defecto.
    index("lista_precios_activo_idx").on(table.activo),
    // El listado hace JOIN contra `materiales` para mostrar su descripción —
    // este índice es el que evita que ese JOIN escanee toda la tabla a
    // medida que crece.
    index("lista_precios_material_id_idx").on(table.material_id),
    check(
      "lista_precios_descuento_pct_check",
      sql`${table.descuento} >= 0 AND ${table.descuento} <= 100`,
    ),
  ],
);

export type ListaPrecios = typeof listaPrecios.$inferSelect;
export type ListaPreciosNueva = typeof listaPrecios.$inferInsert;

/**
 * POR QUÉ NO EXISTE UNA COLUMNA `precio`.
 *
 * Es la decisión central de esta tabla. El precio final se calcula al
 * mostrarlo:
 *
 *   precio = precio_lista × (1 − descuento / 100)
 *
 * y NUNCA se guarda como columna — mismo principio que `edad` en Personal,
 * que es función de `fecha_nacimiento` y no una columna (ver `calcularEdad`
 * en lib/fecha.ts y su comentario «la edad no es un dato, es una
 * consecuencia de dos fechas»). Aquí el precio es una consecuencia de
 * `precio_lista` y `descuento`, no un tercer dato independiente.
 *
 * Guardarlo habría creado un tercer número que puede contradecir a los otros
 * dos (alguien edita `precio_lista` o `descuento` y `precio` queda
 * desactualizado, o los tres se capturan a mano y nunca cuadran entre sí).
 * Esto resuelve la decisión 4 de "Catálogos maestros" en
 * preguntas-abiertas.md a favor de derivarlo.
 *
 * El cálculo vive en el backend (regla invariable 1 de AGENTS.md: el
 * frontend nunca calcula, solo muestra) — el sitio concreto es
 * `modules/lista-precios/`, fuera del alcance de este archivo de esquema.
 */
